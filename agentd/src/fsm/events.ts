/**
 * agentd/src/fsm/events.ts
 * 
 * Event log append-only com hash-chain SHA-256.
 * Cada evento inclui hash(prevHash + payload) para detecção de tampering.
 */

import { appendFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { type FSMEvent, type State, type EventType } from './states.js';
import { config } from '../config.js';

let lastHash = '0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Calcula SHA-256 de uma string.
 */
function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/**
 * Recupera o último hash da cadeia para uma sessão.
 */
function recoverLastHash(sessionId: string): string {
  const filePath = join(config.paths.events, `${sessionId}.jsonl`);
  if (!existsSync(filePath)) return lastHash;

  const content = readFileSync(filePath, 'utf-8').trim();
  if (!content) return lastHash;

  const lines = content.split('\n');
  const lastLine = lines[lines.length - 1];
  try {
    const event = JSON.parse(lastLine) as FSMEvent;
    return event.hash;
  } catch {
    return lastHash;
  }
}

/**
 * Emite um evento FSM no log append-only com hash-chain.
 */
export function emitEvent(
  sessionId: string,
  from: State,
  to: State,
  event: EventType,
  context?: Record<string, unknown>,
): FSMEvent {
  mkdirSync(config.paths.events, { recursive: true });

  // Recuperar hash anterior se necessário
  if (lastHash === '0000000000000000000000000000000000000000000000000000000000000000') {
    lastHash = recoverLastHash(sessionId);
  }

  const payload: Omit<FSMEvent, 'hash'> = {
    timestamp: new Date().toISOString(),
    sessionId,
    from,
    to,
    event,
    context,
    prevHash: lastHash,
  };

  const hash = sha256(lastHash + JSON.stringify(payload));
  const fullEvent: FSMEvent = { ...payload, hash };

  const filePath = join(config.paths.events, `${sessionId}.jsonl`);
  appendFileSync(filePath, JSON.stringify(fullEvent) + '\n');

  lastHash = hash;
  return fullEvent;
}

/**
 * Lê o histórico de eventos de uma sessão.
 */
export function readEventHistory(sessionId: string, limit = 50): FSMEvent[] {
  const filePath = join(config.paths.events, `${sessionId}.jsonl`);
  if (!existsSync(filePath)) return [];

  const content = readFileSync(filePath, 'utf-8').trim();
  if (!content) return [];

  const lines = content.split('\n');
  return lines.slice(-limit).map(line => JSON.parse(line) as FSMEvent);
}

/**
 * Verifica integridade da hash-chain de uma sessão.
 */
export function verifyChain(sessionId: string): { valid: boolean; brokenAt?: number } {
  const events = readEventHistory(sessionId, Infinity);
  let prevHash = '0000000000000000000000000000000000000000000000000000000000000000';

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    if (event.prevHash !== prevHash) {
      return { valid: false, brokenAt: i };
    }
    const { hash, ...payload } = event;
    const expected = sha256(prevHash + JSON.stringify(payload));
    if (hash !== expected) {
      return { valid: false, brokenAt: i };
    }
    prevHash = hash;
  }

  return { valid: true };
}
