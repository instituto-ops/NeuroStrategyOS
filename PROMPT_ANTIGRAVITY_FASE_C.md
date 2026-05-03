# Prompt para Antigravity — Validar Fase C (Fix Gemini 403)

## Contexto
O Cowork resolveu o bloqueio 403 do Gemini. Todo o contexto está em `estado_atual.md`.

**O que foi corrigido nesta sessão:**
- `agentd/src/brain/gemini.ts`: adicionado `{ apiVersion: 'v1beta' }` como `RequestOptions` para modelos `gemini-2.*` — isso resolve o 403 que impedia o Brain de fazer chamadas LLM reais
- `agentd/src/config.ts`: adicionado `modelId: process.env.MODEL_NAVIGATION || 'gemini-2.5-flash'`
- `agentd/src/boot.ts`: passa `config.daemon.modelId` ao `GeminiClient`
- `agentd/test-gemini.mjs`: script de diagnóstico standalone para validar a API antes de reiniciar o daemon

**Arquivos modificados:**
- `agentd/src/brain/gemini.ts` (linhas 38-45 — novo bloco `needsBeta` + `requestOptions`)
- `agentd/src/config.ts` (adicionado `modelId` em `daemon`)
- `agentd/src/boot.ts` (passa `config.daemon.modelId` e loga o modelo)
- `agentd/test-gemini.mjs` (NOVO — script de smoke test isolado)

---

## Passo 1 — Commit das correções da Fase C

```bash
cd "C:\Users\artes\Documents\NeuroStrategy OS - VM\Nucleo de Marketing\agentd"
git add -A
git commit -m "fix: Fase C — Gemini 403 resolvido (v1beta para 2.x), modelId configurável via MODEL_NAVIGATION"
```

---

## Passo 2 — Teste isolado da API Gemini

Execute no diretório `agentd`:
```bash
node --env-file=../.env test-gemini.mjs
```

**Resultado esperado:**
```
🔑 API Key: AIzaSyCKC6N...
🤖 Modelo: gemini-2.5-flash
🔄 API Version: v1beta

📡 Enviando prompt de teste...

✅ SUCESSO — Resposta: "OK_GEMINI_FUNCIONANDO"

🟢 Brain pode usar este modelo. Reinicie o daemon para aplicar as correções.
```

**Se ainda der 403:** tente com gemini-1.5-flash para isolar se é problema da key ou do modelo:
```bash
MODEL_NAVIGATION=gemini-1.5-flash node --env-file=../.env test-gemini.mjs
```
Se `gemini-1.5-flash` funcionar e `gemini-2.5-flash` não, o problema é acesso ao modelo 2.5 — nesse caso mude o `.env` raiz: `MODEL_NAVIGATION=gemini-1.5-flash` e continue.

---

## Passo 3 — Build + testes

```bash
npm run build
npm run test
```

Critério: build sem erros TypeScript, 48 testes passando.

---

## Passo 4 — Reiniciar daemon e smoke test do Brain

```bash
# Terminal 1 — reiniciar daemon
npm run dev
```

No console do browser (`http://localhost:3000`), executar:

```javascript
// Teste 1 — Iniciar tarefa no Brain
const session = await agentAPI.call('agent.run', {
  task: 'Liste os rascunhos disponíveis no Vórtex'
});
console.log('SESSION CRIADA:', session.sessionId, session.status);

// Aguardar 8 segundos e verificar status
await new Promise(r => setTimeout(r, 8000));

const status = await agentAPI.call('agent.session_status', {
  sessionId: session.sessionId
});
console.log('STATUS FINAL:', status.status, '|', status.summary?.slice(0, 100));
console.log('ITERATIONS:', status.iterationCount);
```

---

## Critérios de Sucesso da Fase C

- [ ] `test-gemini.mjs` retorna `✅ SUCESSO`
- [ ] `npm run build` passa sem erros TypeScript
- [ ] `npm run test` passa (48 testes)
- [ ] `agent.run({ task: 'Liste os rascunhos do Vórtex' })` retorna `{ sessionId, status: 'started' }`
- [ ] Após ~8s, `agent.session_status` retorna `{ status: 'completed', summary: '...' }`
- [ ] Nos logs do daemon aparece: `tool.invoke vortex.list_drafts → success: true`
- [ ] FSM transitou: IDLE → DIALOGUE → DIAGNOSIS → EXECUTING → IDLE (visível nos logs)

---

## Se o Brain completar com sucesso → Próxima Fase

Se todos os critérios passarem, o agente está **operacional** para tarefas com `vortex.*`. 

A próxima fase é **Fase D: HITL Execution** — fazer `resolveCheckpoint()` reexecutar a tool aprovada automaticamente.

Arquivo de plano detalhado: `CSA/4_Execucao_e_Historico/Planos_de_Execucao/AUDITORIA_AGENTE_v1.md` (Fase C do plano).

---

## Notas técnicas

- O `.env` raiz tem `GEMINI_API_KEY=AIzaSyCKC6NtEg5kKkBaIoVIPinjxY-UDJTd1_c` e `MODEL_NAVIGATION=gemini-2.5-flash`
- O `config.ts` sobe até 5 níveis buscando `estado_atual.md` como âncora do repo root e então carrega o `.env` do mesmo diretório
- `gemini.ts` detecta automaticamente `gemini-2.*` e usa `v1beta`; `gemini-1.x` usam `v1` padrão
- `brain.ts` tem Morgue trigger: se o mesmo erro aparecer 3x seguidas, encerra a sessão como `morgue` e registra na memória
- `agent.run` retorna imediatamente com `sessionId`; o loop roda em background — use `agent.session_status` para polling
