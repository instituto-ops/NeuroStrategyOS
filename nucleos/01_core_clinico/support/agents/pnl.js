// support/agents/pnl.js
// Estilo PNL (consultivo)

function pnlAgent(prompt) {
  return `
Observe a linguagem utilizada pelo paciente e os mapas representacionais.
Considere intervenções que promovam reestruturação cognitiva
e ampliação de opções comportamentais.
  
Pergunta-base: "Como você sabe que isso é verdade?"
`.trim();
}

module.exports = {
  pnlAgent
};
