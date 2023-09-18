/* global Logger */

class Game {
  constructor({ context }) {
    this.context = context;
    this.log = Logger.getLog({ prefix: "game", context: this.context });
    this.view = this.context.querySelector("#stage-view");
    this.stage = this.context.querySelector("#stage");
    this.players = {};
    this.emoji = Resources.getRandomEmojiIdx();
    this.pos = { x: 0, y: 0 };
    this.accel = { x: 0, y: 0 };
  }
  isActive() {
    return Object.keys(this.players).length > 0;
  }
  setHostId(peerId) {
    this.log("set host id", peerId);
    this.hostId = peerId;
  }
  setEmoji(emoji) {
    this.log("set emoji", emoji);
    this.emoji = emoji;
  }
  setPos({ x, y }, peerId = null) {
    // this.log("set pos", x, y, peerId);
    if (peerId && this.players[peerId]) {
      this.players[peerId].pos.x = x;
      this.players[peerId].pos.y = y;
      return;
    }
    this.pos.x = x;
    this.pos.y = y;
  }
  setAccel({ x, y }, peerId = null) {
    // this.log("set accel", x, y, peerId);
    if (peerId && this.players[peerId]) {
      this.players[peerId].accel.x = x;
      this.players[peerId].accel.y = y;
      return;
    }
    this.accel.x = x;
    this.accel.y = y;
  }
  updateState() {
    if (Object.keys(this.players).length === 0) {
      this.pos = { x: 0, y: 0 };
      this.accel = { x: 0, y: 0 };
      this.setHostId(null);
      this.showLoader();
    } else {
      this.showStage();
    }
  }
  addPlayer({ id, emoji, status }) {
    this.log("add player", id, emoji);
    this.players[id] = {
      id,
      emoji,
      status,
      accel: { x: 0, y: 0 },
      pos: { x: 0, y: 0 },
    };
    this.updateState();
  }
  removePlayer({ id }) {
    this.log("remove player", id);
    delete this.players[id];
    this.updateState();
  }
  refreshStage() {
    this.stage.width = this.view.clientWidth;
    this.stage.height = this.view.clientHeight;
  }
  startAnimation({ draw, clearRect = true, clearStyle = "hsl(0, 0%, 0%)" }) {
    if (this.animation) {
      this.stopAnimation();
    }
    this.animation = setInterval(() => {
      this.refreshStage();
      const stage = this.stage;
      const context = stage.getContext("2d");
      if (clearRect) {
        context.clearRect(0, 0, stage.width, stage.height);
        context.fillStyle = clearStyle;
        context.fillRect(0, 0, stage.width, stage.height);
      }
      draw({ stage, context });
    }, 1000 / 24);
  }
  stopAnimation() {
    clearInterval(this.animation);
  }
  showLoader() {
    this.startAnimation({
      draw: ({ stage, context }) => {
        context.font = "30px Arial";
        const sineHue = Math.sin(Date.now() / 1000 / 10) * 180 + 180;
        context.fillStyle = `hsl(${sineHue}, 100%, 50%)`;
        context.textAlign = "center";
        const text = "Waiting for others...";
        context.fillText(text, stage.width / 2, stage.height / 2);
        const textLayers = [
          {
            x: stage.width / 2 + Math.sin(Date.now() / 1000 / 10) * 20,
            y: stage.height / 2,
            hsl: sineHue - 90,
          },
          {
            x: stage.width / 2 - Math.sin(Date.now() / 1000 / 10) * 20,
            y: stage.height / 2,
            hsl: sineHue - 180,
          },
          {
            x: stage.width / 2,
            y: stage.height / 2 + Math.sin(Date.now() / 1000 / 10) * 20,
            hsl: sineHue - 270,
          },
          {
            x: stage.width / 2,
            y: stage.height / 2 - Math.sin(Date.now() / 1000 / 10) * 20,
            hsl: sineHue - 360,
          },
        ];
        textLayers.forEach(({ x, y, hsl }) => {
          context.fillStyle = `hsl(${hsl}, 100%, 50%)`;
          context.fillText(text, x, y);
        });
      },
    });
  }
  renderPlayer({ player, stage, context }) {
    const emoji = Resources.getEmojiByIdx(player.emoji);
    const x = (stage.width / 2 + player.pos.x) % stage.width;
    const y = (stage.height / 2 + player.pos.y) % stage.height;
    context.font = "30px Arial";
    context.fillStyle = `hsl(${(player.emoji * 360) / 40}, 100%, 50%)`;
    context.textAlign = "center";
    context.fillText(emoji, x, y);

    context.beginPath();
    context.strokeStyle = `hsl(${(player.emoji * 360) / 40}, 100%, 50%)`;
    context.lineWidth = 2;
    context.moveTo(stage.width / 2, stage.height / 2);
    context.lineTo(x, y);
    context.stroke();
  }
  updatePlayer({ player }) {
    player.pos.x += player.accel.x;
    player.pos.y += player.accel.y;
  }
  showStage() {
    this.startAnimation({
      draw: ({ stage, context }) => {
        const player = {
          id: null,
          emoji: this.emoji,
          pos: this.pos,
          accel: this.accel,
        };
        this.renderPlayer({ player, stage, context });
        this.updatePlayer({ player });
        Object.keys(this.players).forEach((id) => {
          const player = this.players[id];
          this.renderPlayer({ player, stage, context });
          this.updatePlayer({ player });
        });
      },
    });
  }
}
