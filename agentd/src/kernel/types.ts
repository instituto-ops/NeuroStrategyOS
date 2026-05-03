/**
 * agentd/src/kernel/types.ts
 *
 * Tipos do Permission Kernel.
 * Decision é o resultado final de toda avaliação.
 */

/** As 4 decisões possíveis do Kernel */
export type Decision = 'allow' | 'review' | 'block' | 'forbidden';

/** Contexto que acompanha cada invocação de tool */
export interface InvocationContext {
  sessionId: string;
  skill: string;
  fsmState: string;
  timestamp: string;
}

/** Chamada de tool que o Kernel precisa avaliar */
export interface ToolCall {
  toolId: string;
  args: Record<string, unknown>;
}

/** Resultado completo da decisão do Kernel */
export interface KernelVerdict {
  decision: Decision;
  toolId: string;
  reason: string;
  matchedRule?: string;
  ctx: InvocationContext;
  timestamp: string;
}

/** Predicado individual de uma regra */
export interface RulePredicate {
  field: string;               // 'tool.id' | 'tool.risk_level' | 'args.path' | 'ctx.skill' | 'ctx.fsm_state'
  op: 'eq' | 'neq' | 'in' | 'matches' | 'startsWith';
  value: string | string[];
}

/** Regra declarativa do Permission Kernel */
export interface PermissionRule {
  id: string;
  description?: string;
  priority: number;            // lower = higher priority
  decision: Decision;
  match: 'all' | 'any';       // combinador de predicados
  predicates: RulePredicate[];
}

/** Arquivo de regras (1 YAML = N regras) */
export interface RuleFile {
  rules: PermissionRule[];
}
