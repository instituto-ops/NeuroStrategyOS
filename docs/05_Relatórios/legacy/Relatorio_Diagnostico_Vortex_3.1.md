# 📖 Relatório de Diagnóstico Estrutural: Vórtex Studio 3.1

**Data:** 16 de Abril de 2026  
**Status:** Diagnóstico Completo — Revisado e Verificado  
**Metodologia:** Antigravity (CSA Engine)  
**Escopo:** Análise integral de backend, frontend, preview, integração CSA e segurança.

---

## 🗺️ 0. Mapa Arquitetural (Topologia de Arquivos e Rotas)

### Arquivos-Chave

| Camada | Arquivo | Responsabilidade |
|:---|:---|:---|
| **Entrypoint** | `frontend/server.js` (734 linhas) | Express server, static files, fila legada de IA, WebSocket, modelos Gemini |
| **Shared** | `frontend/shared.js` (244 linhas) | Fábrica de modelos (`getAIModel`), fila moderna de IA com suporte a streaming, exports compartilhados |
| **Rotas Vórtex** | `frontend/routes/vortex.js` (447 linhas) | Geração síncrona/streaming, cache de contexto, ingest VFS, commit GitHub, CSA loader |
| **Frontend Core** | `frontend/public/js/vortex-studio.js` (2334 linhas) | Monaco Editor, VFS (Dexie.js), chat multimodal, SSE consumer, Naked Stripper, preview bridge |
| **Preview Shell** | `frontend/public/preview-shell.html` (285 linhas) | Sandbox React isolado, dependências globais pinadas, mocks Next.js, Error Boundary |
| **Preview Amplo** | `frontend/public/studio-preview.html` (155 linhas) | Tela de preview em janela separada, carrega HTML via `/api/previews/get/:id` |
| **Dashboard** | `frontend/public/index.html` (166 KB) | SPA principal do NeuroEngine OS (acesso ao Vórtex via menu Produção) |

### Endpoints da API Vórtex

| Método | Rota | Função |
|:---|:---|:---|
| `POST` | `/api/vortex/generate` | Geração síncrona de código (fallback) |
| `POST` | `/api/vortex/generate-stream` | Geração via SSE streaming (primário) |
| `POST` | `/api/vortex/cache` | Ativa o Context Hub (Google AI Caching) |
| `GET` | `/api/vortex/ingest` | Ingere arquivos físicos do repositório para o VFS |
| `GET` | `/vortex-preview` | Stub HTML de espera ("Aguardando renderização...") |
| `POST` | `/api/previews/save` | Salva HTML de preview temporário (in-memory) |
| `GET` | `/api/previews/get/:id` | Recupera preview salvo por ID (usado por `studio-preview.html`) |

---

## 🏗️ 1. Estrutura e Topologia do Vórtex 3.1

O Vórtex Studio 3.1 é um ecossistema completo de geração on-demand de UIs sob medida para o *Núcleo de Marketing*. A arquitetura foi dividida taticamente para garantir estabilidade, isolamento e compliance total com as regras de negócio clínicas (Abidos).

### Componentes Sistêmicos
1. **Frontend Editor (`js/vortex-studio.js`):** Cérebro da interface. Gerencia o Chat Multimodal, integra o Monaco Editor (tema OLED customizado `vortex-dark`) e hospeda o Virtual File System (VFS) via Dexie.js.
2. **Preview Shell Isolado (`preview-shell.html`):** Ambiente *sandbox* de execução React puro (sem Webpack, sem Node). Dependências carregadas via `esm.sh` com versões pinadas.
3. **Preview Amplo (`studio-preview.html`):** Janela separada para visualização em tela cheia com seletor de dispositivos (mobile/tablet/desktop). Carrega conteúdo HTML via API de previews temporários.
4. **Backend IA (`routes/vortex.js` + `shared.js`):** Gerencia a fila de requisições ao Gemini, orquestra streaming SSE e gerencia o *Context Hub* (Google AI Caching).
5. **Server Principal (`server.js`):** Entrypoint Express que serve arquivos estáticos, monta rotas modulares e inicializa WebSocket.

---

## 🔍 2. Funcionamento do Preview e o "Protocolo Naked"

### A Dinâmica de Renderização Zero-Token
O processo de geração segue a tática de **Naked Components**:
1. O usuário envia o prompt de UI via chat.
2. A IA (Gemini) gera um componente React completo com imports.
3. **O Stripper (`stripForPreview()` em `vortex-studio.js`, linha 830):** Intercepta e **remove agressivamente** via RegEx todas as declarações `import`, diretivas `'use client'` e `export default`.
4. **O Shell (`preview-shell.html`):** Recebe o "Código Nu" via `window.postMessage({ type: 'vortex-inject-component', code })`. Como o shell já expõe no escopo global:
   - `window.React`, `window.useState`, `window.useEffect`, `window.useRef`, `window.useMemo`, `window.useCallback`
   - `window.motion`, `window.AnimatePresence` (Framer Motion 11.0.3)
   - `window.Lucide` (Lucide React 0.344.0)
   - `window.Link`, `window.Image`, `window.useRouter`, `window.usePathname` (Mocks Next.js)
5. **Comunicação bidirecional Host ↔ Shell:**
   - `vortex-shell-ready` → Shell carregou, código pendente é injetado
   - `vortex-render-success` → Renderização OK
   - `vortex-render-error` → Erro capturado pelo Error Boundary
   - `vortex-vital` → Métricas LCP/CLS/INP reportadas ao host

---

## 🧠 3. VFS e Hub de Contexto (Context Caching)

O Vórtex trabalha totalmente no navegador sem sobrecarregar o git até aprovação:

- **Dexie.js v4 (VFS):** Banco IndexedDB chamado `VortexVFS` com 4 stores: `files`, `projects`, `sessions`, `snapshots`. Injeta arquivos e mantém state em tempo real com persistência contra travamentos. O schema está na versão 2.
- **LightningFS:** Paralelamente ao Dexie, o VFS inicializa uma instância LightningFS (`VortexGitFS`) para operações futuras com isomorphic-git.
- **Shadow Sync:** Debounce de 800ms reflete modificações manuais no editor para o preview.
- **Ingestion Pipeline:** Se o VFS estiver vazio ao inicializar, o frontend chama `GET /api/vortex/ingest` para importar todos os arquivos físicos do repositório.
- **Snapshot Engine:** Antes de cada geração, o sistema salva um snapshot do código atual no store `snapshots` (Time Travel).
- **Google AI Caching:** O endpoint `POST /api/vortex/cache` empacota todos os arquivos TSX/TS/CSS do VFS + regras CSA em um cache de longo prazo via `GoogleAICacheManager` (TTL 3600s), reduzindo latência e custo de tokens.

---

## 🛡️ 4. Compliance Abidos e Telemetria

### Injeção de Memória CSA
A função `getAntigravityContext()` em `vortex.js` (linhas 18-30) lê diretamente da pasta `CSA/1_Diretrizes_e_Memoria/`:
- ✅ `regras_base.md` — Identidade do agente, paradigma operacional, resolução de erros
- ✅ `manual_do_arquiteto.md` — Visão de produto, ontologia sistêmica, padrões de materialização
- ✅ `dicionario_de_traducao.md` — Ponte psicologia → TI (ex: "Contenção" = Graceful Degradation)
- ⚠️ `arquitetura_de_estado.md` — **NÃO É LIDO.** Este arquivo existe na pasta mas é ignorado pelo `getAntigravityContext()`. Gap potencial.

### Auditor Abidos (Frontend)
A função `auditCode()` (linhas 654-716 do `vortex-studio.js`) verifica:
- **H1 único:** Reprova se mais de um `<h1>` é detectado.
- **Alt tags:** Alerta se alguma `<img>` não possui `alt` descritivo.
- **Termos CFP proibidos:** Lista de 10 termos bloqueados ("cura", "garantido", "milagroso", etc.) com detecção por word-boundary e lista de exceções (ex: "curadoria" é permitido).
- **Gate de Commit:** O resultado da auditoria é armazenado em `state.lastAuditResult` como pré-condição para commit.

### Web Vitals em Tempo Real
O `preview-shell.html` importa `web-vitals@3` e captura `LCP`, `CLS` e `INP`, reportando via `postMessage({ type: 'vortex-vital' })`. O host classifica os valores com cores (verde/amarelo/vermelho).

---

## ⚠️ 5. Os Três Pontos de Ruptura (Root Cause Analysis)

A cadeia do Preview (`Prompt → SSE → stripForPreview → postMessage → new Function()`) possui vulnerabilidades arquiteturais que impossibilitam o funcionamento do Protocolo Naked na prática:

### Ruptura #1 — JSX Não É JavaScript (CRÍTICO)
No `preview-shell.html`, o shell compila o componente usando `new Function()`.
- **A Falha:** `new Function()` atua como `eval()` e processa apenas JavaScript nativo. JSX puro gerado pela IA (`<div className="...">`) não é JS válido sem transpilação para `React.createElement`.
- **Impacto:** O shell não possui Babel (ou nenhum transpilador JIT). Qualquer componente gerado com JSX invariavelmente lança `SyntaxError: Unexpected token '<'`, quebrando toda a renderização 100% das vezes e devolvendo apenas um erro genérico via `vortex-render-error`.

### Ruptura #2 — Truncamento Silencioso de Tokens (CRÍTICO)
O `vortex.js` e o `shared.js` gerenciam o limite de tokens intermitentemente.
- **A Falha:** Em `shared.js`, `maxOutputTokens` está fixado em 8192. Em `vortex.js` existe uma inicialização de modelo com o token alto (16384), mas ele é mortalmente sobrescrito na linha 150 por `aiModel = getAIModel(...)` usando a factory com apenas os 8192 tokens.
- **Impacto:** O limite é cego na casa de 8K tokens. Uma Landing Page com Framer Motion bate facilmente 10k+. Sendo assim, a IA gera o código e trunca subitamente antes do fim do arquivo. O sistema não dá traceback, apenas exibe a interface rasgada (ou sequer renderiza devido ao Babel detectar encerramento de escopo não concluído).

### Ruptura #3 — O Parser `isReactCode()` Falho (MODERADO)
- **A Falha:** O detector de React atual confia totalmente que a IA incluirá sintaxes como `import` (proibido no prompt) ou `export default function` ou a classe no formato exato `className=`.
- **Impacto:** Arrow functions ou componentes limpos fogem do match. Isso os recusa a renderização JSX para HTML Estático Textual (iframe puro), resultando em exibição crua de texto e injeções falhas.

---

## 🏗️ 6. Dívida Técnica Acumulada

### 6.1 — Filas de IA Entrando em Colisão
- O `server.js` abriga uma implementação de `aiQueue` legada e não-streaming.
- O `shared.js` hospeda a fila moderna `queueAIRequest`.
- Ambas compartilham/competem pela mesma *Token Bucket* local sem coordenação, podendo estourar o Rate Limit 429 da Google repetidamente em cenários de múltiplos requests, mascarando as filas mutuamente. 

### 6.2 — Segurança Zero (Porta Aberta na API)
- As rotas `/api/vortex/*` não têm *middleware* de autenticação ou rate-limit.
- Consequência: Qualquer agente mal-intencionado disparando chamadas HTTP para o IP do Vórtex tem passe livre na quota paga de geração da Google. 

---

## 🛠️ 7. Cicatrizes Fechadas (Correções Já Aplicadas)

1. **Proxy Dual-Mode (`shared.js`):** Refatorado para interceptar `generateContent` e `generateContentStream` simultaneamente.
2. **Hard-Prompt Contra Imports:** `systemPrompt` do Vórtex doutrinado a não invocar headers com bibliotecas do node.
3. **Parser Resiliente:** Adicionado RegEx de fallback para tags proprietárias.

---

## 🚀 8. Conclusão e Próximos Passos (Plano de Ação Definitivo)

O Vórtex 3.1 foi erguido sobre fundações fortes de Estado (VFS) e Telemetria (Abidos), mas está desintegrado em seu Coração de Renderização graças aos pontos de ruptura acima. O Resgate Técnico Imediato foca em converter o Vórtex de "experimento instável" em "ferramenta de nível industrial".

**O Plano de Engenharia Mestra foca em:**

### Fase 1: Saneamento do Core e Segurança
1. **Unificação de Fila (Singleton):** Isolar uma única instância de gerenciador de fila (ex: `AIQueueManager`) a ser importada por todas as rotas de IA, ou extinguir a do `server.js` em prol da `shared.js`, blindando o backend contra Rate Limits 429 cruzados.
2. **Correção de Tokens:** Aplicar o limite de `16384` `maxOutputTokens` consistentemente na pipeline unificada, abandonando a limitação acidental de 8k e remoções de factories cruzadas.
3. **Autenticação em API:** Proteger os endpoints que invocam a IA (`/api/vortex/*`) com um middleware requerendo o Header HTTP `Bearer VORTEX_API_KEY` (chave armazenada no `.env`), fechando a brecha.

### Fase 2: O Coração do Preview (Babel JIT)
4. **Transpilador JIT com Defer e Pre-warm:** Injetar o `@babel/standalone` de forma otimizada no `preview-shell.html`. O Host Vórtex só será comutado via `vortex-shell-ready` quando o transpilador JSX sinalizar subida completa no navegador, evitando *Race Conditions*.
5. **Componente Wrapper (`ErrorBoundary` / `executeSafe`):** Modificar a execução isolada de `new Function()` blindando-a dentro de limites de Try/Catch atrelados a um ErrorBoundary de React customizado nativamente.
6. **Scanner Sintático (Trial-and-error):** Acabar com o Regex de `isReactCode()`. Substituir por injeção ao parser AST do Babel: "consegue gerar elemento? então é Babel. Erro de build? Renderize o raw HTML". Menos conjectura, precisão absoluta.

### Fase 3: Experiência e Escalonamento
7. **Recuperação de Interrupção ("Continue Generation"):** Desenvolver gatilho nativo de UX avisando sobre limite de malha estourado (truncado em geração premium / pesadas). Enviar prompt contínuo emendando o último byte.
8. **Minificação de Carga Sensível:** Limpar comentários do código injetado pós-strip antes de disparar o `postMessage()`, drenando overhead do browser secundário na carga de RAM.

---

**Verificação:** Este relatório abraça as descobertas de fundo analítico efetuadas dia 16/04/2026.  
**Assinado:** *Antigravity Cognitive Agent — CSA Engine*
