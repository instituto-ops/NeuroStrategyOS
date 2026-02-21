// support/requestSupport.js
// Orquestra solicitação de apoio cognitivo (sem persistência)

const { riskGuard } = require("./guards/riskGuard");
const { ethicalGuard } = require("./guards/ethicalGuard");

const { ericksonianAgent } = require("./agents/ericksonian");
const { zeigAgent } = require("./agents/zeig");
const { pnlAgent } = require("./agents/pnl");

function requestSupport({
  sessionId,
  agent,
  prompt,
  intent
}) {
  if (!sessionId || !agent || !prompt || !intent) {
    throw new Error("Dados insuficientes para apoio cognitivo.");
  }

  // 1. Guards
  riskGuard(prompt);
  ethicalGuard({ intent });

  // 2. Seleção do agente
  let response;

  switch (agent) {
    case "ericksonian":
      response = ericksonianAgent(prompt);
      break;
    case "zeig":
      response = zeigAgent(prompt);
      break;
    case "pnl":
      response = pnlAgent(prompt);
      break;
    default:
      throw new Error("Agente de apoio cognitivo desconhecido.");
  }

  // 3. Retorno NÃO persistido
  return {
    session_id: sessionId,
    agent,
    response,
    generated_at: new Date().toISOString()
  };
}

module.exports = {
  requestSupport
};
