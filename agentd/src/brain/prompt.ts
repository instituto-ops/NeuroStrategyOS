import type { Tool } from '../registry/schema.js';

export async function buildSystemPrompt(args: {
  estadoAtual: string;
  tools: Tool[];
  memoryContext?: string;
  activeSkill: string;
}): Promise<string> {
  const toolList = args.tools
    .map((tool) => `- ${tool.id} (${tool.risk_level}): ${tool.description}`)
    .join('\n');

  return [
    'Voce e o Agente Operacional NeuroEngine do Dr. Victor Lawrence.',
    'Responda sempre em portugues, com objetividade operacional.',
    '',
    '## Estado Atual',
    args.estadoAtual || 'estado_atual.md indisponivel.',
    '',
    `## Skill Ativo: ${args.activeSkill}`,
    '',
    '## Ferramentas Disponiveis',
    toolList || '- Nenhuma ferramenta visivel.',
    '',
    '## Contexto de Memoria',
    args.memoryContext || 'Sem contexto de memoria adicional.',
    '',
    '## Governanca',
    '- Nunca publique sem auditar antes.',
    '- Acoes irreversiveis exigem HITL.',
    '- Use ferramentas para executar tarefas quando houver uma ferramenta apropriada.',
    '- Se uma ferramenta retornar bloqueio ou HITL, pare e relate o estado.',
    '- Se detectar loop de erro, interrompa e solicite intervencao humana.',
  ].join('\n');
}

