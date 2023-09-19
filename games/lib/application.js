/* global Logger, Room */

class Application {
  constructor({ context }) {
    this.context = context;
    this.log = Logger.getLog({ prefix: "app", context: this.context });
    this.id = "amkisko.github.io/snake/v1";
    this.game = new Game({ context: this.context });
  }
  handleDeviceOrientation(event, debounced = false) {
    if (!debounced) {
      clearTimeout(this.handleDeviceOrientationTimer);
      this.handleDeviceOrientationTimer = setTimeout(() => this.handleDeviceOrientation(event, true), 100);
      return;
    }
    const x = event.gamma;
    const y = event.beta;
    if (this.game.isActive()) {
      this.game.setAccel({ x, y });
      this.gameRoom.sendMessage({ q: "accel", x, y });
    }
  }
  handleMouseMove(event, debounced = false) {
    if (!debounced) {
      clearTimeout(this.handleMouseMoveTimer);
      this.handleMouseMoveTimer = setTimeout(() => this.handleMouseMove(event, true), 100);
      return;
    }
    const x = (event.clientX / this.game.stage.clientWidth) * 2 - 1;
    const y = (event.clientY / this.game.stage.clientHeight) * 2 - 1;
    if (this.game.isActive()) {
      this.game.setAccel({ x, y });
      this.gameRoom.sendMessage({ q: "accel", x, y });
    }
  }
  init() {
    this.game.showLoader();
    this.room = new Room({ appId: this.id, context: this.context });
    this.room.onJoin((...args) => this.onRoomJoin(...args));
    this.room.onLeave((...args) => this.onRoomLeave(...args));
    this.room.onStream((...args) => this.onRoomStream(...args));
    this.room.onMessage((...args) => this.onRoomMessage(...args));
    this.context.querySelector("#stage").addEventListener(
      "touchmove",
      (event) => this.handleMouseMove(event),
      true,
    );
    this.context.querySelector("#stage").addEventListener(
      "mousemove",
      (event) => this.handleMouseMove(event),
      true,
    );
  }
  clearLog() {
    this.log.clearLog();
  }
  sendMessage(msg) {
    msg.ts = Date.now();
    this.room.sendMessage(msg);
  }
  sendLog() {
    const logInput = this.context.querySelector("#log-input");
    const value = logInput.value;
    if (value) {
      this.log(value);
      this.sendMessage({ q: "log", d: value });
    }
    logInput.value = "";
  }
  // negotiate new room within the main room
  // start sending device location to others
  // send device orientation changes to others
  resolveDecision({
    peerId,
    force = false,
    remove = false,
    host = false,
    user = false,
  }) {
    this.decisions = this.decisions || {};
    if (remove) {
      delete this.decisions[peerId];
      return;
    }
    if (force) {
      this.decisions[peerId] = { value: Math.round(Math.random() * 2) };
    }
    if (host) {
      this.decisions[peerId].host = true;
    }
    if (user) {
      this.decisions[peerId].user = true;
    }
    return this.decisions[peerId];
  }
  decisionsCount() {
    return Object.keys(this.decisions || {}).length;
  }
  getDecisionsCounts() {
    return {
      host: Object.keys(this.decisions).filter(
        (peerId) => this.decisions[peerId].host,
      ).length,
      user: Object.keys(this.decisions).filter(
        (peerId) => this.decisions[peerId].user,
      ).length,
      unknown: Object.keys(this.decisions).filter(
        (peerId) =>
          !this.decisions[peerId].host && !this.decisions[peerId].user,
      ).length,
    };
  }
  onRoomJoin(room, peerId) {
    this.room.sendPresence({ peerId });
  }
  onRoomLeave(room, peerId) {
    this.resolveDecision({ peerId, remove: true });
    if (this.decisionsCount() > 0) {
      const decisionsCounts = this.getDecisionsCounts();
      if (decisionsCounts.unknown > 0) return;
      if (decisionsCounts.host === 0 && decisionsCounts.user > 0) {
        const gameRoom = this.resolveGameRoom({});
        Object.keys(this.decisions).forEach((peerId) => {
          this.sendMessage(
            { q: "game_room", rid: gameRoom.id, ts: gameRoom.time },
            peerId,
          );
        });
      }
    }
  }
  onRoomStream(room, stream, peerId) {}
  resolveGameRoom({ id = null }) {
    let status;
    if (id) {
      if (this.gameRoom?.id === id) {
        return { room: this.gameRoom, status: "playing" };
      }
      if (this.gameRoom?.connected) {
        this.gameRoom.room.leave();
      }
      this.gameRoom = null;
      this.gameRoom = new Room({
        id,
        appId: this.id,
        context: this.context,
      });
      status = "accepted";
    } else {
      this.gameRoom = new Room({
        appId: this.id,
        context: this.context,
        seed: `${this.room.time}${Math.round(Math.random() * 1000)}`,
      });
      status = "created";
    }
    this.gameRoom.onJoin((...args) => this.onGameRoomJoin(...args));
    this.gameRoom.onLeave((...args) => this.onGameRoomLeave(...args));
    this.gameRoom.onStream((...args) => this.onGameRoomStream(...args));
    this.gameRoom.onMessage((...args) => this.onGameRoomMessage(...args));
    return { room: this.gameRoom, status };
  }
  sendGameRoomInvitation({ peerId }) {
    const newPlayerEmoji = Resources.getRandomEmojiIdx();
    this.game.addPlayer({ id: peerId, emoji: newPlayerEmoji });
    this.sendMessage(
      { q: "game_room", rid: this.gameRoom.id, emoji: newPlayerEmoji },
      peerId,
    );
  }
  handleNewGameRoomQuery({ room, peerId, msg }) {
    const decisionValue = this.resolveDecision({ peerId })?.value;
    if (!decisionValue) {
      if (this.gameRoom) {
        this.sendGameRoomInvitation({ peerId });
      } else {
        const decision = this.resolveDecision({ peerId, force: true }).value;
        this.sendMessage({ q: "new_game_room", d: decision }, peerId);
      }
    } else if (msg.d === decisionValue) {
      this.sendMessage(
        {
          q: "new_game_room",
          d: this.resolveDecision({ peerId, force: true }).value,
        },
        peerId,
      );
    } else if (msg.d < decisionValue) {
      this.resolveDecision({ peerId, host: true });
      const { room: gameRoom, status } = this.resolveGameRoom({});
      this.sendGameRoomInvitation({ peerId });
    } else {
      this.resolveDecision({ peerId, user: true });
    }
  }
  handleGameRoomQuery({ room, peerId, msg }) {
    const { room: gameRoom, status } = this.resolveGameRoom({ id: msg.rid });
    if (status === "accepted") {
      this.game.setHostId(peerId);
      this.game.emoji = msg.emoji;
      this.gameRoom.time = msg.ts;
    }
  }
  handlePresenceQuery({ room, peerId, msg }) {
    this.gameRoomInvitations = this.gameRoomInvitations || {};
    if (!this.gameRoomInvitations[peerId]) {
      this.log("sending game room invitation", peerId);
      if (this.gameRoom) {
        this.sendGameRoomInvitation({ peerId });
      } else {
        const decision = this.resolveDecision({ peerId, force: true }).value;
        this.sendMessage({ q: "new_game_room", d: decision }, peerId);
      }
      this.gameRoomInvitations[peerId] = this.room.time;
    }
  }
  onRoomMessage(room, peerId, msg) {
    if (msg.q === "new_game_room") {
      this.handleNewGameRoomQuery({ room, peerId, msg });
    } else if (msg.q === "game_room") {
      this.handleGameRoomQuery({ room, peerId, msg });
    } else if (msg.q === "presence") {
      this.handlePresenceQuery({ room, peerId, msg });
    }
  }
  onGameRoomJoin(room, peerId) {
    room.sendPresence({ peerId });
    if (!this.game.hostId) {
      room.sendMessage(
        { q: "player", id: null, emoji: this.game.emoji },
        peerId,
      );
      Object.keys(this.game.players)
        .filter((id) => id !== peerId)
        .forEach((id) => {
          room.sendMessage({ q: "player", id, emoji: this.game.emoji }, peerId);
        });
    }
  }
  onGameRoomLeave(room, peerId) {
    this.game.removePlayer({ id: peerId });
  }
  onGameRoomStream(room, stream, peerId) {}
  onGameRoomMessage(room, peerId, msg) {
    if (msg.q === "presence") {
      if (msg.s === "offline") {
        this.game.removePlayer({ id: peerId });
      }
    } else if (msg.q === "player") {
      this.game.addPlayer({ id: msg.id || peerId, emoji: msg.emoji });
    } else if (msg.q === "accel") {
      this.game.setAccel({ x: msg.x, y: msg.y }, peerId);
    }
  }
}
