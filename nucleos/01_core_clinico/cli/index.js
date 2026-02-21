// CLI Persistente (REPL) — NeuroStrategy OS
const readline = require("readline");

const patient = require("./commands/patient");
const session = require("./commands/session");
const transcription = require("./commands/transcription");
const evolution = require("./commands/evolution");
const support = require("./commands/support");
const diagnosis = require("./commands/diagnosis");

const domains = { patient, session, transcription, evolution, support, diagnosis };

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "NS> "
});

console.log("NeuroStrategy OS — CLI Persistente");
console.log("Digite: <dominio> <acao> [args]");
rl.prompt();

rl.on("line", (line) => {
  const [domain, action, ...args] = line.trim().split(" ");
  try {
    if (!domains[domain] || typeof domains[domain][action] !== "function") {
      console.log("Comando inválido.");
    } else {
      domains[domain][action](args);
    }
  } catch (e) {
    console.error("Erro:", e.message);
  }
  rl.prompt();
});