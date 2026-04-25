# Plano de Execução: Vórtex Studio Central (Checklist Vivo)

> **Objetivo:** Consolidar o Vórtex como o Studio Central do NeuroEngine, integrando briefing criativo, templates Abidos, criação livre premium e gestão de palavras-chave Tier 1.
> **Regra de Ouro:** Liberdade criativa na superfície; estrutura Abidos inegociável por baixo.

---

## Fase 0 — Preparação
- [x] Registrar objetivo: Vórtex como Studio central do NeuroEngine
- [x] Registrar regra: liberdade criativa na superfície, estrutura Abidos por baixo
- [x] Confirmar arquivos principais envolvidos (`vortex-studio.js`, `vortex.css`, `seo-engine.js`, `operations.js`, `vortex.js`)
- [x] Confirmar testes obrigatórios (`node --check` e smoke visual)

## Fase 1 — Hotfix UX V6
- [x] Corrigir card da Lente 4 (glassmorphism, contraste e padding)
- [x] Adicionar overlay escuro na publicação
- [x] Adicionar botão `✦ Aplicar` nos upgrades
- [x] Renomear score para **Score de Impacto**
- [x] Ajustar Hub/Spoke visual
- [x] Ajustar toggle `✦ IA`
- [x] Reduzir histórico visível

## Fase 2 — Briefing Criativo no Vórtex
- [x] Criar estado `creationBrief` no gerenciador de estado
- [x] Adicionar modo **Criar / Editar**
- [x] Migrar campos de Modelo IA e Objetivo Estratégico
- [x] Migrar Tema / Palavra-Chave e Contexto Livre
- [x] Migrar Seleção de Menu e CTAs
- [x] Integrar "Novo Spoke" diretamente ao fluxo de briefing

## Fase 3 — Templates no Vórtex
- [x] Listar templates na Lente 2
- [x] Criar modo **Estruturado Abidos**
- [x] Criar modo **Livre Premium**
- [x] Criar modo **Híbrido**
- [x] Reusar preview/geração existente com novos parâmetros
- [x] Garantir edição visual ativa após geração via template

## Fase 4 — Keywords Estratégicas (Tier 1)
- [x] Adicionar lista de keywords Tier 1
- [x] Permitir seleção de keyword no briefing inicial
- [x] Preencher objetivo e contexto automaticamente pela keyword
- [x] Sugerir Hub/Spoke ideal para a keyword selecionada
- [x] Sugerir template/modo de geração adequado

## Fase 5 — Validação
- [x] `node --check frontend/public/js/vortex-studio.js`
- [x] `node --check frontend/public/js/seo-engine.js`
- [x] `node --check frontend/routes/operations.js`
- [x] `node --check frontend/routes/vortex.js`
- [ ] Smoke visual em `localhost:3000`
- [x] Atualizar `estado_atual.md`

---

## Registro de Execução

- Sessão 1: checklist normalizado; Fase 0 concluída. Fases 1-4 implementadas em `vortex-studio.js`.
- Sessão 2 (2026-04-25): CSS das novas classes de Briefing/Template adicionado em `vortex.css` (`.vortex-v6-brief-head`, `.vortex-v6-brief-grid`, `.vortex-v6-contact-grid`, `.vortex-v6-primary-action`, `.vortex-v6-template-head`, `.vortex-v6-template-grid`, `.vortex-v6-new-spoke`). Exports públicos adicionados ao retorno do módulo (`setCreationMode`, `setCreationBriefField`, `setGenerationMode`, `applyTierKeyword`, `selectVisualTemplate`, `generateFromBrief`, `startNewSpokeFromSilo`, `applyPerformanceUpgrade`). Validação completa: todos os 4 `node --check` passaram.
- Pendente: smoke visual em `localhost:3000`.

---

*Legenda: `[ ]` pendente | `[~]` em execução | `[x]` concluído e validado*
