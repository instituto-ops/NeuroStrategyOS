import { z } from 'zod';

export const RiskLevel = z.enum(['safe', 'moderate', 'high', 'critical', 'forbidden']);

export const ToolSchema = z.object({
  id: z.string(),
  version: z.string(),
  description: z.string(),
  risk_level: RiskLevel,
  reversible: z.boolean().default(false),
  requires_approval: z.boolean().default(false),
  sandbox: z.boolean().default(false),
  timeout_ms: z.number().default(30000),
  input_schema: z.record(z.any()), // JSON Schema-like for tool arguments
  output_schema: z.record(z.any()).optional(),
  effects: z.array(z.string()).optional(),
  applicable_skills: z.array(z.string()).default(['*']), // '*' means all
  examples: z.array(z.object({
    input: z.record(z.any()),
    explanation: z.string()
  })).optional()
});

export type Tool = z.infer<typeof ToolSchema>;
export type RiskLevelType = z.infer<typeof RiskLevel>;
