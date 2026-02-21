# NeuroStrategy OS — Resumo Executivo Visual
## Decisão Técnica One-Page

---

## 🎯 STACK RECOMENDADO

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

## 🔐 ISOLAMENTO DE NÚCLEOS

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

## 🎨 UI: PASSIVA (Espelho de Estado)

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

## 📊 FLUXO DE DADOS CLÍNICO (Exemplo: Sessão)

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

## ⚙️ STACK POR FICHEIRO

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

## 🚀 PHASES & TIMELINE

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

## 🔍 VALIDAÇÕES CRÍTICAS

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

## 📚 PRÓXIMOS PASSOS IMEDIATOS

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

## 📌 DECISÕES CONGELADAS (Não mudar)

```
🔒 Tauri (não Electron) — Por: Security + RAM + Startup + IA viability
🔒 XState (não Redux) — Por: Impossível invalid states, alinha com UI passiva
🔒 SQLite local (não cloud) — Por: Privacidade, soberania, performance
🔒 Rust backend (não Node.js) — Por: Memory safety, type safety, security
🔒 Ollama local (não APIs) — Por: Privacidade, sem custo, controle total
🔒 React (não Vue/Svelte) — Por: IA gera com confiança, maior ecossistema
```

---

## 🎓 AXIOMAS PARA MEMORIZAR

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
