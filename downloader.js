async function saveFile(folder, name, content) {
  const file = await folder.getFileHandle(name, { create: true });
  const stream = await file.createWritable();
  await stream.write(content);
  stream.close();
}

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

function makeJsFile(variable, object) {
  const json = JSON.stringify(object, null, 2);
  return `const ${variable} = ${json}`;
}

class Downloader {

  constructor(root, token) {
    this.root = root;
    this.token = token;
  }

  static async create(token) {
    try {
      const root = await window.showDirectoryPicker({ mode: 'readwrite' });
      return new Downloader(root, token);
    }
    catch(e) {
      console.log('Not able to set root folder');
      return false;
    }
  }

  safeFileName(name) {
    return name.replaceAll(' ', '_').replace(/\W/g, '_');
  }

  async saveAll(roomName, conversations, settings) {
    const root = this.root;
    // const folderName = this.roomId;
    const folderName = this.safeFileName(roomName);

    try {
      const folder = await root.getDirectoryHandle(folderName, { create: true });

      if (settings.downloadFiles) {
        await this.saveFiles(folder, conversations, settings);
      }

      let people = null;
      if (settings.downloadPeople) {
        people = await this.fetchPeople(conversations);
        await this.saveAvatars(folder, people);
      }

      const meta = {
        created: new Date(),
      };

      const data = {
        meta,
        conversations,
        people,
      };

      const content = makeJsFile('data', data);
      await saveFile(folder, 'data.js', content);
    }
    catch(e) {
      console.log(e);
    }
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
          console.log('fetched', people.length, '/', ids.size, person.displayName);
        }
        else {
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
    const files = [];
    const { token } = this;
    conversations.flat().forEach(msg => {
      if (msg.files && msg.files.length) {
        files.push(msg.files);
      }
    });

    const all = files.flat();

    let count = 0;
    for (const url of all) {
      count += 1;
      try {
        const info = await getFileInfo(token, url);
        if (info.size < settings.maxFileSize) {
          const file = await getFile(token, url);
          const blob = await file.blob();
          console.log('save', count, '/', all.length, info);
          await saveFile(folder, info.name, blob);
        }
        else {
          console.log('skip file', info, 'too large');
        }
      }
      catch(e) {
        console.log(e);
      }
    }
  }

  async saveAvatars(folder, people) {
    people.forEach(async (person, n) => {
      const { avatar } = person;
      if (avatar) {
        const scaled = avatar.replace('~1600', '~110');
        try {
          const fileName = (person.emails?.[0] || person.id) + '.jpg';
          const res = await getFile(this.token, scaled);
          const blob = await res.blob();

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