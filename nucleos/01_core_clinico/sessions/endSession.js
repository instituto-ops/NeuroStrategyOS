// sessions/endSession.js
// Encerramento formal de uma sessão clínica

const fs = require("fs");
const path = require("path");

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
 * Encerra uma sessão clínica existente
 */
function endSession({ sessionId, endedBy }) {
  if (!sessionId || !endedBy) {
    throw new Error("sessionId e endedBy são obrigatórios.");
  }

  const sessionFilePath = path.join(
    SESSIONS_BASE_PATH,
    sessionId + ".json"
  );

  if (!fs.existsSync(sessionFilePath)) {
    throw new Error("Sessão não encontrada.");
  }

  const sessionData = JSON.parse(
    fs.readFileSync(sessionFilePath, "utf8")
  );

  if (sessionData.status !== "ACTIVE") {
    throw new Error("Sessão já está encerrada ou inválida.");
  }

  sessionData.status = "TERMINATED";
  sessionData.ended_at = new Date().toISOString();
  sessionData.ended_by = endedBy;

  fs.writeFileSync(
    sessionFilePath,
    JSON.stringify(sessionData, null, 2),
    { encoding: "utf8" }
  );

  return {
    session_id: sessionId,
    ended_at: sessionData.ended_at
  };
}

module.exports = {
  endSession
};
