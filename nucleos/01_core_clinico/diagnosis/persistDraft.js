// diagnosis/persistDraft.js
// Persistência consciente de rascunho clínico após revisão humana

const fs = require("fs");
const path = require("path");

function persistDraft({
  patientId,
  sessionId,
  texto_final,
  confirmado_por
}) {
  if (!patientId || !sessionId || !texto_final || !confirmado_por) {
    throw new Error("Confirmação humana obrigatória.");
  }

  const basePath = path.join(
    __dirname,
    "..",
    "storage",
    "drafts"
  );

  if (!fs.existsSync(basePath)) {
    fs.mkdirSync(basePath, { recursive: true });
  }

  const filePath = path.join(
    basePath,
    `${patientId}_${sessionId}_${Date.now()}.txt`
  );

  fs.writeFileSync(filePath, texto_final, "utf8");

  return {
    status: "persistido",
    confirmado_por,
    path: filePath
  };
}

module.exports = {
  persistDraft
};
