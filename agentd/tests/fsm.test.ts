/**
 * tests/fsm.test.ts — Testa a FSM (transições, persistência, hash-chain)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { State, EventType } from '../src/fsm/states.js';
import { resolveTransition } from '../src/fsm/transitions.js';
import { emitEvent, readEventHistory, verifyChain } from '../src/fsm/events.js';
import { persistState, loadPersistedState } from '../src/fsm/persistence.js';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Override config paths for test isolation
import { config } from '../src/config.js';
const TEST_DIR = join(import.meta.dirname, 'fixtures', 'fsm_test');

describe('resolveTransition', () => {
  it('IDLE + UserInput = DIALOGUE', () => {
    expect(resolveTransition(State.IDLE, EventType.UserInput)).toBe(State.DIALOGUE);
  });

  it('IDLE + ExecutionDone = null (inválida)', () => {
    expect(resolveTransition(State.IDLE, EventType.ExecutionDone)).toBeNull();
  });

  it('DIALOGUE + PlanReady = PLANNING (fast-track)', () => {
    expect(resolveTransition(State.DIALOGUE, EventType.PlanReady)).toBe(State.PLANNING);
  });

  it('PLANNING + ApprovalGranted = EXECUTING', () => {
    expect(resolveTransition(State.PLANNING, EventType.ApprovalGranted)).toBe(State.EXECUTING);
  });

  it('EXECUTING + ExecutionDone = TESTING', () => {
    expect(resolveTransition(State.EXECUTING, EventType.ExecutionDone)).toBe(State.TESTING);
  });

  it('TESTING + TestResult = REPORTING', () => {
    expect(resolveTransition(State.TESTING, EventType.TestResult)).toBe(State.REPORTING);
  });

  it('REPORTING + ReportEmitted = IDLE (ciclo completo)', () => {
    expect(resolveTransition(State.REPORTING, EventType.ReportEmitted)).toBe(State.IDLE);
  });

  it('AWAITING_APPROVAL + ApprovalDenied = IDLE', () => {
    expect(resolveTransition(State.AWAITING_APPROVAL, EventType.ApprovalDenied)).toBe(State.IDLE);
  });

  it('IDLE + ExecutionStep = null (proíbe skip)', () => {
    expect(resolveTransition(State.IDLE, EventType.ExecutionStep)).toBeNull();
  });

  it('Reset sempre retorna a IDLE', () => {
    for (const state of Object.values(State)) {
      expect(resolveTransition(state, EventType.Reset)).toBe(State.IDLE);
    }
  });
});

describe('persistence', () => {
  beforeEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
    mkdirSync(TEST_DIR, { recursive: true });
  });

  it('persiste e recupera estado', () => {
    const orig = config.paths.fsm;
    // @ts-expect-error — mock
    config.paths.fsm = TEST_DIR;

    persistState(State.EXECUTING, 'test-session-1');
    const loaded = loadPersistedState();

    expect(loaded).not.toBeNull();
    expect(loaded!.state).toBe(State.EXECUTING);
    expect(loaded!.sessionId).toBe('test-session-1');

    // @ts-expect-error — restore
    config.paths.fsm = orig;
  });
});

describe('event log & hash-chain', () => {
  const sessionId = `test_${Date.now()}`;

  beforeEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
    mkdirSync(TEST_DIR, { recursive: true });
  });

  it('emite eventos e mantém hash-chain íntegra', () => {
    const orig = config.paths.events;
    // @ts-expect-error — mock
    config.paths.events = TEST_DIR;

    emitEvent(sessionId, State.IDLE, State.DIALOGUE, EventType.UserInput);
    emitEvent(sessionId, State.DIALOGUE, State.PLANNING, EventType.PlanReady, { plan: 'test' });
    emitEvent(sessionId, State.PLANNING, State.EXECUTING, EventType.ApprovalGranted);

    const history = readEventHistory(sessionId);
    expect(history).toHaveLength(3);
    expect(history[0].from).toBe(State.IDLE);
    expect(history[0].to).toBe(State.DIALOGUE);
    expect(history[2].to).toBe(State.EXECUTING);

    // Verificar chain
    const result = verifyChain(sessionId);
    expect(result.valid).toBe(true);

    // @ts-expect-error — restore
    config.paths.events = orig;
  });
});
