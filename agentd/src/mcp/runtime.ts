/**
 * agentd/src/mcp/runtime.ts
 *
 * MCP Runtime — pipeline universal para execução de tools.
 * validate → kernel.decide → exec → redact → audit
 */

import type { ToolCall, InvocationContext, KernelVerdict } from '../kernel/types.js';
import type { Tool } from '../registry/schema.js';
import { PermissionKernel } from '../kernel/kernel.js';
import { ToolLoader } from '../registry/loader.js';
import { auditLog } from '../kernel/audit.js';
import { redactArgs } from '../kernel/redaction.js';
import { createCheckpoint } from '../kernel/hitl.js';
import { logger } from '../logger/logger.js';

/** Resultado de uma execução de tool */
export interface ToolResult {
  success: boolean;
  output?: unknown;
  error?: string;
  verdict: KernelVerdict;
  redactedArgs: Record<string, unknown>;
  durationMs: number;
}

/** Handler que executa a lógica real da tool */
export type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>;

/** Registry de handlers */
const handlers = new Map<string, ToolHandler>();

export function registerHandler(toolId: string, handler: ToolHandler): void {
  handlers.set(toolId, handler);
}

/**
 * Pipeline de execução de uma tool.
 * 1. Validate: tool existe no registry
 * 2. Kernel: decide se pode executar
 * 3. Execute: roda o handler
 * 4. Redact: limpa segredos do output
 * 5. Audit: registra no log
 */
export async function executeTool(
  toolCall: ToolCall,
  ctx: InvocationContext,
  kernel: PermissionKernel,
  registry: ToolLoader,
): Promise<ToolResult> {
  const start = Date.now();

  // 1. Validate
  const toolMeta = registry.getTool(toolCall.toolId);
  if (!toolMeta) {
    const verdict: KernelVerdict = {
      decision: 'block',
      toolId: toolCall.toolId,
      reason: `Tool não registrada: ${toolCall.toolId}`,
      ctx,
      timestamp: new Date().toISOString(),
    };
    auditLog(verdict);
    return { success: false, error: verdict.reason, verdict, redactedArgs: redactArgs(toolCall.args), durationMs: Date.now() - start };
  }

  // 2. Kernel decide
  const verdict = kernel.decide(toolCall, ctx, toolMeta);
  const redacted = redactArgs(toolCall.args);
  auditLog(verdict);

  if (verdict.decision === 'forbidden') {
    logger.warn({ tool: toolCall.toolId, rule: verdict.matchedRule }, 'FORBIDDEN — execução proibida');
    return { success: false, error: `Forbidden: ${verdict.reason}`, verdict, redactedArgs: redacted, durationMs: Date.now() - start };
  }

  if (verdict.decision === 'block') {
    logger.warn({ tool: toolCall.toolId, rule: verdict.matchedRule }, 'BLOCKED — execução negada');
    return { success: false, error: `Blocked: ${verdict.reason}`, verdict, redactedArgs: redacted, durationMs: Date.now() - start };
  }

  if (verdict.decision === 'review') {
    // HITL: cria checkpoint e retorna pendente
    const checkpoint = createCheckpoint(toolCall, ctx, verdict);
    logger.info({ tool: toolCall.toolId, checkpoint: checkpoint.id }, 'REVIEW — aguardando aprovação HITL');
    return {
      success: false,
      error: `Awaiting HITL approval: ${checkpoint.id}`,
      verdict,
      redactedArgs: redacted,
      durationMs: Date.now() - start,
    };
  }

  // 3. Execute (decision === 'allow')
  const handler = handlers.get(toolCall.toolId);
  if (!handler) {
    return { success: false, error: `Handler não registrado para: ${toolCall.toolId}`, verdict, redactedArgs: redacted, durationMs: Date.now() - start };
  }

  try {
    const output = await Promise.race([
      handler(toolCall.args),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Tool timeout')), toolMeta.timeout_ms)),
    ]);
    logger.info({ tool: toolCall.toolId, durationMs: Date.now() - start }, 'Tool executada com sucesso');
    return { success: true, output, verdict, redactedArgs: redacted, durationMs: Date.now() - start };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error({ tool: toolCall.toolId, err: errorMsg }, 'Tool falhou');
    return { success: false, error: errorMsg, verdict, redactedArgs: redacted, durationMs: Date.now() - start };
  }
}
