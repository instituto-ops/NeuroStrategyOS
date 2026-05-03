# Prompt para Antigravity — Validar Fase A + Iniciar Fase B

## Contexto
A Fase A (Correções Cirúrgicas) foi implementada pelo agente Cowork. Todo o contexto atualizado está em `estado_atual.md`.

O que foi feito nessa sessão:
- Corrigidos 6 bugs críticos (schemas errados de regras, imports, YAMLs faltantes)
- Tool Registry: 31 tools com YAMLs corretos
- Regras do Kernel: 9 arquivos todos no schema correto
- Nova tool: `filesystem.patch_file` (handler + YAML + regra)
- Nova tool: `git.push` (handler + YAML + HITL obrigatório)
- `allow-safe-tools-always` (priority 4) corrigido em 00-defaults.yaml

## Passo 1 — Commit da Fase A
```bash
git add -A
git commit -m "fix: Fase A — 6 bugs críticos, 31 tools registry, 9 regras kernel corrigidas"
```

## Passo 2 — Reiniciar daemon e smoke test
```bash
# Terminal 1 — reiniciar daemon
cd agentd && npm run dev
```

No console do browser (http://localhost:3000), executar:
```javascript
// Teste 1 — Registry completo (deve retornar 31 tools)
agentAPI.call('registry.list').then(tools => console.log('TOTAL TOOLS:', tools.length))

// Teste 2 — vortex.list_drafts em IDLE (deve retornar SUCCESS — safe tools permitidas em IDLE)
agentAPI.call('tool.invoke', { toolId: 'vortex.list_drafts', args: {} })
  .then(r => console.log('VORTEX DRAFTS:', r.success, r.output || r.error))

// Teste 3 — git.status em IDLE (safe — deve retornar SUCCESS)
agentAPI.call('tool.invoke', { toolId: 'git.status', args: { cwd: '.' } })
  .then(r => console.log('GIT STATUS:', r.success, r.output?.stdout?.slice(0, 100) || r.error))

// Teste 4 — filesystem.patch_file em IDLE (moderate — deve ser BLOCK por block-idle)
agentAPI.call('tool.invoke', { toolId: 'filesystem.patch_file', args: { path: 'test.txt', search: 'x', replace: 'y' } })
  .then(r => console.log('PATCH (deve ser BLOCK):', r.success, r.error))

// Teste 5 — vortex.publish (deve ser REVIEW/HITL — high risk)
agentAPI.call('tool.invoke', { toolId: 'vortex.publish', args: { filename: 'test.html', content: '<h1>test</h1>', message: 'teste' } })
  .then(r => console.log('PUBLISH (deve ser AWAITING HITL):', r.error))
```

Critérios de sucesso da Fase A:
- [ ] `registry.list` retorna 31 tools
- [ ] `vortex.list_drafts` → `{ success: true }` (era DEFAULT DENY antes)
- [ ] `git.status` → `{ success: true }`
- [ ] `filesystem.patch_file` em IDLE → `{ success: false, error: "Blocked: ..." }`
- [ ] `vortex.publish` → `{ success: false, error: "Awaiting HITL..." }`

## Passo 3 — Iniciar Fase B: Brain / Loop LLM
Se os testes passaram, criar os seguintes arquivos:

### B.1 — `agentd/src/brain/gemini.ts`
Wrapper sobre `@google/generative-ai` com function calling.

Interface esperada:
```typescript
export interface GeminiToolCall {
  toolId: string;
  args: Record<string, unknown>;
}

export interface GeminiResponse {
  text?: string;
  toolCalls?: GeminiToolCall[];
  finishReason: 'stop' | 'tool_use' | 'max_tokens' | 'error';
}

export class GeminiClient {
  constructor(apiKey: string, modelId?: string)
  
  async callWithTools(
    systemPrompt: string,
    userMessage: string,
    tools: FunctionDeclaration[],
    history?: Content[]
  ): Promise<GeminiResponse>
}
```

Usar `gemini-2.5-flash` por padrão.
Mapear `FunctionCall` do SDK para `GeminiToolCall` (campo `name` → `toolId`).

### B.2 — `agentd/src/brain/toolParser.ts`
Converte `Tool[]` do registry para `FunctionDeclaration[]` do Gemini SDK.

```typescript
import type { Tool } from '../registry/schema.js';
import type { FunctionDeclaration } from '@google/generative-ai';

export function toolsToGeminiFunctions(tools: Tool[]): FunctionDeclaration[]
// Mapeia: tool.id → name, tool.description → description, tool.input_schema → parameters
```

### B.3 — `agentd/src/brain/sessionManager.ts`
Persiste sessões de trabalho em `~/.neuroengine/sessions/`.

```typescript
export interface AgentSession {
  id: string;
  task: string;
  startedAt: string;
  history: Content[];       // histórico Gemini
  activeSkill: string;
  iterationCount: number;
  status: 'active' | 'awaiting_hitl' | 'completed' | 'failed';
  lastError?: string;
}

export class SessionManager {
  async start(task: string, skill?: string): Promise<AgentSession>
  async get(id: string): Promise<AgentSession | null>
  async update(id: string, delta: Partial<AgentSession>): Promise<void>
  async end(id: string, outcome: 'success' | 'failure', summary?: string): Promise<void>
  async listActive(): Promise<AgentSession[]>
}
```

### B.4 — `agentd/src/brain/prompt.ts`
Constrói o system prompt para o Gemini com contexto do agente.

```typescript
export async function buildSystemPrompt(args: {
  estadoAtual: string;              // conteúdo bruto do estado_atual.md
  tools: Tool[];                    // tools visíveis para o skill ativo
  memoryContext?: string;           // resultado de memory.search (top 3 factual + 2 stylistic)
  activeSkill: string;
}): Promise<string>
```

O prompt deve incluir:
1. Identidade: "Você é o Agente Operacional NeuroEngine do Dr. Victor Lawrence..."
2. Estado atual (estado_atual.md)
3. Lista de ferramentas disponíveis (apenas as do skill ativo)
4. Contexto de memória (se disponível)
5. Regras de governança: nunca publicar sem auditar antes; sempre HITL para irreversíveis
6. Instruções de output: responder em português; usar as ferramentas disponíveis para executar tarefas

### B.5 — `agentd/src/brain/brain.ts` — O Loop Principal

```typescript
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

  async run(task: string, existingSessionId?: string): Promise<BrainResult>
}
```

**Loop interno (máximo 20 iterações):**
1. `session = sessionManager.start(task)` ou `sessionManager.get(existingSessionId)`
2. `machine.dispatch('START_DIALOGUE')` se em IDLE
3. `estado = readEstadoAtual()` — contexto atual
4. `tools = registry.filterBySkill(session.activeSkill)`
5. `functions = toolsToGeminiFunctions(tools)`
6. `systemPrompt = buildSystemPrompt({ estadoAtual, tools, ... })`
7. `machine.dispatch('START_DIAGNOSIS')`

**Loop:**
```
a. response = await gemini.callWithTools(systemPrompt, mensagem_atual, functions, session.history)
b. Append response ao session.history
c. Se response.finishReason === 'stop' (sem tool calls):
   → machine.dispatch('COMPLETE')
   → sessionManager.end(id, 'success', response.text)
   → emitEvent({ type: 'FSM', message: 'Tarefa concluída', data: response.text })
   → return { status: 'completed', summary: response.text, ... }
d. Para cada toolCall em response.toolCalls:
   i. machine.dispatch('START_PLANNING') se em DIAGNOSIS
   ii. machine.dispatch('START_EXECUTION') se em PLANNING
   iii. ctx = { sessionId, skill, fsmState: machine.current().state, timestamp }
   iv. result = await executeTool(toolCall, ctx, kernel, registry)
   v. Emitir SSE event com resultado da tool
   vi. Se result.error contém 'Awaiting HITL':
       → machine.dispatch('REQUEST_APPROVAL')
       → sessionManager.update(id, { status: 'awaiting_hitl' })
       → emitEvent({ type: 'HITL', message: `Aguardando aprovação: ${toolCall.toolId}` })
       → return { status: 'awaiting_hitl', ... }
   vii. Append result ao session.history como "function response"
e. Se mesmo erro 3x seguidas: Morgue trigger
f. iterationCount++
```

**Morgue trigger:**
```typescript
if (isSameError(lastErrors, 3)) {
  machine.dispatch('START_REPORTING');
  // Registrar na memória morgue
  await memory?.remember('morgue', `Loop de erro: ${task} — ${lastError}`, { sessionId });
  // Criar HITL solicitando intervenção
  return { status: 'morgue', error: `Loop de erro detectado após 3 tentativas: ${lastError}` };
}
```

### B.6 — Registrar método IPC `agent.run` em methods.ts
```typescript
registerMethod('agent.run', async (params) => {
  if (!brain) throw new Error('Brain não inicializado');
  const task = params.task as string;
  const skill = (params.skill as string) ?? 'vortex';
  const sessionId = params.sessionId as string | undefined;
  
  // Inicia em background — retorna sessionId imediatamente
  const session = await sessionManager.start(task, skill);
  brain.run(task, session.id).catch(err => 
    logger.error({ err, sessionId: session.id }, 'Brain.run falhou')
  );
  return { sessionId: session.id, status: 'started', task };
});

registerMethod('agent.session_status', async (params) => {
  const session = await sessionManager.get(params.sessionId as string);
  if (!session) throw new Error(`Sessão não encontrada: ${params.sessionId}`);
  return session;
});

registerMethod('agent.list_sessions', async () => {
  return await sessionManager.listActive();
});
```

### B.7 — Integrar Brain ao boot.ts
Após registrar os MCPs, adicionar:
```typescript
const { Brain } = await import('./brain/brain.js');
const { GeminiClient } = await import('./brain/gemini.js');
const { SessionManager } = await import('./brain/sessionManager.js');

const geminiClient = new GeminiClient(config.daemon.apiKey);
const sessionManager = new SessionManager(config.paths.sessions);
export let brain: Brain | null = null;
brain = new Brain(geminiClient, machine, registry, kernel, memory, sessionManager);
logger.info('🧠 Brain inicializado — agente pronto para receber tarefas');
```

### B.8 — Teste do Brain
Após boot:
```javascript
// No console do browser:
agentAPI.call('agent.run', { task: 'Liste os rascunhos disponíveis no Vórtex' })
  .then(r => console.log('SESSION:', r.sessionId))
  .then(() => new Promise(r => setTimeout(r, 5000)))  // aguarda 5s
  .then(() => agentAPI.call('agent.session_status', { sessionId: 'ID_DO_SESSION' }))
  .then(s => console.log('STATUS:', s.status, s.summary))
```

Verificar também no Live Log (aba Logs do Mission Control) que os eventos aparecem em tempo real.

## Critérios de Sucesso da Fase B
- [ ] `agent.run({ task: 'liste os rascunhos' })` retorna `{ sessionId, status: 'started' }`
- [ ] Brain chama `vortex.list_drafts` automaticamente
- [ ] Resultado aparece no Live Log via SSE
- [ ] `agent.session_status` retorna `{ status: 'completed', summary: '...' }` após ~10s
- [ ] FSM transicionou: IDLE → DIALOGUE → DIAGNOSIS → EXECUTING → IDLE

## Notas de implementação
- `@google/generative-ai` já está instalado no agentd (`npm list @google/generative-ai`)
- Usar `model.generateContent()` com `tools` e `toolConfig` para function calling
- O `Content[]` do histórico usa format `{ role: 'user'|'model', parts: [...] }`
- Para tool results, usar `{ role: 'user', parts: [{ functionResponse: { name, response } }] }`
- Importações com extensão `.js` (não `.ts`) para compatibilidade ESM
