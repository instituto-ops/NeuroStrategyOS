// transcription/startCapture.js
// Inicia captura de transcrição em memória

const activeBuffers = new Map();

/**
 * Inicia a captura de transcrição para uma sessão
 */
function startCapture(sessionId) {
  if (!sessionId) {
    throw new Error("sessionId é obrigatório.");
  }

  if (activeBuffers.has(sessionId)) {
    throw new Error("Captura já ativa para esta sessão.");
  }

  activeBuffers.set(sessionId, {
    session_id: sessionId,
    started_at: new Date().toISOString(),
    status: "ACTIVE",
    chunks: []
  });

  return {
    session_id: sessionId,
    status: "ACTIVE"
  };
}

module.exports = {
  startCapture,
  _activeBuffers: activeBuffers // exposto apenas para uso interno controlado
};
