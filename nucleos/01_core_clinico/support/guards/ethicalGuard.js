// support/guards/ethicalGuard.js
// Impede uso indevido do apoio cognitivo

function ethicalGuard({ intent }) {
  if (!intent) {
    throw new Error("Intenção clínica não declarada.");
  }

  if (
    intent.includes("diagnosticar") ||
    intent.includes("prescrever") ||
    intent.includes("decidir")
  ) {
    throw new Error(
      "Apoio cognitivo não pode diagnosticar, prescrever ou decidir."
    );
  }

  return true;
}

module.exports = {
  ethicalGuard
};
