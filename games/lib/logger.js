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
    return this.context.querySelector("#log-content");
  }
  getAutoscrollElement() {
    return this.context.querySelector("#log-autoscroll");
  }
  isLogEnabled() {
    return document.body.classList.contains("log-visible");
  }
  log(...args) {
    if (!this.isLogEnabled()) {
      return;
    }
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
