/**
 * agentd/src/fsm/machine.ts
 * 
 * FSM engine — dispatch, persist, emit.
 * Rejeita transições inválidas. Serializa por sessionId.
 */

import { State, EventType } from './states.js';
import { resolveTransition } from './transitions.js';
import { persistState, loadPersistedState } from './persistence.js';
import { emitEvent, readEventHistory, verifyChain } from './events.js';
import { logger } from '../logger/logger.js';
import { randomUUID } from 'node:crypto';

export class Machine {
  private state: State;
  private sessionId: string;

  constructor(sessionId?: string) {
    // Tenta recuperar estado persistido
    const persisted = loadPersistedState();
    if (persisted && sessionId && persisted.sessionId === sessionId) {
      this.state = persisted.state;
      this.sessionId = persisted.sessionId;
      logger.info({ state: this.state, sessionId: this.sessionId }, 'FSM restored from disk');
    } else {
      this.state = State.IDLE;
      this.sessionId = sessionId ?? randomUUID();
      persistState(this.state, this.sessionId);
      logger.info({ sessionId: this.sessionId }, 'FSM initialized (IDLE)');
    }
  }

  /** Estado atual */
  current(): { state: State; sessionId: string } {
    return { state: this.state, sessionId: this.sessionId };
  }

  /**
   * Despacha um evento. Retorna o novo estado ou lança erro se inválido.
   */
  dispatch(event: EventType, context?: Record<string, unknown>): { from: State; to: State; event: EventType } {
    const nextState = resolveTransition(this.state, event);

    if (nextState === null) {
      const msg = `Transição inválida: ${this.state} + ${event}`;
      logger.warn({ from: this.state, event }, msg);
      throw new Error(msg);
    }

    const from = this.state;
    this.state = nextState;

    // Persistir e emitir evento
    persistState(this.state, this.sessionId);
    emitEvent(this.sessionId, from, nextState, event, context);

    logger.info({ from, to: nextState, event }, 'FSM transition');
    return { from, to: nextState, event };
  }

  /** Histórico de transições da sessão */
  history(limit = 50) {
    return readEventHistory(this.sessionId, limit);
  }

  /** Verifica integridade do event log */
  verify() {
    return verifyChain(this.sessionId);
  }

  /** Reset forçado para IDLE */
  reset(): void {
    const from = this.state;
    this.state = State.IDLE;
    persistState(this.state, this.sessionId);
    emitEvent(this.sessionId, from, State.IDLE, EventType.Reset);
    logger.info({ from }, 'FSM reset to IDLE');
  }
}
