import { ClinicalState } from "./clinical.states";
import { ClinicalEvent } from "./clinical.events";

/**
 * GUARDS — BLOQUEIAM, NUNCA DECIDEM
 */

export const ClinicalGuards = {
  isTransitionAllowed(
    current: ClinicalState,
    event: ClinicalEvent,
    transitions: Record<string, any>
  ): boolean {
    return Boolean(transitions[current]?.[event]);
  },

  isSessionActive(state: ClinicalState): boolean {
    return state === ClinicalState.SESSION_ACTIVE;
  },

  blockIfSessionActive(
    state: ClinicalState,
    forbiddenEvents: ClinicalEvent[]
  ): boolean {
    return !(state === ClinicalState.SESSION_ACTIVE && forbiddenEvents.length > 0);
  }
};
