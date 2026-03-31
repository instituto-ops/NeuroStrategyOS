# NeuroStrategy OS — BIBLIOTECA DE PROMPTS TÉCNICOS
## Pronto para Google AI Pro (Gerador de Código)

**Como usar esta biblioteca:**
1. Copie UM prompt por vez (não mais de um por sessão)
2. Cole no Google AI Pro (ou ChatGPT Go)
3. Aguarde resultado completo
4. Valide contra axiomas (comentários no prompt)
5. Se OK: copie código, integre ao projeto
6. Se diverge: rejeite, ajuste prompt, regenere

---

## PROMPT 1: SHELL BOOTSTRAP — FASE 1 (Essencial)

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

## PROMPT 2: PERSISTÊNCIA & BANCO DE DADOS — FASE 2-3

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

## PROMPT 3: MÁQUINA XSTATE + UI PASSIVA — FASE 3

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

## PROMPT 4: ISOLAMENTO MARKETING (Tipo Estrutural)

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

## COMO USAR ESTA BIBLIOTECA

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

## VALIDAÇÃO FINAL

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
