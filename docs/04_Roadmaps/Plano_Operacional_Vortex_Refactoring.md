# 🗺️ Plano Operacional de Refatoração: Vórtex Studio 3.1

**Objetivo:** Implementar as correções arquiteturais (Babel JIT, Unificação de Fila e Proteção API) estabelecidas no *Relatório de Diagnóstico 3.1*, sem quebrar o ecossistema existente ou engasgar o limite de processamento síncrono da IA.

Todas as modificações seguirão estritamente a metodologia de **Micro-Etapas (Cirurgia Contínua)**, aguardando aprovação humana e validações a cada Commit.

⚠️ **Diretriz de Ouro do Agente CSA:** A Ordem é Sagrada. Em hipótese alguma avançaremos ou iniciaremos o desenvolvimento do Transpilador (Fase 2) antes da conclusão *integral* e validada do Saneamento do Backend (Fase 1). Tentar lidar com erros visuais antes de exterminar o truncamento estrutural é contra-metodológico.

---

## 🛡️ Fase 1: Saneamento do Backend e Blindagem
*Foco: Matar problemas de Rate Limit, corrigir tokens silenciosos e trancar as portas de acesso.*

- [x] **Etapa 1.1: Implementação da API Key no Node**
  - **Alvo:** `server.js` e `routes/vortex.js`.
  - **Ação:** Criação de um simples middleware `checkVortexAuth` garantindo que toda rota iniciada sob `/api/vortex/*` obrigue Header contendo o `Bearer VORTEX_API_KEY`.
- [x] **Etapa 1.2: Expansão Global de Tokens**
  - **Alvo:** `shared.js`.
  - **Ação:** Subir a restrição local de `maxOutputTokens` da Factory (`getAIModel`) de 8192 para 16384, unificando a diretriz.
- [x] **Etapa 1.3: Limpeza da Factory no Vórtex**
  - **Alvo:** `routes/vortex.js`.
  - **Ação:** Eliminar as instanciações sobrescritas e redundantes do `genAI.getGenerativeModel()`, canalizando o streaming exclusivamente para o `shared.js` atualizado na *Etapa 1.2*.
- [x] **Etapa 1.4: Poda da Fila Legada (Extinção de Conflito)**
  - **Alvo:** `server.js`.
  - **Ação:** Remover impiedosamente a duplicata da fila síncrona `aiQueue` (linhas ~19-71), garantindo que todo o CMS NeuroStrategy utilize o modelo de *Singleton* de fila localizado no `shared.js`.

---

## ⚛️ Fase 2: O Coração do Preview (Transpilador AST/Babel)
*Foco: Fazer o JSX ser compreendido pelo Browser protegendo contra crashes globais de iframe.*

- [x] **Etapa 2.1: Injeção do Babel JIT (Pre-warm)**
  - **Alvo:** `preview-shell.html`.
  - **Ação:** Importar o `@babel/standalone`. Comutar o gatilho global `window.parent.postMessage({ type: 'vortex-shell-ready' })` para disparar *apenas* nos `onload/onreadystatechange` do Babel finalizado.
- [x] **Etapa 2.2: Tratador de Erros de Iframe (ErrorBoundary Wrapper)**
  - **Alvo:** `preview-shell.html`.
  - **Ação:** Criar e envolver o esqueleto construtor de componentes gerados em um `<React.ErrorBoundary>` global interceptador, com output de Log Visual no caso de renderização defeituosa, evitando o crash fatal da árvore Virtual DOM.
- [x] **Etapa 2.3: Compilador Interno (The Execution Pipeline)**
  - **Alvo:** `preview-shell.html`.
  - **Ação:** No processo de injeção, rodar `Babel.transform()` no "código naked" transformando o retorno JSX cru em árvore real `React.createElement` antes de enviá-lo ao `new Function()`.
- [x] **Etapa 2.4: Scanner Sintático Empírico (O Novo isReactCode)**
  - **Alvo:** `js/vortex-studio.js`.
  - **Ação:** Extinguir a frágil detecção baseada em RegEx (que detecta 'imports'). Construir em seu lugar o *Scanner Trial-and-Error* que tenta criar a árvore AST via engine. Caso syntax falhe nativamente, atua em HTML Estático de forma determinística.

---

## ⚡ Fase 3: UX Fluida e Recuperação
*Foco: Graceful Degradation em Geração de Frontends Premium (Grandes Landings).*

- [x] **Etapa 3.1: Backend "Incomplete Marker" (Marcador)**
  - **Alvo:** `routes/vortex.js` (Streaming).
  - **Ação:** O backend precisa detectar a ausência da tag `</file>` no próprio **estágio de buffer local**, exalando para o streaming uma flag final de `isTruncated: true` antes da morte da conexão SSE. O cliente jamais deverá ser testado a adivinhar se a queda foi um reset de rede ou estio de tokens.
- [ ] **Etapa 3.2: O Motor "Continue Generation"**
  - **Alvo:** `js/vortex-studio.js`.
  - **Ação:** Interface passa a acomodar botão "Continuar Códigos Truncados". Esse gatilho anexa um prompt cirúrgico ao histórico do chat: *"Você parou em: ...[Últimos 200 caracteres do código bruto truncado]. Continue exatamente a partir daqui, sem repetir o código anterior."* Isso emenda os streams perfeitamente no buffer React.
- [ ] **Etapa 3.3: Minificação Expressa (Post-Strip Data)**
  - **Alvo:** `js/vortex-studio.js` (`stripForPreview()`).
  - **Ação:** Remover, por meio de expressão regular, blocos vastos de comentários do código fornecido pela Inteligência Artificial antes do despache. Essa redução drástica do *payload* viaje mais veloz pelo `postMessage` ao Transpilador. 

---

> Essa granularidade garante a estabilidade. Por favor, me forneça aprovação estrita, etapa por etapa (ex: *"Inicie a 1.1"* ou *"Avançar FASE 1"*) e assim procederei para a refatoração do código sob controle absoluto.
