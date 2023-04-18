

const model = {

  token: '',
  user: null,
  rooms: [],
  roomId: '',
  currentRoom: '',
  folder: null,
  busy: false,
  settings: {
    maxMessages: 5000,
    maxFileSize: 10_000_000,
    fileType: 'all', // all, image
    downloadFiles: false,
    downloadPeople: false,
  },
  filesizes: [
    { bytes: 0, name: 'No limit' },
    // { bytes: 1_000_000, name: '1 MB' },
    { bytes: 10_000_000, name: '10 MB' },
    { bytes: 50_000_000, name: '50 MB' },
    { bytes: 100_000_000, name: '100 MB' },
    { bytes: 200_000_000, name: '200 MB' },
    { bytes: 500_000_000, name: '500 MB' },
    { bytes: 1_000_000_000, name: '1 GB' },
  ],
  downloader: null,
  logger: null,

  init() {
    this.loadPrefs();
    this.setTips();
  },

  setTips() {
    if (typeof tippy !== 'undefined') {
      tippy('[data-tippy-content]');
    }
  },

  get compatible() {
    return typeof window.showDirectoryPicker === 'function';
  },

  async loadPrefs() {
    try {
      const stored = JSON.parse(localStorage.getItem('archiver-prefs'));
      this.setToken(stored.token);
      if (this.token) {
        await this.checkToken();
      }
      this.setRoom(stored.roomId);
      if (this.user && this.roomId) {
        await this.checkRoom();
      }
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

  async startDownload() {
    this.savePrefs();
    this.logger = new Logger();
    this.downloader = new Downloader(this.folder, this.token, this.logger);
    const { downloader, currentRoom, settings } = this;

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
      console.error('not able to check token');
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

  async selectFolder() {
    try {
      this.folder = await window.showDirectoryPicker({ mode: 'readwrite' });
    }
    catch {}
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
