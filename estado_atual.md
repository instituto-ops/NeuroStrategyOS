# Estado Atual - CSA v3.3

## 1. Current Truth (Verdade Atual)
* **Status do Projeto:** Vortex V5 Fases 1-5 implementadas em escopo local e checklist sincronizado.
* **Fase 2:** Modos Canvas Livre e Template Guiado formalizados; preferencia de modo persistida em `localStorage`; Template Guiado usa `/api/vortex/generate-template` e editor JSON.
* **Fase 3:** Micro-prompt contextual ativo no preview com selecao por clique, barra flutuante e endpoint `/api/vortex/micro-edit`.
* **Fase 4:** Memoria estetica criada em `frontend/data/style_preferences.json`; feedback positivo/negativo no preview; preferencias injetadas no prompt do Vortex.
* **Fase 5:** Mapa de Silos abre Vortex pre-configurado; endpoints de deploy preview, midia stateful, auditoria formal e timeline de snapshots implementados.
* **Validacao:** `node --check` passou em `frontend/routes/vortex.js`, `frontend/public/js/vortex-studio.js`, `frontend/public/js/seo-engine.js` e `frontend/public/js/acervo.js`; smoke visual em `tmp/vortex-v5-phases-2-5-smoke-fixed.png`.

## 2. Constraints (Restricoes)
* **Seguranca:** Chaves de API permanecem no `.env`; rotas `/api/vortex/*` seguem protegidas por `VORTEX_API_KEY`.
* **Deploy externo:** `/api/vortex/deploy-draft` exige `VERCEL_TOKEN`; endpoint implementado, mas deploy real nao foi disparado na validacao.
* **IA real:** Rotas de geracao nova foram validadas por contrato/erro esperado, sem gastar chamada Gemini real.

## 3. Active Queues (Filas Ativas)
* [x] Fase 2 - Modos de operacao.
* [x] Fase 3 - Micro-prompting contextual.
* [x] Fase 4 - Memoria de preferencias esteticas.
* [x] Fase 5 - Integracao ecossistemica essencial.
* [ ] Proxima sessao: teste E2E com Gemini real em Template Guiado e Micro-Prompt.
* [ ] Proxima sessao: executar deploy preview real somente se `VERCEL_TOKEN` estiver configurado e houver autorizacao operacional.
