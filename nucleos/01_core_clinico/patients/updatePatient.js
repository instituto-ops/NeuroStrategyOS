// patients/updatePatient.js
// Atualização controlada de dados administrativos do paciente

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
 * Atualiza apenas dados administrativos do paciente
 */
function updatePatient({
  patientId,
  masterPassword,
  novos_dados_basicos
}) {
  if (!patientId || !masterPassword || !novos_dados_basicos) {
    throw new Error("Dados insuficientes para atualização.");
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

  // 3. Atualizar SOMENTE dados administrativos
  patientData.dados_basicos = {
    ...patientData.dados_basicos,
    ...novos_dados_basicos
  };

  patientData.updated_at = new Date().toISOString();

  // 4. Recriptografar objeto inteiro
  const updatedEncryptedData = encryptData(patientData, dataKey);

  fs.writeFileSync(
    encryptedDataPath,
    updatedEncryptedData,
    { encoding: "utf8" }
  );

  return {
    patient_id: patientId,
    updated_at: patientData.updated_at
  };
}

module.exports = {
  updatePatient
};
