/**
 * agentd/src/kernel/kernel.ts
 *
 * Permission Kernel — gatekeeper determinístico.
 * Default deny. Carrega regras YAML, avalia por prioridade, retorna veredicto.
 */

import { readFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';
import { evaluatePredicates } from './evaluator.js';
import type { Decision, ToolCall, InvocationContext, KernelVerdict, PermissionRule, RuleFile } from './types.js';
import type { Tool } from '../registry/schema.js';
import { logger } from '../logger/logger.js';

export class PermissionKernel {
  private rules: PermissionRule[] = [];

  constructor(private rulesDir: string) {}

  /**
   * Carrega todas as regras YAML, ordena por prioridade.
   */
  async load(): Promise<void> {
    if (!existsSync(this.rulesDir)) {
      mkdirSync(this.rulesDir, { recursive: true });
      logger.warn({ dir: this.rulesDir }, 'Rules directory created (empty — default deny ativo)');
      return;
    }

    const files = readdirSync(this.rulesDir)
      .filter(f => f.endsWith('.yaml') || f.endsWith('.yml'))
      .sort(); // Ordem léxica garante 00-defaults antes de 10-filesystem etc.

    for (const file of files) {
      const content = readFileSync(join(this.rulesDir, file), 'utf-8');
      const parsed = yaml.load(content) as RuleFile;
      if (parsed?.rules && Array.isArray(parsed.rules)) {
        this.rules.push(...parsed.rules);
      }
    }

    // Ordena por prioridade (lower = first)
    this.rules.sort((a, b) => a.priority - b.priority);
    logger.info({ ruleCount: this.rules.length }, 'Permission Kernel rules loaded');
  }

  /**
   * Avalia uma chamada de tool.
   * Percorre regras por prioridade, retorna a primeira que casar.
   * Se nenhuma casar: DEFAULT DENY (block).
   */
  decide(toolCall: ToolCall, ctx: InvocationContext, toolMeta?: Tool): KernelVerdict {
    const metaRecord = toolMeta ? { risk_level: toolMeta.risk_level } : undefined;

    for (const rule of this.rules) {
      const matches = evaluatePredicates(rule.predicates, rule.match, toolCall, ctx, metaRecord);
      if (matches) {
        const verdict: KernelVerdict = {
          decision: rule.decision,
          toolId: toolCall.toolId,
          reason: rule.description ?? `Matched rule: ${rule.id}`,
          matchedRule: rule.id,
          ctx,
          timestamp: new Date().toISOString(),
        };
        logger.debug({ verdict: verdict.decision, rule: rule.id, tool: toolCall.toolId }, 'Kernel decision');
        return verdict;
      }
    }

    // DEFAULT DENY
    const verdict: KernelVerdict = {
      decision: 'block',
      toolId: toolCall.toolId,
      reason: 'No rule matched — default deny',
      ctx,
      timestamp: new Date().toISOString(),
    };
    logger.warn({ tool: toolCall.toolId }, 'Kernel: DEFAULT DENY (no rule matched)');
    return verdict;
  }

  /** Retorna todas as regras carregadas */
  get loadedRules(): readonly PermissionRule[] {
    return this.rules;
  }
}
