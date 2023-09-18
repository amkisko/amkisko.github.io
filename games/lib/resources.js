class Resources {
  static getEmojiList() {
    return [
      "🐶",
      "🐱",
      "🐭",
      "🐹",
      "🐰",
      "🦊",
      "🐻",
      "🐼",
      "🐨",
      "🐯",
      "🍏",
      "🍎",
      "🍐",
      "🍊",
      "🍋",
      "🍌",
      "🍉",
      "🍇",
      "🍓",
      "🍈",
      "🍄",
      "🚗",
      "🚕",
      "🚙",
      "🚌",
      "🚎",
      "🏎️",
      "🚓",
      "🚑",
      "🚒",
      "🚐",
      "🏠",
      "🏡",
      "🏘️",
      "🏚️",
      "🏢",
      "🏬",
      "🏣",
      "🏤",
      "🏥",
      "🏦",
    ];
  }
  static getRandomEmojiIdx() {
    return Math.floor(Math.random() * Resources.getEmojiList().length);
  }
  static getEmojiByIdx(idx) {
    return Resources.getEmojiList()[idx];
  }
}
