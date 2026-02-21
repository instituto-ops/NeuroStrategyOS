// evolution/createEvolutionEntry.js
// Criação de entrada de evolução clínica (append-only, autoral)

const fs = require("fs");
const path = require("path");

const { decryptDataKey } = require("../crypto/keyManager");
const { encryptData, decryptData } = require("../crypto/vault");

/**
 * Caminho base de armazenamento
 */
const PATIENTS_BASE_PATH = path.join(
  __dirname,
  "..",
  "storage",
  "patients"
);

/**
 * Cria uma entrada de evolução clínica no histórico do paciente
 */
function createEvolutionEntry({
  patientId,
  sessionId,
  masterPassword,
  resumo_autoral,
  trechos_referenciados = [],
  autor
}) {
  if (!patientId || !sessionId || !masterPassword || !resumo_autoral || !autor) {
    throw new Error("Dados insuficientes para evolução clínica.");
  }

  const patientPath = path.join(PATIENTS_BASE_PATH, patientId);

  if (!fs.existsSync(patientPath)) {
    throw new Error("Paciente não encontrado.");
  }

  const encryptedKeyPath = path.join(patientPath, "key.enc");
  const encryptedDataPath = path.join(patientPath, "data.enc");

  // 1. Recuperar DATA KEY
  const encryptedDataKey = fs.readFileSync(encryptedKeyPath, "utf8");
  const dataKey = decryptDataKey(encryptedDataKey, masterPassword);

  // 2. Descriptografar dados atuais
  const encryptedData = fs.readFileSync(encryptedDataPath, "utf8");
  const patientData = decryptData(encryptedData, dataKey);

  // 3. Criar entrada de evolução clínica
  const entry = {
    id: require("crypto").randomUUID(),
    tipo: "evolucao_clinica",
    session_id: sessionId,
    resumo_autoral,
    trechos_referenciados,
    autor,
    data_registro: new Date().toISOString()
  };

  // 4. Append-only
  patientData.historico.push(entry);
  patientData.updated_at = new Date().toISOString();

  // 5. Recriptografar objeto inteiro
  const updatedEncryptedData = encryptData(patientData, dataKey);

  fs.writeFileSync(
    encryptedDataPath,
    updatedEncryptedData,
    { encoding: "utf8" }
  );

  return {
    patient_id: patientId,
    evolucao_id: entry.id,
    data_registro: entry.data_registro
  };
}

module.exports = {
  createEvolutionEntry
};
