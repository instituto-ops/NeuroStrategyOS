// transcription/getBuffer.js
// Recupera o buffer de transcrição (somente memória)

const { _activeBuffers } = require("./startCapture");

/**
 * Recupera buffer de transcrição de uma sessão
 */
function getBuffer(sessionId) {
  if (!sessionId) {
    throw new Error("sessionId é obrigatório.");
  }

  const buffer = _activeBuffers.get(sessionId);

  if (!buffer) {
    throw new Error("Nenhuma captura encontrada para esta sessão.");
  }

  return buffer;
}

module.exports = {
  getBuffer
};
