// crypto/vault.js
// Cofre clínico: criptografia e descriptografia de dados

const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

/**
 * Criptografa dados com a DATA KEY
 */
function encryptData(dataObject, dataKey) {
  if (typeof dataObject !== "object" || dataObject === null) {
    throw new Error("encryptData espera um objeto válido.");
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, dataKey, iv);

  const json = JSON.stringify(dataObject);
  const encrypted = Buffer.concat([
    cipher.update(json, "utf8"),
    cipher.final()
  ]);

  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

/**
 * Descriptografa dados com a DATA KEY
 */
function decryptData(payload, dataKey) {
  const buffer = Buffer.from(payload, "base64");

  const iv = buffer.subarray(0, IV_LENGTH);
  const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + 16);
  const encrypted = buffer.subarray(IV_LENGTH + 16);

  const decipher = crypto.createDecipheriv(ALGORITHM, dataKey, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);

  return JSON.parse(decrypted.toString("utf8"));
}

module.exports = {
  encryptData,
  decryptData
};
