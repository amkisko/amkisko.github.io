class Logger {
  static getLog({ prefix, context }) {
    const logger = new Logger({ prefix, context });
    return (...args) => logger.log(...args);
  }
  constructor({ prefix, context }) {
    this.context = context;
    this.prefix = prefix;
  }
  getContentElement() {
    return this.context.document.getElementById("log-content");
  }
  getAutoscrollElement() {
    return this.context.document.getElementById("log-autoscroll");
  }
  log(...args) {
    console.log(...args);
    const contentElement = this.getContentElement();
    const autoscrollElement = this.getAutoscrollElement();
    if (contentElement) {
      const newEntry = document.createElement("div");
      newEntry.innerText = args.join(" ");
      contentElement.appendChild(newEntry);
      if (autoscrollElement.checked) {
        contentElement.scrollTop = contentElement.scrollHeight;
      }
    }
  }
  clearLog() {
    this.logContentElement.innerHTML = "";
  }
}
