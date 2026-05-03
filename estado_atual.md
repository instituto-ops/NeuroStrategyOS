## 🟢 Verdade Atual
- Infraestrutura backend (Neon/Postgres, Cloudinary, Abidos Engine) consolidada.
- Vórtex Studio funcional: geração streaming, VFS, commit GitHub, preview, template guiado, micro-edit.
- CSA v3.5 estabelecida — Fases 1-8 concluídas.
- agentd totalmente integrado ao Vórtex Studio:
  - Painel de controle com abas (Status, Artifacts, Live Log).
  - Feedback em tempo real via SSE (Server-Sent Events).
  - Renderizador de Markdown integrado para visualização de Planos e Relatórios.

## 🔴 Restrições Ativas
- **Bloqueio Abidos 401**: Rota `/api/vortex/generate-sections` falha na autenticação.
- **AI**: 100% via Gemini API (Flash/Pro/Embeddings). Zero modelos locais (ADR-005).
- **Governança**: Permission Kernel ativo — default deny, tools high/critical exigem HITL visual.

## 📋 Fila Ativa
- Plano: `CSA/4_Execucao_e_Historico/Planos_de_Execucao/PLANO_AGENTE_OPERACIONAL_v2.md`
- Próxima etapa: Fase 9 — Automação de Navegador (Browser Skill) — integrando o controle do navegador ao agentd para pesquisa e automação web real.

## ⏭️ Próximo Passo Lógico
- Implementar `agentd/src/mcp/browser.ts` para controle via Playwright ou similar.