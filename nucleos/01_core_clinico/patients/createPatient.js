// patients/createPatient.js
// Criação segura de paciente clínico (identidade + persistência inicial)

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const {
  generateDataKey,
  encryptDataKey
} = require("../crypto/keyManager");

const {
  encryptData
} = require("../crypto/vault");

/**
 * Caminho base de armazenamento de pacientes
 */
const PATIENTS_BASE_PATH = path.join(
  __dirname,
  "..",
  "storage",
  "patients"
);

/**
 * Cria um novo paciente
 */
function createPatient({
  dados_basicos,
  queixa_inicial,
  autor,
  masterPassword
}) {
  if (!dados_basicos || !queixa_inicial || !autor || !masterPassword) {
    throw new Error("Dados insuficientes para criação do paciente.");
  }

  const patientId = crypto.randomUUID();
  const patientPath = path.join(PATIENTS_BASE_PATH, patientId);

  if (fs.existsSync(patientPath)) {
    throw new Error("Paciente já existe.");
  }

  fs.mkdirSync(patientPath, { recursive: true });

  // 1. Gerar DATA KEY
  const dataKey = generateDataKey();

  // 2. Proteger DATA KEY com senha do terapeuta
  const encryptedDataKey = encryptDataKey(dataKey, masterPassword);

  // 3. Estrutura inicial do paciente
  const patientData = {
    patient_id: patientId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    dados_basicos,
    queixa_inicial: {
      texto: queixa_inicial,
      autor,
      data_registro: new Date().toISOString()
    },
    historico: [],
    schema_version: "1.0.0"
  };

  // 4. Criptografar dados clínicos
  const encryptedPatientData = encryptData(patientData, dataKey);

  // 5. Persistir arquivos
  fs.writeFileSync(
    path.join(patientPath, "data.enc"),
    encryptedPatientData,
    { encoding: "utf8" }
  );

  fs.writeFileSync(
    path.join(patientPath, "key.enc"),
    encryptedDataKey,
    { encoding: "utf8" }
  );

  fs.writeFileSync(
    path.join(patientPath, "meta.json"),
    JSON.stringify(
      {
        patient_id: patientId,
        created_at: patientData.created_at,
        schema_version: patientData.schema_version
      },
      null,
      2
    ),
    { encoding: "utf8" }
  );

  return {
    patient_id: patientId,
    created_at: patientData.created_at
  };
}

module.exports = {
  createPatient
};
