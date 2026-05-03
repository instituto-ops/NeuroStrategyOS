/**
 * agentd/src/fsm/transitions.ts
 * 
 * Matriz declarativa de transições válidas.
 * Se a combinação (estado, evento) não está na matriz, a transição é inválida.
 */

import { State, EventType } from './states.js';

/** Matriz: dado um estado e um evento, qual é o próximo estado? */
export const transitionMatrix: Record<State, Partial<Record<EventType, State>>> = {
  [State.IDLE]: {
    [EventType.UserInput]: State.DIALOGUE,
    [EventType.Reset]: State.IDLE,
  },
  [State.DIALOGUE]: {
    [EventType.UserInput]: State.DIALOGUE, // múltiplas trocas
    [EventType.DiagnosisDone]: State.DIAGNOSIS,
    [EventType.PlanReady]: State.PLANNING, // fast-track: diálogo direto para plano
    [EventType.Reset]: State.IDLE,
  },
  [State.DIAGNOSIS]: {
    [EventType.PlanReady]: State.PLANNING,
    [EventType.UserInput]: State.DIALOGUE, // volta para diálogo se necessário
    [EventType.Reset]: State.IDLE,
  },
  [State.PLANNING]: {
    [EventType.ApprovalGranted]: State.EXECUTING,
    [EventType.ApprovalDenied]: State.DIALOGUE,
    [EventType.UserInput]: State.DIALOGUE,
    [EventType.Reset]: State.IDLE,
  },
  [State.EXECUTING]: {
    [EventType.ExecutionStep]: State.EXECUTING, // micro-etapas
    [EventType.ExecutionDone]: State.TESTING,
    [EventType.ReportEmitted]: State.AWAITING_APPROVAL, // ação que requer aprovação
    [EventType.Reset]: State.IDLE,
  },
  [State.TESTING]: {
    [EventType.TestResult]: State.REPORTING,
    [EventType.ExecutionStep]: State.EXECUTING, // re-execução após falha
    [EventType.Reset]: State.IDLE,
  },
  [State.REPORTING]: {
    [EventType.ReportEmitted]: State.IDLE, // ciclo completo
    [EventType.UserInput]: State.DIALOGUE, // novo ciclo
    [EventType.Reset]: State.IDLE,
  },
  [State.AWAITING_APPROVAL]: {
    [EventType.ApprovalGranted]: State.EXECUTING, // resume
    [EventType.ApprovalDenied]: State.IDLE, // abort
    [EventType.Reset]: State.IDLE,
  },
};

/**
 * Resolve a transição. Retorna o próximo estado ou null se inválida.
 */
export function resolveTransition(current: State, event: EventType): State | null {
  return transitionMatrix[current]?.[event] ?? null;
}
