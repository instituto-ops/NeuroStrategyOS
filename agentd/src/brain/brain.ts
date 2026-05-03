import { readFile } from 'node:fs/promises';
import type { Content } from '@google/generative-ai';
import type { Machine } from '../fsm/machine.js';
import { EventType, State } from '../fsm/states.js';
import type { ToolLoader } from '../registry/loader.js';
import type { PermissionKernel } from '../kernel/kernel.js';
import type { MemoryManager } from '../memory/memoryManager.js';
import type { ToolCall } from '../kernel/types.js';
import { config } from '../config.js';
import { logger } from '../logger/logger.js';
import { executeTool, type ToolResult } from '../mcp/runtime.js';
import { buildSystemPrompt } from './prompt.js';
import { toolsToGeminiFunctions, toolIdToGeminiName } from './toolParser.js';
import type { GeminiClient } from './gemini.js';
import type { AgentSession, SessionManager } from './sessionManager.js';

export interface BrainResult {
  sessionId: string;
  status: 'completed' | 'awaiting_hitl' | 'failed' | 'morgue';
  summary?: string;
  error?: string;
  iterationCount: number;
}

export class Brain {
  constructor(
    private gemini: GeminiClient,
    private machine: Machine,
    private registry: ToolLoader,
    private kernel: PermissionKernel,
    private memory: MemoryManager | null,
    private sessionManager: SessionManager,
  ) {}

  async run(task: string, existingSessionId?: string): Promise<BrainResult> {
    let session = existingSessionId ? await this.sessionManager.get(existingSessionId) : null;
    if (!session) session = await this.sessionManager.start(task);

    const lastErrors: string[] = [];
    const estadoAtual = await readEstadoAtualRaw();
    const tools = this.registry.filterBySkill(session.activeSkill);
    const functions = toolsToGeminiFunctions(tools);
    const memoryContext = await this.buildMemoryContext(task);
    const systemPrompt = await buildSystemPrompt({
      estadoAtual,
      tools,
      memoryContext,
      activeSkill: session.activeSkill,
    });

    this.transitionToDialogue();
    this.transitionToDiagnosis();

    for (let iteration = session.iterationCount; iteration < 20; iteration++) {
      session = await this.reload(session);
      const response = await this.gemini.callWithTools(systemPrompt, task, functions, session.history);

      if (response.content) {
        session.history.push(response.content);
      } else if (response.text) {
        session.history.push({ role: 'model', parts: [{ text: response.text }] });
      }

      if (response.finishReason === 'error' || response.finishReason === 'max_tokens') {
        const error = response.text || response.finishReason;
        lastErrors.push(error);
        await this.persistLoopState(session, iteration + 1, error);
        const morgue = await this.maybeMorgue(task, session, lastErrors, iteration + 1);
        if (morgue) return morgue;
        continue;
      }

      if (response.finishReason === 'stop' || !response.toolCalls?.length) {
        const summary = response.text || 'Tarefa concluida.';
        await this.completeCycle();
        await this.sessionManager.end(session.id, 'success', summary);
        logger.info({ sessionId: session.id }, 'Brain task completed');
        return { sessionId: session.id, status: 'completed', summary, iterationCount: iteration + 1 };
      }

      this.transitionToExecution();

      for (const toolCall of response.toolCalls) {
        const result = await this.executeToolCall(session, toolCall);
        session.history.push(functionResponseContent(toolCall.toolId, result));

        if (result.error) {
          lastErrors.push(result.error);
          const morgue = await this.maybeMorgue(task, session, lastErrors, iteration + 1);
          if (morgue) return morgue;
        } else {
          lastErrors.length = 0;
        }

        if (result.error?.includes('Awaiting HITL')) {
          this.requestApproval(toolCall.toolId);
          await this.sessionManager.update(session.id, {
            history: session.history,
            iterationCount: iteration + 1,
            status: 'awaiting_hitl',
            lastError: result.error,
          });
          return {
            sessionId: session.id,
            status: 'awaiting_hitl',
            error: result.error,
            iterationCount: iteration + 1,
          };
        }
      }

      await this.sessionManager.update(session.id, {
        history: session.history,
        iterationCount: iteration + 1,
      });
    }

    const error = 'Limite de 20 iteracoes atingido.';
    await this.sessionManager.end(session.id, 'failure', error);
    return { sessionId: session.id, status: 'failed', error, iterationCount: 20 };
  }

  private async executeToolCall(session: AgentSession, toolCall: ToolCall): Promise<ToolResult> {
    const ctx = {
      sessionId: session.id,
      skill: session.activeSkill,
      fsmState: this.machine.current().state,
      timestamp: new Date().toISOString(),
    };
    const result = await executeTool(toolCall, ctx, this.kernel, this.registry);
    this.safeDispatch(EventType.ExecutionStep, {
      toolId: toolCall.toolId,
      success: result.success,
      error: result.error,
    });
    return result;
  }

  private async buildMemoryContext(task: string): Promise<string | undefined> {
    if (!this.memory) return undefined;
    try {
      const result = await this.memory.search(task, 3);
      const factual = result.factual.slice(0, 3).map((entry) => `Factual: ${entry.content}`);
      const stylistic = result.stylistic.slice(0, 2).map((entry) => `Stylistic: ${entry.content}`);
      return [...factual, ...stylistic].join('\n');
    } catch (err) {
      logger.warn({ err }, 'Memory search failed for Brain');
      return undefined;
    }
  }

  private async maybeMorgue(
    task: string,
    session: AgentSession,
    lastErrors: string[],
    iterationCount: number,
  ): Promise<BrainResult | null> {
    if (!isSameError(lastErrors, 3)) return null;
    const lastError = lastErrors[lastErrors.length - 1];
    await this.rememberMorgue(task, session.id, lastError);
    await this.sessionManager.update(session.id, {
      status: 'failed',
      iterationCount,
      lastError,
      summary: `Loop de erro detectado: ${lastError}`,
    });
    if (this.machine.current().state !== State.IDLE) {
      this.safeDispatch(EventType.Reset, { reason: 'morgue', error: lastError });
    }
    return {
      sessionId: session.id,
      status: 'morgue',
      error: `Loop de erro detectado apos 3 tentativas: ${lastError}`,
      iterationCount,
    };
  }

  private async rememberMorgue(task: string, sessionId: string, lastError: string): Promise<void> {
    if (!this.memory) return;
    try {
      await this.memory.remember('morgue', `Loop de erro: ${task} - ${lastError}`, { sessionId });
    } catch (err) {
      logger.warn({ err, sessionId }, 'Morgue memory write failed');
    }
  }

  private async persistLoopState(session: AgentSession, iterationCount: number, lastError: string): Promise<void> {
    await this.sessionManager.update(session.id, {
      history: session.history,
      iterationCount,
      lastError,
    });
  }

  private async reload(session: AgentSession): Promise<AgentSession> {
    return (await this.sessionManager.get(session.id)) ?? session;
  }

  private transitionToDialogue(): void {
    if (this.machine.current().state === State.IDLE) {
      this.safeDispatch(EventType.UserInput, { source: 'brain.run' });
    }
  }

  private transitionToDiagnosis(): void {
    if (this.machine.current().state === State.DIALOGUE) {
      this.safeDispatch(EventType.DiagnosisDone, { source: 'brain.run' });
    }
  }

  private transitionToExecution(): void {
    const state = this.machine.current().state;
    if (state === State.DIAGNOSIS) this.safeDispatch(EventType.PlanReady, { source: 'brain.run' });
    if (this.machine.current().state === State.PLANNING) {
      this.safeDispatch(EventType.ApprovalGranted, { source: 'brain.run' });
    }
  }

  private requestApproval(toolId: string): void {
    if (this.machine.current().state === State.EXECUTING) {
      this.safeDispatch(EventType.ReportEmitted, { type: 'HITL', message: `Aguardando aprovacao: ${toolId}` });
    }
  }

  private async completeCycle(): Promise<void> {
    const state = this.machine.current().state;
    if (state === State.EXECUTING) this.safeDispatch(EventType.ExecutionDone);
    if (this.machine.current().state === State.TESTING) this.safeDispatch(EventType.TestResult, { ok: true });
    if (this.machine.current().state === State.REPORTING) this.safeDispatch(EventType.ReportEmitted, { type: 'FSM', message: 'Tarefa concluida' });
    if (this.machine.current().state !== State.IDLE) this.safeDispatch(EventType.Reset);
  }

  private safeDispatch(event: EventType, context?: Record<string, unknown>): void {
    try {
      this.machine.dispatch(event, context);
    } catch (err) {
      logger.warn({ event, err }, 'Brain FSM transition skipped');
    }
  }
}

async function readEstadoAtualRaw(): Promise<string> {
  try {
    return await readFile(config.paths.estadoAtual, 'utf-8');
  } catch {
    return '';
  }
}

function functionResponseContent(toolId: string, result: ToolResult): Content {
  return {
    role: 'user',
    parts: [{
      functionResponse: {
        name: toolIdToGeminiName(toolId),
        response: JSON.parse(JSON.stringify(result)) as object,
      },
    }],
  };
}

function isSameError(errors: string[], threshold: number): boolean {
  if (errors.length < threshold) return false;
  const recent = errors.slice(-threshold);
  return recent.every((error) => error === recent[0]);
}
