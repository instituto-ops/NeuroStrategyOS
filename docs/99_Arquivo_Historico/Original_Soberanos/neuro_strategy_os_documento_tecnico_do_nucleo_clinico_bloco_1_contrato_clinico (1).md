# NeuroStrategy OS — DOCUMENTO TÉCNICO DO NÚCLEO CLÍNICO
## Bloco 1 — Contrato Clínico

**Status:** Documento Técnico Subordinado ao Documento Mestre Absoluto e aos Documentos Normativos do Núcleo Clínico

**Objetivo do Bloco:** Definir **contratos técnicos explícitos** (papéis, permissões e proibições) que governam todo o Núcleo Clínico. Este bloco **não implementa UI**, **não define estados** e **não persiste dados clínicos**. Ele cria a base legal‑técnica para os blocos seguintes.

---

## 1. Escopo e Ordem

Este é o **Bloco Clínico 1** e **não pode ser pulado**.

Dependências conceituais:
- Documento Mestre Absoluto
- Documento Normativo do Núcleo Clínico (conceitual)
- Documento Normativo da Aba Evolução

Saídas obrigatórias deste bloco:
- Contratos formais de papéis
- Contratos formais de permissões
- Contratos formais de proibições

---

## 2. Princípios Técnicos Invioláveis

- Autoridade clínica é exclusivamente humana
- Nenhuma automação executa ato clínico
- Nenhuma persistência ocorre sem comando explícito
- O que não estiver explicitamente permitido é proibido

Esses princípios devem ser **enforçados em código**.

---

## 3. Arquivos do Bloco (Obrigatórios)

Criar **exatamente** os seguintes arquivos:

```
clinical.contract.ts
clinical.roles.ts
clinical.permissions.ts
clinical.prohibitions.ts
```

Nenhum outro arquivo pertence a este bloco.

---

## 4. Definições Comuns

### 4.1 Tipos Base

```ts
export type UUID = string;
export type Timestamp = number; // epoch ms
```

---

## 5. Papéis Clínicos (clinical.roles.ts)

### 5.1 Enum de Papéis

```ts
export enum ClinicalRole {
  CLINICIAN = 'clinician',
  SYSTEM = 'system',
  AI_AGENT = 'ai_agent'
}
```

### 5.2 Regra Fundamental

- Apenas `CLINICIAN` possui autoridade clínica
- `SYSTEM` executa infraestrutura
- `AI_AGENT` é sempre consultivo

---

## 6. Permissões (clinical.permissions.ts)

### 6.1 Permissões Canônicas

```ts
export enum ClinicalPermission {
  START_SESSION = 'start_session',
  PAUSE_SESSION = 'pause_session',
  RESUME_SESSION = 'resume_session',
  CLOSE_SESSION = 'close_session',

  WRITE_NOTE = 'write_note',
  EDIT_NOTE = 'edit_note',

  REQUEST_AI_ANALYSIS = 'request_ai_analysis',

  PERSIST_CLINICAL_DATA = 'persist_clinical_data'
}
```

### 6.2 Mapeamento Papel → Permissão

```ts
import { ClinicalRole } from './clinical.roles';
import { ClinicalPermission } from './clinical.permissions';

export const RolePermissions: Record<ClinicalRole, ClinicalPermission[]> = {
  [ClinicalRole.CLINICIAN]: [
    ClinicalPermission.START_SESSION,
    ClinicalPermission.PAUSE_SESSION,
    ClinicalPermission.RESUME_SESSION,
    ClinicalPermission.CLOSE_SESSION,
    ClinicalPermission.WRITE_NOTE,
    ClinicalPermission.EDIT_NOTE,
    ClinicalPermission.REQUEST_AI_ANALYSIS,
    ClinicalPermission.PERSIST_CLINICAL_DATA
  ],
  [ClinicalRole.SYSTEM]: [],
  [ClinicalRole.AI_AGENT]: []
};
```

---

## 7. Proibições (clinical.prohibitions.ts)

### 7.1 Proibições Estruturais

```ts
export enum ClinicalProhibition {
  AUTO_DIAGNOSIS = 'auto_diagnosis',
  AUTO_INTERVENTION = 'auto_intervention',
  AUTO_PERSISTENCE = 'auto_persistence',
  AI_WRITES_PRONTUARIO = 'ai_writes_prontuario',
  ADMIN_ALTERS_SESSION = 'admin_alters_session'
}
```

### 7.2 Regra de Enforçamento

Toda tentativa de violação deve:
- falhar silenciosamente **ou**
- lançar erro explícito

Nunca deve ser corrigida automaticamente.

---

## 8. Contrato Central (clinical.contract.ts)

### 8.1 Interface do Contrato

```ts
import { ClinicalRole } from './clinical.roles';
import { ClinicalPermission } from './clinical.permissions';

export interface ClinicalActionContext {
  actorRole: ClinicalRole;
  permission: ClinicalPermission;
}

export function assertClinicalPermission(ctx: ClinicalActionContext): void {
  // implementação obrigatória no bloco
}
```

### 8.2 Comportamento Esperado

`assertClinicalPermission` deve:
- validar papel
- validar permissão
- bloquear qualquer ação não permitida

---

## 9. O Que Este Bloco NÃO Faz

Este bloco **não**:
- cria estados clínicos
- cria sessão
- cria UI
- persiste dados
- chama IA

Ele apenas **autoriza ou bloqueia**.

---

## 10. Critério de Conclusão do Bloco

O Bloco 1 é considerado **concluído** quando:
- todos os arquivos existem
- permissões são explícitas
- proibições são impossíveis de contornar

Somente após isso é permitido iniciar o **Bloco 2 — Máquina de Estados**.

---

**Documento Técnico — Núcleo Clínico — Bloco 1 (Contrato Clínico)**

Subordinado ao Documento Mestre Absoluto.

