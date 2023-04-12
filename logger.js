class Logger {

  constructor() {
    this.entries = [];
  }

  log(text) {
    this.entries.push({ text, type: 'log' });
  }

  error(text) {
    this.entries.push({ text, type: 'error' });
  }

  get last() {
    return this.entries.at(-1);
  }

}