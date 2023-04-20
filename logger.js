class Logger {

  constructor() {
    this.entries = [];
  }

  entry(type, text) {
    const time = new Date().toLocaleTimeString();
    this.entries.push({ time, text, type });
  }

  log(text) {
    console.log(text);
    this.entry('log', text);
  }

  warn(text) {
    this.entry('warning', text);
    console.warn(text);
  }

  error(text) {
    this.entry('error', text);
    console.error(text);
  }

  get items() {
    return this.entries;
  }

  get errors() {
    return this.entries.filter(i => i.type === 'error');
  }

  get last() {
    return this.entries.at(-1);
  }

}