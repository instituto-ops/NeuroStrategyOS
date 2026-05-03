## 🟢 Verdade Atual
- Infraestrutura backend (Neon/Postgres, Cloudinary, Abidos Engine) consolidada.
- Vórtex Studio funcional: geração streaming, VFS, commit GitHub, preview, template guiado, micro-edit.
- CSA v3.5 estabelecida — Fases 1-5 concluídas (Fundação, Skeleton, FSM, Registry, Kernel).
- agentd operacional: daemon TS com Named Pipe IPC, JSON-RPC 2.0, FSM 8 estados, Tool Registry YAML, Permission Kernel determinístico, HITL, audit hash-chain.

## 🔴 Restrições Ativas
- **Bloqueio Abidos 401**: Rota `/api/vortex/generate-sections` falha na autenticação.
- **AI**: 100% via Gemini API (Flash/Pro/Embeddings). Zero modelos locais (ADR-005).
- **Governança**: Permission Kernel ativo — default deny, tools high/critical exigem HITL.

## 📋 Fila Ativa
- Plano: `CSA/4_Execucao_e_Historico/Planos_de_Execucao/PLANO_AGENTE_OPERACIONAL_v2.md`
- Próxima etapa: Fase 6 — MCPs Core (filesystem, terminal, git) — dar capacidade real ao agente.

## ⏭️ Próximo Passo Lógico
- Implementar MCP runtime pipeline (validate → kernel.decide → exec → redact → audit) e os 3 MCPs core.