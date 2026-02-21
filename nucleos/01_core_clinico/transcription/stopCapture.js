// transcription/stopCapture.js
// Encerra captura de transcrição (buffer permanece acessível)

const { _activeBuffers } = require("./startCapture");

/**
 * Encerra a captura de transcrição
 */
function stopCapture(sessionId) {
  if (!sessionId) {
    throw new Error("sessionId é obrigatório.");
  }

  const buffer = _activeBuffers.get(sessionId);

  if (!buffer || buffer.status !== "ACTIVE") {
    throw new Error("Captura não ativa ou já encerrada.");
  }

  buffer.status = "STOPPED";
  buffer.ended_at = new Date().toISOString();

  return {
    session_id: sessionId,
    status: "STOPPED"
  };
}

module.exports = {
  stopCapture
};
