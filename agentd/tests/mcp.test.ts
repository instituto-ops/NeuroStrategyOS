/**
 * tests/mcp.test.ts — Testa MCP runtime, filesystem, terminal, git
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PermissionKernel } from '../src/kernel/kernel.js';
import { ToolLoader } from '../src/registry/loader.js';
import { executeTool, registerHandler } from '../src/mcp/runtime.js';
import { registerFilesystemHandlers } from '../src/mcp/filesystem.js';
import type { InvocationContext } from '../src/kernel/types.js';
import { writeFileSync, mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { config } from '../src/config.js';

const TEST_DIR = join(import.meta.dirname, 'fixtures', 'mcp_test');
const RULES_DIR = join(TEST_DIR, 'rules');
const TOOLS_DIR = join(TEST_DIR, 'tools');

function setupTestEnv() {
  if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
  mkdirSync(RULES_DIR, { recursive: true });
  mkdirSync(TOOLS_DIR, { recursive: true });

  // Tool def
  writeFileSync(join(TOOLS_DIR, 'read.yaml'), `
id: "filesystem.read_file"
version: "1.0.0"
description: "read"
risk_level: "safe"
input_schema: { type: "object" }
timeout_ms: 5000
applicable_skills: ["*"]
  `);
  writeFileSync(join(TOOLS_DIR, 'write.yaml'), `
id: "filesystem.write_file"
version: "1.0.0"
description: "write"
risk_level: "moderate"
input_schema: { type: "object" }
timeout_ms: 5000
applicable_skills: ["*"]
  `);

  // Rules
  writeFileSync(join(RULES_DIR, '00.yaml'), `
rules:
  - id: "block-idle"
    priority: 5
    decision: "block"
    match: "all"
    predicates:
      - field: "ctx.fsm_state"
        op: "eq"
        value: "IDLE"
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
  - id: "allow-write"
    priority: 20
    decision: "allow"
    match: "all"
    predicates:
      - field: "tool.id"
        op: "eq"
        value: "filesystem.write_file"
      - field: "ctx.fsm_state"
        op: "in"
        value: ["EXECUTING"]
  - id: "allow-slow"
    priority: 20
    decision: "allow"
    match: "all"
    predicates:
      - field: "tool.id"
        op: "eq"
        value: "slow.tool"
  `);
}

const execCtx: InvocationContext = { sessionId: 's1', skill: '*', fsmState: 'EXECUTING', timestamp: '' };
const idleCtx: InvocationContext = { sessionId: 's1', skill: '*', fsmState: 'IDLE', timestamp: '' };

describe('MCP Runtime Pipeline', () => {
  beforeEach(() => {
    setupTestEnv();
    // @ts-expect-error — mock
    config.paths.audit = join(TEST_DIR, 'audit');
    // @ts-expect-error — mock
    config.paths.hitl = join(TEST_DIR, 'hitl');
    // @ts-expect-error — mock
    config.paths.backups = join(TEST_DIR, 'backups');
    mkdirSync(join(TEST_DIR, 'audit'), { recursive: true });
    mkdirSync(join(TEST_DIR, 'hitl'), { recursive: true });
    mkdirSync(join(TEST_DIR, 'backups'), { recursive: true });
  });

  it('bloqueia tool desconhecida', async () => {
    const kernel = new PermissionKernel(RULES_DIR);
    await kernel.load();
    const registry = new ToolLoader(TOOLS_DIR);
    await registry.load();

    const result = await executeTool({ toolId: 'unknown.tool', args: {} }, execCtx, kernel, registry);
    expect(result.success).toBe(false);
    expect(result.error).toContain('não registrada');
  });

  it('bloqueia em IDLE', async () => {
    const kernel = new PermissionKernel(RULES_DIR);
    await kernel.load();
    const registry = new ToolLoader(TOOLS_DIR);
    await registry.load();

    const result = await executeTool({ toolId: 'filesystem.read_file', args: { path: '/test' } }, idleCtx, kernel, registry);
    expect(result.success).toBe(false);
    expect(result.verdict.decision).toBe('block');
  });

  it('executa filesystem.read_file com sucesso em EXECUTING', async () => {
    const kernel = new PermissionKernel(RULES_DIR);
    await kernel.load();
    const registry = new ToolLoader(TOOLS_DIR);
    await registry.load();

    // Register handler
    registerFilesystemHandlers();

    // Create test file
    const testFile = join(TEST_DIR, 'test_read.txt');
    writeFileSync(testFile, 'hello agent');

    const result = await executeTool(
      { toolId: 'filesystem.read_file', args: { path: testFile } },
      execCtx, kernel, registry,
    );
    expect(result.success).toBe(true);
    expect((result.output as any).content).toBe('hello agent');
  });

  it('executa filesystem.write_file com backup', async () => {
    const kernel = new PermissionKernel(RULES_DIR);
    await kernel.load();
    const registry = new ToolLoader(TOOLS_DIR);
    await registry.load();
    registerFilesystemHandlers();

    const testFile = join(TEST_DIR, 'test_write.txt');
    writeFileSync(testFile, 'original');

    const result = await executeTool(
      { toolId: 'filesystem.write_file', args: { path: testFile, content: 'updated' } },
      execCtx, kernel, registry,
    );
    expect(result.success).toBe(true);
    expect(readFileSync(testFile, 'utf-8')).toBe('updated');
    expect((result.output as any).backup).toBeTruthy();
  });

  it('trata timeout de handler', async () => {
    const kernel = new PermissionKernel(RULES_DIR);
    await kernel.load();
    const registry = new ToolLoader(TOOLS_DIR);
    await registry.load();

    // Register a slow handler with a very short tool timeout
    writeFileSync(join(TOOLS_DIR, 'slow.yaml'), `
id: "slow.tool"
version: "1"
description: "slow"
risk_level: "safe"
timeout_ms: 100
input_schema: { type: "object" }
applicable_skills: ["*"]
    `);
    await registry.load();

    registerHandler('slow.tool', async () => {
      await new Promise(r => setTimeout(r, 1000));
    });

    const result = await executeTool(
      { toolId: 'slow.tool', args: {} },
      execCtx, kernel, registry,
    );
    expect(result.success).toBe(false);
    expect(result.error).toContain('timeout');
  });
});
