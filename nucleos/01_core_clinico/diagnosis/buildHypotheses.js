// diagnosis/buildHypotheses.js
// Gera hipóteses diagnósticas provisórias (não decisórias)

function buildHypotheses({ contexto_clinico }) {
  if (!contexto_clinico) {
    throw new Error("Contexto clínico é obrigatório.");
  }

  return [
    {
      hipotese: "Transtorno de Ansiedade Generalizada (provisório)",
      base: "Relatos recorrentes de preocupação excessiva e tensão",
      nivel_confianca: "baixo"
    },
    {
      hipotese: "Insônia secundária ao estresse",
      base: "Dificuldade de iniciar e manter o sono",
      nivel_confianca: "baixo"
    }
  ];
}

module.exports = {
  buildHypotheses
};
