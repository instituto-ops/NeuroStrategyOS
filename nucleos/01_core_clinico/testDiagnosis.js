const { buildHypotheses } = require("./diagnosis/buildHypotheses");
const { refutationModule } = require("./diagnosis/refutationModule");
const { draftClinicalText } = require("./diagnosis/draftClinicalText");

const hipoteses = buildHypotheses({
  contexto_clinico: "Paciente relata ansiedade e insônia."
});

const refutacoes = refutationModule(hipoteses);

const rascunho = draftClinicalText({
  hipoteses,
  refutacoes,
  observacoes_clinicas:
    "Paciente demonstra boa capacidade reflexiva e adesão ao processo."
});

console.log(rascunho);
