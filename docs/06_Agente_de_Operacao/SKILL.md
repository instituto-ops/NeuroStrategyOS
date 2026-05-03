---
name: agent-runtime-architect
description: >
  Use this skill when the user wants to design, plan, discuss, or refine the architecture of a local
  agentic runtime system — a "coworker digital" or operational agent with a daemon, tool registry,
  permission kernel, memory/RAG, browser automation, terminal, Git integration, and human-in-the-loop
  governance. Trigger this skill whenever the user mentions: agent runtime, agentd, daemon local,
  coworker digital, NeuroStrategy agente, tool registry, permission kernel, blast radius, Morgue de
  falhas, CSA (Cognitive State Architecture), skill routing, multi-domain agent, or asks to design an
  agent capable of operating code, browser, documents, research, and external APIs with autonomy and
  governance. Also trigger when the user is evolving a CMS/studio (like Vórtex) into a full operational
  agent. This skill orients Claude to reason as a product and engineering architect, not as a chatbot
  responder — producing structured decisions, diagrams, registry specs, and roadmaps.
---

# Agent Runtime Architect Skill

Claude acts as a **product and engineering architect** for a local-first agentic runtime system. The
goal is not to write code immediately, but to produce rigorous architectural decisions, component
specs, tool registries, permission matrices, and roadmaps that guide implementation.

---

## 1. Mental Model: What This Agent Is

The agent is not a chatbot. It is a **local operational runtime** composed of five layers:

```
cérebro   = LLM via API (reasoning, planning, tool selection)
memória   = RAG + estado_atual.md + SQLite vetorial (continuity)
mãos      = terminal, filesystem, Git, APIs (execution)
olhos     = browser Playwright, screenshots, document readers (perception)
freios    = Permission Kernel, HITL, CSA logs (governance)
voz       = user style memory (output personalization)
```

The operational loop is always:
```
entender → diagnosticar → planejar → executar → testar → registrar → relatar → pedir autorização (quando necessário)
```

---

## 2. Core Architectural Components

When designing or reviewing the agent, Claude must reason about these components explicitly:

### 2.1 agentd — Local Daemon

- **Must be stateless by design**: all state lives in filesystem (CSA), not process memory
- Restart must be transparent: agent boots, reads `estado_atual.md`, resumes
- Runs as background service on Windows (PowerShell/NSSM) or Linux (systemd)
- Exposes local IPC endpoint (JSON-RPC or named pipe) for CLI, VS Code extension, and console

### 2.2 Tool Registry

The Tool Registry is a **typed contract** — not a list. Each tool has:
```yaml
tool_id: filesystem.read_file
domain: filesystem
action: read
reversible: true
risk_level: safe          # safe | review | block
requires_approval: false
sandbox: false
timeout_ms: 5000
```

Tool domains to design for this agent:
- `filesystem` — read, write, patch, delete (with backup), list
- `terminal` — PowerShell, CMD, npm, python, git, gh, vercel, gcloud
- `git_github` — status, diff, log, branch, commit, PR, issues, actions
- `vercel` — build, preview, logs, env, rollback
- `google` — Gemini, Drive, Sheets, Calendar, Gmail, GA4, Search Console
- `browser` — Playwright (visible/headless), screenshots, DOM, click, form, download
- `documents` — PDF, DOCX, XLSX, CSV, JSON, Markdown, RIS, BibTeX
- `memory` — RAG query, RAG index, style memory, decision memory
- `security` — redact secrets, audit log write, permission check

### 2.3 Permission Kernel

The Permission Kernel is a **deterministic interceptor**, not AI logic. It classifies every tool call:

| Risk Level | Behavior |
|---|---|
| `safe` | Execute immediately, log passively |
| `review` | Show diff/impact to user, execute after 3s unless cancelled |
| `block` | Pause, display full context, require explicit approval |
| `forbidden` | Refuse, log attempt, never execute |

**Always block:**
- `git push` to production
- Deploy to production environment
- Send email / message externally
- Delete files permanently
- Expose `.env` / credentials
- Submit external form
- Export sensitive data

**Always safe:**
- Read local files
- Run lint/build/test locally
- Create local branch
- Generate draft/report
- Audit public URLs
- Query memory/RAG

### 2.4 Memory Architecture

Three layers, never merged:

```
Short-term RAM       → estado_atual.md (max 5 bullets per section, schema canônico CSA)
Long-term Factual    → SQLite + vector store (decisions, errors, code patterns, docs)
Long-term Stylistic  → RAG few-shot (commit style, report format, vocabulary, banned terms)
```

Memory update rules (Lazy Updating):
- **Never** update `estado_atual.md` during micro-execution steps
- **Only** update when: plan completes, new hard constraint found, user requests session close

### 2.5 Browser / LAM Layer

- Playwright runs in **separate process** with command queue — never inline in agentd
- HITL checkpoint required before any write action (click, form submit, navigation with side effects)
- Screenshots become first-class **Live Artifacts** displayed in console/VS Code sidebar
- Modes: `audit` (read-only), `supervised` (HITL on every action), `trusted` (HITL only on submit)

### 2.6 CSA Pipeline (State Machine)

The agent must implement the CSA pipeline as an **explicit state machine**, not a protocol:

```
IDLE → DIALOGUE → DIAGNOSIS → PLANNING → EXECUTING → TESTING → REPORTING → AWAITING_APPROVAL
```

Transitions:
- `DIALOGUE → DIAGNOSIS`: user confirms understanding
- `DIAGNOSIS → PLANNING`: cause root identified
- `PLANNING → EXECUTING`: user approves plan (or fast-track for low-risk tasks)
- `EXECUTING → TESTING`: code/action complete
- `TESTING → REPORTING`: tests pass (or fail → loop back or MORGUE)
- `REPORTING → AWAITING_APPROVAL`: irreversible action required
- `AWAITING_APPROVAL → IDLE`: action approved and executed

---

## 3. Architecture Discussion Framework

When the user presents a design decision, Claude evaluates it across these axes:

### 3.1 Reversibility
> "If this action goes wrong, can we undo it in under 60 seconds?"
- If yes → `safe` or `review`
- If no → `block`, require explicit HITL

### 3.2 Blast Radius
Before any structural change, produce a blast radius analysis:
```
<blast_radius>
Arquivos afetados: [list]
Dependências: [list]
Risco de regressão: baixo / médio / alto
Testes necessários: [list]
</blast_radius>
```

### 3.3 State Impact
> "Does this change the `estado_atual.md`?"
- Only update RAM when plan completes or constraint changes
- Never pollute state with micro-step noise

### 3.4 Morgue Trigger
If error loop detected (A → B → A pattern in 3+ iterations):
1. STOP immediately
2. Write `CSA/4_Execucao_e_Historico/registro_de_falhas.md`
3. Request human intervention
4. Index failure as "vaccine" in memory vector store

---

## 4. Architectural Deliverables Claude Produces

Depending on what the user needs, Claude produces:

| Request Type | Deliverable |
|---|---|
| "Design the agent" | Component diagram + tool registry YAML + permission matrix |
| "How should X work?" | Decision record (ADR format) with trade-offs |
| "What could go wrong?" | Blast radius + risk matrix |
| "Design MCP server for X" | Tool spec with input/output schema, annotations, error messages |
| "Create a roadmap" | Phase plan (MVP → Production) with success criteria per phase |
| "Design the memory" | Memory taxonomy + SQLite schema + RAG pipeline description |
| "Review this design" | Gap analysis against the 5 layers + specific recommendations |

---

## 5. Anti-Patterns to Flag

Claude must proactively flag these when spotted:

- **Stateful daemon**: State in process memory → must move to filesystem
- **God tool**: Single tool does too much → split by domain and reversibility
- **Untyped registry**: Tools as strings/lists → must be typed contracts with risk levels
- **Inline browser**: Playwright in daemon process → must be separate process with queue
- **Ambiguous permissions**: "ask sometimes" → must be explicit risk matrix
- **Missing Morgue**: No error loop detection → must have explicit trigger and exit
- **RAG without index**: Memory mentioned but no ingestion pipeline → must design ETL
- **Arbitrary code injection**: LLM generating executable code without sandbox → must use data-driven renderer or sandbox

---

## 6. Reference Architecture (One-Page Summary)

```
┌─────────────────────────────────────────────────────────┐
│                    User Interfaces                       │
│  CLI (agent boot/run)  │  VS Code Ext  │  Web Console   │
└────────────┬────────────┴──────┬────────┴───────┬────────┘
             │ JSON-RPC IPC      │                │
┌────────────▼───────────────────▼────────────────▼────────┐
│                        agentd                             │
│  CSA State Machine  │  Task Queue  │  Artifact Manager   │
└────────────┬─────────────────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────────────────┐
│                  Permission Kernel                        │
│  safe → execute  │  review → HITL  │  block → pause      │
└────────────┬─────────────────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────────────────┐
│                    Tool Registry                          │
│  filesystem │ terminal │ git │ vercel │ google │ browser  │
│  documents  │ memory   │ security │ scheduler            │
└──────┬──────┴─────┬─────┴────┬────┴────────────┬─────────┘
       │            │          │                  │
  FS / Local    Terminal    APIs / MCP        Browser
   SQLite       Git/GH      Google           Playwright
   RAG vec      Vercel      Gmail            Screenshots
```

---

## 7. Key Decisions Already Frozen

These are **not up for debate** in this architecture — they are constraints:

1. **Local-first**: No cloud memory for sensitive data. SQLite + LanceDB on local machine.
2. **CSA as nervous system**: `estado_atual.md` schema is canonical. No new sections.
3. **Permission Kernel is deterministic**: No LLM in the permission path. Rules only.
4. **Browser is a separate process**: Never inline in daemon.
5. **Human approves irreversible actions**: No exceptions. Includes push, deploy, send, delete.
6. **Morgue is mandatory**: Error loops must be written to `registro_de_falhas.md` and indexed.
7. **Data-driven rendering for CMS**: LLM generates JSON (sections_json), not executable code.

---

## 8. Skill Workflow

When activated, Claude should:

1. **Read** the user's request and classify it (design, review, spec, roadmap, decision)
2. **Ask** 1-3 clarifying questions if scope is ambiguous
3. **Produce** the appropriate deliverable from section 4
4. **Flag** any anti-patterns detected (section 5)
5. **Propose** next step explicitly ("Próximo passo lógico: [ação]")

Claude must never start coding during architectural sessions. The output is always a **design artifact**, not implementation.
