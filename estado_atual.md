## 🟢 Verdade Atual
_O que foi concluído e está estável. Máximo 5 bullets._
- Fase A commitada em `b3d1117`: 35 tools, regras corrigidas, safe tools em IDLE funcionam.
- Fase B Brain implementada: `agent.run`, `agent.session_status`, `agent.list_sessions` ativos no IPC.
- `npm run build` e `npm run test` passam (48 testes); daemon inicializa sem erros.
- **Fase C fix aplicado**: `gemini.ts` agora usa `apiVersion: 'v1beta'` para modelos `gemini-2.*`; `config.ts` lê `MODEL_NAVIGATION` do `.env`; `boot.ts` passa o `modelId` ao `GeminiClient`.
- Script de diagnóstico criado: `agentd/test-gemini.mjs` valida conexão antes de reiniciar o daemon.

## 🔴 Restrições Ativas
_Limitações técnicas, decisões arquiteturais fixas, débitos conhecidos. Máximo 5 bullets._
- Fix Fase C **ainda não validado em runtime** — daemon precisa ser reiniciado e `test-gemini.mjs` precisa passar.
- `filesystem.patch_file` moderate continua bloqueado em IDLE (comportamento correto por design).
- HITL aprovado ainda não reexecuta checkpoints pendentes (escopo Fase D do plano).
- IPC Named Pipe pode exigir execução elevada no sandbox (erro `EPERM` em Vitest/IPC tests).
- Console Web (`console/src/App.tsx`) é scaffold vazio — ainda não implementado (Fase E do plano).

## 📋 Fila Ativa
_O que está em andamento agora. Referência ao Plano de Execução ativo (nome do arquivo)._
- Plano: `CSA/4_Execucao_e_Historico/Planos_de_Execucao/plano_fase_a_smoke_e_fase_b_brain_2026-05-03.md`
- Próxima etapa: Rodar `test-gemini.mjs`, reiniciar daemon, executar smoke `agent.run` para confirmar Brain funcional.

## ⏭️ Próximo Passo Lógico
_Uma única frase. O que o agente deve fazer no próximo boot imediatamente após ler este arquivo._
No diretório `agentd`, executar `node --env-file=../.env test-gemini.mjs` e, se passar, reiniciar o daemon com `npm run dev` e rodar `agentAPI.call('agent.run', { task: 'Liste os rascunhos do Vórtex' })` no browser para confirmar que Brain chama `vortex.list_drafts` automaticamente.
