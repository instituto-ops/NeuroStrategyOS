# NeuroStrategy OS — DOCUMENTO TÉCNICO DO NÚCLEO CLÍNICO
## Bloco 3 — Persistência Ética

**Status:** Documento Técnico Subordinado ao Documento Mestre Absoluto e aos Documentos Normativos do Núcleo Clínico

**Objetivo do Bloco:** Definir as regras **éticas, técnicas e enforçáveis** de persistência de dados clínicos. Este bloco garante que **nada é salvo sem intenção humana explícita**, que o passado clínico é protegido e que toda gravação é auditável.

---

## 1. Escopo e Dependências

Este é o **Bloco Clínico 3** e **depende obrigatoriamente** dos blocos anteriores:
- Bloco 1 — Contrato Clínico
- Bloco 2 — Máquina de Estados Clínicos

Dependências normativas:
- Documento Normativo do Núcleo Clínico (conceitual)
- Documento Normativo da Aba Evolução

Saídas obrigatórias:
- Regras de persistência
- Invariantes de imutabilidade
- Modelo mínimo de auditoria

---

## 2. Princípios de Persistência

- Persistir é um **ato ético consciente**
- Persistência nunca é automática
- O passado clínico é imutável
- Correções nunca apagam o original

Esses princípios devem ser **enforçados em código**.

---

## 3. Condições Necessárias para Persistir

Uma persistência clínica **só pode ocorrer** quando **todas** as condições abaixo forem verdadeiras:

- `actorRole === CLINICIAN`
- `ClinicalState === ACTIVE || ClinicalState === PAUSED`
- ação explícita do clínico (comando direto)
- contexto clínico identificado

Qualquer tentativa fora dessas condições **deve falhar**.

---

## 4. Tipos de Dados Persistíveis

Podem ser persistidos:
- notas clínicas
- marcações temporais
- estados encerrados
- metadados clínicos mínimos

Não podem ser persistidos:
- conteúdo bruto de IA
- rascunhos não confirmados
- dados administrativos
- dados de pesquisa

---

## 5. Imutabilidade e Correções

### 5.1 Regra de Imutabilidade

Após persistido, um registro clínico é **imutável**.

- não pode ser sobrescrito
- não pode ser editado silenciosamente
- não pode ser apagado

### 5.2 Correções

Correções são feitas por:
- novos registros
- referências explícitas ao original
- justificativa textual

O registro original permanece intacto.

---

## 6. Auditoria Mínima (clinical.audit.ts)

Toda persistência deve gerar um **evento de auditoria mínimo**.

```ts
export interface ClinicalAuditEvent {
  id: string;
  timestamp: number;
  actorRole: 'clinician';
  action: 'persist';
  targetId: string;
}
```

Eventos de auditoria:
- não são editáveis
- não são apagáveis
- não são ocultáveis

---

## 7. Falhas e Recuperação

- falhas de persistência **não alteram estado clínico**
- o sistema não tenta corrigir automaticamente
- o clínico é informado explicitamente

Nunca existe persistência parcial silenciosa.

---

## 8. O Que Este Bloco NÃO Faz

Este bloco **não**:
- define schema de banco
- escolhe tecnologia de armazenamento
- implementa backup
- define criptografia (documento próprio)

Ele governa **quando e como** é permitido persistir.

---

## 9. Critério de Conclusão do Bloco

O Bloco 3 é considerado **concluído** quando:
- nenhuma persistência automática é possível
- registros são imutáveis
- auditoria mínima é obrigatória

Somente após isso é permitido iniciar o **Bloco 4 — IA (Análises & NAC)**.

---

**Documento Técnico — Núcleo Clínico — Bloco 3 (Persistência Ética)**

Subordinado ao Documento Mestre Absoluto.

