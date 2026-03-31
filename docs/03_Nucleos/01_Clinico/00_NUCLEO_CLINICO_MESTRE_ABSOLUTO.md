# 🏥 DOCUMENTO MESTRE ABSOLUTO: NÚCLEO CLÍNICO

**Status:** Documento Soberano do Domínio Clínico  
**Autoridade:** Clínica e Ética (Humana)  
**Referência:** Subordinado ao `00_Mestre_Absoluto.md` e operado sob a **Metodologia Antigravity**.

---

## 1. Ontologia e Alma do Núcleo
O **Núcleo Clínico** é o coração pulsante do NeuroStrategy OS. Ele não é uma base de dados de pacientes; é o espaço sagrado onde ocorre o **Gesto Clínico**. Sua existência é pautada pela **Individuação** (desacoplamento ético e técnico) e pela **Soberania do Vínculo**.

### Princípios Inegociáveis (A "Lei Clínica"):
1. **A Clínica é Soberana:** Tecnologia e IA são subordinadas ao julgamento humano.
2. **Sessão como Átomo:** A sessão clínica é a unidade fundamental de tempo e informação.
3. **Persistência Consciente:** Gravar um dado clínico é um ato ético, nunca automático.
4. **IA Consultiva, Nunca Decisiva:** Agentes (NAC) sugerem e analisam; o clínico decide e valida.

---

## 2. Arquitetura de Materialização (Os 5 Blocos)

O Núcleo Clínico é materializado através de 5 camadas de proteção e funcionalidade:

### Bloco 1: O Contrato Ético-Técnico
*   Definição rigorosa de **Papéis** (`Clinician`, `System`, `AI_Agent`).
*   Apenas o `Clinician` possui permissão para `START_SESSION`, `WRITE_NOTE` e `PERSIST_DATA`.
*   **Proibição Absoluta:** Automação de atos clínicos ou diagnósticos.

### Bloco 2: A Máquina de Estados (Homeostase)
O ciclo de vida de um atendimento segue estados finitos e imutáveis:
*   `IDLE` (Repouso) ➔ `ACTIVE` (Sessão Ativa) ➔ `PAUSED` (Pausa Reflexiva) ➔ `CLOSED` (Encerrado/Auditável).
*   **Guards:** Transições são explícitas. Nenhuma ação administrativa ou de IA pode alterar o estado clínico `ACTIVE`.

### Bloco 3: Persistência Ética (Memória Explícita)
*   **Imutabilidade:** Uma nota persistida é um documento histórico. Correções geram novos registros, nunca apagam o original.
*   **Auditoria:** Todo ato de persistência gera um log inalterável de autoria humana.

### Bloco 4: Orquestração Cognitiva (NAC & IA)
*   **Modo Analítico:** IA episódica para gerar hipóteses rápidas e descartáveis.
*   **NAC (Núcleo de Agentes Cognitivos):** Agentes especializados com perfis "Jungianos" ou "Ericksonianos" para análise longitudinal de casos.
*   **Isolamento:** A IA não possui acesso de escrita ao prontuário. Seu conteúdo só se torna clínico após "Captação" e validação pelo humano.

### Bloco 5: Mediação via UI (A Tela Âncora)
*   A interface é um **Dispositivo de Proteção**. Ela reflete o estado clínico, mas não detém lógica de negócio.
*   **Centro Operacional:** Aba Evolução. Navegação entre abas não interrompe a sessão (continuidade de fluxo).

---

## 3. Dicionário Ontológico Contextual

*   **"Reflexo Instintivo":** Resposta imediata de UI em tempo real durante a sessão (via WebSockets).
*   **"Poda Sináptica":** Limpeza automática de rascunhos de IA não captados pelo clínico após o fechamento da sessão.
*   **"Contenção":** Mecanismo de *Fail-Safe* que bloqueia salvamentos parciais se a integridade do link clínico for perdida.

---

## 4. Critérios de Excelência e Validação
> *"Se uma funcionalidade não protege o vínculo, não preserva a ética ou não reduz o erro clínico, ela não pertence ao Núcleo Clínico."*

---
**Materializado em:** 31/03/2026  
**Por:** Antigravity AI (Sênior Sintético)  
**Validação:** Aguardando assinatura mental do Arquiteto Visionário.
