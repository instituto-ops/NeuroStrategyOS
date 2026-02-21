const { startCapture } = require("../../transcription/startCapture");
const { appendChunk } = require("../../transcription/appendChunk");
const { stopCapture } = require("../../transcription/stopCapture");
const { getBuffer } = require("../../transcription/getBuffer");

module.exports = {
  start([sessionId]) {
    console.log(startCapture(sessionId));
  },
  add([sessionId, ...text]) {
    console.log(appendChunk({ sessionId, text: text.join(" "), speaker: "cli" }));
  },
  show([sessionId]) {
    console.log(getBuffer(sessionId));
  },
  stop([sessionId]) {
    console.log(stopCapture(sessionId));
  }
};