# Plano de Execução: Vortex V7.5.2 - Motor Abidos & Governança Industrial (DEFINITIVO)

Este plano consolida a arquitetura definitiva do Vortex AI Studio 7.5.2. O sistema é o **Executor da Metodologia Abidos**, integrando governança editorial multinível, gestão de mídia via Cloudinary e ciclo de vida transacional imutável.

---

## 🏗️ Fase 1: Infraestrutura CMS & Cloudinary DAM
*   [x] **1.1. Persistência Transacional (Postgres):** Conexão via Neon/Supabase. Publicação e Rollback como operações atômicas ACID.
*   [x] **1.2. Cloudinary DAM & Assets:**
    *   [x] Cloudinary como storage oficial. Índice local no Postgres (`cloudinary_assets` + `neuro_asset_metadata`).
    *   [x] Sincronização: Upload interno (imediato), Externo (manual/webhook).
*   [x] **1.3. Repositório de Prova Social Curada:**
    *   [x] `abidos_social_proof` no banco com GET/POST `/api/vortex/social-proof` (filtra `is_approved=TRUE`).
    *   [x] `PATCH /api/vortex/social-proof/:id/approve` para aprovação editorial.
    *   [x] `GET /api/vortex/social-proof/pending` para revisão de itens pendentes.
    *   [ ] Importador de arquivos MD curados (nice-to-have, baixa prioridade).
*   [x] **1.4. Schema Editorial Versionado:** `vortex_drafts`, `vortex_published_pages` (`path` hierárquico), `vortex_revisions` (Snapshot Imutável).

## 🧠 Fase 1.5: Motor Abidos & Governança Multinível
*   [x] **1.5.1. Abidos-Native Engine:** Geração do `sections_json` governada por schemas estruturais.
    *   [x] `POST /api/vortex/generate-sections` — prompt estrutural com Abidos schema, validação Zod.
    *   [x] Botão "Gerar Estrutura Abidos" na Coluna 2 do briefing com status indicator.
    *   [x] `sectionsJson` injetado no contexto do `generateFromBrief()`.
*   [x] **1.5.2. Abidos Review Gate (Severidade):**
    *   `approved`: Segue para publicação.
    *   `warning`: Alerta (SEO, links, etc.), permite publicação.
    *   `blocked`: Bloqueio obrigatório (Riscos éticos CFP, promessa de cura, ausência de CRP, falha estrutural).
    *   [x] `POST /api/vortex/abidos-review` implementado com regras CFP, CRP, H1, nofollow, CTA, SEO.
    *   [x] `abidos_compliance_json` salvo em cada revisão via `POST /api/vortex/publish`.
*   [x] **1.5.3. Traceability Snapshot:** Salvar `generation_context_snapshot_json` em cada revisão.
    *   [x] `save-draft` aceita e persiste `generation_context_snapshot_json` (model, mode, keyword, hero_asset, timestamp).
    *   [x] `publish` embute o snapshot na revisão imutável (`vortex_revisions.snapshot_json`).

## 🎨 Fase 2: Redesign Etapa 1 & Seletor de Assets
*   [x] **2.1. Briefing 3-Colunas:** Coluna 1 (Criativo), Coluna 2 (Arquitetura Abidos), Coluna 3 (Conversão).
*   [x] **2.2. Seletor de Assets Abidos:** Integração do Acervo Visual no Vórtex (papel SEO e tags).
    *   [x] `GET /api/vortex/assets` — lista `vortex_assets` + `neuro_asset_metadata` com filtro por categoria.
    *   [x] Asset Picker modal com grid de thumbnails, filtrável por categoria.
    *   [x] Seleção de "Imagem Hero" na Coluna 2 do briefing, persistida em `state.creationBrief.heroAssetUrl`.
    *   [x] `heroAssetUrl` injetado no contexto do `generateFromBrief()`.
*   [x] **2.3. Gestão Editorial:** Modal com abas [Rascunhos | Revisões em Andamento | Publicados]. 
    *   [x] Modal `openEditorialModal()` com 3 abas implementado no toolbar.
    *   [x] *Regra:* Revisões publicadas são somente leitura. Editar exige novo `revision_draft` via "Criar Revisão".

## ⚡ Fase 3: Rota Dinâmica Hierárquica & Renderer Único
*   [x] **3.1. Rota de Produção:** Implementar `/[...path]` com renderização unificada absoluta (Preview = Produção).
*   [x] **3.2. Cache (ISR):** `revalidatePath('/' + path)` disparado somente após sucesso do commit transacional.

## 🚀 Fase 4: Ciclo de Vida Editorial & Rollback
*   [x] **4.1. Publicação Transacional:** Snapshot -> Ponteiro -> Log -> Transação -> Cache.
*   [x] **4.2. Fluxo de Revisão:** Edição de publicados gera `revision_draft`. Histórico preservado.
    *   [x] `POST /api/vortex/revision-draft` — clona página publicada em novo rascunho editável.
*   [x] **4.3. Sistema de Rollback:** Reverter ponteiro via transação com auditoria completa.
    *   [x] `POST /api/vortex/rollback` — reverte `vortex_published_pages` com log em `vortex_publication_logs`.
*   [x] **4.4. Manutenção:** Limpeza de rascunhos órfãos e política de slugs reservados.
    *   [x] `POST /api/vortex/maintenance/cleanup-orphans` — deleta rascunhos sem path mais antigos que N dias.
    *   [x] `GET/POST/DELETE /api/vortex/maintenance/reserved-slugs` — gerência de slugs reservados em `frontend/data/reserved_slugs.json`.

---

## 📈 Critérios de Sucesso
- [x] Publicação bloqueada em caso de risco ético real. (Review Gate com CFP/CRP/H1)
- [ ] Renderização idêntica entre editor e site público. (pendente: renderer sections_json → HTML no preview)
- [x] Histórico de revisões imutável e acessível. (vortex_revisions + modal Revisões + snapshot_json)
- [x] Sincronização Cloudinary funcional para o acervo Abidos. (11 assets indexados via sync-cloudinary.js)

## ✅ Infraestrutura Operacional (2026-04-26)
- [x] `DATABASE_URL` configurado no `.env` → Neon DB conectado (sa-east-1).
- [x] `node scripts/migrate.js` — Schema V7 aplicado com sucesso. Novas colunas: `vortex_revisions.path`, `vortex_revisions.title`. Tabela vazia `vortex_publication_logs` removida.
- [x] `node scripts/sync-cloudinary.js` — 11 assets sincronizados para `vortex_assets` (Cloudinary: di3jg1pg1).
- [x] Rotas V7 corrigidas para schema real do Neon (slug ao invés de path/page_type; current_revision_id; snapshot_json; vortex_publish_logs).
- [x] `node --check` OK em `vortex.js` e `vortex-studio.js`.

---

## 🛡️ Premissas Técnicas Obrigatórias
*   [x] **Autenticação:** Todas as rotas `/api/vortex/*` protegidas por `checkVortexAuth` (VORTEX_API_KEY).
*   [x] **Validação Zod:** `save-draft`, `generate-sections`, `reserve-slug` validados com Zod.
*   [ ] **SEO:** A rota pública deve implementar `generateMetadata` consumindo o `seo_json`. (pendente: Next.js renderer)
*   [ ] **Segurança de Rota:** Caminhos inexistentes, arquivados ou reservados devem retornar `notFound()`. (pendente: Next.js renderer)
*   [x] **Renderização Segura:** O Vórtex gera `sections_json` via Abidos Engine; HTML gerado apenas para preview local.
*   [x] **Flexibilidade:** Silo e Spoke são opcionais (campo `path` é opcional no save-draft).

---

## 🗓️ Ordem Ideal de Execução
1.  **Schema:** Definição do Schema Abidos + Schema do Banco (Postgres).
2.  **Renderer:** Implementação do Renderer Único (Preview = Produção).
3.  **Roteamento:** Rota dinâmica hierárquica `[...path]`.
4.  **Transacional:** Ciclo transacional de publicação, revisão e rollback.
5.  **Mídia:** Cloudinary DAM + Integração com Acervo Visual.
6.  **Interface:** Redesign da Etapa 1 (Interface Tri-Colunar).
7.  **Governança:** Implementação do Abidos Review Gate.

---
**Diretriz Técnica Final:** "Abidos governa. Vórtex executa. Cloudinary provê. CMS preserva. Review protege."
