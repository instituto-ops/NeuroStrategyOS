/**
 * agentd/src/ipc/methods.ts
 * 
 * Métodos JSON-RPC — Fase 2 (agent.*) + Fase 3 (fsm.*) + Fase 4 (registry.*) + Fase 5 (kernel.*)
 */

import { registerMethod } from './server.js';
import { readEstadoAtual } from '../state/estadoAtualReader.js';
import { config } from '../config.js';
import { machine, registry, kernel, memory } from '../boot.js';
import { EventType } from '../fsm/states.js';
import type { ToolCall, InvocationContext } from '../kernel/types.js';
import { auditLog, verifyAuditChain } from '../kernel/audit.js';
import { redactArgs } from '../kernel/redaction.js';
import { createCheckpoint, listPendingCheckpoints, resolveCheckpoint } from '../kernel/hitl.js';

const bootTime = Date.now();

export function registerCoreMethods(): void {

  // === Agent core (Fase 2) ===

  registerMethod('agent.status', () => {
    const fsm = machine?.current();
    return {
      pid: process.pid,
      uptime: Math.floor((Date.now() - bootTime) / 1000),
      version: config.daemon.version,
      name: config.daemon.name,
      platform: config.platform,
      fsm: fsm?.state ?? 'UNKNOWN',
      sessionId: fsm?.sessionId ?? null,
      transport: config.isWindows ? 'Named Pipe' : 'Unix Socket',
    };
  });

  registerMethod('agent.state', () => {
    const estado = readEstadoAtual();
    if (!estado) throw new Error('estado_atual.md não encontrado ou inválido');
    return estado;
  });

  registerMethod('agent.shutdown', () => {
    setTimeout(() => process.exit(0), 100);
    return { message: 'Shutting down...', pid: process.pid };
  });

  registerMethod('agent.ping', () => {
    return { pong: true, timestamp: new Date().toISOString() };
  });

  // === FSM (Fase 3) ===

  registerMethod('fsm.current', () => {
    if (!machine) throw new Error('FSM não inicializada');
    return machine.current();
  });

  registerMethod('fsm.transition', (params) => {
    if (!machine) throw new Error('FSM não inicializada');
    const event = params.event as string;
    if (!Object.values(EventType).includes(event as EventType)) {
      throw new Error(`Evento inválido: ${event}. Válidos: ${Object.values(EventType).join(', ')}`);
    }
    const context = params.context as Record<string, unknown> | undefined;
    return machine.dispatch(event as EventType, context);
  });

  registerMethod('fsm.history', (params) => {
    if (!machine) throw new Error('FSM não inicializada');
    const limit = typeof params.limit === 'number' ? params.limit : 50;
    return machine.history(limit);
  });

  registerMethod('fsm.verify', () => {
    if (!machine) throw new Error('FSM não inicializada');
    return machine.verify();
  });

  registerMethod('fsm.reset', () => {
    if (!machine) throw new Error('FSM não inicializada');
    machine.reset();
    return machine.current();
  });

  // === Registry (Fase 4) ===

  registerMethod('registry.list', () => {
    if (!registry) throw new Error('Registry não inicializado');
    return registry.getAll();
  });

  registerMethod('registry.get', (params) => {
    if (!registry) throw new Error('Registry não inicializado');
    const id = params.id as string;
    const tool = registry.getTool(id);
    if (!tool) throw new Error(`Tool não encontrada: ${id}`);
    return tool;
  });

  registerMethod('registry.visible', (params) => {
    if (!registry) throw new Error('Registry não inicializado');
    const skill = params.skill as string ?? '*';
    return registry.filterBySkill(skill);
  });

  // === Kernel (Fase 5) ===

  registerMethod('kernel.decide', (params) => {
    if (!kernel) throw new Error('Kernel não inicializado');
    const toolCall: ToolCall = {
      toolId: params.toolId as string,
      args: (params.args as Record<string, unknown>) ?? {},
    };
    const ctx: InvocationContext = {
      sessionId: machine?.current().sessionId ?? 'unknown',
      skill: (params.skill as string) ?? '*',
      fsmState: machine?.current().state ?? 'IDLE',
      timestamp: new Date().toISOString(),
    };
    const toolMeta = registry?.getTool(toolCall.toolId);
    const verdict = kernel.decide(toolCall, ctx, toolMeta);
    // Redact args before audit
    const redacted = { ...verdict, toolCall: { ...toolCall, args: redactArgs(toolCall.args) } };
    auditLog(verdict);
    return redacted;
  });

  registerMethod('kernel.rules', () => {
    if (!kernel) throw new Error('Kernel não inicializado');
    return kernel.loadedRules;
  });

  registerMethod('audit.verify', () => {
    return verifyAuditChain();
  });

  registerMethod('hitl.list', () => {
    return listPendingCheckpoints();
  });

  registerMethod('hitl.resolve', (params) => {
    const id = params.id as string;
    const approved = params.approved as boolean;
    const result = resolveCheckpoint(id, approved);
    if (!result) throw new Error(`Checkpoint não encontrado: ${id}`);
    return result;
  });

  // === MCPs (Fase 6) ===

  registerMethod('tool.invoke', async (params) => {
    if (!kernel || !registry) throw new Error('Kernel/Registry não inicializados');
    const { executeTool } = await import('../mcp/runtime.js');
    const toolCall: ToolCall = {
      toolId: params.toolId as string,
      args: (params.args as Record<string, unknown>) ?? {},
    };
    const ctx: InvocationContext = {
      sessionId: machine?.current().sessionId ?? 'unknown',
      skill: (params.skill as string) ?? '*',
      fsmState: machine?.current().state ?? 'IDLE',
      timestamp: new Date().toISOString(),
    };
    return executeTool(toolCall, ctx, kernel, registry);
  });

  // === Memory (Fase 7) ===

  registerMethod('memory.remember', async (params) => {
    if (!memory) throw new Error('Memória RAG não inicializada (verifique API Key)');
    const silo = params.silo as 'factual' | 'stylistic' | 'morgue';
    const content = params.content as string;
    const metadata = (params.metadata as Record<string, unknown>) || {};
    await memory.remember(silo, content, metadata);
    return { success: true };
  });

  registerMethod('memory.recall', async (params) => {
    if (!memory) throw new Error('Memória RAG não inicializada');
    const silo = params.silo as 'factual' | 'stylistic' | 'morgue';
    const query = params.query as string;
    const k = (params.k as number) || 5;
    return await memory.recall(silo, query, k);
  });

  registerMethod('memory.search', async (params) => {
    if (!memory) throw new Error('Memória RAG não inicializada');
    const query = params.query as string;
    const k = (params.k as number) || 3;
    return await memory.search(query, k);
  });

  registerMethod('memory.index_repo', async (params) => {
    if (!memory) throw new Error('Memória RAG não inicializada');
    const { RepoIndexer } = await import('../memory/indexer.js');
    const indexer = new RepoIndexer(memory);
    const path = (params.path as string) || config.paths.repoRoot || process.cwd();
    return await indexer.indexDirectory(path);
  });

  registerMethod('memory.index_git', async (params) => {
    if (!memory) throw new Error('Memória RAG não inicializada');
    const { GitExtractor } = await import('../memory/gitExtractor.js');
    const extractor = new GitExtractor(memory);
    const path = (params.path as string) || config.paths.repoRoot || process.cwd();
    const n = (params.n as number) || 50;
    const count = await extractor.extractHistory(path, n);
    return { count };
  });

  registerMethod('memory.log_decision', async (params) => {
    if (!memory) throw new Error('Memória RAG não inicializada');
    const { DecisionLogger } = await import('../memory/decisionLogger.js');
    const logger = new DecisionLogger(memory);
    const id = await logger.logDecision(
      params.title as string,
      params.context as string,
      params.decision as string,
      params.rationale as string
    );
    return { id };
  });
}
