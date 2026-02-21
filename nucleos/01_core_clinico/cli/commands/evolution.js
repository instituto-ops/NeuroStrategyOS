const { createEvolutionEntry } = require("../../evolution/createEvolutionEntry");

module.exports = {
  add([patientId, sessionId, ...text]) {
    console.log(createEvolutionEntry({
      patientId,
      sessionId,
      masterPassword: "senha_forte_de_teste",
      resumo_autoral: text.join(" "),
      autor: "CLI"
    }));
  }
};