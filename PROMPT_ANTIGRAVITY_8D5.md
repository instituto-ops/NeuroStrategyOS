# Prompt para Antigravity — Tarefa: Teste E2E 8D.5 + Commit

## Contexto
Trabalhei com o agente Cowork hoje (2026-05-03) completando as Fases 8A–8D do Agente Operacional NeuroEngine.
Todo o contexto atualizado está em `estado_atual.md` na raiz do repo.

Resumo do que foi feito nessa sessão:
- Criado `frontend/public/js/agent-workspace.js` (Mission Control — 6 abas)
- Criado `frontend/public/js/agent-fab.js` (FAB universal — 5 estados visuais)
- Corrigidos 4 bugs críticos na bridge e no daemon (detalhes em `estado_atual.md`)
- Adicionadas 3 tools Vórtex faltantes (`list_drafts`, `list_published`, `micro_edit`)
- Removido SparkEngine (legacy overlay)
- Criados ADR-011 e ADR-012

## O que preciso que você faça

### Passo 1 — Criar branch
```bash
git checkout -b feat/agent-workspace-shell
```

### Passo 2 — Iniciar o daemon
Abra um terminal separado (ou use o terminal integrado do Antigravity):
```bash
cd agentd && npm run dev
```
Aguarde o log: `[AGENT] Named Pipe escutando em \\.\pipe\agentd`
Se aparecer erros de compilação TypeScript, me mostre o output completo.

### Passo 3 — Teste E2E no browser
Abra http://localhost:3000 no browser.
Navegue para a seção `#agent-workspace` (menu "🤖 Agente" → "Mission Control").
Se o menu não aparecer, rode no console DevTools:
```javascript
localStorage.setItem('neuroengine_flags', JSON.stringify({ agentWorkspace: true }));
location.reload();
```

Execute no console DevTools:
```javascript
// Teste 1 — Status (deve retornar FSM state = "IDLE", não "OFFLINE")
agentAPI.getStatus().then(s => console.log('STATUS:', s))

// Teste 2 — Tool Vórtex
agentAPI.call('tool.invoke', { toolId: 'vortex.list_drafts', args: {} })
  .then(r => console.log('DRAFTS:', r))
  .catch(e => console.error('ERRO:', e.message))

// Teste 3 — HITL flow (apenas se Testes 1 e 2 passaram)
agentAPI.call('tool.invoke', {
  toolId: 'vortex.publish',
  args: { filename: '_test_hitl.html', content: '<h1>Teste HITL</h1>', message: 'teste E2E 8D.5' }
}).then(r => console.log('PUBLISH:', r)).catch(e => console.error('ERRO:', e.message))
// Esperado: card de aprovação aparece na aba HITL do Mission Control
```

Me diga o resultado de cada teste (output do console).

### Passo 4 — Se tudo passou, commit
```bash
git add -A
git commit -m "feat: Agent Workspace 8A-8D — Mission Control, FAB, bridge Vórtex, 4 bugs, 3 tools"
```

### Passo 5 — Verificar Fase 9
Após o commit, cheque se os MCPs extras da Fase 9 já foram implementados:
```bash
ls agentd/src/mcp/
ls console/ 2>/dev/null || echo "console/ não existe"
```
Me diz o que encontrou.

## Critérios de sucesso
- [ ] `npm run dev` sobe sem erros TypeScript
- [ ] `agentAPI.getStatus()` retorna `{ connected: true, status: { fsmState: 'IDLE' } }`
- [ ] `vortex.list_drafts` retorna array (mesmo vazio)
- [ ] `vortex.publish` cria checkpoint HITL visível na aba HITL
- [ ] Commit criado na branch `feat/agent-workspace-shell`

## Se encontrar erros
- Erro de TypeScript no `npm run dev` → me mostre o stack trace completo
- Erro `ENOENT` no pipe → daemon ainda não subiu, aguarde mais 5s
- Erro 401 na Vórtex API → cheque se `.env` na raiz tem `VORTEX_API_KEY` e `GEMINI_API_KEY`
- Erro `method not found` → me diga qual método retornou o erro (pode ser bug residual na bridge)
