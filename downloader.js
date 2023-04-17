async function saveFile(folder, name, content) {
  const file = await folder.getFileHandle(name, { create: true });
  const stream = await file.createWritable();
  await stream.write(content);
  stream.close();
}

function createFolder(parent, name) {
  return parent.getDirectoryHandle(name, { create: true });
}

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

function makeJsFile(variable, object) {
  const json = JSON.stringify(object, null, 2);
  return `const ${variable} = ${json}`;
}

async function copyUrlToFile(url, folder, file) {
  const text = await (await fetch(url)).text();
  await saveFile(folder, file, text);
}

function toHumanSize(bytes) {
  if (bytes > 1_000_000_000) {
    return (bytes / 1_000_000_000).toFixed(1) + ' GB';
  }
  if (bytes > 1_000_000) {
    return (bytes / 1_000_000).toFixed(1) + ' MB';
  }
  if (bytes > 1_000) {
    return Math.ceil(bytes / 1_000) + ' KB';
  }
  return bytes + ' B';
}

function uniqueFileName(original) {
  const prefix = Math.floor(Math.random() * 10E4);
  return prefix + '-' + original;
}

class Downloader {

  constructor(root, token, logger) {
    this.root = root;
    this.token = token;
    this.logger = logger;
  }

  static async create(token, logger) {
    try {
      const root = await window.showDirectoryPicker({ mode: 'readwrite' });
      console.log('got access to', root.name);
      return new Downloader(root, token, logger);
    }
    catch(e) {
      console.log('Not able to set root folder');
      return false;
    }
  }

  safeFileName(name) {
    return name.replaceAll(' ', '_').replace(/\W/g, '_');
  }

  async saveAll(room, conversations, settings) {
    const root = this.root;
    // const folderName = this.roomId;
    const folderName = this.safeFileName(room.title);

    try {
      const folder = await createFolder(root, folderName);

      if (settings.downloadFiles) {
        const filesFolder = await createFolder(folder, 'files');
        await this.saveFiles(filesFolder, conversations, settings);
      }

      let people = null;
      if (settings.downloadPeople) {
        const peopleFolder = await createFolder(folder, 'people');
        people = await this.fetchPeople(conversations);
        await this.saveAvatars(peopleFolder, people);
      }

      const meta = {
        created: new Date(),
      };

      const data = {
        meta,
        settings,
        room,
        conversations,
        people,
      };

      const assets = await createFolder(folder, 'assets');
      const content = makeJsFile('data', data);
      await saveFile(assets, 'data.js', content);
      await copyUrlToFile('./style.css', assets, 'style.css');
      await copyUrlToFile('./archive.html', folder, 'archive.html');
      await copyUrlToFile('https://cdn.jsdelivr.net/npm/alpinejs@3.12.0/dist/cdn.min.js', assets, 'alpine.js');
    }
    catch(e) {
      console.warn(e);
    }
    this.logger.log('🎉 Done. The archive is now available in the local folder you selected.');
  }

  async fetchPeople(conversations) {
    const ids = new Set(conversations.flat().map(c => c.personId));
    const people = [];
    for (const id of ids) {
      try {
        const res = await getPerson(this.token, id);
        if (res.ok) {
          const person = await res.json();
          people.push(person);
          const count = people.length;
          this.logger.log(`Fetching person ${count} / ${ids.size}`);
          console.log('fetched', people.length, '/', ids.size, person.displayName);
        }
        else {
          this.logger.error('Not able to fetch person');
          console.warn('not able to fetch', id);
        }
      }
      catch(e) {
        console.log('error fetching', id);
      }

      await sleep(1000);
    }
    console.log('done fetching people');

    return people;
  }

  async saveFiles(folder, conversations, settings) {
    const { token } = this;

    const total = conversations.flat()
      .map(msg => msg.files)
      .flat().filter(i => i).length;

    let count = 0;
    // we need to do the looping sequentially to avoid rate limiting:
    for (const conv of conversations) {
      for (const msg of conv) {
        if (!msg.files?.length) continue;

        const list = [];
        for (const url of msg.files) {
          count++;
          try {
            const { name, size, type } = await getFileInfo(token, url);
            const humanSize = toHumanSize(size);
            if (size < settings.maxFileSize) {
              this.logger.log(`Fetching file ${count} / ${total}: ${name} (${humanSize})`);
              const file = await getFile(token, url);
              const blob = await file.blob();
              const localName = uniqueFileName(name);
              try {
                await saveFile(folder, localName, blob);
                list.push({ url, localName, type, size });
              }
              catch(e) {
                this.logger.error('Not able to download ' + name);
              }
            }
            else {
              console.log('skip file', name, 'too large');
            }
          }
          catch(e) {
            this.logger.error('Not able to fetch file ' + url);
          }
        }
        msg.files = list;
      }
    }
  }

  async saveAvatars(folder, people) {
    people.forEach(async (person, n) => {
      const { avatar } = person;
      if (avatar) {
        const scaled = avatar.replace('~1600', '~110'); // possible: 80, 110, 640, ...
        try {
          const fileName = (person.emails?.[0] || person.id) + '.jpg';
          const res = await getFile(this.token, scaled);
          const blob = await res.blob();
          const name = person.displayName;

          this.logger.log(`Downloading avatar ${n + 1} / ${people.length}: ${name}`);
          await saveFile(folder, fileName, blob);
          console.log('Saved avatar', n + 1, '/', people.length);
        }
        catch(e) {
          console.log('not able to save avatar', person.emails, scaled);
        }
      }
    });
  }
}