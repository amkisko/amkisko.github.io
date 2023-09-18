/* global Logger, Peer */

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
