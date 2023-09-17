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

class Peer {
  constructor({ room, id }) {
    this.room = room;
    this.id = id;
    this.log = Logger.getLog({
      prefix: `peer#${this.id}`,
      context: this.room.context,
    });
    this.log("new peer", this.id);
    this.state = {};
    this.lastMessage = null;
    this.lastMessageReceivedAt = 0;
  }
  receivedMessage(msg) {
    this.lastMessage = msg;
    this.lastMessageReceivedAt = this.room.time;
  }
  onMessage(callback) {
    this.room.getMessage((msg, peerId) => {
      if (peerId === this.id) {
        callback(msg);
      }
    });
  }
}

class Room {
  trackerUrls;
  rtcConfig = {
    iceServers: [
      {
        urls: "stun:openrelay.metered.ca:80",
      },
      {
        urls: "turn:openrelay.metered.ca:80",
        username: "openrelayproject",
        credential: "openrelayproject",
      },
      {
        urls: "turn:openrelay.metered.ca:443",
        username: "openrelayproject",
        credential: "openrelayproject",
      },
      {
        urls: "turn:openrelay.metered.ca:443?transport=tcp",
        username: "openrelayproject",
        credential: "openrelayproject",
      },
    ],
  };
  constructor({ id = null, appId, context, seed = "main" }) {
    this.context = context;
    this.appId = appId;
    this.time = Date.now();
    this.timer = setInterval(() => {
      if (!this) {
        clearInterval(this.timer);
        return false;
      }
      if (this.time) {
        this.time += 1000;
      }
    }, 1000);

    if (id) {
      this.id = id;
    } else {
      window.roomSeeds = window.roomSeeds || {};
      window.roomSeeds[seed] = (window.roomSeeds[seed] || 0) + 1;
      const roomSeed = window.roomSeeds[seed];
      this.id = `game#${seed}#${roomSeed}`;
    }

    this.log = Logger.getLog({
      prefix: `room#${this.id}`,
      context: this.context,
    });

    this.log("joining room", appId, this.id);
    this.room = window.trysteroJoinRoom(
      {
        appId: btoa(appId),
        trackerUrls: this.trackerUrls,
        trackerRedundancy: 4,
        rtcConfig: this.rtcConfig,
      },
      btoa(this.id),
    );
    this.peers = {};
    this.addPeer = (peerId) => {
      if (this.peers[peerId]) {
        return;
      }
      this.log("peer joined", this.id, peerId);
      this.peers[peerId] = new Peer({ room: this, id: peerId });
    };
    this.roomCallbacks = {
      peerJoin: () => {},
      peerLeave: () => {},
      peerStream: () => {},
      peerMessage: () => {},
    };
    this.room.onPeerJoin((peerId) => {
      this.addPeer(peerId);
      this.roomCallbacks.peerJoin(peerId);
    });
    this.room.onPeerLeave((peerId) => {
      this.log("peer left", this.id, peerId);
      delete this.peers[peerId];
      this.roomCallbacks.peerLeave(peerId);
    });
    this.room.onPeerStream((stream, peerId) => {
      this.addPeer(peerId);
      this.log("peer stream", this.id, peerId);
      this.peers[peerId].stream = stream;
      this.roomCallbacks.peerStream(stream, peerId);
    });
    const [sendMsg, getMsg] = this.room.makeAction("msg");
    this.sendMessage = sendMsg;
    this.getMessage = getMsg;
    getMsg((msg, peerId) => {
      this.addPeer(peerId);
      this.log("peer message", this.id, peerId, JSON.stringify(msg));
      this.peers[peerId].receivedMessage(msg);
      this.roomCallbacks.peerMessage(msg, peerId);
    });
  }
  get connected() {
    return !!this.room;
  }
  onJoin(callback) {
    this.roomCallbacks.peerJoin = (peerId) => callback(this, peerId);
  }
  onLeave(callback) {
    this.roomCallbacks.peerLeave = (peerId) => callback(this, peerId);
  }
  onStream(callback) {
    this.roomCallbacks.peerStream = (stream, peerId) =>
      callback(this, stream, peerId);
  }
  onMessage(callback) {
    this.roomCallbacks.peerMessage = (msg, peerId) =>
      callback(this, peerId, msg);
  }
}

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
  onRoomJoin(room, peerId) {
    if (this.gameRoom) {
      this.sendMessage({ q: "game_room", rid: this.gameRoom.id }, peerId);
    } else {
      const decision = this.resolveDecision({ peerId, force: true }).value;
      this.sendMessage({ q: "new_game_room", d: decision }, peerId);
    }
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
      this.gameRoom.room.leave();
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
  onRoomMessage(room, peerId, msg) {
    if (msg.q === "new_game_room") {
      const decisionValue = this.resolveDecision({ peerId }).value;
      if (msg.d === decisionValue) {
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
    } else if (msg.q === "game_room") {
      const { room: gameRoom, status } = this.resolveGameRoom({ id: msg.rid });
      if (status === "accepted") {
        this.gameRoom.time = msg.ts;
      }
    }
  }
  onGameRoomJoin(room, peerId) {}
  onGameRoomLeave(room, peerId) {}
  onGameRoomStream(room, stream, peerId) {}
  onGameRoomMessage(room, peerId, msg) {}
}

addEventListener("load", function () {
  Promise.resolve().then(function () {
    window.app = new Application(this);
    window.app.init();
  });
});
