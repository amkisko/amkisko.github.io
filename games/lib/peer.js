/* global Logger */

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
