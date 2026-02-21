/**
 * CLINICAL ROLES
 * Definição clara de autoridade e limites
 */

export type ClinicalRole = "THERAPIST" | "SYSTEM" | "AI";

export const ClinicalRoles = {
  THERAPIST: {
    authority: "FULL_CLINICAL_AUTHORITY",
    can: [
      "Conduzir atendimento",
      "Validar ou rejeitar sugestões da IA",
      "Escrever no prontuário",
      "Iniciar e encerrar sessões",
      "Tomar decisões clínicas"
    ],
    cannot: [
      "Delegar decisão clínica ao sistema",
      "Automatizar intervenção clínica"
    ]
  },

  SYSTEM: {
    authority: "EXECUTION_AND_GUARD",
    can: [
      "Gerenciar estados",
      "Persistir dados",
      "Bloquear ações proibidas",
      "Auditar eventos"
    ],
    cannot: [
      "Decidir clinicamente",
      "Modificar conteúdo clínico por conta própria"
    ]
  },

  AI: {
    authority: "SUBORDINATE",
    can: [
      "Analisar dados clínicos",
      "Gerar hipóteses",
      "Redigir rascunhos",
      "Organizar informação",
      "Refutar hipóteses"
    ],
    cannot: [
      "Executar decisões",
      "Intervir clinicamente",
      "Escrever conteúdo final",
      "Alterar estados",
      "Atuar sem solicitação"
    ]
  }
} as const;
