// patients/getPatient.js
// Leitura segura de paciente clínico
// Nenhuma persistência, nenhuma modificação, apenas acesso autorizado

const fs = require("fs");
const path = require("path");

const {
  decryptDataKey
} = require("../crypto/keyManager");

const {
  decryptData
} = require("../crypto/vault");

/**
 * Caminho base onde os pacientes estão armazenados
 */
const PATIENTS_BASE_PATH = path.join(
  __dirname,
  "..",
  "storage",
  "patients"
);

/**
 * Recupera os dados completos de um paciente
 */
function getPatient(patientId, masterPassword) {
  if (!patientId || !masterPassword) {
    throw new Error("patientId e masterPassword são obrigatórios.");
  }

  const patientPath = path.join(PATIENTS_BASE_PATH, patientId);

  if (!fs.existsSync(patientPath)) {
    throw new Error("Paciente não encontrado.");
  }

  const encryptedKeyPath = path.join(patientPath, "key.enc");
  const encryptedDataPath = path.join(patientPath, "data.enc");

  if (!fs.existsSync(encryptedKeyPath) || !fs.existsSync(encryptedDataPath)) {
    throw new Error("Dados do paciente estão incompletos ou corrompidos.");
  }

  // 1. Recuperar DATA KEY usando a senha do terapeuta
  const encryptedDataKey = fs.readFileSync(encryptedKeyPath, "utf8");
  const dataKey = decryptDataKey(encryptedDataKey, masterPassword);

  // 2. Descriptografar dados clínicos
  const encryptedData = fs.readFileSync(encryptedDataPath, "utf8");
  const patientData = decryptData(encryptedData, dataKey);

  return patientData;
}

module.exports = {
  getPatient
};
