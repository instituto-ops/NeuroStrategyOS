# NeuroStrategy OS — DOCUMENTO TÉCNICO DO NÚCLEO CLÍNICO
## Bloco 2 — Máquina de Estados Clínicos

**Status:** Documento Técnico Subordinado ao Documento Mestre Absoluto e aos Documentos Normativos do Núcleo Clínico

**Objetivo do Bloco:** Definir a **máquina de estados clínicos** de forma explícita, mínima e enforçável, garantindo previsibilidade, auditabilidade e proteção ética. Este bloco **não define UI** e **não implementa persistência** (isso pertence aos blocos seguintes).

---

## 1. Escopo e Dependências

Este é o **Bloco Clínico 2** e **depende obrigatoriamente** do **Bloco 1 — Contrato Clínico**.

Dependências:
- Documento Normativo do Núcleo Clínico (conceitual)
- Documento Normativo da Aba Evolução
- Documento Técnico — Bloco 1 (Contrato Clínico)

Saídas obrigatórias:
- Enumeração canônica de estados
- Enumeração canônica de eventos
- Regras de transição (guards)
- Invariantes de segurança

---

## 2. Princípios da Máquina de Estados

- Estados existem para **proteger o vínculo clínico**
- Transições são **explícitas e raras**
- Nenhum evento implícito altera estado
- O que não estiver modelado **não acontece**

---

## 3. Estados Canônicos (clinical.states.ts)

Estados **mínimos e suficientes**:

```ts
export enum ClinicalState {
  IDLE = 'idle',           // sem sessão ativa
  ACTIVE = 'active',       // sessão em andamento
  PAUSED = 'paused',       // sessão pausada
  CLOSED = 'closed'        // sessão encerrada
}
```

### 3.1 Invariantes por Estado

- `IDLE`: nenhum registro em tempo real
- `ACTIVE`: escrita permitida; sem persistência automática
- `PAUSED`: escrita bloqueada; leitura permitida
- `CLOSED`: leitura apenas; nenhuma mutação

---

## 4. Eventos Canônicos (clinical.events.ts)

```ts
export enum ClinicalEvent {
  START_SESSION = 'start_session',
  PAUSE_SESSION = 'pause_session',
  RESUME_SESSION = 'resume_session',
  CLOSE_SESSION = 'close_session'
}
```

Eventos **não existem** fora deste enum.

---

## 5. Regras de Transição (clinical.transitions.ts)

```ts
import { ClinicalState } from './clinical.states';
import { ClinicalEvent } from './clinical.events';

export const ClinicalTransitions: Record<ClinicalState, Partial<Record<ClinicalEvent, ClinicalState>>> = {
  [ClinicalState.IDLE]: {
    [ClinicalEvent.START_SESSION]: ClinicalState.ACTIVE
  },
  [ClinicalState.ACTIVE]: {
    [ClinicalEvent.PAUSE_SESSION]: ClinicalState.PAUSED,
    [ClinicalEvent.CLOSE_SESSION]: ClinicalState.CLOSED
  },
  [ClinicalState.PAUSED]: {
    [ClinicalEvent.RESUME_SESSION]: ClinicalState.ACTIVE,
    [ClinicalEvent.CLOSE_SESSION]: ClinicalState.CLOSED
  },
  [ClinicalState.CLOSED]: {}
};
```

Transições não listadas são **proibidas**.

---

## 6. Guards e Validações (clinical.guards.ts)

### 6.1 Guards Obrigatórios

- Apenas `CLINICIAN` pode disparar eventos
- `START_SESSION` só ocorre a partir de `IDLE`
- `PAUSE_SESSION` só ocorre a partir de `ACTIVE`
- `RESUME_SESSION` só ocorre a partir de `PAUSED`
- `CLOSE_SESSION` só ocorre a partir de `ACTIVE` ou `PAUSED`

```ts
import { ClinicalRole } from './clinical.roles';
import { ClinicalState } from './clinical.states';
import { ClinicalEvent } from './clinical.events';

export function assertTransition(
  role: ClinicalRole,
  from: ClinicalState,
  event: ClinicalEvent
): void {
  if (role !== ClinicalRole.CLINICIAN) throw new Error('Unauthorized role');
  // validações adicionais obrigatórias
}
```

---

## 7. Invariantes Globais de Segurança

- Nenhuma transição automática
- Nenhuma transição por IA
- Nenhuma transição por evento administrativo
- Falhas não corrigem estado

Qualquer violação **bloqueia a ação**.

---

## 8. O Que Este Bloco NÃO Faz

Este bloco **não**:
- persiste dados
- escreve prontuário
- renderiza UI
- chama IA

Ele apenas **define estados e transições permitidas**.

---

## 9. Critério de Conclusão do Bloco

O Bloco 2 é considerado **concluído** quando:
- estados são finitos e explícitos
- eventos são finitos e explícitos
- nenhuma transição inválida é possível

Somente após isso é permitido iniciar o **Bloco 3 — Persistência Ética**.

---

**Documento Técnico — Núcleo Clínico — Bloco 2 (Máquina de Estados Clínicos)**

Subordinado ao Documento Mestre Absoluto.