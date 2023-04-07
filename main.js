

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

function groupMessages(list) {
  const conversations = {};

  const sortByDate = (r1, r2) => r1.created < r2.created ? -1 : 1;

  // build list of start messages
  const starters = list.filter(i => !i.parentId);
  starters.sort(sortByDate).reverse();
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
    else {
      console.warn('Couldnt find parent for msg', i);
    }
  });
  return Object.values(conversations);
}

const model = {

  token: '',
  user: null,
  rooms: [],
  roomId: '',
  roomName: '',
  conversations: [],
  people: [],
  busy: false,
  topFolderHandle: null,
  maxFileSize: 10_000_000,
  downloadFiles: false,
  downloadPeople: true,

  init() {
    this.loadPrefs();
  },

  loadPrefs() {
    try {
      const stored = JSON.parse(localStorage.getItem('archiver-prefs'));
      this.setToken(stored.token);
      this.setRoom(stored.roomId);
    }
    catch(e) {}
  },

  savePrefs() {
    const data = {
      token: this.token,
      roomId: this.roomId,
    };
    localStorage.setItem('archiver-prefs', JSON.stringify(data));
  },

  askForLocation() {
    return window.showDirectoryPicker({ mode: 'readwrite' });
  },

  async downloadRoom() {
    try {
      this.topFolderHandle = await this.askForLocation();
      this.saveAll();
    }
    catch(e) {
      console.log(e);
    }
  },

  safeFileName(name) {
    return name.replaceAll(' ', '_').replace(/\W/g, '_');
  },

  async saveAll() {
    const root = this.topFolderHandle;
    const data = JSON.stringify(this.conversations, null, 2);
    // const folderName = this.roomId;
    const folderName = this.safeFileName(this.roomName);

    try {
      const folder = await root.getDirectoryHandle(folderName, { create: true });
      const fileHandle = await folder.getFileHandle("messages.json", { create: true });
      const messageFile = await fileHandle.createWritable();
      await messageFile.write(data);
      messageFile.close();

      if (this.downloadFiles) {
        this.saveFiles(folder);
      }

      if (this.downloadPeople) {
        this.people = await this.fetchPeople();
        await this.savePeople(folder);
      }
    }
    catch(e) {
      console.log(e);
    }
  },

  async saveFiles(folder) {
    const files = [];
    const { token } = this;
    this.conversations.flat().forEach(msg => {
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
        if (info.size < this.maxFileSize) {
          const file = await getFile(token, url);
          const blob = await file.blob();
          console.log('save', count, '/', all.length, info);
          const fileHandle = await folder.getFileHandle(info.name, { create: true });
          const stream = await fileHandle.createWritable();
          await stream.write(blob);
          stream.close();
        }
        else {
          console.log('skip file', info, 'too large');
        }
      }
      catch(e) {
        console.log(e);
      }
      }

  },

  async fetchMessages() {

    const token = this.token.trim();
    const roomId = this.roomId.trim();
    this.busy = true;

    try {
      const res = await getMessages(token, roomId);
      if (res.ok) {
        const { items } = await res.json();
        const conversations = groupMessages(items);
        // console.log(conversations);
        this.conversations = conversations;
      }
      else {
        console.warn('not able to fetch messages', await res.text());
      }
      this.busy = false;
    }
    catch(e) {
      console.log(e);
      this.busy = false;
    }
  },

  async fetchPeople() {
    this.busy = true;
    const ids = new Set(this.conversations.flat().map(c => c.personId));
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
    this.busy = false;

    return people;
  },

  async savePeople(folder) {
    const data = JSON.stringify(this.people, null, 2);

    try {
      // const folder = await rootFolder.getDirectoryHandle('people', { create: true });
      const file = await folder.getFileHandle('people.json', { create: true });
      const stream = await file.createWritable();
      await stream.write(data);
      stream.close();
      await this.saveAvatars(folder);
    }
    catch(e) {
      console.log(e);
    }
  },

  async saveAvatars(folder) {
    this.people.forEach(async (person) => {
      const { avatar } = person;
      if (avatar) {
        const scaled = avatar.replace('~1600', '~110');
        try {
          const fileName = (person.emails?.[0] || person.id) + '.jpg';
          const res = await getFile(this.token, scaled);
          const blob = await res.blob();
          const file = await folder.getFileHandle(fileName, { create: true });
          const stream = await file.createWritable();
          await stream.write(blob);
          stream.close();
        }
        catch(e) {
          console.log('not able to save avatar', person.emails, scaled);
        }
      }
    });
  },

  async checkToken() {
    this.user = null;
    this.busy = true;

    const token = this.token.trim();
    if (!token) {
      return;
    }

    try {
      const res = await whoAmI(token);
      if (res.ok) {
        this.user = await res.json();
      }
      else {
        console.warn('not able to use token', await res.text());
      }
      this.busy = false;

    }
    catch(e) {
      console.log(e);
      this.busy = false;
    }
  },

  async findRooms() {
    this.busy = true;

    const token = this.token.trim();
    try {
      const res = await getRooms(token);
      if (res.ok) {
        this.rooms = (await res.json()).items;
      }
      else {
        console.warn('not able to find rooms', await res.text());
      }
      this.busy = false;

    }
    catch(e) {
      console.log(e);
      this.busy = false;
    }
  },

  setToken(token) {
    this.token = token;
    this.checkToken();
  },

  async setRoom(id) {
    this.roomId = id;
    await this.checkRoom();
  },

  async checkRoom() {
    this.roomName = '';
    const token = this.token.trim();
    const roomId = fixId(this.roomId.trim());
    this.roomId = roomId;

    // console.log('fetch room', this.roomId);
    if (!roomId || !token) return;

    this.busy = true;

    try {
      const res = await getRoomDetails(token, roomId);
      if (res.ok) {
        const room = await res.json();
        this.roomName = room.title;
      }
      else {
        console.warn(await res.text());
      }
      this.busy = false;
      this.fetchMessages();
    }
    catch(e) {
      console.log(e);
      this.busy = false;

    }
  }
};
