

const model = {

  token: '',
  user: null,
  rooms: [],
  roomId: '',
  currentRoom: '',
  busy: false,
  settings: {
    maxFileSize: 10_000_000,
    downloadFiles: false,
    downloadPeople: false,
  },
  downloader: null,
  logger: null,

  init() {
    this.loadPrefs();
  },

  get compatible() {
    return typeof window.showDirectoryPicker === 'function';
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
    this.logger = new Logger();
    this.downloader = await Downloader.create(this.token, this.logger);
    const { downloader, currentRoom, settings } = this;

    if (!this.downloader) {
      alert('You must pick a directory to save an archive.');
      return;
    }

    this.busy = 'Starting download';
    await downloader.saveAll(currentRoom, settings);
    this.busy = false;
  },

  async checkToken() {
    this.user = null;
    this.busy = 'Verifying token';

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
      console.error('invalid token');
      this.busy = false;
    }
  },

  async findRooms() {
    this.busy = 'Searching for rooms. This may take a while';

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
  },

  async setRoom(id) {
    this.roomId = id;
  },

  async checkRoom() {
    this.currentRoom = null;
    const token = this.token.trim();
    const roomId = fixId(this.roomId.trim());
    this.roomId = roomId;

    // console.log('fetch room', this.roomId);
    if (!roomId || !token) return;

    this.busy = 'Verifying room id';

    try {
      const res = await getRoomDetails(token, roomId);
      if (res.ok) {
        this.currentRoom = await res.json();
      }
      else {
        console.warn(await res.text());
      }
      this.busy = false;
    }
    catch(e) {
      console.log(e);
      this.busy = false;
    }
  }
};
