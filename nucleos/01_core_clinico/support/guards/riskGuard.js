// support/guards/riskGuard.js
// Bloqueia apoio cognitivo em situações de risco

const RISK_KEYWORDS = [
  "suicídio",
  "matar",
  "morrer",
  "me matar",
  "me ferir",
  "violência",
  "agressão"
];

function riskGuard(contextText = "") {
  const normalized = contextText.toLowerCase();

  const detected = RISK_KEYWORDS.some(keyword =>
    normalized.includes(keyword)
  );

  if (detected) {
    throw new Error(
      "Apoio cognitivo bloqueado: possível risco clínico detectado."
    );
  }

  return true;
}

module.exports = {
  riskGuard
};
