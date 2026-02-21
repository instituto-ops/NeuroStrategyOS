// sessions/startSession.js
// Início formal de uma sessão clínica

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

/**
 * Caminho base de armazenamento de sessões
 */
const SESSIONS_BASE_PATH = path.join(
  __dirname,
  "..",
  "storage",
  "sessions"
);

/**
 * Inicia uma nova sessão clínica
 */
function startSession({ patientId, createdBy }) {
  if (!patientId || !createdBy) {
    throw new Error("patientId e createdBy são obrigatórios.");
  }

  const sessionId = crypto.randomUUID();
  const sessionPath = path.join(SESSIONS_BASE_PATH, sessionId);

  if (!fs.existsSync(SESSIONS_BASE_PATH)) {
    fs.mkdirSync(SESSIONS_BASE_PATH, { recursive: true });
  }

  const sessionData = {
    session_id: sessionId,
    patient_id: patientId,
    started_at: new Date().toISOString(),
    ended_at: null,
    status: "ACTIVE",
    created_by: createdBy,
    schema_version: "1.0.0"
  };

  fs.writeFileSync(
    path.join(sessionPath + ".json"),
    JSON.stringify(sessionData, null, 2),
    { encoding: "utf8" }
  );

  return {
    session_id: sessionId,
    started_at: sessionData.started_at
  };
}

module.exports = {
  startSession
};
