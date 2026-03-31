# NeuroStrategy OS: UI Blueprints & Architecture Spec
**Status:** DRAFT 1.0
**Autor:** Senior UI/UX Architect
**Ref:** Documento Mestre / Bloco 5

---

## 1. Filosofia de Design e Layout

O sistema segue o padrão **"Dense Utility"**. Ao contrário de apps web modernos que usam muito espaço em branco ("air"), o NeuroStrategy OS deve parecer um cockpit profissional.

*   **Densidade:** Alta. Fontes pequenas (12px-14px), espaçamentos rígidos.
*   **Cromática:** Monocromática (Slate/Grayscale) para a estrutura. Cores apenas para *Status* (Verde/Amarelo/Vermelho) e *Ações Primárias* (Azul clínico).
*   **Comportamento:** A UI é **Passiva**. Ela não tem estado próprio complexo; ela reflete o `machineState` do Core.

---

## 2. Árvore de Componentes Sugerida (`src/components`)

Esta estrutura isola o "Shell" (o container do SO) dos "Cores" (as funcionalidades injetadas).

```text
src/
├── components/
│   ├── shell/                  # O "Chassis" Imutável da Aplicação
│   │   ├── AppShell.tsx        # Layout Grid Principal (CSS Grid)
│   │   ├── GlobalSidebar.tsx   # Navegação entre Núcleos (Clínico, Mkt, Financeiro)
│   │   ├── ContextBar.tsx      # Barra Superior (Paciente Atual, Status do Sistema, Timer)
│   │   ├── UtilityTray.tsx     # Barra lateral direita (Notas rápidas, Calculadora, Todo)
│   │   └── StatusBar.tsx       # Rodapé (Status de Criptografia, Sync, Versão)
│   │
│   ├── cores/                  # Os Módulos Funcionais
│   │   ├── clinical/
│   │   │   ├── Dashboard.tsx   # Visão Geral do dia
│   │   │   ├── PatientFile.tsx # Prontuário (Tabs: Dados, Sessões, Anamnese)
│   │   │   └── SessionMode.tsx # Interface de Sessão Ativa (Foco)
│   │   ├── growth/             # Marketing & CRM
│   │   └── research/           # Análise de Dados
│   │
│   └── shared/                 # UI Kit (Atomic Design)
│       ├── Button.tsx          # Variantes: Ghost, Solid, Outline (Notion style)
│       ├── Card.tsx            # Container padrão com borda fina
│       ├── Input.tsx
│       └── Typography.tsx
```

---

## 3. Wireframes ASCII

### Estado A: Dashboard Inicial (Idle / Visão Geral)
*Foco: Agenda do dia e status dos pacientes.*

```text
+---------------------+-------------------------------------------------------+
|  NEUROSTRATEGY      |  [Search Cmd+K]      [User: Dr. Flow]    [Settings]   |
+---------------------+-------------------------------------------------------+
| SIDEBAR       [<]   |  CONTEXT: Sistema Pronto / Nenhum Paciente Selec.     |
|                     +-------------------------------------------------------+
| [@] Dashboard       |  MAIN STAGE (Grid Layout)                             |
|                     |                                                       |
| -- CLÍNICO --       |  +------------------+  +---------------------------+  |
| [8] Pacientes       |  | AGENDA HOJE      |  | LEMBRETES CLÍNICOS        |  |
| [O] Sessões         |  |                  |  |                           |  |
|                     |  | 09:00 - Ana B.   |  | [!] Revisar Prontuário X  |  |
| -- GESTÃO --        |  | 14:00 - João M.  |  | [ ] Emitir Recibo Y       |  |
| [$] Financeiro      |  | 16:30 - Bloq.    |  |                           |  |
| [%] Marketing       |  +------------------+  +---------------------------+  |
|                     |                                                       |
| -- SISTEMA --       |  +------------------+  +---------------------------+  |
| [?] Ajuda           |  | STATUS DISCO     |  | FLUXO FINANCEIRO (MÊS)    |  |
|                     |  | Encrypted: YES   |  | $$$$$___________          |  |
|                     |  | Local: 45GB Free |  |                           |  |
|                     |  +------------------+  +---------------------------+  |
+---------------------+-------------------------------------------------------+
| STATUS: Online | Encriptação: NaCl High | V 1.0.0                           |
+-----------------------------------------------------------------------------+
```

### Estado B: Sessão Ativa (Clinical Mode)
*Foco: Registro da sessão. Redução de ruído visual. Barra lateral recolhida.*

```text
+--+--------------------------------------------------------------------------+
|NS|  PACIENTE: ANA BEATRIZ (ID: 402) | SESSÃO: #42 | TIMER: 00:45:12 [STOP]  |
+--+--------------------------------------------------------------------------+
|  |  TAB: [Evolução] [Histórico] [Anexos] [Plano]                            |
|S |                                                                          |
|I |  +-------------------------------------+  +---------------------------+  |
|D |  | EDITOR DE EVOLUÇÃO (Rich Text)      |  | CONTEXTO RÁPIDO           |  |
|E |  |                                     |  |                           |  |
|  |  | O paciente relata melhoria no       |  | > Última Sessão (10/10)   |  |
|B |  | sono após aplicação da técnica      |  |   "Relatou ansiedade..."  |  |
|A |  | X. Reação positiva ao...            |  |                           |  |
|R |  |                                     |  | > Metas Atuais            |  |
|  |  | [Draft Auto-Saved localmente]       |  |   1. Higiene do Sono      |  |
|  |  |                                     |  |   2. Regulação Emocional  |  |
|  |  |                                     |  |                           |  |
|  |  +-------------------------------------+  +---------------------------+  |
|  |                                                                          |
|  |  [ AÇÕES CLÍNICAS ]                                                      |
|  |  ( ) Gerar Documento   ( ) Agendar Retorno   ( ) Encerrar Sessão         |
|  |                                                                          |
+--+--------------------------------------------------------------------------+
| GRAVANDO LOGS LOCAIS... | NÃO SINCRONIZADO (PRIVACIDADE)                    |
+-----------------------------------------------------------------------------+
```

### Estado C: Modo Marketing (Growth Core)
*Foco: Métricas e gestão. Estilo mais "Dashboard Analytics".*

```text
+---------------------+-------------------------------------------------------+
|  NEUROSTRATEGY      |  GROWTH DASHBOARD                 [Exportar Relatório]|
+---------------------+-------------------------------------------------------+
| SIDEBAR       [<]   |  CONTEXT: Campanha "Outubro Saúde Mental"             |
|                     +-------------------------------------------------------+
| [@] Dashboard       |                                                       |
|                     |  [ KPI CARDS ]                                        |
| -- CLÍNICO --       |  +----------+  +----------+  +----------+             |
| ...                 |  | LEADS    |  | CONVERSÃO|  | CUSTO/ACQ|             |
|                     |  | 42       |  | 15%      |  | R$ 45,00 |             |
| -- GESTÃO --        |  +----------+  +----------+  +----------+             |
| [$] Financeiro      |                                                       |
| [%] Marketing  <--  |  +----------------------------------------+           |
|    > Campanhas      |  | FUNIL DE AQUISIÇÃO (CHART AREA)        |           |
|    > Conteúdo       |  | [===========] Visitantes               |           |
|    > CRM            |  |    [======]   Interessados             |           |
|                     |  |       [==]    Pacientes                |           |
|                     |  +----------------------------------------+           |
|                     |                                                       |
|                     |  LISTA DE TAREFAS MARKETING                           |
|                     |  [ ] Post Instagram (Tema: Ansiedade)                 |
|                     |  [x] Email lista VIP                                  |
+---------------------+-------------------------------------------------------+
| STATUS: Módulo Gestão Ativo                                                 |
+-----------------------------------------------------------------------------+
```

---

## 4. Definição de Rotas Lógicas (React Router)

A estrutura de URL deve ser semântica e previsível.

### Raiz / Shell
*   `/` -> Redireciona para `/dashboard` se autenticado, ou `/login` (chave local).
*   `/settings` -> Configurações globais (Tema, Caminhos de arquivo, Chaves API).

### Núcleo Clínico (`/clinical`)
*   `/clinical/dashboard` -> Visão geral da clínica.
*   `/clinical/schedule` -> Agenda completa.
*   `/clinical/patients` -> Lista de pacientes (tabela pesquisável).
*   `/clinical/patients/:patientId` -> Prontuário do paciente (Read/Edit).
*   `/clinical/session/new?patientId=X` -> Iniciar nova sessão (Lógica de segurança: cria draft temporário).
*   `/clinical/session/:sessionId` -> Sessão em andamento ou revisão.

### Núcleo de Crescimento (`/growth`)
*   `/growth/dashboard` -> KPIs financeiros e de marketing.
*   `/growth/finances` -> Fluxo de caixa, recibos.
*   `/growth/crm` -> Gestão de leads (não pacientes).

### Núcleo de Pesquisa (`/research`)
*   `/research/analytics` -> Dados anonimizados agregados.
*   `/research/library` -> Biblioteca de protocolos e PDFs.

---

## 5. Diretrizes de CSS (Tailwind Config Spec)

Para atingir o visual "Office/Notion", usaremos uma paleta restrita configurada no `tailwind.config.js`.

*   **Font Family:** `Inter`, `system-ui`, sans-serif.
*   **Backgrounds:**
    *   `bg-surface-50`: Fundo geral (quase branco/cinza muito claro).
    *   `bg-surface-100`: Sidebar e Cards.
*   **Borders:**
    *   `border-border-200`: Cinza pálido para divisórias sutis.
*   **Text:**
    *   `text-ink-900`: Títulos (quase preto).
    *   `text-ink-500`: Labels e metadados.
*   **Interactive:**
    *   `hover:bg-action-100`: Hover states sutis.
    *   `active:scale-[0.98]`: Feedback tátil visual.

---
**Fim da Especificação. Aguardando aprovação para início da codificação dos componentes Shell.**
