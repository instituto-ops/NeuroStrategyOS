/**
 * agentd/src/kernel/evaluator.ts
 *
 * Avaliador puro de predicados. Sem efeitos colaterais.
 * Resolve cada predicado contra os dados da invocação.
 */

import type { RulePredicate, ToolCall, InvocationContext } from './types.js';

/**
 * Resolve o valor de um campo no contexto da invocação.
 */
function resolveField(field: string, toolCall: ToolCall, ctx: InvocationContext, toolMeta?: Record<string, unknown>): unknown {
  if (field === 'tool.id') return toolCall.toolId;
  if (field === 'tool.risk_level') return toolMeta?.risk_level ?? 'unknown';
  if (field.startsWith('args.')) {
    const key = field.slice(5);
    return toolCall.args[key];
  }
  if (field.startsWith('ctx.')) {
    const key = field.slice(4);
    if (key === 'skill') return ctx.skill;
    if (key === 'fsm_state') return ctx.fsmState;
    if (key === 'sessionId') return ctx.sessionId;
  }
  return undefined;
}

/**
 * Avalia um único predicado.
 */
function evaluatePredicate(pred: RulePredicate, toolCall: ToolCall, ctx: InvocationContext, toolMeta?: Record<string, unknown>): boolean {
  const actual = resolveField(pred.field, toolCall, ctx, toolMeta);
  const actualStr = String(actual ?? '');

  switch (pred.op) {
    case 'eq':
      return actualStr === String(pred.value);
    case 'neq':
      return actualStr !== String(pred.value);
    case 'in':
      return Array.isArray(pred.value) && pred.value.includes(actualStr);
    case 'matches': {
      try {
        return new RegExp(String(pred.value)).test(actualStr);
      } catch {
        return false;
      }
    }
    case 'startsWith':
      return actualStr.startsWith(String(pred.value));
    default:
      return false;
  }
}

/**
 * Avalia todos os predicados de uma regra com o combinador (all/any).
 */
export function evaluatePredicates(
  predicates: RulePredicate[],
  match: 'all' | 'any',
  toolCall: ToolCall,
  ctx: InvocationContext,
  toolMeta?: Record<string, unknown>,
): boolean {
  if (predicates.length === 0) return true; // sem predicados = match universal

  if (match === 'all') {
    return predicates.every(p => evaluatePredicate(p, toolCall, ctx, toolMeta));
  }
  return predicates.some(p => evaluatePredicate(p, toolCall, ctx, toolMeta));
}
