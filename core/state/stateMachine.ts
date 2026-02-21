import { ClinicalState } from "./clinicalStates";

type TransitionTable = {
  [key in ClinicalState]?: ClinicalState[];
};

const transitions: TransitionTable = {
  [ClinicalState.SYSTEM_IDLE]: [ClinicalState.PATIENT_OPEN],
  [ClinicalState.PATIENT_OPEN]: [ClinicalState.SESSION_READY],
  [ClinicalState.SESSION_READY]: [ClinicalState.SESSION_ACTIVE],
  [ClinicalState.SESSION_ACTIVE]: [
    ClinicalState.SESSION_PAUSED,
    ClinicalState.SESSION_ENDED
  ],
  [ClinicalState.SESSION_PAUSED]: [
    ClinicalState.SESSION_ACTIVE,
    ClinicalState.SESSION_ENDED
  ],
  [ClinicalState.SESSION_ENDED]: [ClinicalState.PATIENT_OPEN]
};

export class StateMachine {
  private state: ClinicalState = ClinicalState.SYSTEM_IDLE;

  getState(): ClinicalState {
    return this.state;
  }

  transition(next: ClinicalState) {
    const allowed = transitions[this.state] || [];
    if (!allowed.includes(next)) {
      throw new Error(`Transição inválida: ${this.state} → ${next}`);
    }
    this.state = next;
  }
}