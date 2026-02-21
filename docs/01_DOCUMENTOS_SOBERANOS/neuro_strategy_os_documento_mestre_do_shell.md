# NeuroStrategy OS — DOCUMENTO MESTRE DO SHELL

**Status:** Documento Normativo Subordinado ao Documento Mestre Absoluto

**Autoridade:** Arquitetural e Clínica (por delegação)

---

## 1. Natureza do Documento

Este documento define, de forma **explícita, definitiva e não ambígua**, o que é, o que faz e o que **não pode fazer** o **Shell** do NeuroStrategy OS.

Ele é um **documento normativo subordinado** ao **Documento Mestre Absoluto** e existe para:
- impedir regressões arquiteturais
- eliminar interpretações livres
- proteger o isolamento dos núcleos
- garantir estabilidade estrutural ao longo da evolução do sistema

Em qualquer divergência entre código, sugestões técnicas ou decisões futuras, **prevalece este documento**.

---

## 2. Definição Essencial do Shell

O **Shell** é a **porta única da interface gráfica** do NeuroStrategy OS.

Ele **não é**:
- um núcleo
- um módulo clínico
- um orquestrador inteligente
- um controlador de lógica
- um gestor de estados clínicos

O Shell **é**:
> um contêiner estável, passivo e previsível que permite a convivência segura de núcleos autônomos.

Metáfora oficial:
> **O Shell é a mesa da clínica.**
> Os núcleos são os instrumentos colocados sobre ela.

---

## 3. Princípio Fundamental

> **Shell não pensa. Shell não decide. Shell não interpreta.**

Qualquer tentativa de dotar o Shell de inteligência clínica, lógica de negócio ou inferência constitui **erro sistêmico grave**.

---

## 4. Responsabilidades Exclusivas do Shell

O Shell **deve executar exclusivamente** as funções abaixo.

### 4.1 Porta Única de UI

- O Electron carrega apenas o Shell
- Nenhum núcleo é carregado diretamente pelo Electron

### 4.2 Estrutura Fixa

O Shell possui **exatamente** os seguintes arquivos:
- `shell/index.html`
- `shell/app.js`
- `shell/styles.css`

Nenhuma lógica fora desses arquivos é permitida.

---

### 4.3 Layout Base Congelado

O layout do Shell é **fixo, simples e invariável**.

Elementos obrigatórios:
- Menu Principal (nível 1), sempre visível
- Área única de carregamento de núcleos

O layout do Shell:
- não muda conforme o núcleo ativo
- não reage a estados clínicos
- não se adapta dinamicamente

---

### 4.4 Menu Principal (Nível 1)

Itens obrigatórios e fixos:
- Dashboard
- Pacientes
- Núcleo Clínico
- Diagnóstico & Redação
- Administração
- Marketing
- Pesquisa
- Configurações

Regras absolutas:
- Núcleos não criam, removem ou alteram itens do menu
- O menu não depende de paciente ativo
- O menu não depende de estado clínico

---

### 4.5 Navegação Global

O Shell:
- controla qual núcleo está ativo
- troca núcleos exclusivamente pelo Menu Principal

O Shell **não**:
- conhece abas internas
- controla navegação dentro dos núcleos
- interfere no fluxo interno de qualquer núcleo

---

### 4.6 Contexto Global Mínimo

O Shell mantém **apenas**:
- `activePatientId` (string | null)
- `sessionState` (`idle | active | paused | closed`)

O Shell:
- armazena
- transmite

O Shell **não**:
- interpreta
- valida
- decide

---

### 4.7 Comunicação Shell ↔ Núcleos (Contrato Fechado)

Toda comunicação ocorre por mensagens explícitas.

#### Mensagens Permitidas

**Shell → Núcleo**
- `SET_PATIENT`
- `CLEAR_PATIENT`

**Núcleo → Shell**
- `REQUEST_CONTEXT`
- `REQUEST_NAVIGATION` (apenas nível 1)

Mensagens fora deste contrato:
- são ignoradas
- não geram efeitos colaterais

Este contrato funciona como **firewall arquitetural**.

---

## 5. Proibições Absolutas do Shell

O Shell **não pode**, sob nenhuma circunstância:

- conter lógica clínica
- renderizar UI clínica
- conhecer conceitos como Evolução, Atendimento ou Sessão
- gerenciar timers clínicos
- criar ou interpretar estados clínicos
- armazenar dados clínicos
- implementar persistência
- implementar autenticação
- integrar Inteligência Artificial
- antecipar funcionalidades futuras

Qualquer violação descaracteriza o Shell.

---

## 6. Critério de Shell Fechado

O Shell é considerado **fechado** quando:

- Núcleos podem evoluir sem alterar o Shell
- Nenhum núcleo consegue criar menu próprio
- Nenhum núcleo consegue trocar paciente sozinho
- O layout do Shell permanece idêntico
- Falhas em núcleos não afetam o Shell
- O autor humano consegue ignorar o Shell por longos períodos

Quando estes critérios são atendidos, o Shell **não deve mais ser modificado nesta fase do projeto**.

---

## 7. Relação com a Metodologia do Projeto

O fechamento precoce do Shell:
- não empobrece o sistema
- não antecipa arquitetura
- não bloqueia uso real

Ele **protege** o projeto contra retrabalho e regressão estrutural.

---

## 8. Encerramento

O Shell do NeuroStrategy OS é um **componente de contenção**, não de inteligência.

Sua função é:
- permitir
- separar
- estabilizar

Não decidir.

---

**Documento Normativo — Shell do NeuroStrategy OS**

Subordinado ao Documento Mestre Absoluto.

