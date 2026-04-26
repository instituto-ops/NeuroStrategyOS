# Estado Atual - CSA v3.3

## 1. Current Truth (Verdade Atual)
* **Status do Projeto:** Vortex V5 Fases 1-5 implementadas em escopo local e checklist sincronizado.
* **Fase 2:** Modos Canvas Livre e Template Guiado formalizados; preferencia de modo persistida em `localStorage`; Template Guiado usa `/api/vortex/generate-template` e editor JSON.
* **Fase 3:** Micro-prompt contextual ativo no preview com selecao por clique, barra flutuante e endpoint `/api/vortex/micro-edit`.
* **Fase 4:** Memoria estetica criada em `frontend/data/style_preferences.json`; feedback positivo/negativo no preview; preferencias injetadas no prompt do Vortex.
* **Fase 5:** Mapa de Silos abre Vortex pre-configurado; endpoints de deploy preview, midia stateful, auditoria formal e timeline de snapshots implementados.
* **Validacao:** `node --check` passou em `frontend/routes/vortex.js`, `frontend/public/js/vortex-studio.js`, `frontend/public/js/seo-engine.js` e `frontend/public/js/acervo.js`; smoke visual em `tmp/vortex-v5-phases-2-5-smoke-fixed.png`.
* **Planejamento V6:** `CSA/3_Engenharia_e_Arquitetura/vortex_v6_plano_etapas.md` atualizado para v6.6 com Fase 0 executavel, SSOT minimo por `data-vortex-*`, V6 como lente sobre V5 e primeiro corte recomendado em Masking e Exaustao/Hero/headline.
* **Execucao V6:** plano v6.6 implementado em `frontend/public/js/vortex-studio.js`, `frontend/public/css/vortex.css` e `frontend/routes/vortex.js`: flag visual, pagina anotada, prompt mock/IA, snapshots, targeted edit, historico, Raio-X, silos, performance e publicacao simulada.
* **Validacao V6:** `node --check` passou em `frontend/public/js/vortex-studio.js` e `frontend/routes/vortex.js`; smoke visual local ficou pendente porque o ambiente bloqueou iniciar o dev server (`Start-Process npm run dev` negado e escalacao recusada por limite de uso).
* **Checklist V6:** `CSA/3_Engenharia_e_Arquitetura/vortex_v6_plano_etapas.md` sincronizado; todos os itens de implementacao marcados, mantendo apenas smoke visual como pendente.
* **Correcao V6 UI:** V6 agora abre como modo visual padrao; V5 fica como fallback por toggle/query. Controles tecnicos do V5 foram escondidos no modo visual, incluindo model select, header do preview, vitals, feedback, drawer/terminal e botoes legados.
* **Strategy Studio v6:** tela de Estrategia recebeu lentes `Silos / Abidos / Autoridade / Pauta`, dropdowns escuros legiveis, Pauta vinculada a `Silos` e `Pauta`, Abidos renderizado como resumo executivo + cards acionaveis e relatorio completo rebaixado ao Vault.
* **Silos canonicos:** `frontend/routes/silos.json` e `frontend/silos.json` normalizados em UTF-8 com schema `Silo -> Hub -> Spokes`; `Hipnose Clinica` consta com spokes separados e status `nao_sincronizado`.
* **Vortex hierarquico:** Vortex carrega hubs e spokes em optgroups, renderiza spokes como paginas editaveis na Lente 1, importa breadcrumb `Silo > Spoke` e preserva metadados de sync/pagina no draft.
* **Edicao manual Vortex:** campos `data-vortex-field` agora ativam `contenteditable`, mini-toolbar, painel de campo com contagem/historico local, toggle `Direto / IA` e snapshots sem gasto de token.
* **Validacao atual:** `node --check` passou em `frontend/public/js/seo-engine.js`, `frontend/public/js/vortex-studio.js` e `frontend/routes/operations.js`; servidor respondeu `200` em `/`, `/js/seo-engine.js`, `/js/vortex-studio.js` e `/api/seo/silos`.
* **Vortex Studio Central - CONCLUIDO (pendente smoke visual):** CSS das novas classes de Briefing/Template adicionado em `frontend/public/css/vortex.css`; exports publicos dos handlers de briefing/template/keywords adicionados ao modulo `vortex-studio.js`; todos os 4 `node --check` passaram (`vortex-studio.js`, `seo-engine.js`, `operations.js`, `vortex.js`). Checklist em `docs/05_Relatórios/Planos de execução/vortex_studio_central_execucao.md` sincronizado.
* **Validação Visual V6 (2026-04-26):** Smoke test em `localhost:3000` via `browser_subagent` CONFIRMADO. Backdrop blur, shelf de templates integrada e modo visual V6 funcionando perfeitamente.
* **Correção Mojibake (2026-04-26):** Resolvido o problema de caracteres corrompidos (ex: `estÃ¡`) no dashboard. Corrigidas strings hardcoded em `routes/operations.js`, limpados emojis no `server.js` e forçada a regeneração do `analytics_cache.json` em UTF-8.
* **Pendente:** limpeza fina de logs remanescentes em `health-marketing.js` e `server.js` (baixa prioridade).

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
* [x] V6: implementar fases 0-4 conforme `vortex_v6_plano_etapas.md`.
* [ ] V6: executar smoke visual em navegador assim que o dev server puder ser iniciado; confirmar que a primeira tela nao parece IDE/admin.
* [x] Strategy Studio v6: implementar lentes, Abidos acionavel, silos canonicos, Vortex hierarquico e edicao manual direta no preview.
* [x] Strategy Studio v6: smoke visual completo em navegador real via `browser_subagent`.
* [x] Vortex Studio Central: smoke visual em localhost:3000 concluído.
