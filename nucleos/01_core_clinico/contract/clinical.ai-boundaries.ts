/**
 * AI BOUNDARIES — CLINICAL CORE
 * Define exatamente onde a IA pode atuar
 */

export const ClinicalAIBoundaries = {
  allowedZones: {
    analysis: {
      description: "Área de análise e estudo de caso",
      aiAccess: "READ_WRITE_SUGGESTION_ONLY"
    },

    draft: {
      description: "Rascunhos clínicos não oficiais",
      aiAccess: "WRITE_REQUIRES_VALIDATION"
    },

    transcription: {
      description: "Transcrição automática da sessão",
      aiAccess: "WRITE_RAW_ONLY"
    }
  },

  forbiddenZones: {
    officialRecord: {
      description: "Prontuário clínico oficial",
      aiAccess: "NO_ACCESS"
    },

    stateControl: {
      description: "Máquina de estados clínicos",
      aiAccess: "NO_ACCESS"
    }
  },

  validation: {
    requiredAction: "THERAPIST_CONFIRMATION",
    method: "EXPLICIT_UI_EVENT",
    failure: "DISCARD_AI_OUTPUT"
  },

  audit: {
    logAllAIOutputs: true,
    logValidationEvents: true
  }
} as const;
