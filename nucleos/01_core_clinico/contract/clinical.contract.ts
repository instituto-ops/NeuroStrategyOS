/**
 * CLINICAL CONTRACT — NEUROSTRATEGY OS
 * Núcleo Clínico com IA ativa, limitada e subordinada
 *
 * Este arquivo define o contrato canônico do atendimento clínico.
 * Nenhuma lógica clínica pode existir fora deste contrato.
 */

export const ClinicalContract = {
  systemName: "NeuroStrategy OS",
  clinicalCore: "HipnoLawrence",

  principles: [
    "O sistema nunca decide clinicamente",
    "O terapeuta é a autoridade final",
    "Toda ação clínica é explícita",
    "A IA apenas propõe, nunca executa",
    "Nada é escrito sem validação humana",
    "Estados clínicos são canônicos",
    "O que não está permitido é proibido"
  ],

  definitions: {
    clinicalAct: "Qualquer ação que impacte diretamente o cuidado do paciente",
    clinicalRecord: "Registro oficial que compõe o prontuário",
    aiSuggestion: "Conteúdo gerado pela IA que exige validação humana explícita",
    humanValidation: "Ato consciente do terapeuta ao aceitar ou rejeitar uma sugestão"
  },

  authority: {
    finalDecision: "THERAPIST",
    systemRole: "EXECUTION_AND_GUARD",
    aiRole: "SUBORDINATE_COGNITIVE_ASSISTANT"
  },

  validationRule: {
    rule: "Nenhuma escrita clínica é válida sem ação explícita do terapeuta",
    enforcement: "BLOCK_AND_AUDIT"
  }
} as const;
