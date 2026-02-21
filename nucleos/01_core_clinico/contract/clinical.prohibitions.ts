/**
 * CLINICAL PROHIBITIONS — ABSOLUTE
 * Tudo que está aqui é fisicamente bloqueado
 */

export const ClinicalProhibitions = {
  ai: [
    "Decidir conduta clínica",
    "Executar intervenção terapêutica",
    "Encerrar ou iniciar atendimento",
    "Alterar prontuário sem validação",
    "Escrever diretamente no registro oficial",
    "Modificar estados clínicos",
    "Treinar agentes durante atendimento",
    "Acessar governança do NAC"
  ],

  system: [
    "Executar ação clínica implícita",
    "Inferir decisão do terapeuta",
    "Persistir dados sem evento explícito",
    "Misturar contexto clínico e cognitivo",
    "Ignorar máquina de estados"
  ],

  ui: [
    "Tomar decisões clínicas",
    "Executar lógica clínica",
    "Aceitar ações fora do estado permitido"
  ],

  enforcement: {
    mode: "HARD_BLOCK",
    violationResponse: "ABORT_EVENT_AND_LOG"
  }
} as const;
