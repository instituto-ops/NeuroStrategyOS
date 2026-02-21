// diagnosis/draftClinicalText.js
// Cria rascunho clínico para revisão humana

function draftClinicalText({
  hipoteses,
  refutacoes,
  observacoes_clinicas
}) {
  if (!hipoteses || !refutacoes || !observacoes_clinicas) {
    throw new Error("Dados insuficientes para rascunho.");
  }

  return `
RASCUNHO CLÍNICO — NÃO FINAL

Hipóteses Consideradas:
${hipoteses.map(h => `- ${h.hipotese} (confiança ${h.nivel_confianca})`).join("\n")}

Contra-argumentos:
${refutacoes.map(r => `- ${r.hipotese}: ${r.por_que_pode_nao_ser.join("; ")}`).join("\n")}

Observações do Terapeuta:
${observacoes_clinicas}

Este texto requer revisão humana antes de qualquer uso oficial.
`.trim();
}

module.exports = {
  draftClinicalText
};
