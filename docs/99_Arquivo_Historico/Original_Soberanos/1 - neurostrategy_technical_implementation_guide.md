# NeuroStrategy OS — Relatório Técnico de Implementação
## Arquitetura, Stack Tecnológica e Guia de Bootstrap

**Data:** 13 de Janeiro de 2026  
**Status:** Relatório Executivo — Pronto para Implementação  
**Audiência:** Não-programador com suporte de IA (ChatGPT Go, Google AI Pro)  

---

## EXECUTIVE SUMMARY

Este relatório apresenta a arquitetura técnica **completa e executável** para o NeuroStrategy OS, respeitando:
- **Soberania Documental** (Documento Mestre Absoluto rege tudo)
- **Segurança Clínica** (Dados locais, sem nuvem, criptografia de repouso)
- **UI Passiva** (Interface nunca decide, apenas renderiza estado do núcleo clínico)
- **Isolamento de Núcleos** (Clínico ↔ Marketing ↔ NAC sem contaminação)
- **Viabilidade para IA Geradora** (Stack escolhida facilita código gerado sem erros por Google AI Pro)

**Decisão Principal:** Tauri (não Electron) + Rust (backend) + TypeScript/React (frontend) + SQLite com SQLCipher (persistência) + Ollama (IA local)

---

## 1. MATRIZ DE DECISÃO TECNOLÓGICA

### 1.1 Shell & Container (Desktop Framework)

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
| **Logging & Auditoria** | **Arquivo JSON imutável (append-only) + Assinatura Digital** | Base de dados | Arquivo: impossível alterar histórico, auditoria clara, simples exportar. Assinatura = comprovação de integridade. |
| **Local LLM** | **Ollama (Llama 3.2 8B ou Phi-3)** | LocalAI, LM Studio | Ollama: Maior comunidade, melhor integração Node.js, GGUF format estável, fácil integração. |

### 1.4 Persistência & Segurança de Dados

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

## 2. ARQUITETURA DE PASTAS SUGERIDA

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

## 3. ROTEIRO DE IMPLEMENTAÇÃO FASEADO

### Fase 1: Hello World + Shell Fechado (1-2 semanas)

**Objetivo:** Tauri app abre, mostra menu, carrega núcleo clínico vazio.

**Entregáveis:**
- [ ] `tauri.conf.json` configurado (Windows, React, Rust backend)
- [ ] `src/shell/app.tsx` com menu fixo (Pacientes, Clínico, Admin, Config)
- [ ] `src/shell/styles.css` com design system (cores, tipografia)
- [ ] `src-tauri/src/main.rs` básico (Tauri window, nenhuma lógica)
- [ ] Projeto compila e roda em Windows

**Prompt para Google AI Pro:**
```
[VER BLOCO ABAIXO NA SEÇÃO 4]
```

---

### Fase 2: Persistência & Banco de Dados (2-3 semanas)

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

## 4. BIBLIOTECA DE PROMPTS INICIAL (Bootstrap)

### Prompt 1: Estrutura Shell + Menu (Fase 1)

```
Atue como arquiteto senior de software desktop (Tauri + Rust + React). 
Seu objetivo é gerar código production-ready que obedeça aos seguintes axiomas:

AXIOMAS INVIOLÁVEIS:
1. Shell (UI) é PASSIVO: nunca contém lógica, nunca decide, apenas renderiza.
2. Toda lógica clínica vem de máquina XState (não useState).
3. Tauri commands são o único acesso a I/O (file, DB, net).
4. Nenhum global state exceto contexto mínimo: activePatientId, sessionState.

TAREFA: Gere os arquivos abaixo para Fase 1.

ARQUIVO 1: src/shell/app.tsx
- Root component React que:
  - Carrega XState machine clínica (empty stub por enquanto)
  - Renderiza menu horizontal fixo com itens: Dashboard, Pacientes, Clínico, Diagnóstico, Admin, Marketing, Pesquisa, Config
  - Menu items NÃO fazem lógica, apenas disparam eventos XState
  - Renderiza área vazia onde núcleos serão carregados dinamicamente
- Use TypeScript strict mode, hooks xstate/react (@xstate/react: useActor)
- Adicione comentários explicando por que cada decisão (axioma X)

ARQUIVO 2: src/shell/styles.css
- Design system completo (não usar Tailwind, CSS puro):
  - Cores: palette neutra (cinza), foco teal (profissional, calmo)
  - Tipografia: -apple-system, BlinkMacSystemFont (desktop standard)
  - Menu: barra horizontal, altura 50px, bold text
  - Áreas: 1 container para núcleos dinâmicos (flex)
- Incluir reset CSS mínimo

ARQUIVO 3: src-tauri/src/main.rs
- Window Tauri básica:
  - Título: "NeuroStrategy OS"
  - Size: 1200x800
  - Sem decoração customizada (use padrão Windows)
  - Nenhum comando implementado ainda (apenas janela vazia)

ARQUIVO 4: tauri.conf.json
- Configuração mínima:
  - bundler: vite
  - frontend: React (src/shell/app.tsx)
  - deepLinks: false (por enquanto)
  - permissions: desabilitar tudo (apenas janela)

REQUISITOS DE CÓDIGO:
- TypeScript 5.x, React 19
- Sem prettier/eslint overrides (use padrão sensato)
- Imports organizados: React → tauri → @xstate → local
- Documentação inline comentando AXIOMA correspondente
- Nenhuma dependência externa além de tauri, react, xstate

VALIDAÇÃO:
- npm run tauri dev deve abrir janela com menu + área vazia
- Menu items click sem erro
- Shell recebe eventos corretamente
```

---

### Prompt 2: Máquina XState Clínica + DB (Fase 2-3)

```
ARQUITETURA: Máquina XState governa TODOS os estados clínicos. UI é mirror disso.

TAREFA: Gere estrutura XState + SQLite para núcleo clínico.

ARQUIVO 1: src/core/clinical/machine.ts
- Máquina XState que modela sessão clínica:
  ESTADOS:
  - idle: nenhum paciente aberto
  - patientSelected: paciente aberto, nenhuma sessão
  - sessionIdle: sessão aberta, esperando ação
  - sessionActive: clínico está documentando/transcrevendo
  - sessionPaused: sessão pausada (clínico fez pausa clínica)
  - sessionClosing: finalizando (pedir confirmação)
  - sessionClosed: salvo permanentemente

  TRANSIÇÕES (só essas permitidas):
  - idle → patientSelected (SELECT_PATIENT)
  - patientSelected → patientSelected (CHANGE_PATIENT)
  - patientSelected → sessionIdle (NEW_SESSION ou VIEW_EXISTING_SESSION)
  - sessionIdle → sessionActive (START_DOCUMENTATION)
  - sessionActive → sessionPaused (PAUSE)
  - sessionPaused → sessionActive (RESUME)
  - sessionActive → sessionClosing (REQUEST_CLOSE)
  - sessionClosing → sessionActive (CANCEL_CLOSE)
  - sessionClosing → sessionClosed (CONFIRM_CLOSE)
  - sessionClosed → idle (RESET)

  CONTEXT:
  - activePatientId: string | null
  - activeSessionId: string | null
  - sessionNotes: string (conteúdo em edição)
  - sessionTranscription: string (rascunho não-persistido)
  - sessionStartTime: Date
  - sessionMetadata: { mbc_scores: {...}, alerts: [...] }

  GUARDS (impedem transição inválida):
  - canStartSession(): activePatientId !== null && sessionIdle
  - canCloseSession(): sessionActive || sessionPaused
  - canNaviagateAway(): não sessionActive && não sessionClosing

- Exports: createClinicalMachine(), ClinicalContext, ClinicalEvent

ARQUIVO 2: src-tauri/src/db.rs
- SQLite com SQLCipher:
  - Conexão pool (r2d2)
  - Função: fn get_db() → Result<Connection>
  - Migration: criar tabelas patients, sessions, evolution_entries
  - Schema NEVER exposing sem prepared statement
  - Exemplo: fn insert_patient(id, name, age) → Result<()> (uso: db.execute(...binding)?);

ARQUIVO 3: src/core/clinical/db/client.ts
- TypeScript wrapper:
  - fn createPatient(data) → async Promise<Patient>
  - fn getPatient(id) → async Promise<Patient>
  - fn listPatients() → async Promise<Patient[]>
  - fn createSession(patientId) → async Promise<Session>
  - fn saveSessionNotes(sessionId, notes) → async Promise<void>
  - TODAS as funções: ipc call to Tauri command

ARQUIVO 4: src/core/clinical/types.ts
- TypeScript types:
  - Patient { id, name, birthDate, mainComplaint, ... }
  - Session { id, patientId, startTime, endTime, status, notes, transcription }
  - EvolutionEntry { ... }
  - ClinicalContext (alinha com machine.ts)

REQUISITOS:
- Nenhum SQL dinâmico (tudo prepared statement)
- Todas DB calls async/await
- Cryptography transparente (SQLCipher handle automaticamente)
- Migrations versionadas (começar em v1)

VALIDAÇÃO:
- Máquina recusa transição inválida (testa guard)
- DB persiste após close
- SQLite file criptografado (abre com password)
```

---

### Prompt 3: Integração Whisper + XState + UI Passiva (Fase 4-5)

```
INTEGRAÇÃO: Áudio local → Whisper → Rascunho → Validação Humana → Persistência

TAREFA: Gere fluxo de transcrição respeitando "Sem automação sem confirmação".

ARQUIVO 1: src-tauri/src/commands/ollama.rs
- Spawn Whisper localmente (quantizado, ~1.5GB model):
  - fn transcribe_audio(audio_path: String) → Result<String>
  - Internal: spawn("ollama", ["run", "whisper", "prompt:...audio_path..."])
  - Timeout: 60s max
  - Error handling: se Whisper não instalado, retorna erro descritivo

ARQUIVO 2: src/core/clinical/machine.ts (EXTEND)
- Adicionar sub-machine de transcrição:
  ESTADO: transcribing
  TRANSIÇÕES:
  - sessionActive → transcribing (RECORD_START)
  - transcribing → transcribing (RECORDING)
  - transcribing → reviewingTranscription (RECORD_END)
  - reviewingTranscription → reviewingTranscription (EDIT_TRANSCRIPTION)
  - reviewingTranscription → sessionActive (CONFIRM_TRANSCRIPTION)
  - reviewingTranscription → transcribing (CANCEL_AND_RERECORD)

  GARANTIA: Áudio em RAM TEM que ser descartado após CONFIRM ou CANCEL. Nunca persiste bruto.

ARQUIVO 3: src/core/clinical/ui/TranscriptionPanel.tsx
- Componente que:
  - Botão "Iniciar Gravação" (dispatch RECORD_START)
  - Enquanto recording: timer, waveform visual (opcional), botão Stop
  - Após recording: exibe rascunho transcrito (read-only)
  - Editor: botão "Editar", permite user ajustar transcrição
  - Botões: "Confirmar (salva em sessionNotes)" || "Refazer Gravação"
  - Lê state de XState (useActor):
    - if state.matches('transcribing'): mostra recording UI
    - if state.matches('reviewingTranscription'): mostra editor

ARQUIVO 4: src/lib/hooks/useTranscription.ts
- Hook que:
  - fn startRecording() → comanda browser Audio API (getUserMedia)
  - fn stopRecording() → para gravação, salva em memory buffer
  - fn sendToWhisper(buffer) → tauri invoke, retorna texto
  - NOTA: Áudio buffer NUNCA persiste (always in-memory until confirmation)

REQUISITOS:
- Áudio bruto (WAV/MP3) NUNCA toca disco antes de confirmação
- Whisper roda local (nenhuma API cloud)
- XState machine impossibilita salvar sem revisão humana (guard: canConfirmTranscription())
- Erro no Whisper não corrompe estado (rollback automático)

VALIDAÇÃO:
- Grava → Transcreve → Edita → Confirma → Salvo
- Grava → Cancela → Áudio descartado (verifica RAM/memory)
- Whisper unavailable → erro claro, sem crash
```

---

## 5. VALIDAÇÕES DE SEGURANÇA

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

## 6. PRÓXIMOS PASSOS

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

## 7. REFERÊNCIAS TÉCNICAS

- **Tauri Docs:** https://tauri.app/
- **XState Docs:** https://stately.ai/docs
- **Whisper:** https://github.com/openai/whisper
- **Ollama:** https://ollama.ai/
- **SQLCipher:** https://www.zetetic.net/sqlcipher/

---

**FIM DO RELATÓRIO**

Data: 13 de Janeiro de 2026  
Pronto para apresentação a equipe de IA e início de implementação.
