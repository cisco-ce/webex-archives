class Logger {

  constructor() {
    this.entries = [];
  }

  log(text) {
    console.log(text);
    this.entries.push({ text, type: 'log' });
  }

  error(text) {
    this.entries.push({ text, type: 'error' });
    console.warn('LOGGER', text);
  }

  get last() {
    return this.entries.at(-1);
  }

}