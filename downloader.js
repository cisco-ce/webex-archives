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

// take a list of messages and group them into conversation threads
function groupMessages(list) {
  const conversations = {};

  const sortByDate = (r1, r2) => r1.created < r2.created ? -1 : 1;

  // build list of start messages
  const starters = list.filter(i => !i.parentId);
  starters.forEach(i => {
    conversations[i.id] = [i];
  });

  // add all threaded replies
  const replies = list.filter(i => i.parentId);
  replies.sort(sortByDate);
  replies.forEach(i => {
    const parent = conversations[i.parentId]
    if (parent) {
      parent.push(i);
    }

    // message belongs to a thread where the first message has been deleted
    else {
      const root = {
        id: i.parentId,
        created: i.created,
        html: '<i>This message was not available</i>',
      };

      conversations[root.id] = [root, i];
    }
  });

  const sorted = Object.values(conversations);
  sorted.sort((s1, s2) => s1[0].created < s2[0].created ? -1 : 1);

  return sorted;
}

class Downloader {

  constructor(root, token, logger) {
    this.root = root;
    this.token = token;
    this.logger = logger;
  }

  safeFileName(name) {
    return name.replaceAll(' ', '_').replace(/\W/g, '_');
  }

  async spaceAlreadyExists(folder, room) {
    const folderName = this.safeFileName(room.title);
    try {
      const dir = await folder.getDirectoryHandle(folderName, { create: false });
      return true;
    }
    catch {
      return false;
    }
  }

  async saveAll(room, settings) {
    const conversations = await this.fetchMessages(room.id, settings);

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

      const messageCount = conversations.flat().length;
      const dir = `${root.name} > ${folder.name}`;
      const errorCount = this.logger.errors.length;
      const errors = errorCount ? `There were ${errorCount} errors.` : '';
      this.logger.log(`🎉 Saved ${messageCount} messages. The archive is now available in local folder: "${dir}". ${errors}`);
    }
    catch(e) {
      console.warn(e);
      this.logger.log('🚨 Something went wrong during download.');
    }

  }

  async fetchMessages(roomId, settings) {
    const token = this.token;
    this.logger.log('Fetching messages from room');

    try {
      const items = await this.getAllMessages(token, roomId, settings);
      const conversations = groupMessages(items, settings);
      return conversations;
    }
    catch(e) {
      // TODO: This means the whole download failed. must be flagged
      this.logger.error('Something went wrong while downloading messages');
      console.log(e);
      return [];
    }
  }

  async getAllMessages(token, roomId, settings) {
    const { maxMessages, beforeDate } = settings;
    let all = [];
    let url = `${apiUrl}messages?roomId=${roomId}&max=1000`;

    if (beforeDate) {
      url += `&before=${beforeDate}T23:59:59.000Z`;
    }

    while(url) {
      const count = all.length;
      this.logger.log(`Fetching messages ${count} - ${count + 1000}`);
      const res = await webex(url, token);
      if (!res.ok) {
        console.warn('Not able to fetch messages', await res.text());
        return all;
      }

      const list = (await res.json()).items;
      all = all.concat(list);

      // got more messages than requested
      if (maxMessages && all.length >= maxMessages) {
        return all.slice(0, maxMessages);
      }

      const link = res.headers.get('Link');
      url = link?.match(/<(.*)>; rel="next"/)?.[1];
    }

    return all;
  }

  async fetchPeople(conversations) {
    const allIds = conversations
      .flat()
      .map(p => p.personId)
      .filter(i => i);

    const ids = Array.from(new Set(allIds));

    const total = ids.length;
    const pageSize = 70;

    let people = [];
    for (let i = 0; i < total; i += pageSize) {
      const params = ids.slice(i, i + pageSize);
      this.logger.log(`Fetching person data ${i + 1} - ${i + params.length} / ${total}`);
      try {
        const all = await getPeople(this.token, params);
        const json = await all.json();
        people = people.concat(json.items);
        await sleep(1000);
      }
      catch(e) {
        this.logger.error(`Not able to fetch people ${i + 1} - ${i + params.length}`);
      }
    }

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

            const contentType = type.split('/').shift();
            const typeOk = settings.fileType === 'all' || settings.fileType === contentType;
            const sizeOk = !settings.maxFileSize || (size < settings.maxFileSize);

            if (typeOk && sizeOk) {
              this.logger.log(`Fetching file ${count} / ${total}: ${name} (${type} / ${humanSize})`);
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

              this.logger.warn(`Skip file ${name}: too large or wrong type`);
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
    let n = 0;
    for (const person of people) {
      n++;
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
        }
        catch(e) {
          const msg = `Not able to save avatar for ${person.displayName} ${person.emails?.[0]}`;
          this.logger.error(msg);
        }
      }
    }
  }
}