import { ClinicalState } from "./clinical.states";
import { ClinicalEvent } from "./clinical.events";

/**
 * TRANSITION TABLE
 * Qualquer evento fora daqui é BLOQUEADO
 */

export const ClinicalTransitions: Record<
  ClinicalState,
  Partial<Record<ClinicalEvent, ClinicalState>>
> = {
  [ClinicalState.SYSTEM_IDLE]: {
    [ClinicalEvent.OPEN_PATIENT]: ClinicalState.PATIENT_OPEN
  },

  [ClinicalState.PATIENT_OPEN]: {
    [ClinicalEvent.CLOSE_PATIENT]: ClinicalState.SYSTEM_IDLE,
    [ClinicalEvent.PREPARE_SESSION]: ClinicalState.SESSION_READY
  },

  [ClinicalState.SESSION_READY]: {
    [ClinicalEvent.START_SESSION]: ClinicalState.SESSION_ACTIVE,
    [ClinicalEvent.CLOSE_PATIENT]: ClinicalState.SYSTEM_IDLE
  },

  [ClinicalState.SESSION_ACTIVE]: {
    [ClinicalEvent.PAUSE_SESSION]: ClinicalState.SESSION_PAUSED,
    [ClinicalEvent.END_SESSION]: ClinicalState.SESSION_ENDED
  },

  [ClinicalState.SESSION_PAUSED]: {
    [ClinicalEvent.RESUME_SESSION]: ClinicalState.SESSION_ACTIVE,
    [ClinicalEvent.END_SESSION]: ClinicalState.SESSION_ENDED
  },

  [ClinicalState.SESSION_ENDED]: {
    [ClinicalEvent.CLOSE_PATIENT]: ClinicalState.SYSTEM_IDLE
  },

  [ClinicalState.CLINICAL_ERROR]: {
    [ClinicalEvent.RESET]: ClinicalState.SYSTEM_IDLE
  }
};
