import type { FunctionDeclaration } from '@google/generative-ai';
import type { Tool } from '../registry/schema.js';

const TOOL_NAME_PREFIX = 'tool__';

export function toolIdToGeminiName(toolId: string): string {
  return `${TOOL_NAME_PREFIX}${toolId.replace(/[^a-zA-Z0-9_-]/g, '__')}`.slice(0, 64);
}

export function geminiNameToToolId(name: string, tools: FunctionDeclaration[] = []): string {
  const declaration = tools.find((tool) => tool.name === name);
  const toolId = declaration?.description?.match(/\[toolId: ([^\]]+)\]/)?.[1];
  if (toolId) return toolId;

  if (!name.startsWith(TOOL_NAME_PREFIX)) return name;
  return name.slice(TOOL_NAME_PREFIX.length).replace(/__/g, '.');
}

export function toolsToGeminiFunctions(tools: Tool[]): FunctionDeclaration[] {
  return tools.map((tool) => ({
    name: toolIdToGeminiName(tool.id),
    description: `[toolId: ${tool.id}] ${tool.description}`,
    parameters: tool.input_schema as FunctionDeclaration['parameters'],
  }));
}

