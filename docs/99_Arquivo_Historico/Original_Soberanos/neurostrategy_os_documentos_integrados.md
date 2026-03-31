# NeuroStrategy OS — Documentos Integrados

**Versão:** 1.1 — Integração Completa com Documentos Operacionais  
**Data:** 14 de Janeiro de 2026  
**Status:** Documento Consolidado

---

## Sumário

1. Documento Mestre Absoluto
2. Documento Mestre do Shell
3. Documento Normativo do Núcleo Clínico (conceitual)
4. Documento Normativo do Núcleo de Marketing
5. Documento Normativo do Núcleo de Pesquisa
6. Documento Normativo da Aba Evolução
7. Documento Normativo de Diagnóstico & Redação
8. Documento Normativo de Administração
9. Documento Auxiliar de Resolução de Ambiguidades Operacionais
10. Bloco 1 — Contrato Clínico
11. Bloco 2 — Máquina de Estados Clínicos
12. Bloco 3 — Persistência Ética
13. Bloco 4 — IA: Análises & NAC
14. Bloco 5 — Integração com UI
15. Documento Técnico do Núcleo Ads / Marketing

---

# 16. DOCUMENTO OPERACIONAL — RESUMO EXECUTIVO VISUAL

**Status:** Documento de Decisão Técnica One-Page

**Autoridade:** Arquitetural e Operacional (por delegação)

---

## Stack Recomendado

```
┌─────────────────────────────────────────────────────────┐
│  NEUROSTRATEGY OS — ARQUITETURA COMPLETA               │
└─────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ SHELL (UI Container)                                     │
│ ┌────────────────────────────────────────────────────┐   │
│ │ Tauri 2.0+ (Desktop Framework)                     │   │
│ │ ├─ Windows executable: <10MB (vs Electron 100MB)  │   │
│ │ ├─ Memory idle: 30-40MB (vs Electron 200-300MB)   │   │
│ │ ├─ Startup: <500ms (vs Electron 1-2s)             │   │
│ │ └─ Security: Rust + WebView (less attack surface) │   │
│ └────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ FRONTEND (UI + State Management)                         │
│ ┌────────────────────────────────────────────────────┐   │
│ │ React 19 + TypeScript                              │   │
│ │ └─ XState 5.x (Máquinas de Estado)                │   │
│ │    ├─ Faz impossível estados inválidos             │   │
│ │    ├─ UI é passive (nunca decide, só renderiza)   │   │
│ │    └─ Todas transições são explícitas             │   │
│ └────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ BACKEND (API + Business Logic)                           │
│ ┌────────────────────────────────────────────────────┐   │
│ │ Tauri Commands (Rust)                              │   │
│ │ ├─ All I/O goes through here (File, DB, Network)  │   │
│ │ ├─ Firewall: Frontend NÃO acessa sistem directly  │   │
│ │ └─ Security: Prepared statements, validated input │   │
│ └────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ PERSISTENCE & ENCRYPTION                                 │
│ ┌────────────────────────────────────────────────────┐   │
│ │ SQLite 3.45+ + SQLCipher (AES-256)                │   │
│ │ ├─ One file: patients.db (encrypted at rest)      │   │
│ │ ├─ ACID compliance (no data loss)                 │   │
│ │ ├─ No external server (fully local)               │   │
│ │ └─ Portable (easy backup)                         │   │
│ └────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ AI LOCAL (Privacy-First)                                 │
│ ┌────────────────────────────────────────────────────┐   │
│ │ Ollama (Local LLM Runtime)                         │   │
│ │ ├─ Model: Llama 3.2 8B or Phi-3                   │   │
│ │ ├─ Portuguese: Native support                     │   │
│ │ ├─ Privacy: 100% on-device (no cloud calls)       │   │
│ │ └─ Integration: Tauri spawn_command                │   │
│ └────────────────────────────────────────────────────┘   │
│ ┌────────────────────────────────────────────────────┐   │
│ │ Whisper Local (Speech-to-Text)                     │   │
│ │ ├─ OpenAI model (quantized, ~1.5GB)               │   │
│ │ ├─ Privacy: Audio stays on device                 │   │
│ │ ├─ No external API calls                          │   │
│ │ └─ Robust to background noise                     │   │
│ └────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

---

## Isolamento de Núcleos

```
┌─────────────────────────────────────────────────────────┐
│  CLINICAL (Núcleo Clínico)                              │
│  ├─ Máquina XState (todas transições clínicas)         │
│  ├─ Database: table "patients", "sessions", "notes"    │
│  ├─ NUNCA acessível por Marketing                      │
│  └─ Only export: getAggregates() (anonymized stats)    │
└─────────────────────────────────────────────────────────┘

         ↓ ETL Pipeline (unidirectional)
         ↓ Marketing lê APENAS: count, stats (NO PII)

┌─────────────────────────────────────────────────────────┐
│  MARKETING (Núcleo de Marketing)                        │
│  ├─ Máquina XState (leads, campaigns, analytics)       │
│  ├─ Database: table "leads", "campaigns", "metrics"    │
│  ├─ NUNCA consegue import from ../clinical/           │
│  └─ Trabalha com dados anônimos ("Paciente-001")       │
└─────────────────────────────────────────────────────────┘

         ↓

┌─────────────────────────────────────────────────────────┐
│  NAC (Núcleo de Agentes Cognitivos)                     │
│  ├─ Máquina XState (agent lifecycle)                   │
│  ├─ LLM Client (calls Ollama)                          │
│  ├─ Audit Log (append-only, immutable)                 │
│  ├─ CAN read Clinical (full context for analysis)      │
│  ├─ CANNOT write Clinical (never persists automatically)
│  └─ Only human can approve & copy IA output            │
└─────────────────────────────────────────────────────────┘

ISOLAMENTO GARANTIDO: TypeScript imports + Tauri commands
├─ If Marketing tries: import from clinical → COMPILE FAILS
├─ If NAC tries write: no command available → RUNTIME BLOCKED
└─ Estrutura impõe segurança, não confia só em disciplina
```

---

## UI: Passiva (Espelho de Estado)

```
┌─────────────────────────────────────────┐
│  USER INTERACTION                       │
│  (Click button)                         │
│  ↓                                      │
│  Event → XState Machine                │
│  ↓                                      │
│  State Changes                          │
│  ↓                                      │
│  UI Re-renders (passively)              │
│  ↓                                      │
│  User sees new state                    │
└─────────────────────────────────────────┘

GARANTIA: UI NUNCA:
├─ Inicia transição inválida (guards previne)
├─ Acessa banco de dados diretamente
├─ Executa lógica de negócio
└─ Persiste dados sem comando Tauri

UI = render(state)
ESTADO = máquina XState
LÓGICA = backend Rust
```

---

## Fluxo de Dados Clínico (Exemplo: Sessão)

```
1. PACIENTE ABRE
   ├─ Shell: activePatientId = "pac-001"
   ├─ XState: patientSelected state
   └─ UI: Renderiza lista de sessões

2. CLÍNICO INICIA SESSÃO
   ├─ XState: idle → sessionActive
   ├─ UI: Mostra editor de notas + IA lab
   └─ Status: Pronto para documentar

3. CLÍNICO GRAVA ÁUDIO
   ├─ Frontend: getUserMedia() → WAV buffer
   ├─ Send to Tauri: invoke('transcribe', {audio})
   ├─ Backend: spawn Ollama Whisper
   ├─ Retorna: texto transcrito (bruto em RAM)
   └─ Frontend: Exibe rascunho para revisão

4. CLÍNICO EDITA TRANSCRIÇÃO
   ├─ XState: reviewingTranscription state
   ├─ UI: Editor de texto (pode ajustar)
   └─ Áudio original: DESCARTADO (nunca persistiu)

5. CLÍNICO CONFIRMA
   ├─ invoke('db_save_notes', {sessionId, content})
   ├─ Backend: Prepared statement (binding)
   ├─ DB: Encrypted save (SQLCipher)
   ├─ XState: sessionClosing → sessionClosed
   └─ PERSISTÊNCIA: COMPLETA E IMUTÁVEL

6. PRÓXIMAS VEZES
   ├─ Sessão pode ser consultada (read-only)
   ├─ NAC pode ler histórico completo
   ├─ Mas sem automação (sempre humano autoriza)
   └─ Auditoria: Who changed what, when, why
```

---

## Stack por Ficheiro

```
ARQUIVO                          LINGUAGEM    RESPONSABILIDADE
────────────────────────────────────────────────────────────
src/shell/app.tsx                TypeScript   Menu, roteamento
src/shell/styles.css             CSS          Design system

src/core/clinical/machine.ts      TypeScript   Estados clínicos (XState)
src/core/clinical/ui/*.tsx        TypeScript   Componentes clínicos
src/core/clinical/db/client.ts    TypeScript   Wrapper SQLite

src/core/nac/machine.ts           TypeScript   Estados de IA
src/core/nac/llm-client.ts        TypeScript   Chama Ollama
src/core/nac/audit.ts             TypeScript   Log imutável

src/core/marketing/machine.ts     TypeScript   Estados marketing
src/core/marketing/etl.ts         TypeScript   Lê anônimos do Clinical

src-tauri/src/main.rs             Rust         Tauri window + commands
src-tauri/src/db.rs               Rust         SQLite pool
src-tauri/src/commands/db.rs      Rust         DB commands
src-tauri/src/commands/ollama.rs  Rust         Spawn LLM
src-tauri/src/commands/crypto.rs  Rust         Encrypt/decrypt
```

---

## Phases e Timeline

```
FASE 1 (1-2 weeks):  Shell + Menu + Tauri window
FASE 2 (2-3 weeks):  SQLite + PatientList
FASE 3 (2-3 weeks):  XState Machine (impossível invalid states)
FASE 4 (2 weeks):    Whisper + Audio Pipeline
FASE 5 (2-3 weeks):  NAC (IA + Audit)
FASE 6 (1-2 weeks):  MVP Clinical (usável em consultório real)
FASE 7 (ongoing):    Marketing Isolation + Pesquisa

TOTAL: ~12-16 weeks até MVP clínico completo
```

---

## Validações Críticas

```
✅ SEGURANÇA
├─ Dados locais (sem nuvem) → Confirmado (SQLite local)
├─ Criptografia de repouso → Confirmado (SQLCipher AES-256)
├─ IA nunca persiste automaticamente → Confirmado (guard: needsHumanApproval)
├─ Marketing não acessa Clinical → Confirmado (imports falham em compile)
└─ Auditoria imutável → Confirmado (append-only JSON)

✅ USABILIDADE
├─ Startup rápido → Confirmado (Tauri <500ms vs Electron 1-2s)
├─ Baixo uso RAM → Confirmado (Tauri 30-40MB vs Electron 200-300MB)
├─ Interface clara → Confirmado (design system definido)
└─ Sem bugs de estado → Confirmado (XState impossible invalid states)

✅ VIABILIDADE TÉCNICA
├─ IA consegue gerar código → Confirmado (Rust/React bem documentados)
├─ Stack open-source → Confirmado (Tauri, XState, SQLite, Ollama, Whisper)
├─ Sem single point of failure → Confirmado (núcleos isolados)
└─ Escalável → Confirmado (arquitetura por núcleos permite growth)
```

---

## Próximos Passos Imediatos

**HOJE:**
1. Revise este documento
2. Apresente a ChatGPT Go (role: "Crítico de Segurança Clínica")
   - Pergunta: "Há brechas em isolamento Marketing-Clinical?"
   - Pergunta: "Máquina XState realmente impossibilita estado inválido?"
   - Pergunta: "IA nunca escreve prontuário sem humano?"

**SEMANA 1:**
1. Instale Tauri CLI
2. Instale Ollama + modelo Llama 3.2 8B
3. Use Prompt 1 (Shell Bootstrap) com Google AI Pro
4. Comece Fase 1

**SEMANA 2:**
1. Shell compila e roda em Windows
2. Menu funciona (navigation events)
3. Use Prompt 2 (DB + XState) com Google AI Pro

---

## Decisões Congeladas (Não mudar)

```
🔒 Tauri (não Electron) — Por: Security + RAM + Startup + IA viability
🔒 XState (não Redux) — Por: Impossível invalid states, alinha com UI passiva
🔒 SQLite local (não cloud) — Por: Privacidade, soberania, performance
🔒 Rust backend (não Node.js) — Por: Memory safety, type safety, security
🔒 Ollama local (não APIs) — Por: Privacidade, sem custo, controle total
🔒 React (não Vue/Svelte) — Por: IA gera com confiança, maior ecossistema
```

---

## Axiomas para Memorizar

```
1. UI É PASSIVA
   Nunca: state.setSessionActive()
   Sempre: XState dispensa evento → máquina transiciona → UI re-renderiza

2. SEM AUTOMAÇÃO SEM CONFIRMAÇÃO
   Nunca: IA escreve prontuário automaticamente
   Sempre: IA propõe → humano revisa → humano clica "Confirmar"

3. ISOLAMENTO POR ESTRUTURA
   Nunca: Contar em disciplina humana
   Sempre: Impossibilitar em compile (import fails)

4. CLÍNICA SOBRE TECNOLOGIA
   Nunca: Elegância técnica que prejudica gesto clínico
   Sempre: Pragmatismo seguro (Documento Mestre rege tudo)

5. LOCAL-FIRST
   Nunca: Dados sensíveis na nuvem
   Sempre: Tudo no dispositivo clínico, criptografado
```

---

**Data:** 13 de Janeiro de 2026  
**Status:** ✅ Pronto para Implementação Imediata  
**Próximo:** Fase 1 Bootstrap (Shell)

---

# 17. DOCUMENTO COMPLEMENTAR DE CONSOLIDAÇÃO DE MENUS, UI E ESCOPO DE IA

**Status:** Documento Complementar Normativo-Interpretativo

**Subordinação:** Documento Mestre Absoluto

**Função:** Este documento existe para **eliminar definitivamente ambiguidades futuras** sobre onde estão definidas as regras de **menus, abas, navegação, layout** e a distinção entre **IA de Produto** e **IA de Desenvolvimento**. Ele **não cria regras novas**. Ele **consolida, reforça e repete** decisões já tomadas, de forma propositalmente redundante.

A repetição aqui é **intencional e desejável**.

---

## 1. Princípio Geral deste Documento

> **Se uma regra parece repetida em mais de um lugar, isso não é erro: é blindagem documental.**

Este documento deve ser consultado sempre que surgir a dúvida:
- "Onde isso está definido?"
- "Existe um documento único para menus ou layout?"
- "Isso é IA do produto ou IA de desenvolvimento?"

---

## 2. Definição Oficial de Menus, Abas e Navegação

### 2.1 Esclarecimento Central

Não existe — e **não deve existir** — um único documento isolado chamado:

> "Definição Oficial de Menus, Abas e Navegação"

Essa definição é **intencionalmente distribuída** em documentos de níveis diferentes, cada um cobrindo uma camada específica do sistema.

Essa decisão evita:
- documentos inchados
- duplicação normativa
- conflitos de autoridade

---

### 2.2 Onde, oficialmente, menus, abas e navegação são definidos

A definição oficial está distribuída **exatamente** nos seguintes documentos:

#### 1️⃣ Documento Mestre do Shell (nível 1)

Define:
- menu de nível 1
- papel do Shell como porta única
- impossibilidade de núcleos criarem menus próprios
- regras de navegação global

Este documento governa **o que pode existir no topo da UI**.

---

#### 2️⃣ Documento Normativo da Aba Evolução

Define:
- centralidade da Evolução durante sessão
- navegação permitida durante atendimento
- separação entre abas clínicas e administrativas
- impossibilidade de navegação encerrar sessão

Este documento governa **o comportamento clínico da navegação**.

---

#### 3️⃣ Documento Técnico do Núcleo Clínico — Bloco 5 (Integração com UI)

Define:
- contrato técnico UI ↔ Núcleo Clínico
- eventos permitidos
- renderização por estado clínico
- proibição absoluta de inferência por UI

Este documento governa **como a navegação é tecnicamente enforçada**.

---

#### 4️⃣ Wireframes Textuais Oficiais

Definem:
- disposição das abas
- hierarquia visual
- comportamento esperado de cada tela
- fluxos possíveis sem ambiguidade

Os wireframes são a **fonte visual final** para implementação.

---

### 2.3 Regra de Ouro

> **Se não estiver previsto nesses quatro elementos, não pertence à navegação oficial do sistema.**

---

## 3. Consolidação do Layout (Ausência de Documento Único)

### 3.1 Esclarecimento Central

Não existe — e **não deve existir** — um documento separado chamado:

> "Documento de Layout Unificado"

O layout do NeuroStrategy OS foi **absorvido conscientemente** por documentos mais fortes e menos interpretáveis.

---

### 3.2 Onde o layout está oficialmente definido

O layout está consolidado nos seguintes artefatos:

#### ✔ Wireframes Textuais Oficiais
- hierarquia visual
- distribuição espacial
- foco cognitivo

#### ✔ Documento Mestre do Shell
- layout fixo do contêiner
- invariância estrutural

#### ✔ Documento Normativo da Aba Evolução
- Word Clínico
- Painel de Agentes
- centralidade do atendimento

Não existe outro local autorizado para definição de layout.

---

### 3.3 Regra de Ouro do Layout

> **Layout é dispositivo clínico, não estética.**

Qualquer proposta de layout fora desses documentos:
- é inválida
- deve ser descartada
- ou movida para material exploratório

---

## 4. Esclarecimento Reforçado — IA de Produto × IA de Desenvolvimento

Este esclarecimento é **deliberadamente repetido**, pois é um dos pontos mais comuns de confusão futura.

---

### 4.1 IA de Produto (NeuroStrategy OS)

A IA de Produto:
- atua **dentro do sistema entregue**
- obedece aos contratos clínicos
- nunca decide
- nunca persiste automaticamente
- nunca escreve no prontuário

Ela está formalmente definida em:
- Documento Mestre Absoluto
- Documento Normativo do Núcleo Clínico
- Documento Técnico Bloco 4 (IA: Análises & NAC)
- Documento Auxiliar de Resolução de Ambiguidades

---

### 4.2 IA de Desenvolvimento (fora do produto)

A IA de Desenvolvimento:
- auxilia programação
- auxilia escrita de documentos
- auxilia raciocínio arquitetural
- **não faz parte do produto clínico**

Ela:
- não segue contratos clínicos
- não interage com pacientes
- não aparece na UI

Seu uso é **livre, agressivo e pragmático**, pois não afeta a ética do produto final.

---

### 4.3 Regra de Ouro da IA

> **Qualquer IA visível ao paciente ou atuante no prontuário é IA de Produto e está rigidamente limitada.**

> **Qualquer IA usada para criar o sistema é IA de Desenvolvimento e não impõe restrições ao produto.**

Misturar essas duas categorias é **erro conceitual grave**.

---

## 5. Encerramento

Este documento existe para:
- reforçar decisões já tomadas
- impedir regressões conceituais
- reduzir dependência de memória institucional

Ele deve ser lido como:
> **manual de prevenção de confusão futura**.

---

**Documento Complementar — Consolidação de Menus, UI e Escopos de IA**

NeuroStrategy OS

---

# 18. DOCUMENTO TÉCNICO DE IMPLEMENTAÇÃO — RELATÓRIO TÉCNICO

**Status:** Relatório Executivo — Pronto para Implementação

**Autoridade:** Arquitetural e Operacional (por delegação)

**Data:** 13 de Janeiro de 2026

**Audiência:** Não-programador com suporte de IA (ChatGPT Go, Google AI Pro)

---

## Executive Summary

Este relatório apresenta a arquitetura técnica **completa e executável** para o NeuroStrategy OS, respeitando:
- **Soberania Documental** (Documento Mestre Absoluto rege tudo)
- **Segurança Clínica** (Dados locais, sem nuvem, criptografia de repouso)
- **UI Passiva** (Interface nunca decide, apenas renderiza estado do núcleo clínico)
- **Isolamento de Núcleos** (Clínico ↔ Marketing ↔ NAC sem contaminação)
- **Viabilidade para IA Geradora** (Stack escolhida facilita código gerado sem erros por Google AI Pro)

**Decisão Principal:** Tauri (não Electron) + Rust (backend) + TypeScript/React (frontend) + SQLite com SQLCipher (persistência) + Ollama (IA local)

---

## 1. Matriz de Decisão Tecnológica

### 1.1 Shell e Container (Desktop Framework)

| Componente | Recomendado | Alternativa | Justificativa |
|-----------|------------|-----------|--------------|
| **Desktop Framework** | **Tauri 2.0+** | Electron | Tauri: <10MB (vs 100MB), 30-40MB RAM (vs 200-300MB), Rust security, startup <500ms. Para clínico usando 8h/dia, diferença de RAM é crítica. Electron ainda excelente para ecossistema, mas Tauri é "security-first" e "developer-experience-first" para IA geradora. |
| **Frontend Framework** | **React 19 + TypeScript** | Vue 3, Svelte | React: Maior ecossistema, mais documentado, IA gera código React com confiança. XState (state machines) integra nativamente. |
| **Backend Language** | **Rust** | Go, Node.js | Rust: Segurança de memória (impossível buffer overflow), tipos fortes, Tauri native. Google AI Pro gera Rust mais seguro que C/C++. Node.js funcionaria mas menos seguro para dados clínicos. |
| **State Management** | **XState 5.x** | Redux, Zustand | XState: Máquinas de estado forçam transições explícitas, impedem estados inválidos na UI, alinha com "UI Passiva". Zustand é mais simples mas menos seguro para garantias clínicas. |

### 1.2 Transcrição de Áudio (Speech-to-Text)

| Componente | Recomendado | Alternativa | Justificativa |
|-----------|------------|-----------|--------------|
| **STT Engine** | **Whisper Local (via Ollama ou standalone)** | Google STT, AWS Transcribe | Whisper: Roda 100% on-device, sem nuvem, suporta português, robusto em ruído, MIT license. Alternativas quebram privacidade (áudio sai do dispositivo). Quantização para rodar em CPU comum. |
| **Arquitetura STT** | **Captura → RAM Temporária → Rascunho → Edição → Commit** | Gravação automática | Garante: áudio bruto nunca persiste, humano sempre revisa antes de salvar no prontuário. |

### 1.3 Núcleo de Agentes Cognitivos (NAC)

| Componente | Recomendado | Alternativa | Justificativa |
|-----------|------------|-----------|--------------|
| **Formato Persona** | **JSON Schema + Versionamento** | YAML, Protobuf | JSON: Sem dependências externas, human-readable, fácil para IA gerar, versionável em Git. |
| **Logging e Auditoria** | **Arquivo JSON imutável (append-only) + Assinatura Digital** | Base de dados | Arquivo: impossível alterar histórico, auditoria clara, simples exportar. Assinatura = comprovação de integridade. |
| **Local LLM** | **Ollama (Llama 3.2 8B ou Phi-3)** | LocalAI, LM Studio | Ollama: Maior comunidade, melhor integração Node.js, GGUF format estável, fácil integração. |

### 1.4 Persistência e Segurança de Dados

| Componente | Recomendado | Alternativa | Justificativa |
|-----------|------------|-----------|--------------|
| **Banco de Dados** | **SQLite 3.45+ com SQLCipher** | JSON puro, PostgreSQL local | SQLite: ACID compliance, criptografia AES-256, sem servidor externo, 1 arquivo, portable. Não precisa Postgres para caso clínico solo. JSON causaria lentidão em queries longitudinais. |
| **Criptografia** | **AES-256 (SQLCipher)** | Rust's crypto, Manual | SQLCipher: Battle-tested, implementação correta, transparente ao código. |
| **Local Isolation** | **Tauri Isolation Pattern (Sandbox iframe)** | Ad-hoc validation | Tauri enforça sandbox para IPC (Inter-Process Communication), impossibilita acesso direto filesystem de UI. |

### 1.5 Núcleo de Marketing (Isolamento Crítico)

| Componente | Recomendado | Alternativa | Justificativa |
|-----------|------------|-----------|--------------|
| **Arquitetura Isolamento** | **Pasta completamente separada (`/core/marketing` ≠ `/core/clinical`), sem imports cross-core, contrato ETL explícito** | Compartilhar funções | Estrutura força isolamento: Marketing NUNCA consegue acessar `/core/clinical/data` em tempo de execução. Contrato: "Marketing lê APENAS dados agregados anonimizados". |
| **Data Transfer** | **ETL Pipeline Unidirecional (Clinical → Anonymized Mirror → Marketing)** | Acesso direto | Garantia: dados de paciente nunca saem de `/core/clinical`. Marketing trabalha com "Paciente-001" (sem identificador real). |

### 1.6 IA Local (On-Premise)

| Componente | Recomendado | Alternativa | Justificativa |
|-----------|------------|-----------|--------------|
| **LLM Runtime** | **Ollama (standalone executável) + Tauri spawn_command** | LocalAI, vLLM | Ollama: 1 line setup, pode rodar como daemon, REST API simples, modelos pré-otimizados, zero Python dependency. |
| **Modelos** | **Llama 3.2 8B (para prosa clínica) ou Phi-3 (menor, mais rápido)** | GPT-4 local (não existe), Mistral | Llama 3.2: Bom custo-benefício, treinou em português, suporta 8k tokens (suficiente para sessão+histórico). |
| **Integração** | **Tauri command que chama `ollama run modelo "prompt"`** | HTTP client | Command: Simples, não precisa configurar HTTP server, output stderr é capturado nativamente. |

---

## 2. Arquitetura de Pastas Sugerida

```
neurostrategy-os/
│
├── src/
│   ├── shell/
│   │   ├── index.html              # Página única (Tauri requer)
│   │   ├── app.tsx                 # React root, menu principal, roteamento
│   │   ├── styles.css              # Design system (variables, reset, componentes base)
│   │   └── useShellContext.ts       # Context: activePatientId, sessionState (mínimo)
│   │
│   ├── core/
│   │   │
│   │   ├── clinical/               # *** NÚCLEO CLÍNICO ***
│   │   │   ├── index.ts            # Export público
│   │   │   ├── machine.ts          # XState: máquina de estados clínica
│   │   │   ├── context.ts          # Tipos: types clínicos (Patient, Session, Evolution, etc)
│   │   │   ├── guards.ts           # Validações de transição (pode abrir evolução? pode fechar sessão?)
│   │   │   ├── actions.ts          # Side effects autorizados (persist, notify)
│   │   │   ├── selectors.ts        # Funções para ler estado (getActiveSession, getPatientHistory)
│   │   │   ├── db/
│   │   │   │   ├── schema.ts       # Tabelas SQL: patients, sessions, evolucoes, mbc_scores
│   │   │   │   ├── client.ts       # SQLite wrapper (insert, update, query)
│   │   │   │   └── migrate.ts      # Schema versioning
│   │   │   ├── nac-connector.ts    # Único arquivo que fala com NAC (contrato)
│   │   │   └── ui/
│   │   │       ├── PatientList.tsx
│   │   │       ├── PatientCard.tsx
│   │   │       ├── EvolutionTab.tsx       # Aba Evolução (tela principal)
│   │   │       ├── SessionHistory.tsx
│   │   │       └── MBCDisplay.tsx
│   │   │
│   │   ├── nac/                    # *** NÚCLEO DE AGENTES COGNITIVOS ***
│   │   │   ├── index.ts
│   │   │   ├── machine.ts          # XState: gerenciamento de agentes
│   │   │   ├── types.ts            # Persona, TrainingLog, AuditEntry
│   │   │   ├── personas/
│   │   │   │   ├── supervisor.json     # Configuração da persona (versionada)
│   │   │   │   ├── analyzer.json
│   │   │   │   └── synthesizer.json
│   │   │   ├── llm-client.ts       # Interface com Ollama (spawn, parse response)
│   │   │   ├── audit.ts            # Logging imutável de cada prompt/resposta
│   │   │   ├── clinical-connector.ts   # Único arquivo que lê Clinical (contrato)
│   │   │   └── ui/
│   │   │       ├── AgentLab.tsx        # Painel de IA (lado direito da Evolução)
│   │   │       └── AgentAnalysis.tsx
│   │   │
│   │   ├── marketing/              # *** NÚCLEO DE MARKETING ***
│   │   │   ├── index.ts
│   │   │   ├── machine.ts          # XState: fluxo de marketing
│   │   │   ├── types.ts            # LeadData, CampaignMetrics
│   │   │   ├── db/
│   │   │   │   ├── client.ts       # SQLite separado ou tabelas marcadas "marketing"
│   │   │   │   └── queries.ts
│   │   │   ├── etl-pipeline.ts     # Lê APENAS dados anônimos do Clinical
│   │   │   ├── analytics.ts        # Google Analytics, GEO, conversão
│   │   │   └── ui/
│   │   │       ├── DashboardMarketing.tsx
│   │   │       └── CampaignManager.tsx
│   │   │
│   │   ├── diagnosis/              # *** NÚCLEO DE DIAGNÓSTICO (future)***
│   │   │   └── (estrutura similar)
│   │   │
│   │   └── research/               # *** NÚCLEO DE PESQUISA (future) ***
│   │       └── (estrutura similar)
│   │
│   ├── lib/
│   │   ├── types/
│   │   │   └── index.ts            # Tipos compartilhados (GlobalContext)
│   │   ├── utils/
│   │   │   ├── encryption.ts       # Wrapper para encrypt/decrypt
│   │   │   ├── date.ts             # Formatação de data
│   │   │   ├── validation.ts       # CPF, Email, etc
│   │   │   └── logger.ts           # Logging estruturado
│   │   └── hooks/
│   │       ├── useActor.ts         # Hook XState (já vem com @xstate/react)
│   │       ├── useClinical.ts      # Acesso ao núcleo clínico
│   │       └── useShell.ts         # Acesso ao contexto global
│   │
│   └── tauri-api/
│       ├── commands.rs             # Tauri commands (IPC handlers)
│       ├── file.rs                 # File I/O (sempre through Tauri)
│       ├── crypto.rs               # Wrapper para encryption
│       └── ollama.rs               # Spawn ollama, parse responses
│
├── src-tauri/                      # Rust backend (Tauri)
│   ├── src/
│   │   ├── main.rs                 # Entry point Tauri
│   │   ├── db.rs                   # SQLite connection pool
│   │   ├── commands/
│   │   │   ├── file.rs             # Read/write files (com validação de path)
│   │   │   ├── db.rs               # Execute queries (nunca SQL direto, sempre prepared)
│   │   │   ├── ollama.rs           # Spawn ollama, stream output
│   │   │   └── crypto.rs           # Encryption/decryption
│   │   └── models.rs               # Rust structs (Patient, Session, etc)
│   │
│   └── Cargo.toml                  # Dependências Rust (tauri, rusqlite, tokio, etc)
│
├── docs/
│   ├── ARCHITECTURE.md             # Este diagrama
│   ├── API_CONTRACTS.md            # Contratos entre núcleos
│   ├── SECURITY.md                 # Threat model, encryption spec
│   ├── DEV_GUIDE.md                # Como estender
│   └── CLINICAL_SPEC.md            # Especificação clínica (máquina de estados)
│
├── tests/
│   ├── unit/
│   │   ├── clinical.test.ts
│   │   ├── nac.test.ts
│   │   └── marketing.test.ts
│   ├── integration/
│   │   └── core-isolation.test.ts  # Verifica que Marketing não acessa Clinical
│   └── e2e/
│       └── session-flow.test.ts    # Fluxo completo de sessão clínica
│
├── tauri.conf.json                 # Configuração Tauri (deep linking, permissions)
├── package.json
├── tsconfig.json
├── vite.config.ts                  # Bundler
└── README.md
```

### Princípios de Estrutura:

1. **Isolamento por Núcleo:** Cada núcleo tem sua máquina XState, seu DB (ou schema), seus tipos.
2. **Contrato Explícito:** Arquivo `*-connector.ts` é o único ponto de comunicação inter-núcleos.
3. **Sem Imports Cruzados:** `clinical/index.ts` nunca importa de `marketing/index.ts`.
4. **Tauri como Firewall:** Todos os I/O (file, DB, net) vai através de `src-tauri/src/commands/`.

---

## 3. Roteiro de Implementação Faseado

### Fase 1: Hello World + Shell Fechado (1-2 semanas)

**Objetivo:** Tauri app abre, mostra menu, carrega núcleo clínico vazio.

**Entregáveis:**
- [ ] `tauri.conf.json` configurado (Windows, React, Rust backend)
- [ ] `src/shell/app.tsx` com menu fixo (Pacientes, Clínico, Admin, Config)
- [ ] `src/shell/styles.css` com design system (cores, tipografia)
- [ ] `src-tauri/src/main.rs` básico (Tauri window, nenhuma lógica)
- [ ] Projeto compila e roda em Windows

---

### Fase 2: Persistência e Banco de Dados (2-3 semanas)

**Objetivo:** SQLite está funcional, pacientes podem ser criados/listados, dados salvam.

**Entregáveis:**
- [ ] `src-tauri/src/db.rs`: Conexão SQLite com SQLCipher
- [ ] Schema migrations: tabelas `patients`, `sessions`, `evolucoes`
- [ ] `src-tauri/src/commands/db.rs`: Commands para INSERT/SELECT/UPDATE
- [ ] `src/core/clinical/db/client.ts`: TypeScript wrapper
- [ ] `src/core/clinical/ui/PatientList.tsx`: Lista funcional de pacientes

**Validações:**
- [ ] Dados persistem após fechar app
- [ ] Marketing NUNCA consegue acessar clinical DB (teste: import falha em compile)

---

### Fase 3: Máquina de Estados Clínica (2-3 semanas)

**Objetivo:** XState governa transições, UI é passiva.

**Entregáveis:**
- [ ] `src/core/clinical/machine.ts`: Estados (idle, active, paused, closed)
- [ ] Guards implementados: posso abrir sessão? Posso fechar? Posso navegar para admin?
- [ ] `src/core/clinical/ui/EvolutionTab.tsx`: Renderiza APENAS o estado atual
- [ ] Testes: Transição inválida não acontece

**Validações:**
- [ ] UI nunca consegue forçar transição inválida (impossible states)

---

### Fase 4: Integração de Áudio (Whisper Local) (2 semanas)

**Objetivo:** Captura audio, transcreve local, usuário valida antes de salvar.

**Entregáveis:**
- [ ] `src-tauri/src/commands/ollama.rs`: Spawn whisper (quantizado)
- [ ] `src/core/clinical/ui/TranscriptionPanel.tsx`: Gravar → transcrever → editar
- [ ] Fluxo: Captura (RAM) → Transcrição (Whisper) → Rascunho → Humano confirma → Persiste

**Validações:**
- [ ] Áudio bruto NUNCA salvo
- [ ] Transcrição sempre revisada antes de persistência

---

### Fase 5: Núcleo de Agentes (NAC) (2-3 semanas)

**Objetivo:** IA consulta clínico (não gera automaticamente).

**Entregáveis:**
- [ ] `src/core/nac/machine.ts`: Estados (ready, querying, responding)
- [ ] `src/core/nac/llm-client.ts`: Chama Ollama com prompt
- [ ] `src/core/nac/audit.ts`: Cada prompt/resposta logged imutavelmente
- [ ] `src/core/clinical/ui/EvolutionTab.tsx` com painel NAC (lado direito)
- [ ] Botão "Consultar IA" → IA lê sessão + histórico → oferece análise

**Validações:**
- [ ] IA NUNCA escreve prontuário (clínico copia/adapta manualmente)
- [ ] Audit log impossível de alterar

---

### Fase 6: MVP Clínico Usável (1-2 semanas)

**Objetivo:** Sistema pronto para uso real em consultório.

**Entregáveis:**
- [ ] Lista de pacientes funcional
- [ ] Abertura de paciente, aba Evolução
- [ ] Sessão completa: notas + transcrição + IA opcional
- [ ] Histórico de sessões
- [ ] Salvar (persist), carregar (read)
- [ ] Backup local automático

---

### Fase 7: Isolamento Marketing (Estrutura Futura)

**Objetivo:** Estrutura pronta para equipe de marketing não contaminar clínica.

**Entregáveis:**
- [ ] Pasta `/core/marketing/` com máquina própria
- [ ] ETL pipeline: Clinical → Anonymized Data → Marketing
- [ ] Testes de isolamento (import fails, data access fails)
- [ ] **Mas:** Nenhuma interface visual ainda (apenas estrutura)

---

## 4. Validações de Segurança

### Isolamento de Núcleos (Teste Crítico)

```typescript
// Este teste DEVE falhar em compile se Marketing conseguir importar Clinical:

// ❌ Isto deve ser impossible:
// import { getClinicalData } from '../clinical'; 

// ✅ Isto é o máximo permitido:
import { getClinicalAggregates } from '../clinical/etl-connector'; // Retorna APENAS: count, stats, sem PII
```

### Segurança de Persistência

```typescript
// ✅ Correto: SEMPRE através de commands Tauri
const result = await invoke('db_save_notes', { sessionId, content });

// ❌ Errado: Acesso direto desabilitar em compile
// import sqlite3 from 'sqlite3'; // Module not exported
```

### Máquina de Estados (Impossível Invalid State)

```typescript
// ✅ TypeScript prevent:
if (state.matches('sessionActive')) {
  // setNotes é safe aqui
}

// ❌ Impossível:
// state.sessionActive && state.sessionClosed simultaneamente
// (XState garante mutual exclusion)
```

---

## 5. Próximos Passos

1. **Apresente este relatório a ChatGPT Go** com role: "Crítico de Segurança Clínica"
   - Validar: "Há falha em isolamento Marketing-Clinical?"
   - Validar: "Máquina XState previne estado inválido?"
   - Validar: "Persistência segue 'sem automação sem confirmação'?"

2. **Use Prompts 1, 2, 3 com Google AI Pro** para gerar código (um prompt por vez)
   - Revise cada saída contra axiomas
   - Se divergir, rejeite e regenere

3. **Comece Fase 1** (Shell + Menu)
   - Compila, roda em Windows
   - Menu responde

4. **Paralelo:** Instale Ollama, baixe `whisper` quantizado

---

## 6. Referências Técnicas

- **Tauri Docs:** https://tauri.app/
- **XState Docs:** https://stately.ai/docs
- **Whisper:** https://github.com/openai/whisper
- **Ollama:** https://ollama.ai/
- **SQLCipher:** https://www.zetetic.net/sqlcipher/

---

**FIM DO RELATÓRIO**

**Data:** 13 de Janeiro de 2026  
**Pronto para apresentação a equipe de IA e início de implementação.**

---

# 19. DOCUMENTO OPERACIONAL — ACORDO DE VIRADA PARA PRODUTO REAL

**Status:** Oficial · Ativo

**Data:** 03/01/2026

**Modo:** Uso Clínico Pessoal · Valor Imediato

---

## 1. Contexto da Decisão

O projeto alcançou maturidade estrutural suficiente no Núcleo Clínico (máquina de estados, guards e contratos). No entanto, a ausência de funcionalidades **visivelmente utilizáveis** passou a gerar desgaste e perda de motivação.

Ao mesmo tempo, existe uma **necessidade concreta e imediata**:
- Centralizar o cotidiano do consultório
- Reduzir o uso fragmentado de múltiplas ferramentas
- Ganhar tempo operacional antes do início do mestrado
- Testar o sistema em atendimentos reais

Diante disso, foi tomada a decisão consciente de **priorizar funcionalidade prática**, mantendo a arquitetura "boa o suficiente", sem paralisar o projeto por excesso de conservadorismo invisível.

---

## 2. Declaração Oficial de Modo

A partir deste ponto, o projeto entra em:

**Modo Produto Real — Uso Clínico Pessoal**

Características deste modo:
- Usuário único (o próprio clínico)
- Risco ético controlado
- Segurança equivalente ou superior ao uso atual (Drive, Docs, Chatbots)
- Foco em valor imediato
- Iteração rápida
- Arquitetura pragmática, não perfeita

Este modo **não invalida** decisões anteriores — apenas ajusta o ritmo e o foco.

---

## 3. Acordos Técnicos Congelados

### 3.1 Uso da IA

- A IA **pode ler todo o prontuário do paciente**
- A IA **pode ler todas as sessões anteriores**
- A IA **pode ler anotações e transcrições**
- Não haverá compartimentalização perfeita neste momento
- Contexto rico é considerado **vantagem clínica**

A IA atua como:
- Assistente clínico
- Supervisor reflexivo
- Organizador de pensamento
- Apoio à escrita e análise

A IA **não substitui** a decisão humana.

---

### 3.2 Persistência de Dados

- 100% local
- Nenhum dado enviado automaticamente para a nuvem
- Persistência simples baseada em arquivos
- Transparência total sobre onde os dados estão

Estrutura base:

```
data/patients/  
└─ paciente-id/  
   ├─ patient.json  
   └─ sessions.json
```

Este modelo é considerado adequado e mais seguro do que o uso atual de múltiplas ferramentas dispersas.

---

### 3.3 Interface (UI)

Princípio adotado:

**Simples não é feio.**

Diretrizes de UI:
- Estilo Office / Notion
- Visual limpo e claro
- Tipografia adequada
- Organização espacial coerente
- Nada tosco, nada improvisado
- Design começa a nascer desde já, mesmo incompleto

A UI deve ser **agradável de usar**, ainda que funcionalmente limitada no início.

---

### 3.4 Segurança

- Uso pessoal consciente
- Controle humano total dos dados
- Sem automações ocultas
- Sem uploads invisíveis

O nível de segurança é considerado **equivalente ou superior** às práticas atuais do clínico.

---

## 4. Objetivo Central do MVP Clínico

Criar um sistema que permita:

- Cadastro e abertura de prontuário de pacientes
- Registro de atendimentos (notas + transcrição)
- Consulta fácil a sessões anteriores
- Uso de IA contextual, lendo todo o histórico

O sistema deve substituir, de forma integrada:
- Gravador de áudio + transcrição externa
- Google Drive / Google Docs
- ChatGPT, Gemini, NotebookLM usados separadamente
- Anotações dispersas

---

## 5. MVP Clínico Usável — Escopo em 3 Blocos

### BLOCO A — Prontuário Real

Entrega:
- Lista de pacientes
- Cadastro de novo paciente
- Abertura de paciente
- Documento vivo do prontuário
- Persistência local

Resultado esperado:
> "Tenho um lugar único para cada paciente."

---

### BLOCO B — Registro de Atendimento

Entrega:
- Criação de sessões
- Editor de notas funcional
- Campo de transcrição
- Histórico de sessões

Resultado esperado:
> "Consigo usar isso em atendimentos reais nesta semana."

---

### BLOCO C — IA Clínica Contextual

Entrega:
- Botão de consulta à IA
- IA recebe prontuário completo + sessões
- Respostas clínicas contextualizadas

Resultado esperado:
> "A IA pensa comigo sobre este paciente."

---

## 6. Relação com o Núcleo Clínico

- O Núcleo Clínico atual é considerado **suficiente** para este estágio
- Ele não será descartado
- Ele poderá ser refinado posteriormente, com menor carga emocional
- Nenhuma exigência de perfeição arquitetural bloqueia o avanço do produto

---

## 7. Diretriz Psicológica do Projeto

Este projeto existe para:
- Reduzir carga cognitiva
- Otimizar o cotidiano clínico
- Apoiar a formação acadêmica
- Renovar a prática clínica

Ele **não existe** para provar elegância técnica.

---

## 8. Status Final deste Documento

Este documento:
- Consolida a virada estratégica do projeto
- Deve ser considerado referência ativa
- Autoriza explicitamente decisões pragmáticas
- Serve como contexto para novos chats

**Documento Oficial — NeuroStrategy OS**

---

## 9. Atualização — Consolidação Pós-Análise dos Documentos e Referências Visuais

**Data:** 03/01/2026

Após a leitura integral dos documentos oficiais do projeto (Documento Mestre, Etapa 3, Etapa 3.1, Diretrizes de Uso da IA, Guia de Leitura das Camadas) e da análise das referências visuais fornecidas (prints de software clínico em uso real e rascunho da Aba Evolução), ficam consolidadas as decisões abaixo, sem reabertura de contratos congelados.

---

### 9.1 Confirmações Arquiteturais (Sem Alteração de Contratos)

- A **Tela Âncora (Evolução / Atendimento)** continua sendo soberana **apenas** para o gesto clínico em tempo real.
- A existência de **Dashboard**, **Lista de Pacientes** e **Ficha Administrativa do Paciente** não viola a Tela Âncora nem os contratos da Etapa 3.
- O erro de interpretação por mistura de camadas foi explicitamente evitado, conforme o *Guia Oficial de Leitura dos Documentos*.

📌 Nenhum documento congelado precisou ser alterado.

---

### 9.2 Consolidação do Modelo de Sistema (Produto Real)

O NeuroStrategy OS será materializado, a partir deste ponto, como um **software clínico clássico de consultório**, com:

- Menu superior global fixo
- Navegação previsível
- Tabelas densas e funcionais
- Abas administrativas e clínicas coexistindo
- IA como camada cognitiva invisível (não protagonista visual)

O sistema **não adota** padrões de app moderno, chat-centrismo ou UX experimental.

---

### 9.3 Pacientes como Eixo Central do Sistema

Fica confirmado que:

- A **Tela de Pacientes** é o eixo operacional do sistema.
- Ela deve conter tabela de pacientes, busca simples, botões de ação e abertura por duplo clique.
- A abertura de um paciente leva à **Ficha do Paciente**, que constitui um mini-sistema próprio.

---

### 9.4 Ficha do Paciente — Abas Mínimas Funcionais

As seguintes abas são consideradas **mínimo obrigatório para uso real de consultório**:

- **Principal** — dados cadastrais e prontuário longitudinal
- **Evolução** — atendimento clínico (Tela Âncora aplicada)
- **Pagamentos** — controle administrativo simples
- **Presenças** — histórico de comparecimento

Outras abas permanecem fora de escopo neste momento.

---

### 9.5 Aba Evolução — Contrato Visual e Funcional (Congelado)

O rascunho visual produzido manualmente passa a valer como **contrato visual de implementação** da Aba Evolução, em conformidade com a Tela Âncora oficial.

Componentes obrigatórios:

- Coluna esquerda: Estrutura Cognitiva (Objetivo, Hipóteses, Pontos de Atenção, Limites)
- Área central: Editor de texto funcional (documento clínico vivo)
- Painel direito: IA LAB (Análise dos Agentes)
- Rodapé: Sessões anteriores (leitura) + ações finais

Não serão feitas simplificações estruturais nem substituições por chat.

---

### 9.6 Uso da IA — Confirmação Final

Reafirma-se, sem ressalvas, que:

- A IA **pode ser consultada durante a sessão clínica**
- Sempre por ação humana explícita
- Sempre como assistente cognitivo
- Nunca escreve prontuário automaticamente
- Nunca persiste conteúdo sozinha
- Nunca altera estados clínicos

Essa regra vale transversalmente para todas as abas.

---

### 9.7 Pagamentos e Presenças

- São módulos administrativos
- Não interferem no gesto clínico
- Não exigem lógica de IA
- Devem ser simples, funcionais e completos

---

### 9.8 Decisão Operacional (Materialização)

Fica oficialmente decidido que, a partir deste documento:

- O foco passa da produção de contratos para a **materialização visual e funcional** do sistema.
- O próximo passo do projeto é a **implementação do esqueleto visual funcional**, iniciando por:

  1. Menu superior global
  2. Dashboard inicial
  3. Tela de Pacientes
  4. Ficha do Paciente
  5. Aba Evolução conforme contrato visual

Nenhuma nova decisão conceitual será introduzida durante esta fase — apenas execução.

---

**Atualização válida e incorporada ao acordo oficial do projeto.**

---

# 20. DOCUMENTO OPERACIONAL — BIBLIOTECA DE PROMPTS PARA GERAÇÃO DE CÓDIGO

**Status:** Documento de Ferramentas Operacionais

**Autoridade:** Desenvolvimento e Implementação (por delegação)

**Data:** 13 de Janeiro de 2026

**Audiência:** Google AI Pro, ChatGPT Go, e outras IAs de desenvolvimento

---

## Como Usar Esta Biblioteca

1. Copie UM prompt por vez (não mais de um por sessão)
2. Cole no Google AI Pro (ou ChatGPT Go)
3. Aguarde resultado completo
4. Valide contra axiomas (comentários no prompt)
5. Se OK: copie código, integre ao projeto
6. Se diverge: rejeite, ajuste prompt, regenere

---

## Prompt 1: Shell Bootstrap — Fase 1 (Essencial)

```
# PROMPT INICIAL PARA GOOGLE AI PRO

Contexto de Projeto:
- NeuroStrategy OS: software clínico (Hipnose Ericksoniana + TEA adulto)
- Stack: Tauri 2.0 + React 19 + TypeScript + Rust backend
- Usuário: psicólogo clínico individual (não-programador)
- Modelo: UI Passiva (nunca decide, só renderiza estado XState)

AXIOMAS INVIOLÁVEIS (comentar código explicando cada um):
1. Shell NÃO contém lógica clínica (zero business logic)
2. Todos eventos vão para máquina XState (nunca setState direto)
3. Tauri commands são ÚNICA forma de I/O (file, DB, net)
4. Contexto global mínimo: activePatientId, sessionState (nada mais)
5. Sem props drilling além de 2 níveis (use useShellContext)

TAREFA: Gere 4 arquivos para bootstrap Fase 1.

---

ARQUIVO 1: src/shell/app.tsx

Requisitos:
- Root React component usando createBrowserRouter (não SPA simple)
- Menu horizontal fixo (altura ~50px, nunca muda):
  Items: Dashboard, Pacientes, Clínico, Diagnóstico, Admin, Marketing, Pesquisa, Configurações
  Nenhum destes faz lógica, só dispatcha eventos
- Context provider: ShellContext (activePatientId, sessionState, dispatch)
- Uma área centrale vazia (<div id="core-outlet">) para núcleos dinâmicos
- useShellContext hook para componentes acessarem estado global

Código:
- TypeScript strict mode
- React 19 hooks (não class components)
- Comentários explicando AXIOMA correspondente:
  // AXIOMA 3: Eventos vêm de XState, não de onClick direto
  button.onClick → dispatch(event) → máquina processa → state muda → re-render
- Sem Tailwind (CSS puro em styles.css)
- Imports organizados: React → hooks → types → local components

---

ARQUIVO 2: src/shell/styles.css

Requisitos:
- Design system completo (nenhuma cor mágica, tudo em :root variables)
- Cores:
  --color-bg-primary: #fafaf9 (creme suave)
  --color-text-primary: #1f2937 (charcoal)
  --color-accent: #2d8a96 (teal clínico)
  --color-border: #d4d4d0 (cinza suave)
  --color-error: #dc2626 (red para alertas)
  --color-success: #059669 (green para confirmações)
- Tipografia:
  --font-base: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
  --font-mono: 'Monaco', 'Courier New', monospace
  --text-sm: 12px, --text-base: 14px, --text-lg: 16px
  --weight-normal: 400, --weight-medium: 500, --weight-bold: 600
- Reset CSS:
  * { box-sizing: border-box; }
  body { margin: 0; font: var(--font-base); }
- Layout:
  body {
    display: grid;
    grid-template-rows: 50px 1fr; /* menu + content */
  }
  #menu { 
    background: white;
    border-bottom: 1px solid var(--color-border);
    display: flex;
    gap: 2rem;
    padding: 0 1rem;
  }
  #menu button {
    border: none;
    background: transparent;
    cursor: pointer;
    padding: 0.5rem 0.75rem;
    border-bottom: 2px solid transparent;
  }
  #menu button.active { border-bottom-color: var(--color-accent); }
- Componentes:
  .card { background: white; border: 1px var(--color-border); border-radius: 8px; }
  .button { padding: 0.5rem 1rem; border-radius: 6px; font-weight: 500; }
  .button--primary { background: var(--color-accent); color: white; }
  .button--secondary { background: #f3f4f6; }

---

ARQUIVO 3: src-tauri/src/main.rs

Requisitos:
- Entry point Tauri
- Window padrão:
  Título: "NeuroStrategy OS"
  Dimensões: 1200x800
  Sem fullscreen, sem decoração custom
  Sem múltiplas windows (por enquanto)
- Nenhum comando implementado ainda (apenas window init)
- Estrutura pronta para próximas fases:
  mod commands { ... }  // Vazio por enquanto
  fn main() { 
    tauri::Builder::default()
      .run(tauri::generate_context!())
      .expect("error while running tauri application");
  }

---

ARQUIVO 4: tauri.conf.json

Requisitos:
- Configuração mínima e correta:
  {
    "build": {
      "beforeDevCommand": "npm run dev",
      "beforeBuildCommand": "npm run build",
      "devPath": "http://localhost:5173",
      "frontendDist": "../dist"
    },
    "app": {
      "windows": [{
        "title": "NeuroStrategy OS",
        "width": 1200,
        "height": 800,
        "resizable": true,
        "fullscreen": false
      }],
      "security": {
        "csp": "default-src 'self'; script-src 'self' 'unsafe-inline';"
      }
    },
    "build": {
      "withGlobalTauri": true
    }
  }

---

VALIDAÇÃO:
- npm run tauri dev deve:
  ✓ Abrir janela com menu horizontal
  ✓ Menu items click sem console errors
  ✓ Área vazia pronta para núcleos
  ✓ Nenhuma lógica clínica (apenas UI)

---

CRITÉRIO DE SUCESSO:
Código gerado deve:
1. Compilar sem warnings (apenas informações)
2. Comentários explicarem AXIOMA 1-5 em contextos relevantes
3. Zero business logic no shell
4. Estrutura pronta para add nutcleos nas próximas fases
5. TypeScript strict mode passa (sem any)
```

---

## Prompt 2: Persistência e Banco de Dados — Fase 2-3

```
# PROMPT PARA GOOGLE AI PRO — BANCO DE DADOS + TIPOS

Contexto:
- NeuroStrategy OS em Tauri 2.0
- Núcleo Clínico precisa persistência segura
- Usuário: psicólogo individual (100-500 pacientes esperados)

AXIOMAS APLICÁVEIS:
1. Todos dados clínicos NUNCA saem do dispositivo
2. Criptografia AES-256 de repouso (SQLCipher)
3. Toda persistência vai via Tauri command (nunca acesso direto)
4. Prepared statements obrigatório (impossível SQL injection)
5. Dados NUNCA expostos em plaintext logs

TAREFA: Gere arquitetura SQLite + TypeScript wrapper.

---

ARQUIVO 1: src-tauri/src/db.rs

Requisitos:
- Connection pool (r2d2 + rusqlite)
- Inicialização com SQLCipher:
  PRAGMA cipher = 'aes-256-cbc';
  PRAGMA key = '...password-from-env...';
- Migrations automáticas (v1 = patients, sessions, evolution_entries tables)
  NEVER raw SQL (todas prepared statements)
- Exports:
  pub fn get_db() -> Result<Connection>
  pub fn run_migrations() -> Result<()>
  pub fn insert_patient(...)
  pub fn query_patient(...)
  pub fn insert_session(...)
- Exemplo migration:
  CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    birth_date TEXT NOT NULL,
    main_complaint TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  (NUNCA expose raw schema em código frontend)

---

ARQUIVO 2: src-tauri/Cargo.toml (dependências relevantes)

```toml
[package]
name = "neurostrategy-os"
version = "0.1.0"
edition = "2021"

[dependencies]
tauri = { version = "2", features = ["shell-open", "fs-all", "system-tray"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
rusqlite = { version = "0.32", features = ["bundled-sqlcipher", "chrono"] }
r2d2 = "0.8"
r2d2_sqlite = "0.26"
tokio = { version = "1", features = ["full"] }
chrono = { version = "0.4", features = ["serde"] }
uuid = { version = "1", features = ["v4", "serde"] }
anyhow = "1"
```

---

ARQUIVO 3: src/core/clinical/db/client.ts

Requisitos:
- TypeScript async/await wrapper
- NENHUM SQL direto (todos via Tauri invoke)
- Exports:
  export async function createPatient(data: PatientInput): Promise<Patient>
  export async function getPatient(id: string): Promise<Patient>
  export async function listPatients(): Promise<Patient[]>
  export async function createSession(patientId: string, sessionData: SessionInput): Promise<Session>
  export async function saveSessionNotes(sessionId: string, content: string): Promise<void>
  export async function getSessionHistory(patientId: string): Promise<Session[]>
- Cada função:
  const result = await invoke('db_operation', { /* params */ });
  return result as Patient; // Type assertion OK aqui (backend typed)
- Error handling:
  try { ... } catch (e: unknown) { 
    const err = e as TauriError; 
    console.error(`DB Error: ${err.message}`);
    throw new Error(`Failed to ${operation}: ${err.message}`);
  }

---

ARQUIVO 4: src/core/clinical/types.ts

Requisitos:
- TypeScript interfaces para domínio clínico:
  export interface Patient {
    id: string; // UUID
    name: string;
    birthDate: Date;
    mainComplaint: string;
    registeredAt: Date;
    updatedAt: Date;
  }
  export interface Session {
    id: string;
    patientId: string;
    startTime: Date;
    endTime: Date | null;
    status: 'active' | 'paused' | 'closed';
    notes: string;
    transcription: string | null;
  }
  export interface EvolutionEntry {
    sessionId: string;
    timestamp: Date;
    type: 'note' | 'transcription' | 'mbc_score' | 'system_alert';
    content: string;
  }
- Correspondent Rust types em models.rs (serde derive)

---

VALIDAÇÃO:
- Criptografia: arquivo .db ilegível sem password
- Prepared statements: String inputs nunca injected diretamente
- Type safety: TypeScript interface <→ Rust struct 1:1
- Tests:
  ✓ Cria paciente → persiste → recover após restart
  ✓ Session data não corrompe se app fecha
  ✓ NUNCA plaintext em logs
```

---

## Prompt 3: Máquina XState + UI Passiva — Fase 3

```
# PROMPT PARA GOOGLE AI PRO — MÁQUINA DE ESTADOS CLÍNICA

Contexto:
- Núcleo Clínico precisa garantir: impossível estados inválidos
- UI renderiza APENAS o que máquina permite
- Transições são explícitas (nenhuma mudança silenciosa de estado)

AXIOMA CRÍTICO:
- Se state = 'sessionActive', então posso editar notas
- Se state = 'sessionClosed', então read-only
- Se state = 'sessionActive' AND 'sessionClosed', IMPOSSÍVEL (máquina previne)

TAREFA: Gere máquina XState que força essas garantias.

---

ARQUIVO 1: src/core/clinical/machine.ts

Requisitos:
- XState 5.x (createMachine, assign, guard, invoke)
- Estados (mutual exclusive):
  idle: nenhum paciente
  patientSelected: paciente aberto, nenhuma sessão
  sessionIdle: sessão aberta, sem edição
  sessionActive: documentando/editando
  sessionPaused: pausa clínica
  sessionClosing: pedindo confirmação de fechamento
  sessionClosed: encerrado, imutável
- Context:
  activePatientId: string | null
  activeSessionId: string | null
  sessionNotes: string
  sessionStartTime: Date | null
- Events:
  {type: 'SELECT_PATIENT', patientId: string}
  {type: 'NEW_SESSION'}
  {type: 'VIEW_SESSION', sessionId: string}
  {type: 'START_DOCUMENTATION'}
  {type: 'UPDATE_NOTES', content: string}
  {type: 'PAUSE_SESSION'}
  {type: 'RESUME_SESSION'}
  {type: 'REQUEST_CLOSE_SESSION'}
  {type: 'CONFIRM_CLOSE_SESSION'}
  {type: 'CANCEL_CLOSE'}
  {type: 'RESET'}
- Guards (impedem transição inválida):
  canStartSession: context.activePatientId !== null && state.value === 'sessionIdle'
  canCloseSession: context.activeSessionId !== null && ['sessionActive', 'sessionPaused'].includes(state.value)
  canNavigateAway: !['sessionActive', 'sessionClosing'].includes(state.value)
- Actions:
  'persistSessionNotes': invoke tauri command 'db_save_notes'
  'clearSessionData': assign context to null
  'logStateChange': internal logging

---

ARQUIVO 2: src/lib/hooks/useClinical.ts

Requisitos:
- Hook que encapsula machine:
  export function useClinical() {
    const [state, send] = useActor(clinicalMachine);
    return {
      state,
      isSessionActive: state.matches('sessionActive'),
      canEdit: state.matches('sessionActive') || state.matches('sessionPaused'),
      canClose: state.matches('sessionClosing'),
      actions: {
        selectPatient: (id: string) => send({type: 'SELECT_PATIENT', patientId: id}),
        startSession: () => send({type: 'NEW_SESSION'}),
        startDocumentation: () => send({type: 'START_DOCUMENTATION'}),
        updateNotes: (content: string) => send({type: 'UPDATE_NOTES', content}),
        pauseSession: () => send({type: 'PAUSE_SESSION'}),
        requestClose: () => send({type: 'REQUEST_CLOSE_SESSION'}),
        confirmClose: () => send({type: 'CONFIRM_CLOSE_SESSION'}),
      }
    }
  }

---

ARQUIVO 3: src/core/clinical/ui/EvolutionTab.tsx (componente exemplo)

Requisitos:
- Componente que renderiza APENAS baseado em state.value:
  function EvolutionTab() {
    const clinical = useClinical();
    const [notes, setNotes] = React.useState(clinical.state.context.sessionNotes);
    
    // AXIOMA: UI nunca manda estado para máquina via setNotes direto
    // Sempre: setNotes → handleSave → invoke db → máquina atualiza context
    
    const handleUpdateNotes = async (content: string) => {
      setNotes(content);
      await invoke('db_update_notes', {sessionId: clinical.state.context.activeSessionId, content});
      clinical.actions.updateNotes(content);
    };
    
    if (clinical.state.matches('idle')) {
      return <div>Selecione um paciente</div>;
    }
    
    if (clinical.state.matches('sessionClosed')) {
      return (
        <div className="evolution-view read-only">
          <h2>Sessão Encerrada (read-only)</h2>
          <pre>{notes}</pre>
        </div>
      );
    }
    
    if (clinical.state.matches('sessionActive')) {
      return (
        <div className="evolution-view editing">
          <h2>Evolução Clínica</h2>
          <textarea 
            value={notes} 
            onChange={(e) => handleUpdateNotes(e.target.value)}
            disabled={clinical.state.matches('sessionClosed')}
          />
          <button onClick={() => clinical.actions.pauseSession()}>Pausar</button>
          <button onClick={() => clinical.actions.requestClose()}>Encerrar</button>
        </div>
      );
    }
  }

---

VALIDAÇÃO:
- TypeScript: if state.matches('sessionActive'), then canEdit = true (no false positives)
- Impossível: state.matches('sessionActive') && state.matches('sessionClosed') simultaneamente
- Guards: Transição rejeitada em compile se precondições não atendidas
- Tests:
  ✓ Abre paciente → state = patientSelected
  ✓ Tenta fechar sem sessão → guard falha, state inalterado
  ✓ Documenta → salva → persiste
```

---

## Prompt 4: Isolamento Marketing (Tipo Estrutural)

```
# PROMPT PARA GOOGLE AI PRO — ISOLAMENTO DE NÚCLEOS

Contexto:
- Marketing NUNCA consegue ler dados reais de pacientes
- Estrutura TypeScript impõe isto (não confia só em disciplina)
- ETL pipeline unidirecional: Clinical → Aggregates → Marketing

AXIOMA:
- import from ../clinical/index (banco de dados) = COMPILE ERROR
- import from ../clinical/etl-connector (agregados) = OK
- Marketing trabalha com: { patientCount, avgRetention, leads, campaigns }

TAREFA: Estrutura que impossibilita violação.

---

ARQUIVO 1: src/core/clinical/index.ts

```typescript
// NUCLEAR: Exports APENAS públicos
export * from './types';  // Interfaces públicas
export * from './db/client';  // DB operations
export { createClinicalMachine } from './machine';
export { useClinical } from './hooks';

// ⚠️ NUNCA export internal implementations:
// ❌ export * from './db/queries'; (raw SQL)
// ❌ export { clinicalMachine }; (state machine internals)
```

---

ARQUIVO 2: src/core/clinical/etl-connector.ts

```typescript
// ✅ ETL PIPELINE: Clinical → Aggregated Data → Marketing

import { getDb } from './db/client';

export interface AggregatedMetrics {
  totalPatients: number;
  totalSessions: number;
  averageRetention: number;  // % sessões completadas
  topDiagnoses: {diagnosis: string; count: number}[];
  responseTimeWeeks: number;  // tempo até melhora típica
}

export async function getMarketingAggregate(): Promise<AggregatedMetrics> {
  // Lê APENAS estatísticas, nunca dados do paciente
  const totalPatients = await invoke('db_count_patients');
  const topDiagnoses = await invoke('db_get_diagnosis_stats');
  // ... mais aggregations
  
  return {
    totalPatients,
    totalSessions: 0, // placeholder
    averageRetention: 0.85,
    topDiagnoses,
    responseTimeWeeks: 6,
  };
}

// ⚠️ GARANTIA: Esta função NUNCA retorna:
// ❌ Patient names
// ❌ Session notes
// ❌ Personalized data
// ✅ APENAS: statistics, counts, aggregates
```

---

ARQUIVO 3: src/core/marketing/index.ts

```typescript
// Marketing pode ONLY ler agregados
import { getMarketingAggregate, AggregatedMetrics } from '../clinical/etl-connector';

// ❌ ISTO DEVE FALHAR EM COMPILE:
// import { getPatient } from '../clinical'; // Module not exported

// ✅ ISTO É OK:
export async function buildMarketingReport() {
  const metrics = await getMarketingAggregate();
  // Trabalha com: totalPatients (integer), topDiagnoses (anonymous)
  // NUNCA: "Fulano tem TEA"
  // SEMPRE: "30% dos casos são TEA"
}
```

---

ARQUIVO 4: tests/integration/core-isolation.test.ts

```typescript
// Teste que VALIDA isolamento
describe('Core Isolation', () => {
  it('marketing cannot import clinical internals', () => {
    // Este teste valida que import fails
    expect(() => {
      // @ts-expect-error Module should not export this
      import('../marketing').then(m => m.cannotAccessClinical?.());
    }).toThrow();
  });

  it('marketing only gets aggregates, never PII', async () => {
    const metrics = await getMarketingAggregate();
    
    // Deve ter só números:
    expect(metrics.totalPatients).toBeGreaterThan(0);
    expect(typeof metrics.averageRetention).toBe('number');
    
    // NUNCA deve ter:
    expect(metrics).not.toHaveProperty('patientNames');
    expect(metrics).not.toHaveProperty('sessionNotes');
  });

  it('data flows unidirectional: clinical -> aggregates -> marketing', async () => {
    // Clinical salva paciente
    // ETL lê e agrega
    // Marketing consome agregados
    // ✓ Marketing NUNCA escreve em Clinical
  });
});
```

---

VALIDAÇÃO:
- TypeScript compile: import from clinical/private = ERROR
- Runtime: Marketing code não consegue accessar DB clínico
- Structure: Impossible to cross contaminate sem refactor estrutural
```

---

## Como Usar Esta Biblioteca

1. **Comece com Prompt 1** (Shell Bootstrap)
   - Cole no Google AI Pro
   - Aguarde resposta completa
   - Crie arquivos conforme indicado
   - Teste: `npm run tauri dev`

2. **Próximo: Prompt 2** (Banco de Dados)
   - Integre ao projeto
   - Execute migrations
   - Crie teste simples

3. **Depois: Prompt 3** (XState)
   - Copie máquina
   - Crie componentes testes
   - Valide impossibilidade de estados inválidos

4. **Finalmente: Prompt 4** (Isolamento)
   - Configure estrutura de pastas
   - Rode testes de isolamento
   - Confirme que Marketing não acessa Clinical

---

## Validação Final

Após todos 4 prompts:
- [ ] Tauri app abre
- [ ] Menu funciona
- [ ] Pacientes podem ser criados/listados
- [ ] Dados persistem (SQLite funcional)
- [ ] XState governa estados (impossível invalid)
- [ ] Marketing isolado (estruturalmente)
- [ ] Zero warnings TypeScript
- [ ] Pronto para Fase 5 (Whisper + NAC)

---

**Data:** 13 de Janeiro de 2026  
**Versão:** 1.0 — Pronto para Geração de Código IA

---

# REGRA FINAL DE PRECEDÊNCIA

Em qualquer conflito:

1. Documento Mestre Absoluto
2. Documento Mestre do Shell
3. Normativos de Núcleos
4. Normativos de Abas / Domínios
5. Documento Auxiliar de Ambiguidades
6. Documentos Técnicos
7. Documentos Operacionais e de Implementação

**Sempre vence o nível mais alto.**  
**Sempre vence a interpretação mais protetiva à clínica e à autoridade humana.**

---

**Documento Consolidado — NeuroStrategy OS**

Versão 1.1 — Integração Completa com Documentos Operacionais
