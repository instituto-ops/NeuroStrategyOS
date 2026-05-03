## 🟢 Verdade Atual
- **Fase A (Correções Cirúrgicas) COMPLETA** (2026-05-03):
  - 6 bugs críticos corrigidos (BUG-01 a BUG-06)
  - Tool Registry: **31 tools** com YAMLs corretos
  - Regras do Kernel: **9 arquivos** todos no schema correto
  - `filesystem.patch_file` implementado (handler + YAML + regra)
  - `git.push` implementado (handler + YAML + regra com HITL)
  - `allow-safe-tools-always` (priority 4) — tools safe executam mesmo em IDLE
  - Import `.ts` → `.js` corrigido em memoryManager.ts
- **Branch `feat/agent-workspace-shell`** — inclui todas as correções da Fase A.

## 📋 Registry Atual (31 tools / 9 regras)

| Domínio | Tools | Status |
|---------|-------|--------|
| filesystem | read_file, write_file, list_dir, search, patch_file | ✅ 5 tools |
| terminal | run | ✅ 1 tool |
| git | status, diff, add, commit, log, branch, checkout, push | ✅ 8 tools |
| vortex | generate, publish, list_drafts, save_draft, audit, list_published, list_media, micro_edit | ✅ 8 tools |
| browser | open, click, type, screenshot, get_content, close | ✅ 6 tools |
| google | search, ga4_query | ✅ 2 tools (Drive/Sheets/Gmail na Fase F) |
| vercel | list_deployments, get_deployment, trigger_deploy | ✅ 3 tools |
| documents | parse_pdf, parse_docx | ✅ 2 tools |

## ⏭️ Próxima Fase: B — Brain / Loop LLM

**O componente mais crítico**: loop de raciocínio que conecta instrução → Gemini → FSM → tools → resultado.

Arquivos a criar:
```
agentd/src/brain/
├── gemini.ts          ← Wrapper Gemini com function calling
├── prompt.ts          ← Template system prompt (contexto, tools, CSA, estilo)
├── toolParser.ts      ← Tool[] → FunctionDeclaration[] do Gemini SDK
├── sessionManager.ts  ← Ciclo de vida de sessões de trabalho
└── brain.ts           ← O loop principal: think → act → observe
```

IPC novo: `agent.run({ task, skill })` — inicia sessão autônoma e retorna sessionId.

## 🔴 Ainda Pendente (não bloqueia Fase B)
- **Fase C**: HITL Execution (aprovados não executam) — implementar após Brain
- **Fase D**: Registry OK. ✅ Completo como parte da Fase A
- **Fase E**: Console Web (App.tsx vazio)
- **Fase F**: Google MCPs completos (Drive, Sheets, GA4, Calendar, Gmail)
- **Fase G**: Browser isolado (Playwright como child process)

## 🔴 Restrições Ativas
- **AI**: 100% Gemini API — Zero modelos locais (ADR-005)
- **Push**: HITL obrigatório (ADR-008) — agora com handler + regra
- **HITL**: Checkpoints criados mas não re-executam após aprovação — BUG-03 (Fase C)
