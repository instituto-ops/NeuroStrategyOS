# NeuroStrategy OS — DOCUMENTO TÉCNICO DO NÚCLEO CLÍNICO
## Bloco 4 — IA: Análises & NAC

**Status:** Documento Técnico Subordinado ao Documento Mestre Absoluto e aos Documentos Normativos do Núcleo Clínico

**Objetivo do Bloco:** Definir, de forma **técnica e enforçável**, como a Inteligência Artificial pode atuar no Núcleo Clínico **exclusivamente** nos modos **Análises (IA)** e **NAC (Núcleo de Agentes Cognitivos)**, sem violar autoridade humana, ética clínica ou integridade do prontuário.

---

## 1. Escopo e Dependências

Este é o **Bloco Clínico 4** e **depende obrigatoriamente** dos blocos anteriores:
- Bloco 1 — Contrato Clínico
- Bloco 2 — Máquina de Estados Clínicos
- Bloco 3 — Persistência Ética

Dependências normativas:
- Documento Normativo do Núcleo Clínico (conceitual)
- Documento Normativo da Aba Evolução
- Documento Normativo do NAC

Saídas obrigatórias:
- Contratos técnicos de IA clínica
- Separação Análises (IA) × NAC
- Regras de execução, visibilidade e descarte

---

## 2. Princípios Técnicos Invioláveis

- IA **não possui** autoridade clínica
- IA **não persiste** dados clínicos
- IA **não altera** estados clínicos
- IA **não escreve** no prontuário
- Toda ação de IA é **explicitamente solicitada** pelo clínico

Esses princípios devem ser **enforçados em código**.

---

## 3. Modos de IA no Núcleo Clínico

Existem **apenas dois modos permitidos** de IA clínica:

### 3.1 Análises (IA)

Modo **episódico e descartável** de análise cognitiva.

Características:
- acionado sob demanda
- contexto explícito fornecido pelo clínico
- resultados **não persistentes** por padrão
- uso durante ou após sessão

Finalidade:
- apoiar reflexão
- gerar hipóteses
- comparar perspectivas

---

### 3.2 NAC — Núcleo de Agentes Cognitivos

Modo **estrutural e versionado** de agentes.

Características:
- agentes nomeados
- perfis cognitivos explícitos
- versões auditáveis
- treinamentos registrados

Finalidade:
- manter estilos de análise
- evitar deriva cognitiva
- permitir auditoria de raciocínio assistido

---

## 4. Contrato Técnico — Análises (IA)

### 4.1 Contexto de Execução

Toda análise deve receber **contexto explícito**:
- objetivo do atendimento
- hipóteses iniciais
- pontos de atenção
- limites explícitos

Sem contexto explícito, a análise **não executa**.

---

### 4.2 Saída da IA

A saída da IA:
- é apresentada em painel separado
- não modifica conteúdo clínico
- não gera efeitos colaterais

Persistir qualquer parte da saída exige **ação humana explícita**.

---

## 5. Contrato Técnico — NAC

### 5.1 Entidades Mínimas

```ts
export interface CognitiveAgent {
  id: string;
  name: string;
  version: string;
  description: string;
}
```

### 5.2 Regras de Execução

- agentes **não executam automaticamente**
- agentes não compartilham memória clínica entre si
- agentes não aprendem em tempo real durante sessões

---

## 6. Visibilidade e UI

- IA aparece apenas no **Painel de Agentes**
- nunca sobrepõe o Caderno Clínico
- nunca interrompe o fluxo de escrita

A ausência do painel **não impede** atendimento.

---

## 7. Descarte e Persistência

- saídas de IA são descartáveis
- persistência exige comando explícito
- conteúdo persistido vira **registro humano**, não registro de IA

Nunca existe persistência automática de IA.

---

## 8. Falhas e Contenção

- falhas de IA não afetam sessão
- falhas não alteram estado clínico
- falhas não disparam persistência

A IA é **isolada por design**.

---

## 9. O Que Este Bloco NÃO Faz

Este bloco **não**:
- treina modelos base
- define infraestrutura de IA
- implementa UX detalhada
- cria automações clínicas

Ele governa **quando e como** a IA pode existir clinicamente.

---

## 10. Critério de Conclusão do Bloco

O Bloco 4 é considerado **concluído** quando:
- IA nunca executa ação clínica
- NAC é versionado e auditável
- Análises são descartáveis por padrão

Somente após isso é permitido iniciar o **Bloco 5 — Integração com UI**.

---

**Documento Técnico — Núcleo Clínico — Bloco 4 (IA: Análises & NAC)**

Subordinado ao Documento Mestre Absoluto.

