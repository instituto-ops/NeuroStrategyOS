// support/agents/ericksonian.js
// Estilo Ericksoniano (consultivo)

function ericksonianAgent(prompt) {
  return `
Considere abordar o paciente de forma indireta, utilizando metáforas
e permissões sutis, respeitando o ritmo interno e a experiência subjetiva.
Evite confrontos diretos; convide à exploração.
  
Pergunta-base: "O que nessa experiência já está tentando mudar por conta própria?"
`.trim();
}

module.exports = {
  ericksonianAgent
};
