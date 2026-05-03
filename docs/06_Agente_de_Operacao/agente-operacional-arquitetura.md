# Documento Arquitetural: Agente Operacional Avançado — NeuroStrategy OS
*Versão 1.0 — Consolidado em 02/05/2026*

---

## 1. Tese Central

O NeuroStrategy Agente Operacional Avançado não é um chatbot, um autocompletar ou um gerador de código. É um **runtime operacional local**: uma extensão técnica do usuário capaz de transformar intenção humana em execução rastreável, segura e revisável.

A frase-síntese que define toda decisão de design:

> **O LLM raciocina. O daemon executa. O Permission Kernel protege. O terminal prova. O Git registra. O usuário aprova o irreversível.**

O agente opera como um profissional sênior com autonomia calibrada: age rapidamente em tarefas reversíveis, pausa e explica antes de qualquer ação com impacto permanente, e mantém um diário auditável de cada decisão tomada.

---

## 2. Evolução: Do Vórtex ao Agente Operacional

### 2.1 A Semente

O Vórtex nasceu como um problema específico: transformar intenção estratégica em páginas, componentes e conteúdo clínico com menos atrito. A IA era um motor criativo/editorial.

Mas gerar código livre é frágil. A primeira virada conceitual foi perceber que a IA precisava ser **governada**, não apenas criativa. O sistema passou de "gerar páginas" para "produzir conteúdo validado dentro de contratos com preview, revisão, logs e rollback".

### 2.2 A Virada Operacional

A segunda virada foi perceber que gerar uma página é só uma parte do trabalho. O processo completo exige editar arquivos, corrigir imports, rodar build, testar links, fazer commit, preparar deploy. Se o agente não consegue executar o ciclo completo, ele depende do humano para tudo que não é geração de texto — e isso limita drasticamente seu valor.

A pergunta mudou de "como a IA gera conteúdo?" para "como a IA executa o trabalho completo?". A resposta: ela precisa de ferramentas reais.

### 2.3 O Runtime Local

Para executar de verdade, o agente não pode viver apenas no chat. Ele precisa de um **daemon local** (`agentd`) que:

- Lê e edita arquivos locais
- Opera o terminal Windows (PowerShell, npm, python, git)
- Controla um navegador Playwright
- Chama APIs (Google, Vercel, GitHub)
- Armazena memória de longo prazo em SQLite local
- Registra logs auditáveis de cada ação
- Aplica permissões antes de qualquer execução

### 2.4 O Papel do Vórtex na Nova Arquitetura

O Vórtex deixa de ser o produto inteiro e se torna **um dos domínios do agente**: o braço de criação e publicação de conteúdo clínico. Ele passa de studio generativo para skill especializada, operada pelo mesmo runtime que também executa código, pesquisa acadêmica e operações administrativas.

```
Vórtex antes:   [Geração de páginas] → produto completo
Vórtex depois:  [Skill de CMS/Publicação] → um dos domínios do agente
```

---

## 3. Arquitetura

### 3.1 As Cinco Camadas

```
┌─────────────────────────────────────────────────────────────┐
│                      INTERFACES                              │
│  CLI  │  VS Code Extension  │  Web Console / Desktop App   │
└───────────────────────┬─────────────────────────────────────┘
                        │ JSON-RPC / IPC
┌───────────────────────▼─────────────────────────────────────┐
│                       agentd                                 │
│                  (daemon local)                              │
│  CSA State Machine  │  Task Queue  │  Artifact Manager      │
│  Live Artifacts     │  Skill Router│  Session Manager       │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                  Permission Kernel                           │
│   (determinístico, sem LLM, regras YAML)                    │
│   safe → execute  │  review → HITL  │  block → pause        │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                    Tool Registry                             │
│  filesystem │ terminal │ git_github │ vercel │ google        │
│  browser    │ memory   │ security   │ documents              │
└──────┬──────┴────┬─────┴─────┬──────┴─────────┬─────────────┘
       │           │           │                 │
  FS/SQLite    Terminal     APIs/MCP          Browser
   RAG vec     Git/GH       Google          Playwright
```

### 3.2 O Daemon (agentd)

**Princípio fundamental**: o agentd é **stateless por design**. Todo estado vive no filesystem (CSA), não em memória de processo. Uma reinicialização é transparente: o agente lê `estado_atual.md` e retoma exatamente onde parou.

O agentd gerencia:
- **CSA State Machine**: implementação explícita do pipeline IDLE → DIALOGUE → DIAGNOSIS → PLANNING → EXECUTING → TESTING → REPORTING → AWAITING_APPROVAL
- **Task Queue**: fila de execução com prioridade e cancelamento
- **Artifact Manager**: produz e atualiza Live Artifacts (planos, diffs, logs, screenshots)
- **Skill Router**: seleciona o domínio correto (código, pesquisa, browser, documentos) baseado no `project.profile.json`

### 3.3 O Permission Kernel

O Permission Kernel não é IA — é um **interceptor determinístico** baseado em regras YAML. Ele classifica cada chamada de ferramenta antes da execução:

| Classificação | Comportamento |
|---|---|
| `safe` | Executa, loga passivamente |
| `review` | Mostra diff/impacto, executa após confirmação |
| `block` | Pausa, exibe checkpoint completo, aguarda aprovação |
| `forbidden` | Recusa, loga tentativa, nunca executa |

**Sempre bloqueado sem aprovação humana:**
- `git push` para qualquer remoto
- Deploy para produção
- Envio de email ou mensagem
- Deleção permanente de arquivos
- Exposição de `.env` ou credenciais
- Submissão de formulário externo
- Exportação de dados sensíveis
- Diagnóstico clínico em contexto público

### 3.4 A Memória

Três camadas nunca misturadas:

**RAM Operacional** (`estado_atual.md`):
Schema canônico CSA — 4 seções fixas, máximo 5 bullets cada:
```markdown
## 🟢 Verdade Atual
## 🔴 Restrições Ativas
## 📋 Fila Ativa
## ⏭️ Próximo Passo Lógico
```
Atualizado apenas ao final de um plano completo, ao descobrir nova restrição, ou ao encerrar sessão.

**Memória Factual de Longo Prazo** (SQLite-vec + LanceDB):
- Código, padrões arquiteturais, ADRs
- Documentação indexada
- Histórico de commits aprovados
- Falhas indexadas (Morgue) como "vacinas"

**Memória Estilística** (RAG few-shot):
- Estilo de commit (Conventional Commits com vocabulário do usuário)
- Formato de relatório (estrutura, marcadores, tom)
- Vocabulário preferido e termos proibidos
- Padrões de planejamento (fases, checklists)

### 3.5 O Navegador (LAM)

O Playwright roda em **processo filho dedicado** com fila de comandos — nunca inline no agentd. Screenshots são Live Artifacts exibidos no console/VS Code sidebar.

**Modos de operação:**
- `audit`: somente leitura, sem HITL
- `supervised`: HITL em cada ação
- `trusted`: HITL apenas em ações com submit/envio

**HITL Checkpoint padrão (para ações escritas):**
```
⚠️ AÇÃO PENDENTE — Aprovação necessária
Ação:    browser_click
Elemento: button#submit
Página:   https://...
Risco:    ALTO — Submissão irreversível
[ Aprovar ] [ Cancelar ] [ Ver Elemento ]
```

---

## 4. Capacidades por Domínio

### 4.1 Engenharia de Software
- Leitura de projeto, identificação de stack, edição multi-arquivo
- Aplicação de patches, refatoração, criação de componentes e APIs
- Build, lint, teste, leitura de stdout/stderr, autocorreção em loop
- Commit, criação de PR, revisão de diff, preparação de deploy

### 4.2 Navegação Web
- Auditoria de links, extração de dados estruturados, screenshots
- Operação de portais externos sob supervisão (Doctoralia, JBI SUMARI, Rayyan)
- Comparação visual preview vs. produção
- Download de relatórios, formulários sob aprovação

### 4.3 Pesquisa Acadêmica
- Formulação de pergunta PCC, construção de protocolo JBI
- Montagem de strings de busca para bases acadêmicas
- Triagem e extração no Rayyan, integração com Zotero
- Geração de PRISMA-ScR, apoio psicométrico (EFA, CFA, ROC)
- Radar de oportunidades (CNPq, CAPES, periódicos)

### 4.4 Documentos e Dados
- Leitura de PDF (com OCR), DOCX, XLSX, CSV, RIS, BibTeX
- Extração de tabelas e referências bibliográficas
- Criação de relatórios e documentos formatados
- Análise de dados com Python/R (scripts auditados)

### 4.5 Administração e Comunicação
- CRM leve: agenda, presença, falta, remarcação
- Alertas de evasão com rascunhos de mensagem supervisionados
- Estilo de comunicação: acolhedor, direto, sem pressão artificial

### 4.6 Marketing Ético e Publicação (Vórtex)
- SEO/GEO, arquitetura Hub & Spoke, auditoria Abidos
- CMS generativo data-driven (LLM gera JSON, não código executável)
- Preview, revisão ética CFP/LGPD, publicação com aprovação
- Audit trail de revisões imutável

---

## 5. Tool Registry

Nove MCP Servers especializados, cada um com domínio, risco e annotations explícitos:

| Server | Domínio | Transport | Stack |
|---|---|---|---|
| `neuro-filesystem` | Leitura/escrita de arquivos locais | stdio | TypeScript |
| `neuro-terminal` | Execução de comandos Windows | stdio | TypeScript |
| `neuro-git_github` | Git local + GitHub API | stdio + SSE | TypeScript |
| `neuro-vercel` | Deploy, preview, logs, rollback | SSE/HTTP | TypeScript |
| `neuro-google` | Gemini, Drive, Sheets, GA4, Gmail | SSE/HTTP | TS + Python |
| `neuro-browser` | Playwright, screenshots, auditoria web | stdio (proc. filho) | TypeScript |
| `neuro-memory` | RAG vetorial local-first | stdio | Python FastMCP |
| `neuro-security` | Permission Kernel, audit log, redação | stdio (síncrono) | TypeScript |
| `neuro-documents` | PDF, DOCX, XLSX, RIS, BibTeX | stdio | Python FastMCP |

**Context Bloat Prevention**: o agentd injeta apenas os schemas dos MCPs relevantes para a tarefa ativa. Nunca todos os 9 simultaneamente.

---

## 6. Permission Kernel — Matriz Completa

### Executa sem pedir autorização (safe)
- Ler arquivos locais autorizados
- Criar arquivos locais novos
- Editar código local
- Rodar lint, build, testes locais
- Criar branch local
- Criar commit local
- Gerar rascunhos e relatórios
- Auditar páginas públicas
- Consultar RAG/memória

### Exibe checkpoint e aguarda (review)
- Deletar arquivos (com backup obrigatório)
- Preencher campos em formulários web
- Clicar em elementos com efeito
- Criar issue ou PR no GitHub
- Escrever em Google Sheets
- Gerar preview no Vercel
- Exportar dados não sensíveis

### Bloqueia até aprovação explícita (block)
- `git push` para qualquer remoto
- Merge de PR
- Deploy para produção
- Rollback de produção
- Submeter formulário externo
- Enviar email ou mensagem
- Publicar conteúdo
- Alterar perfil externo (Doctoralia, etc.)
- Exportar dados pessoais ou clínicos
- Alterar secrets ou variáveis de ambiente

### Recusa permanente (forbidden)
- Expor credenciais ou `.env`
- Diagnóstico clínico automático em contexto público
- Commit contendo secrets
- Scraping invasivo ou bypass de autenticação
- Execução destrutiva sem escopo explícito (`rm -rf /`)
- Publicação de dado sensível sem revisão
- Loop de erro sem registro na Morgue

---

## 7. Roadmap de Implementação

### Fase 1 — Runtime Mínimo (MVP Operacional)
**Critério de saída**: agente lê projeto, executa terminal, aplica patches, faz commit local.
- agentd básico (TypeScript/Node.js)
- CLI: `agent boot`, `agent status`, `agent run`, `agent commit`
- MCP: filesystem + terminal + git (Git local apenas)
- Permission Kernel (regras YAML básicas)
- Audit log append-only
- `estado_atual.md` como RAM operacional

### Fase 2 — Agente de Código Pleno
**Critério de saída**: auto-corrige build em loop, cria PR, integra GitHub Actions.
- MCP git_github completo (GitHub API)
- Self-healing pipeline (stderr → diagnose → patch → rerun)
- Morgue de falhas ativa
- Blast Radius mapper (ripgrep-based)
- MCP vercel (preview + logs)
- VS Code Extension básica (diff review, plan display)

### Fase 3 — Navegador e Memória
**Critério de saída**: audita página, extrai dados estruturados, lembra decisões entre sessões.
- MCP browser (Playwright, modo audit + supervised)
- MCP memory (SQLite-vec, RAG factual + estilístico)
- Live Artifacts: screenshots, relatórios, logs visuais
- Web Console básica
- Memória de estilo ativa (commit, relatório, planejamento)

### Fase 4 — Integrações Externas
**Critério de saída**: consulta GA4, atualiza Sheets, acessa Drive, envia draft Gmail (com HITL).
- MCP google completo (GA4, Drive, Sheets, Calendar, Gmail draft)
- MCP documents (PDF, DOCX, XLSX, RIS, BibTeX)
- Context Bloat Prevention implementado
- Permission Kernel completo (todas as 9 categorias)

### Fase 5 — Domínios Especializados
**Critério de saída**: monta protocolo JBI, opera Rayyan, gera relatório psicométrico.
- Skill: pesquisa acadêmica (JBI, Rayyan, Zotero)
- Skill: administração clínica (agenda, evasão, rascunhos)
- Skill: marketing ético (SEO, Abidos, Vórtex)
- Skill: psicometria (EFA, CFA, ROC via Python/R)
- Radar de oportunidades (CNPq, CAPES, periódicos)
- Tarefas agendadas (audits, monitoramento, relatórios)

---

## 8. Decisões Congeladas

Estas decisões não são reabríveis sem revisão arquitetural formal (ADR):

| # | Decisão | Rationale |
|---|---|---|
| D1 | agentd é stateless — estado no filesystem | Reinicializações transparentes, sem estado perdido |
| D2 | `estado_atual.md` schema canônico CSA — 4 seções fixas | Previsibilidade e zero ambiguidade no boot |
| D3 | Permission Kernel é determinístico, sem LLM | LLM não pode ser árbitro de segurança |
| D4 | Browser roda em processo filho separado | Não bloqueia execuções paralelas do daemon |
| D5 | Humano aprova todas as ações irreversíveis | Sem exceções. Inclui push, deploy, envio, delete |
| D6 | Morgue é obrigatória para loops de erro | Error loops sem registro são proibidos |
| D7 | Memória é local-first (SQLite-vec, LanceDB) | Dados clínicos/profissionais não saem da máquina |
| D8 | CMS/Vórtex usa data-driven renderer | LLM gera JSON, não código executável |
| D9 | Secrets são redactados automaticamente | Nunca expostos em logs, memory ou outputs |
| D10 | VS Code é interface, não limite arquitetural | O agente usa VS Code para código; usa outras interfaces para outros domínios |

---

## 9. Interfaces

### 9.1 CLI
```bash
agent boot                          # lê estado_atual.md, exibe status
agent status                        # estado atual do agente e plano ativo
agent run "corrija o erro do build" # executa tarefa
agent plan "refatorar auth"         # gera plano sem executar
agent browser audit https://site.com
agent research scan "instrumentos breves de rastreio"
agent memory query "erros de CORS anteriores"
agent commit                        # commit local com estilo personalizado
agent deploy preview                # gera preview no Vercel
```

### 9.2 VS Code Extension
- Chat lateral com contexto do workspace
- Diff review inline (aprovar / pausar / reverter)
- Terminal supervisionado com approval gate
- Status do plano ativo no status bar
- Sidebar de Live Artifacts (planos, logs, screenshots)

### 9.3 Web Console
- New Task (entrada de comando natural)
- Projects (projetos ativos com estado CSA)
- Scheduled (tarefas agendadas e próximas execuções)
- Live Artifacts (todos os artefatos vivos centralizados)
- Browser (view do Playwright com HITL)
- Terminal (log em tempo real)
- GitHub (PRs, issues, actions)
- Deploys (histórico Vercel com visual diff)
- Memory (visualizador de RAG e decisões)
- Security (audit log e permission matrix)

---

*Documento gerado como artefato arquitetural do NeuroStrategy OS.*
*Próximo passo lógico: Iniciar implementação da Fase 1 — Runtime Mínimo (agentd + CLI + MCPs filesystem/terminal/git).*
