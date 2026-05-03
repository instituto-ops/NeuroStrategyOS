## 🟢 Verdade Atual
- Fases 1–9 do agentd concluídas (tag `agente-operacional-v1`).
- **Fases 8A, 8B, 8C, 8D (código) completas** (2026-05-03 — sessão Cowork):
  - Mission Control (`#agent-workspace`): 6 abas (Status/HITL/Artifacts/Logs/Memory/Command), smoke test aprovado via Kapture.
  - Agent FAB (`agent-fab.js`): 5 estados visuais, badge HITL, long-press navega para #agent-workspace.
  - SparkEngine V5.30 ALPHA removido: `#spark-trigger`, `#spark-panel`, `spark-engine.js` deletados de `index.html`.
  - ADR-011 (`vortex_como_oficina`) e ADR-012 (`agent_workspace_separado`) congelados.
  - Bridge Agent↔Vórtex: 4 bugs críticos corrigidos, 3 tools adicionadas, SSE com heartbeat 30s.
- **Menu `🤖 Agente` ativo** no browser de Dr. Victor (localStorage flag `neuroengine_flags.agentWorkspace = true` persistida).

## 📋 Arquivos Modificados (Fases 8A–8D)

| Arquivo | O que mudou |
|---------|-------------|
| `frontend/public/css/agent-workspace.css` | CRIADO — estilos Mission Control |
| `frontend/public/js/agent-workspace.js` | CRIADO — 6 abas, polling, SSE, HITL, Artifacts, Command |
| `frontend/public/js/agent-fab.js` | CRIADO — FAB universal 5 estados, badge, popover, long-press |
| `frontend/public/js/app.js` | EDITADO — `agentFAB.init()` + `agentWorkspace` lifecycle |
| `frontend/public/index.html` | EDITADO — seção #agent-workspace, menu Agente, scripts, SparkEngine removido |
| `agentd/src/config.ts` | EDITADO — `findEnvFile()` ancora em `estado_atual.md`; aceita `GEMINI_API_KEY` |
| `agentd/src/mcp/vortex.ts` | EDITADO — handlers: `vortex.list_drafts`, `vortex.list_published`, `vortex.micro_edit` |
| `agentd/src/skills/vortex/vortexSkill.ts` | EDITADO — métodos: `listDrafts()`, `listPublished()`, `microEdit()` |
| `agentd/registry/tools/vortex.yaml` | EDITADO — 3 tools adicionadas |
| `agentd/registry/rules/40-vortex.yaml` | EDITADO — seletores corrigidos para tools reais |
| `frontend/agent-bridge.js` | EDITADO — `agent.status`, `tool.invoke` (2x), SSE JSONL, heartbeat |
| `CSA/1_Diretrizes_e_Memoria/ADRs/ADR-011_vortex_como_oficina.md` | CRIADO |
| `CSA/1_Diretrizes_e_Memoria/ADRs/ADR-012_agent_workspace_separado.md` | CRIADO |

## 📋 Bugs Corrigidos (8D)
- `config.ts` dotenv buscava `agentd/.env` (inexistente) → corrigido: `findEnvFile()` sobe diretórios ancorando em `estado_atual.md`
- `config.ts` usava `GOOGLE_GENAI_API_KEY` → corrigido: aceita `GEMINI_API_KEY || GOOGLE_GENAI_API_KEY`
- `agent-bridge.js` chamava `fsm.status` (não registrado) → corrigido: `agent.status`
- `agent-bridge.js` chamava `tools.invoke` (typo em 2 lugares) → corrigido: `tool.invoke`

## 🔴 Pendentes (bloqueados por CLI/daemon)

### 8A.2 — Branch de feature (requer terminal Windows)
```bash
git checkout -b feat/agent-workspace-shell
```

### 8D.5 — Teste E2E (requer daemon ativo)
```bash
# Terminal 1 — iniciar daemon
cd agentd && npm run dev

# Verificar: log "Named Pipe escutando em \\.\pipe\agentd"
```
Depois, no browser (http://localhost:3000), console DevTools:
```javascript
// Teste 1 — FSM deve retornar IDLE (não OFFLINE)
agentAPI.getStatus().then(console.log)

// Teste 2 — Vórtex tool smoke
agentAPI.call('tool.invoke', { toolId: 'vortex.list_drafts', args: {} }).then(console.log)

// Teste 3 — HITL flow
agentAPI.call('tool.invoke', {
  toolId: 'vortex.publish',
  args: { filename: 'test.html', content: '<h1>Teste</h1>', message: 'teste HITL' }
}).then(console.log)
// → deve aparecer card de aprovação na aba HITL do #agent-workspace
```

### 8D.5 — Commit final
```bash
git add -A
git commit -m "feat: Agent Workspace 8A-8D — Mission Control, FAB, bridge Vórtex, 4 bugs, 3 tools"
```

## ⏭️ Próximo Passo Lógico (após 8D.5)
- Se E2E passou: tag `agent-workspace-v1`, merge para main.
- Fase 9 (Browser, MCPs extras, Web Console) já consta como concluída no plano — verificar se código existe ou se é aspiracional.
  - Checar: `ls agentd/src/mcp/` — se existir `browser.ts`, `vercel.ts`, `google.ts`, `documents.ts` → já implementado.
  - Checar: `ls console/` — se existir → Web Console já foi construído.
