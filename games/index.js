/* global Application */

addEventListener("load", function () {
  const view = document.getElementById("stage-view");
  const stage = document.getElementById("stage");
  stage.width = view.clientWidth;
  stage.height = view.clientHeight;
  const animation = setInterval(() => {
    const context = stage.getContext("2d");
    context.clearRect(0, 0, stage.width, stage.height);
    context.fillStyle = "black";
    context.fillRect(0, 0, stage.width, stage.height);
    context.font = "30px Arial";
    context.fillStyle = "white";
    context.textAlign = "center";
    context.fillText("Loading...", stage.width / 2, stage.height / 2);
    context.font = "10px Arial";
    context.fillStyle = "white";
    context.textAlign = "left";
  }, 1000 / 24);

  Promise.resolve().then(function () {
    window.app = new Application(this);
    window.app.init();
  });
});
