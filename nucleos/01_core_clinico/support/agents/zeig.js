// support/agents/zeig.js
// Estilo Jeffrey Zeig (estratégico)

function zeigAgent(prompt) {
  return `
Considere o momento atual do tratamento e o padrão de manutenção.
Avalie intervenções que ampliem escolhas e flexibilidade,
sem reforçar o problema central.
  
Pergunta-base: "O que acontece se isso continuar exatamente igual?"
`.trim();
}

module.exports = {
  zeigAgent
};
