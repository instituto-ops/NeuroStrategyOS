// sessions/getSession.js
// Leitura segura de uma sessão clínica

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
 * Recupera uma sessão pelo ID
 */
function getSession(sessionId) {
  if (!sessionId) {
    throw new Error("sessionId é obrigatório.");
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

  return sessionData;
}

module.exports = {
  getSession
};
