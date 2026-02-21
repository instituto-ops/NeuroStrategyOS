// diagnosis/refutationModule.js
// Gera contra-argumentos para cada hipótese (anti viés)

function refutationModule(hipoteses = []) {
  if (!Array.isArray(hipoteses)) {
    throw new Error("Hipóteses inválidas.");
  }

  return hipoteses.map(h => ({
    hipotese: h.hipotese,
    por_que_pode_nao_ser: [
      "Sintomas podem ser situacionais e reativos",
      "Falta de duração mínima para critérios formais",
      "Outros diagnósticos diferenciais ainda não explorados"
    ]
  }));
}

module.exports = {
  refutationModule
};
