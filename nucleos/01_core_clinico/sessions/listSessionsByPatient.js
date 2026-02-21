// sessions/listSessionsByPatient.js
// Lista todas as sessões associadas a um paciente

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
 * Lista sessões associadas a um paciente
 */
function listSessionsByPatient(patientId) {
  if (!patientId) {
    throw new Error("patientId é obrigatório.");
  }

  if (!fs.existsSync(SESSIONS_BASE_PATH)) {
    return [];
  }

  const files = fs.readdirSync(SESSIONS_BASE_PATH);

  const sessions = files
    .filter(file => file.endsWith(".json"))
    .map(file => {
      const data = JSON.parse(
        fs.readFileSync(
          path.join(SESSIONS_BASE_PATH, file),
          "utf8"
        )
      );
      return data;
    })
    .filter(session => session.patient_id === patientId)
    .sort(
      (a, b) =>
        new Date(a.started_at) - new Date(b.started_at)
    );

  return sessions;
}

module.exports = {
  listSessionsByPatient
};
