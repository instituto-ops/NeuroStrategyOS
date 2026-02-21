import { NACState } from '../state/nac.states';
import { NAC_TRANSITIONS } from '../state/nac.transitions';

export function guardNACState(currentState: NACState, nextEvent: string) {
  const allowedTransitions = (NAC_TRANSITIONS as any)[currentState] || [];
  if (!allowedTransitions.includes(nextEvent)) {
    return { allowed: false, reason: 'Transição não permitida para o estado atual' };
  }
  return { allowed: true };
}
