/**
 * tests/kernel.test.ts — Testa o Permission Kernel completo
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PermissionKernel } from '../src/kernel/kernel.js';
import { evaluatePredicates } from '../src/kernel/evaluator.js';
import { redactSecrets, redactArgs } from '../src/kernel/redaction.js';
import { auditLog, verifyAuditChain } from '../src/kernel/audit.js';
import { createCheckpoint, resolveCheckpoint, listPendingCheckpoints } from '../src/kernel/hitl.js';
import type { ToolCall, InvocationContext, RulePredicate } from '../src/kernel/types.js';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { config } from '../src/config.js';

const TEST_DIR = join(import.meta.dirname, 'fixtures', 'kernel_test');

// === Evaluator Tests ===
describe('evaluatePredicates', () => {
  const toolCall: ToolCall = { toolId: 'filesystem.read_file', args: { path: '/home/user/file.txt' } };
  const ctx: InvocationContext = { sessionId: 's1', skill: 'vortex', fsmState: 'EXECUTING', timestamp: '' };

  it('eq operator', () => {
    const preds: RulePredicate[] = [{ field: 'tool.id', op: 'eq', value: 'filesystem.read_file' }];
    expect(evaluatePredicates(preds, 'all', toolCall, ctx)).toBe(true);
  });

  it('neq operator', () => {
    const preds: RulePredicate[] = [{ field: 'tool.id', op: 'neq', value: 'terminal.run' }];
    expect(evaluatePredicates(preds, 'all', toolCall, ctx)).toBe(true);
  });

  it('in operator', () => {
    const preds: RulePredicate[] = [{ field: 'ctx.fsm_state', op: 'in', value: ['EXECUTING', 'TESTING'] }];
    expect(evaluatePredicates(preds, 'all', toolCall, ctx)).toBe(true);
  });

  it('matches operator', () => {
    const preds: RulePredicate[] = [{ field: 'args.path', op: 'matches', value: '^/home' }];
    expect(evaluatePredicates(preds, 'all', toolCall, ctx)).toBe(true);
  });

  it('startsWith operator', () => {
    const preds: RulePredicate[] = [{ field: 'args.path', op: 'startsWith', value: '/home' }];
    expect(evaluatePredicates(preds, 'all', toolCall, ctx)).toBe(true);
  });

  it('all combinator fails if one fails', () => {
    const preds: RulePredicate[] = [
      { field: 'tool.id', op: 'eq', value: 'filesystem.read_file' },
      { field: 'ctx.fsm_state', op: 'eq', value: 'IDLE' }, // false
    ];
    expect(evaluatePredicates(preds, 'all', toolCall, ctx)).toBe(false);
  });

  it('any combinator succeeds if one succeeds', () => {
    const preds: RulePredicate[] = [
      { field: 'ctx.fsm_state', op: 'eq', value: 'IDLE' },  // false
      { field: 'ctx.fsm_state', op: 'eq', value: 'EXECUTING' }, // true
    ];
    expect(evaluatePredicates(preds, 'any', toolCall, ctx)).toBe(true);
  });
});

// === Kernel Tests ===
describe('PermissionKernel', () => {
  beforeEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
    mkdirSync(TEST_DIR, { recursive: true });
  });

  it('DEFAULT DENY quando nenhuma regra carregada', async () => {
    const kernel = new PermissionKernel(TEST_DIR);
    await kernel.load();
    const verdict = kernel.decide(
      { toolId: 'unknown.tool', args: {} },
      { sessionId: 's1', skill: '*', fsmState: 'EXECUTING', timestamp: '' },
    );
    expect(verdict.decision).toBe('block');
    expect(verdict.reason).toContain('default deny');
  });

  it('permite leitura de arquivo durante EXECUTING', async () => {
    writeFileSync(join(TEST_DIR, '10-fs.yaml'), `
rules:
  - id: "allow-read"
    priority: 20
    decision: "allow"
    match: "all"
    predicates:
      - field: "tool.id"
        op: "eq"
        value: "filesystem.read_file"
      - field: "ctx.fsm_state"
        op: "in"
        value: ["EXECUTING"]
    `);

    const kernel = new PermissionKernel(TEST_DIR);
    await kernel.load();
    const verdict = kernel.decide(
      { toolId: 'filesystem.read_file', args: { path: '/test' } },
      { sessionId: 's1', skill: '*', fsmState: 'EXECUTING', timestamp: '' },
    );
    expect(verdict.decision).toBe('allow');
  });

  it('bloqueia execução em IDLE', async () => {
    writeFileSync(join(TEST_DIR, '00-defaults.yaml'), `
rules:
  - id: "block-idle"
    priority: 5
    decision: "block"
    match: "all"
    predicates:
      - field: "ctx.fsm_state"
        op: "eq"
        value: "IDLE"
    `);

    const kernel = new PermissionKernel(TEST_DIR);
    await kernel.load();
    const verdict = kernel.decide(
      { toolId: 'filesystem.read_file', args: {} },
      { sessionId: 's1', skill: '*', fsmState: 'IDLE', timestamp: '' },
    );
    expect(verdict.decision).toBe('block');
  });

  it('prioridade funciona: regra de prioridade menor vence', async () => {
    writeFileSync(join(TEST_DIR, 'mixed.yaml'), `
rules:
  - id: "allow-all"
    priority: 100
    decision: "allow"
    match: "all"
    predicates: []
  - id: "block-first"
    priority: 1
    decision: "block"
    match: "all"
    predicates: []
    `);

    const kernel = new PermissionKernel(TEST_DIR);
    await kernel.load();
    const verdict = kernel.decide(
      { toolId: 'any', args: {} },
      { sessionId: 's1', skill: '*', fsmState: 'EXECUTING', timestamp: '' },
    );
    expect(verdict.decision).toBe('block');
  });
});

// === Redaction Tests ===
describe('redactSecrets', () => {
  it('redige AWS keys', () => {
    expect(redactSecrets('key: AKIAIOSFODNN7EXAMPLE')).toContain('[AWS_KEY]');
  });

  it('redige GitHub tokens', () => {
    expect(redactSecrets('token: ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijk')).toContain('[GH_TOKEN]');
  });

  it('redige JWTs', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
    expect(redactSecrets(jwt)).toContain('[JWT]');
  });

  it('redactArgs funciona recursivamente', () => {
    const args = { config: { token: 'ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijk', safe: 'hello' } };
    const result = redactArgs(args);
    expect((result.config as Record<string, string>).token).toContain('[GH_TOKEN]');
    expect((result.config as Record<string, string>).safe).toBe('hello');
  });
});

// === Audit Tests ===
describe('audit log', () => {
  beforeEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
    mkdirSync(TEST_DIR, { recursive: true });
    // @ts-expect-error — mock
    config.paths.audit = TEST_DIR;
  });

  it('grava e verifica hash-chain', () => {
    auditLog({
      decision: 'allow', toolId: 'test', reason: 'test',
      ctx: { sessionId: 's1', skill: '*', fsmState: 'EXECUTING', timestamp: '' },
      timestamp: new Date().toISOString(),
    });
    auditLog({
      decision: 'block', toolId: 'test2', reason: 'blocked',
      ctx: { sessionId: 's1', skill: '*', fsmState: 'IDLE', timestamp: '' },
      timestamp: new Date().toISOString(),
    });

    const result = verifyAuditChain();
    expect(result.valid).toBe(true);
    expect(result.entries).toBe(2);
  });
});

// === HITL Tests ===
describe('HITL checkpoints', () => {
  beforeEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
    mkdirSync(TEST_DIR, { recursive: true });
    // @ts-expect-error — mock
    config.paths.hitl = TEST_DIR;
  });

  it('cria, lista e resolve checkpoint', () => {
    const cp = createCheckpoint(
      { toolId: 'terminal.run', args: { command: 'npm install' } },
      { sessionId: 's1', skill: '*', fsmState: 'EXECUTING', timestamp: '' },
      { decision: 'review', toolId: 'terminal.run', reason: 'high risk', ctx: {} as any, timestamp: '' },
    );

    expect(cp.status).toBe('pending');
    expect(listPendingCheckpoints()).toHaveLength(1);

    const resolved = resolveCheckpoint(cp.id, true);
    expect(resolved?.status).toBe('approved');
    expect(listPendingCheckpoints()).toHaveLength(0);
  });
});
