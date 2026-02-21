// transcription/appendChunk.js
// Adiciona trecho de transcrição ao buffer em memória

const { _activeBuffers } = require("./startCapture");

/**
 * Adiciona um chunk de transcrição
 */
function appendChunk({
  sessionId,
  text,
  speaker = "unknown"
}) {
  if (!sessionId || !text) {
    throw new Error("sessionId e text são obrigatórios.");
  }

  const buffer = _activeBuffers.get(sessionId);

  if (!buffer || buffer.status !== "ACTIVE") {
    throw new Error("Captura não ativa para esta sessão.");
  }

  const entry = {
    index: buffer.chunks.length + 1,
    text,
    speaker,
    timestamp: new Date().toISOString()
  };

  buffer.chunks.push(entry);

  return {
    session_id: sessionId,
    chunk_index: entry.index
  };
}

module.exports = {
  appendChunk
};
