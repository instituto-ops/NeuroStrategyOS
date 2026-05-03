/**
 * agentd/src/fsm/persistence.ts
 * 
 * Persistência atômica do estado FSM.
 * Write em .tmp + rename para crash-safety.
 */

import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { State } from './states.js';
import { config } from '../config.js';
import { logger } from '../logger/logger.js';

interface PersistedState {
  state: State;
  sessionId: string;
  updatedAt: string;
}

const STATE_FILE = () => `${config.paths.fsm}/current.json`;

/**
 * Persiste o estado atual de forma atômica (tmp + rename).
 */
export function persistState(state: State, sessionId: string): void {
  const filePath = STATE_FILE();
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const data: PersistedState = {
    state,
    sessionId,
    updatedAt: new Date().toISOString(),
  };

  const tmpPath = `${filePath}.tmp`;
  writeFileSync(tmpPath, JSON.stringify(data, null, 2));
  renameSync(tmpPath, filePath);
  logger.debug({ state, sessionId }, 'FSM state persisted');
}

/**
 * Lê o estado persistido. Retorna null se não existir.
 */
export function loadPersistedState(): PersistedState | null {
  const filePath = STATE_FILE();
  if (!existsSync(filePath)) return null;

  try {
    const content = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content) as PersistedState;
    if (!Object.values(State).includes(data.state)) {
      logger.warn({ data }, 'Estado persistido inválido — ignorando');
      return null;
    }
    return data;
  } catch (err) {
    logger.error({ err }, 'Falha ao ler estado persistido');
    return null;
  }
}
