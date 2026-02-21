// crypto/keyManager.js
// Gerenciamento seguro de chaves criptográficas clínicas

const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100_000;
const DIGEST = "sha256";

/**
 * Deriva a MASTER KEY a partir da senha do terapeuta
 */
function deriveMasterKey(password, salt) {
  return crypto.pbkdf2Sync(
    password,
    salt,
    ITERATIONS,
    KEY_LENGTH,
    DIGEST
  );
}

/**
 * Gera uma nova DATA KEY
 */
function generateDataKey() {
  return crypto.randomBytes(KEY_LENGTH);
}

/**
 * Protege a DATA KEY com a MASTER KEY
 */
function encryptDataKey(dataKey, password) {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const masterKey = deriveMasterKey(password, salt);

  const cipher = crypto.createCipheriv(ALGORITHM, masterKey, iv);
  const encrypted = Buffer.concat([
    cipher.update(dataKey),
    cipher.final()
  ]);

  const authTag = cipher.getAuthTag();

  return Buffer.concat([salt, iv, authTag, encrypted]).toString("base64");
}

/**
 * Recupera a DATA KEY a partir da senha
 */
function decryptDataKey(encryptedKey, password) {
  const buffer = Buffer.from(encryptedKey, "base64");

  const salt = buffer.subarray(0, SALT_LENGTH);
  const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = buffer.subarray(
    SALT_LENGTH + IV_LENGTH,
    SALT_LENGTH + IV_LENGTH + 16
  );
  const encrypted = buffer.subarray(SALT_LENGTH + IV_LENGTH + 16);

  const masterKey = deriveMasterKey(password, salt);
  const decipher = crypto.createDecipheriv(ALGORITHM, masterKey, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);
}

module.exports = {
  generateDataKey,
  encryptDataKey,
  decryptDataKey
};
