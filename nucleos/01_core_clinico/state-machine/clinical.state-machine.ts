import { ClinicalState } from "./clinical.states";
import { ClinicalEvent } from "./clinical.events";
import { ClinicalTransitions } from "./clinical.transitions";
import { ClinicalGuards } from "./clinical.guards";

/**
 * STATE MACHINE — FONTE ÚNICA DE VERDADE
 */

export class ClinicalStateMachine {
  private state: ClinicalState = ClinicalState.SYSTEM_IDLE;

  getState(): ClinicalState {
    return this.state;
  }

  dispatch(event: ClinicalEvent): ClinicalState {
    const currentState = this.state;

    if (
      !ClinicalGuards.isTransitionAllowed(
        currentState,
        event,
        ClinicalTransitions
      )
    ) {
      console.warn(
        `[CLINICAL BLOCK] Evento ${event} não permitido em ${currentState}`
      );
      return currentState;
    }

    const nextState = ClinicalTransitions[currentState][event];

    if (!nextState) {
      console.error("[CLINICAL ERROR] Transição inválida");
      this.state = ClinicalState.CLINICAL_ERROR;
      return this.state;
    }

    this.state = nextState;
    return this.state;
  }
}
