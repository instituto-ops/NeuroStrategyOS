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
* **Fix V6 init (2026-04-25):** Dois bugs corrigidos em `frontend/public/js/vortex-studio.js`: (1) `loadVisualModePreference()` bumped de `'v6.5-default-on'` para `'v6.6-default-on'` — força re-ativação do V6 para usuários com `'false'` persistido no localStorage; (2) `installPreviewInteractionTools()` recebeu guard `!doc.head` — elimina o `TypeError: Cannot read properties of null (reading 'appendChild')` quando o iframe srcdoc ainda não finalizou o parse. `node --check` OK.
* **Diagnostico Vortex V6 (2026-04-25):** Sessao de smoke real com usuario identificou 3 grupos de problemas para proxima sessao:
  - **Criticos estruturais:** (A) espaço vazio 283px acima do preview (grid reserva altura para painel V5 oculto — precisa `display:none` quando `data-vortex-mode=visual`); (B) clicar em silo/spoke navega automaticamente para Lente 2, impedindo preenchimento do briefing; (C) preview mostra conteúdo "masking" mesmo quando briefing especifica outro silo — estado do draft não é invalidado ao trocar contexto.
  - **Funcionais quebrados:** `startNewSpokeFromSilo()` não está exportado no módulo (botão "+ Novo Spoke" silencioso); keywords Tier 1 hardcoded sem input livre; botões "Criar/Editar" sem propósito visível; seletor de silo duplicado (painel + dropdown no briefing); auto-navegação para Etapa 2 ao trocar de aba; confirm dialog de saída do V6 não dispara consistentemente.
  - **Layout/UX:** preview espremido sem scroll interno; sem toggle viewport Desktop/Tablet/Mobile; sem botão Cancelar na seleção de campo; silos vêm expandidos ocupando espaço excessivo (devem vir colapsados).
* **Referencia redesign Lente 1:** `Downloads/vortex_lente1_redesign_funcional.html` — mockup funcional criado pelo usuario com: silos colapsáveis (estilo Hub cards com chevron), seleção de spoke sem auto-navegação, keywords como pills com input livre, modo de criação como cards explicativos, sem botões Criar/Editar obsoletos, status contextual claro, breadcrumb no topo. Este arquivo é a referência visual para implementação da proxima sessão.
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
* [x] Fix V6 init: localStorage trap + null guard no iframe — `node --check` OK.
* [ ] PROXIMA SESSAO — Redesign Lente 1: implementar a partir de `Downloads/vortex_lente1_redesign_funcional.html`. Prioridade: (1) fix grid 283px; (2) silos colapsáveis sem auto-navegação; (3) keywords com input livre; (4) draft invalidado ao trocar silo; (5) export `startNewSpokeFromSilo`; (6) remover dropdown redundante de silo no briefing; (7) scroll interno no preview + toggle viewport.
* [ ] PROXIMA SESSAO — Diagnóstico de Regressão - Vórtex Lente 1 (2026-04-26)
* **Problema:** A Etapa 1 (Lente 1 - Contexto) está renderizando elementos legados e poluídos, em vez do briefing limpo e tri-columnar esperado para a V7.
* **Evidências (via browser_subagent):**
  - **Poluição Visual:** Sidebar de Silos (V6), Iframe de Preview e Chatbar (com botões "Refinar Hero", etc.) estão visíveis na Lente 1.
  - **Layout Quebrado:** A coluna de briefing está comprimida, causando scroll horizontal e sobreposição.
  - **Mojibake Persistente:** Caracteres corrompidos visíveis na interface (`VÃ³rtex`, `intenÃ§Ã£o`, `criaÃ§Ã£o`).
  - **Causa Provável:** O sistema está renderizando um ramo legado da UI V6 como "Lente 1", em vez de isolar o novo Briefing V7.
* **Ação Futura:** Reestruturar `vortex-studio.js` para que a Lente 1 oculte todos os elementos de IDE (preview, editor, chat) e exiba apenas o Briefing tri-columnar (Creative Nucleus, Abidos Architecture, Conversion & CTAs) em largura total.
* [ ] PROXIMA SESSAO — Lente 2: edição manual contenteditable com toolbar flutuante (B, H1, Link, Cor, ✦ IA, X cancelar) + toggle Desktop/Tablet/Mobile no preview.

## 4. Update Sessao - V7.5.2 CONCLUÍDO (2026-04-26)
* **Status:** Plano `vortex_v7_redesign_plano.md` ~95% concluído. Único item pendente: renderer sections_json → HTML no preview (requer integração Next.js).
* **Implementado nesta sessão (continuação):**
  - **Abidos-Native Engine (1.5.1):** `POST /api/vortex/generate-sections` com prompt estrutural + Abidos schema + validação Zod. Botão "Gerar Estrutura Abidos" na Coluna 2 do briefing com status indicator. `sectionsJson` injetado no `generateFromBrief()`.
  - **Traceability Snapshot (1.5.3):** `save-draft` persiste `generation_context_snapshot_json`. `publish` embute snapshot + `abidos_compliance_json` em cada `vortex_revisions`.
  - **Social Proof (1.3):** `PATCH /api/vortex/social-proof/:id/approve` + `GET /pending`.
  - **Seletor de Assets (2.2):** `GET /api/vortex/assets` com join `neuro_asset_metadata`. Asset Picker modal com grid de thumbnails + seleção de Imagem Hero no briefing.
  - **Manutenção (4.4):** `POST /api/vortex/maintenance/cleanup-orphans` + `GET/POST/DELETE /reserved-slugs`.
  - **Zod validation** nas rotas `save-draft`, `generate-sections`, `reserve-slug`.
  - **CSS** para asset grid, sections status, asset thumb adicionados em `vortex.css`.
  - `node --check` OK em `vortex-studio.js` e `vortex.js`.
* **Infraestrutura operacional (2026-04-26):**
  - [x] `DATABASE_URL` ativo → Neon DB sa-east-1 conectado.
  - [x] `node scripts/migrate.js` executado — schema V7 aplicado: `vortex_revisions.path/title` adicionados, `vortex_publication_logs` (vazia) removida.
  - [x] Rotas V7 corrigidas para schema real do Neon (`slug` vs `path/page_type`; `current_revision_id`; `snapshot_json`; `vortex_publish_logs`).
  - [x] `node scripts/sync-cloudinary.js` — 11 assets Cloudinary indexados em `vortex_assets` (cloud: di3jg1pg1).
  - [x] `node --check` OK em `vortex.js` e `vortex-studio.js`.
* **Único pendente V7:**
  - [ ] Renderer sections_json → HTML (Next.js `generateMetadata` + `notFound()`) — requer setup Next.js separado.
  - [ ] Smoke visual do modal editorial e asset picker no browser (requer dev server).
  - [ ] Importador MD para `abidos_social_proof` (nice-to-have).
