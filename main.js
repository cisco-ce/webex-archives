
const model = {

  token: '',
  user: null,
  rooms: [],
  showRoomList: false,
  roomFilter: '',
  roomId: '',
  currentRoom: '',
  folder: null,
  busy: false,
  downloading: false,
  showDownloading: false,
  settings: {
    maxMessages: 5000,
    maxFileSize: 10_000_000,
    beforeDate: '',
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
        this.findRooms();
      }
      if (stored.roomId) {
        this.roomId = stored.roomId;
        await this.checkRoom();
      }
      this.settings = Object.assign(this.settings, stored.settings);
    }
    catch(e) {}
  },

  savePrefs() {
    const data = {
      token: this.token,
      roomId: this.roomId,
      settings: this.settings,
    };
    localStorage.setItem('archiver-prefs', JSON.stringify(data));
  },

  async startDownload() {
    this.savePrefs();
    this.logger = new Logger();
    this.downloader = new Downloader(this.folder, this.token, this.logger);
    const { downloader, currentRoom, settings } = this;

    const alreadyExists = await this.downloader.spaceAlreadyExists(this.folder, currentRoom);
    if (alreadyExists) {
      const msg = `The folder "${this.folder.name}" already contains an archive for the selected space. Do you want to overwrite it?`;
      const overwrite = confirm(msg);
      if (!overwrite) {
        return;
      }
    }


    this.downloading = true;
    this.showDownloading = true;
    await downloader.saveAll(currentRoom, settings);
    this.downloading = false;
  },

  async checkToken() {
    this.user = null;
    this.busy = 'Verifying token';

    const token = this.token.trim();
    if (!token) {
      this.busy = false;
      return;
    }

    try {
      const res = await whoAmI(token);
      if (res.ok) {
        this.user = await res.json();
        this.savePrefs();
      }
      else {
        alert('The current token does not seem to be valid. Perhaps it has expired?');
      }
      this.busy = false;

    }
    catch(e) {
      console.error('not able to check token');
      this.busy = false;
    }
  },

  pasteRoom(text) {
    this.roomId = fixId(text);
    this.checkRoom();
  },

  async findRooms() {
    if (!this.user) return;

    try {
      const res = await getRooms(this.token);
      if (res.ok) {
        this.rooms = (await res.json()).items;
      }
      else {
        console.warn('not able to find rooms', await res.text());
      }

    }
    catch(e) {
      console.log("not able to fetch rooms", e.message);
    }
  },

  setToken(token) {
    this.token = token;
  },

  async setRoom(id) {
    this.roomId = id;
    this.checkRoom();
    this.showRoomList = false;
  },

  async selectFolder() {
    try {
      this.folder = await window.showDirectoryPicker({ mode: 'readwrite' });
    }
    catch {}
  },

  get roomsFiltered() {
    const { rooms, roomFilter } = this;
    return rooms?.filter(r => r.title.toLowerCase().includes(roomFilter));
  },

  get readyToDownload() {
    return this.user && !!this.currentRoom && this.folder;
  },

  async checkRoom() {
    this.currentRoom = null;
    const token = this.token;
    const roomId = fixId(this.roomId.trim());
    this.roomId = roomId;

    if (!roomId || !token) return;

    this.busy = 'Verifying room id';

    try {
      const res = await getRoomDetails(token, roomId);
      if (res.ok) {
        this.currentRoom = await res.json();
        this.savePrefs();
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
