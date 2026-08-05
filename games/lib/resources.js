/*
 * © Andrei Makarov / amkisko
 * Licensed under CC BY 4.0: https://creativecommons.org/licenses/by/4.0/
 * SPDX-License-Identifier: CC-BY-4.0
 */

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
