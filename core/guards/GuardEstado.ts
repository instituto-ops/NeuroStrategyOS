import { ClinicalEventType } from "../events/eventTypes";
import { ClinicalState } from "../state/clinicalStates";

export class GuardEstado {
  static check(event: any, state: ClinicalState) {
    if (
      event.type === ClinicalEventType.START_SESSION &&
      state !== ClinicalState.SESSION_READY
    ) {
      throw new Error("START_SESSION fora de estado permitido.");
    }
  }
}