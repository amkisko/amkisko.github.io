/* global Logger, Room */

class Application {
  constructor(context) {
    this.context = context;
    this.log = Logger.getLog({ prefix: "app", context: this.context });
    this.id = "amkisko.github.io/snake/v1";
  }
  init() {
    this.room = new Room({ appId: this.id, context: this.context });
    this.room.onJoin((...args) => this.onRoomJoin(...args));
    this.room.onLeave((...args) => this.onRoomLeave(...args));
    this.room.onStream((...args) => this.onRoomStream(...args));
    this.room.onMessage((...args) => this.onRoomMessage(...args));
  }
  clearLog() {
    this.log.clearLog();
  }
  sendMessage(msg) {
    msg.ts = Date.now();
    this.room.sendMessage(msg);
  }
  sendLog() {
    const value = this.context.document.getElementById("log-input").value;
    this.context.document.getElementById("log-input").value = "";
    if (value) {
      this.sendMessage({ q: "log", d: value });
    }
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
  sendPresence({ status = "online", peerId = null }) {
    const msg = { q: "presence", d: status };
    if (peerId) {
      this.sendMessage(msg, peerId);
    } else {
      this.sendMessage(msg);
    }
  }
  onRoomJoin(room, peerId) {
    this.sendPresence({ peerId });
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
  handleNewGameRoomQuery({ room, peerId, msg }) {
    const decisionValue = this.resolveDecision({ peerId })?.value;
    if (!decisionValue) {
      if (this.gameRoom) {
        this.sendMessage({ q: "game_room", rid: this.gameRoom.id }, peerId);
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
      this.sendMessage({ q: "game_room", rid: gameRoom.id }, peerId);
    } else {
      this.resolveDecision({ peerId, user: true });
    }
  }
  handleGameRoomQuery({ room, peerId, msg }) {
    const { room: gameRoom, status } = this.resolveGameRoom({ id: msg.rid });
    if (status === "accepted") {
      this.gameRoom.time = msg.ts;
    }
  }
  handlePresenceQuery({ room, peerId, msg }) {
    this.gameRoomInvitations = this.gameRoomInvitations || {};
    if (!this.gameRoomInvitations[peerId]) {
      if (this.gameRoom) {
        this.sendMessage({ q: "game_room", rid: this.gameRoom.id }, peerId);
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
    }
  }
  onGameRoomJoin(room, peerId) {}
  onGameRoomLeave(room, peerId) {}
  onGameRoomStream(room, stream, peerId) {}
  onGameRoomMessage(room, peerId, msg) {}
}
