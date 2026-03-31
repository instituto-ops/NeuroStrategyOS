# NeuroStrategy OS — Acordo de Virada para Produto Real

**Status:** Oficial · Ativo **Data:** 03/01/2026 **Modo:** Uso Clínico Pessoal · Valor Imediato

Este documento registra **formalmente a mudança de estratégia** do projeto NeuroStrategy OS, com foco em **uso real, integração prática e entrega de valor imediato**, sem abandonar os fundamentos arquiteturais já construídos.

---

## 1\. Contexto da Decisão

O projeto alcançou maturidade estrutural suficiente no Núcleo Clínico (máquina de estados, guards e contratos). No entanto, a ausência de funcionalidades **visivelmente utilizáveis** passou a gerar desgaste e perda de motivação.

Ao mesmo tempo, existe uma **necessidade concreta e imediata**: \- Centralizar o cotidiano do consultório \- Reduzir o uso fragmentado de múltiplas ferramentas \- Ganhar tempo operacional antes do início do mestrado \- Testar o sistema em atendimentos reais

Diante disso, foi tomada a decisão consciente de **priorizar funcionalidade prática**, mantendo a arquitetura “boa o suficiente”, sem paralisar o projeto por excesso de conservadorismo invisível.

---

## 2\. Declaração Oficial de Modo

A partir deste ponto, o projeto entra em:

🔓 **Modo Produto Real — Uso Clínico Pessoal**

Características deste modo: \- Usuário único (o próprio clínico) \- Risco ético controlado \- Segurança equivalente ou superior ao uso atual (Drive, Docs, Chatbots) \- Foco em valor imediato \- Iteração rápida \- Arquitetura pragmática, não perfeita

Este modo **não invalida** decisões anteriores — apenas ajusta o ritmo e o foco.

---

## 3\. Acordos Técnicos Congelados

### 3.1 Uso da IA

* A IA **pode ler todo o prontuário do paciente**

* A IA **pode ler todas as sessões anteriores**

* A IA **pode ler anotações e transcrições**

* Não haverá compartimentalização perfeita neste momento

* Contexto rico é considerado **vantagem clínica**

A IA atua como: \- Assistente clínico \- Supervisor reflexivo \- Organizador de pensamento \- Apoio à escrita e análise

A IA **não substitui** a decisão humana.

---

### 3.2 Persistência de Dados

* 100% local

* Nenhum dado enviado automaticamente para a nuvem

* Persistência simples baseada em arquivos

* Transparência total sobre onde os dados estão

Estrutura base:

data/patients/  
└─ paciente-id/  
   ├─ patient.json  
   └─ sessions.json

Este modelo é considerado adequado e mais seguro do que o uso atual de múltiplas ferramentas dispersas.

---

### 3.3 Interface (UI)

Princípio adotado:

**Simples não é feio.**

Diretrizes de UI: \- Estilo Office / Notion \- Visual limpo e claro \- Tipografia adequada \- Organização espacial coerente \- Nada tosco, nada improvisado \- Design começa a nascer desde já, mesmo incompleto

A UI deve ser **agradável de usar**, ainda que funcionalmente limitada no início.

---

### 3.4 Segurança

* Uso pessoal consciente

* Controle humano total dos dados

* Sem automações ocultas

* Sem uploads invisíveis

O nível de segurança é considerado **equivalente ou superior** às práticas atuais do clínico.

---

## 4\. Objetivo Central do MVP Clínico

Criar um sistema que permita:

* Cadastro e abertura de prontuário de pacientes

* Registro de atendimentos (notas \+ transcrição)

* Consulta fácil a sessões anteriores

* Uso de IA contextual, lendo todo o histórico

O sistema deve substituir, de forma integrada: \- Gravador de áudio \+ transcrição externa \- Google Drive / Google Docs \- ChatGPT, Gemini, NotebookLM usados separadamente \- Anotações dispersas

---

## 5\. MVP Clínico Usável — Escopo em 3 Blocos

### BLOCO A — Prontuário Real

Entrega: \- Lista de pacientes \- Cadastro de novo paciente \- Abertura de paciente \- Documento vivo do prontuário \- Persistência local

Resultado esperado: \> “Tenho um lugar único para cada paciente.”

---

### BLOCO B — Registro de Atendimento

Entrega: \- Criação de sessões \- Editor de notas funcional \- Campo de transcrição \- Histórico de sessões

Resultado esperado: \> “Consigo usar isso em atendimentos reais nesta semana.”

---

### BLOCO C — IA Clínica Contextual

Entrega: \- Botão de consulta à IA \- IA recebe prontuário completo \+ sessões \- Respostas clínicas contextualizadas

Resultado esperado: \> “A IA pensa comigo sobre este paciente.”

---

## 6\. Relação com o Núcleo Clínico

* O Núcleo Clínico atual é considerado **suficiente** para este estágio

* Ele não será descartado

* Ele poderá ser refinado posteriormente, com menor carga emocional

* Nenhuma exigência de perfeição arquitetural bloqueia o avanço do produto

---

## 7\. Diretriz Psicológica do Projeto

Este projeto existe para: \- Reduzir carga cognitiva \- Otimizar o cotidiano clínico \- Apoiar a formação acadêmica \- Renovar a prática clínica

Ele **não existe** para provar elegância técnica.

---

## 8\. Status Final deste Documento

Este documento: \- Consolida a virada estratégica do projeto \- Deve ser considerado referência ativa \- Autoriza explicitamente decisões pragmáticas \- Serve como contexto para novos chats

**Documento Oficial — NeuroStrategy OS**

---

## 9\. Atualização — Consolidação Pós‑Análise dos Documentos e Referências Visuais

**Data:** 03/01/2026

Após a leitura integral dos documentos oficiais do projeto (Documento Mestre, Etapa 3, Etapa 3.1, Diretrizes de Uso da IA, Guia de Leitura das Camadas) e da análise das referências visuais fornecidas (prints de software clínico em uso real e rascunho da Aba Evolução), ficam consolidadas as decisões abaixo, sem reabertura de contratos congelados.

---

### 9.1 Confirmações Arquiteturais (Sem Alteração de Contratos)

* A **Tela Âncora (Evolução / Atendimento)** continua sendo soberana **apenas** para o gesto clínico em tempo real.

* A existência de **Dashboard**, **Lista de Pacientes** e **Ficha Administrativa do Paciente** não viola a Tela Âncora nem os contratos da Etapa 3\.

* O erro de interpretação por mistura de camadas foi explicitamente evitado, conforme o *Guia Oficial de Leitura dos Documentos*.

📌 Nenhum documento congelado precisou ser alterado.

---

### 9.2 Consolidação do Modelo de Sistema (Produto Real)

O NeuroStrategy OS será materializado, a partir deste ponto, como um **software clínico clássico de consultório**, com:

* Menu superior global fixo

* Navegação previsível

* Tabelas densas e funcionais

* Abas administrativas e clínicas coexistindo

* IA como camada cognitiva invisível (não protagonista visual)

O sistema **não adota** padrões de app moderno, chat‑centrismo ou UX experimental.

---

### 9.3 Pacientes como Eixo Central do Sistema

Fica confirmado que:

* A **Tela de Pacientes** é o eixo operacional do sistema.

* Ela deve conter tabela de pacientes, busca simples, botões de ação e abertura por duplo clique.

* A abertura de um paciente leva à **Ficha do Paciente**, que constitui um mini‑sistema próprio.

---

### 9.4 Ficha do Paciente — Abas Mínimas Funcionais

As seguintes abas são consideradas **mínimo obrigatório para uso real de consultório**:

* **Principal** — dados cadastrais e prontuário longitudinal

* **Evolução** — atendimento clínico (Tela Âncora aplicada)

* **Pagamentos** — controle administrativo simples

* **Presenças** — histórico de comparecimento

Outras abas permanecem fora de escopo neste momento.

---

### 9.5 Aba Evolução — Contrato Visual e Funcional (Congelado)

O rascunho visual produzido manualmente passa a valer como **contrato visual de implementação** da Aba Evolução, em conformidade com a Tela Âncora oficial.

Componentes obrigatórios:

* Coluna esquerda: Estrutura Cognitiva (Objetivo, Hipóteses, Pontos de Atenção, Limites)

* Área central: Editor de texto funcional (documento clínico vivo)

* Painel direito: IA LAB (Análise dos Agentes)

* Rodapé: Sessões anteriores (leitura) \+ ações finais

Não serão feitas simplificações estruturais nem substituições por chat.

---

### 9.6 Uso da IA — Confirmação Final

Reafirma‑se, sem ressalvas, que:

* A IA **pode ser consultada durante a sessão clínica**

* Sempre por ação humana explícita

* Sempre como assistente cognitivo

* Nunca escreve prontuário automaticamente

* Nunca persiste conteúdo sozinha

* Nunca altera estados clínicos

Essa regra vale transversalmente para todas as abas.

---

### 9.7 Pagamentos e Presenças

* São módulos administrativos

* Não interferem no gesto clínico

* Não exigem lógica de IA

* Devem ser simples, funcionais e completos

---

### 9.8 Decisão Operacional (Materialização)

Fica oficialmente decidido que, a partir deste documento:

* O foco passa da produção de contratos para a **materialização visual e funcional** do sistema.

* O próximo passo do projeto é a **implementação do esqueleto visual funcional**, iniciando por:

  1. Menu superior global

  2. Dashboard inicial

  3. Tela de Pacientes

  4. Ficha do Paciente

  5. Aba Evolução conforme contrato visual

Nenhuma nova decisão conceitual será introduzida durante esta fase — apenas execução.

---

**Atualização válida e incorporada ao acordo oficial do projeto.**