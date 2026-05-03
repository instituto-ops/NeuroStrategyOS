/**
 * agentd/src/kernel/hitl.ts
 *
 * Human-In-The-Loop checkpoint.
 * Persiste ações que exigem aprovação humana.
 * Interface + implementação in-memory para testes.
 */

import { writeFileSync, readFileSync, unlinkSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { KernelVerdict, ToolCall, InvocationContext } from './types.js';
import { config } from '../config.js';
import { logger } from '../logger/logger.js';

export interface HITLCheckpoint {
  id: string;
  toolCall: ToolCall;
  ctx: InvocationContext;
  verdict: KernelVerdict;
  createdAt: string;
  status: 'pending' | 'approved' | 'denied';
}

/**
 * Persiste um checkpoint HITL no disco.
 */
export function createCheckpoint(toolCall: ToolCall, ctx: InvocationContext, verdict: KernelVerdict): HITLCheckpoint {
  mkdirSync(config.paths.hitl, { recursive: true });

  const checkpoint: HITLCheckpoint = {
    id: `hitl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    toolCall,
    ctx,
    verdict,
    createdAt: new Date().toISOString(),
    status: 'pending',
  };

  const filePath = join(config.paths.hitl, `${checkpoint.id}.json`);
  writeFileSync(filePath, JSON.stringify(checkpoint, null, 2));
  logger.info({ id: checkpoint.id, tool: toolCall.toolId }, 'HITL checkpoint criado — aguardando aprovação');
  return checkpoint;
}

/**
 * Resolve um checkpoint (approve ou deny).
 */
export function resolveCheckpoint(checkpointId: string, approved: boolean): HITLCheckpoint | null {
  const filePath = join(config.paths.hitl, `${checkpointId}.json`);
  if (!existsSync(filePath)) return null;

  const checkpoint = JSON.parse(readFileSync(filePath, 'utf-8')) as HITLCheckpoint;
  checkpoint.status = approved ? 'approved' : 'denied';
  writeFileSync(filePath, JSON.stringify(checkpoint, null, 2));
  logger.info({ id: checkpointId, status: checkpoint.status }, 'HITL checkpoint resolvido');
  return checkpoint;
}

/**
 * Lista checkpoints pendentes.
 */
export function listPendingCheckpoints(): HITLCheckpoint[] {
  if (!existsSync(config.paths.hitl)) return [];

  const files = readdirSync(config.paths.hitl).filter(f => f.endsWith('.json'));
  const pending: HITLCheckpoint[] = [];

  for (const file of files) {
    const content = readFileSync(join(config.paths.hitl, file), 'utf-8');
    const checkpoint = JSON.parse(content) as HITLCheckpoint;
    if (checkpoint.status === 'pending') {
      pending.push(checkpoint);
    }
  }

  return pending;
}

/**
 * Remove um checkpoint resolvido.
 */
export function cleanupCheckpoint(checkpointId: string): void {
  const filePath = join(config.paths.hitl, `${checkpointId}.json`);
  if (existsSync(filePath)) unlinkSync(filePath);
}
