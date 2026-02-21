// patients/appendHistory.js
// Adiciona entrada ao histórico clínico (append-only)

const fs = require("fs");
const path = require("path");

const {
  decryptDataKey
} = require("../crypto/keyManager");

const {
  encryptData,
  decryptData
} = require("../crypto/vault");

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
 * Adiciona um registro ao histórico clínico do paciente
 */
function appendHistory({
  patientId,
  masterPassword,
  tipo,
  conteudo,
  autor
}) {
  if (!patientId || !masterPassword || !tipo || !conteudo || !autor) {
    throw new Error("Dados insuficientes para adicionar histórico.");
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

  // 3. Criar nova entrada de histórico
  const entry = {
    id: crypto.randomUUID(),
    tipo,
    conteudo,
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
    historico_id: entry.id,
    data_registro: entry.data_registro
  };
}

module.exports = {
  appendHistory
};
