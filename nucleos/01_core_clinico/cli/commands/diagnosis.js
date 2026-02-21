const { buildHypotheses } = require("../../diagnosis/buildHypotheses");
const { refutationModule } = require("../../diagnosis/refutationModule");
const { draftClinicalText } = require("../../diagnosis/draftClinicalText");

module.exports = {
  draft() {
    const h = buildHypotheses({ contexto_clinico: "Contexto CLI" });
    const r = refutationModule(h);
    console.log(draftClinicalText({
      hipoteses: h,
      refutacoes: r,
      observacoes_clinicas: "Rascunho via CLI persistente"
    }));
  }
};