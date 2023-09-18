/* global Application */

const urlParams = new URLSearchParams(window.location.search);
const log = urlParams.get("log");
if (log) {
  document.body.classList.add("log-visible");
}

addEventListener("load", function () {
  Promise.resolve().then(function () {
    window.app = new Application({ context: document.getElementById("app") });
    window.app.init();
  });
});
