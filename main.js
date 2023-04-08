
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
  currentRoom: '',
  conversations: [],
  busy: false,
  settings: {
    maxFileSize: 10_000_000,
    downloadFiles: false,
    downloadPeople: false,
  },
  downloader: null,

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

  async downloadRoom() {
    this.downloader = await Downloader.create(this.token);
    const { downloader, currentRoom, conversations, settings } = this;

    if (!this.downloader) {
      alert('You must pick a directory to save an archive.');
      return;
    }

    this.busy = true;
    await downloader.saveAll(currentRoom, conversations, settings);
    this.busy = false;
    alert('Done!');
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
        alert('The current token does not seem to be valid. Perhaps it has expired?');
        // console.warn('not able to use token', await res.text());
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
    this.currentRoom = null;
    const token = this.token.trim();
    const roomId = fixId(this.roomId.trim());
    this.roomId = roomId;

    // console.log('fetch room', this.roomId);
    if (!roomId || !token) return;

    this.busy = true;

    try {
      const res = await getRoomDetails(token, roomId);
      if (res.ok) {
        this.currentRoom = await res.json();
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
