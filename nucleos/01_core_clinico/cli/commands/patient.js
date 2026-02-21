const { createPatient } = require("../../patients/createPatient");
const { getPatient } = require("../../patients/getPatient");
const { updatePatient } = require("../../patients/updatePatient");

module.exports = {
  create() {
    console.log(createPatient({
      dados_basicos: { nome: "Paciente CLI" },
      queixa_inicial: "Criado via CLI",
      autor: "CLI",
      masterPassword: "senha_forte_de_teste"
    }));
  },
  get([id]) {
    console.log(getPatient(id, "senha_forte_de_teste"));
  },
  update([id, ...rest]) {
    console.log(updatePatient({
      patientId: id,
      masterPassword: "senha_forte_de_teste",
      novos_dados_basicos: { contato: rest.join(" ") }
    }));
  }
};