# NeuroStrategy OS — DOCUMENTO TÉCNICO DO NÚCLEO CLÍNICO
## Bloco 5 — Integração com UI

**Status:** Documento Técnico Subordinado ao Documento Mestre Absoluto e aos Documentos Normativos do Núcleo Clínico

**Objetivo do Bloco:** Definir, de forma **técnica, mínima e enforçável**, como o Núcleo Clínico se integra à **UI** (Shell + Abas), garantindo que **nenhuma decisão clínica seja deslocada para a interface**, que o estado clínico permaneça soberano e que a UI atue apenas como **dispositivo de mediação segura**.

---

## 1. Escopo e Dependências

Este é o **Bloco Clínico 5** e **depende obrigatoriamente** dos blocos anteriores:
- Bloco 1 — Contrato Clínico
- Bloco 2 — Máquina de Estados Clínicos
- Bloco 3 — Persistência Ética
- Bloco 4 — IA: Análises & NAC

Dependências normativas:
- Documento Mestre do Shell
- Documento Normativo do Núcleo Clínico (conceitual)
- Documento Normativo da Aba Evolução
- Documento Normativo de Diagnóstico & Redação
- Documento Normativo de Administração

Saídas obrigatórias:
- Contrato UI ↔ Núcleo Clínico
- Regras de renderização por estado
- Proibições de inferência por UI

---

## 2. Princípios de Integração

- UI **não decide**
- UI **não interpreta**
- UI **não cria estado**
- UI **não persiste dados clínicos**

A UI apenas **reflete** o estado clínico autorizado.

---

## 3. Contrato UI ↔ Núcleo Clínico

A comunicação ocorre exclusivamente por **eventos explícitos**.

### 3.1 UI → Núcleo Clínico (Solicitações)

Eventos permitidos:
- `REQUEST_START_SESSION`
- `REQUEST_PAUSE_SESSION`
- `REQUEST_RESUME_SESSION`
- `REQUEST_CLOSE_SESSION`
- `REQUEST_PERSIST_CLINICAL_DATA`
- `REQUEST_AI_ANALYSIS`

A UI **não executa** nenhuma dessas ações diretamente.

---

### 3.2 Núcleo Clínico → UI (Notificações)

Eventos permitidos:
- `STATE_CHANGED`
- `PERSISTENCE_CONFIRMED`
- `PERSISTENCE_FAILED`
- `AI_RESPONSE_READY`

A UI **não deriva lógica** a partir desses eventos.

---

## 4. Renderização por Estado Clínico

A UI deve respeitar as seguintes regras:

- **IDLE**
  - escrita desabilitada
  - botões de sessão disponíveis

- **ACTIVE**
  - escrita habilitada
  - persistência manual disponível

- **PAUSED**
  - escrita bloqueada
  - leitura permitida

- **CLOSED**
  - leitura apenas
  - nenhuma ação clínica disponível

A UI **não pode** violar essas regras.

---

## 5. Aba Evolução como Centro

Durante uma sessão:
- a Aba Evolução é o **centro operacional**
- outras abas clínicas são acessíveis
- abas administrativas **não interferem** no estado

Nenhuma navegação encerra sessão automaticamente.

---

## 6. Integração com Diagnóstico & Redação

- conteúdo produzido em Diagnóstico & Redação **não entra automaticamente** no prontuário
- integração exige ação humana explícita
- a UI não sugere transferência automática

---

## 7. Integração com Administração

- dados administrativos **refletem** eventos clínicos
- nenhuma ação administrativa altera estado clínico
- cobranças nunca ocorrem durante sessão ativa

---

## 8. Integração com IA

- IA aparece apenas em painéis dedicados
- nunca sobrepõe escrita clínica
- nunca bloqueia interação

Falhas de IA **não afetam UI clínica**.

---

## 9. Proibições Absolutas da UI

A UI **não pode**:
- inferir estado clínico
- criar automações clínicas
- persistir dados por conta própria
- alterar histórico
- executar lógica de negócio

Qualquer tentativa constitui **erro sistêmico**.

---

## 10. Critério de Conclusão do Bloco

O Bloco 5 é considerado **concluído** quando:
- nenhuma ação clínica ocorre fora do núcleo
- a UI é completamente passiva
- estados clínicos governam renderização

Com isso, o **Núcleo Clínico Técnico** está **formalmente encerrado**.

---

**Documento Técnico — Núcleo Clínico — Bloco 5 (Integração com UI)**

Subordinado ao Documento Mestre Absoluto.

