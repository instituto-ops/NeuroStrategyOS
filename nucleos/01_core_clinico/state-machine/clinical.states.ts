/**
 * CLINICAL STATES — CANÔNICOS
 * Nenhum estado implícito é permitido
 */

export enum ClinicalState {
  SYSTEM_IDLE = "SYSTEM_IDLE",          // nenhum paciente aberto
  PATIENT_OPEN = "PATIENT_OPEN",        // prontuário aberto
  SESSION_READY = "SESSION_READY",      // pronto para iniciar atendimento
  SESSION_ACTIVE = "SESSION_ACTIVE",    // atendimento em andamento
  SESSION_PAUSED = "SESSION_PAUSED",    // atendimento pausado
  SESSION_ENDED = "SESSION_ENDED",      // atendimento encerrado
  CLINICAL_ERROR = "CLINICAL_ERROR"     // falha controlada
}
