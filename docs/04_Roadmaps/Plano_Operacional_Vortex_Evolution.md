# Plano de Execução Operacional — Vórtex Studio v3.2

**Protocolo:** PEA (Prioridade por Esforço e Impacto)
**Data:** 16/04/2026
**Status:** Em execução — Módulo 1.1 em progresso

---

## Princípios do Plano

- Cada microetapa deve ser implementável e testável de forma isolada.
- Nenhuma microetapa depende da seguinte para funcionar — falhas ficam contidas.
- A ordem dentro de cada fase é obrigatória: cada etapa prepara o terreno da próxima.

---

## 🔴 Fase I — Ação Imediata (Alto ROI, Baixo Custo de Implementação)

**Objetivo:** Estabilizar a sessão de trabalho, reduzir custo de tokens e garantir continuidade de geração sem intervenção manual do usuário.

---

### Módulo 1.1 — Isolamento do Preview contra Travamento

**Problema:** Componentes mal gerados pela IA podem travar ou corromper a interface inteira.

**Clarificação arquitetural importante:** O `<ErrorBoundary>` do React **não atravessa a fronteira de um `<iframe>`**. O isolamento correto depende de onde o componente é montado:

- Se o componente é renderizado **dentro de um `<iframe>`**: o crash já é isolado pelo browser. O que precisa ser protegido é o código do lado de **fora** que faz a injeção — envolva esse orquestrador em um `try/catch` com fallback visual.
- Se o componente é renderizado **na árvore React principal** (sem iframe): use `<ErrorBoundary>` diretamente.

- [x] **Microetapa 1.1.a — Identificar o ponto de montagem atual**
  - **Status:** CONCLUÍDO. O preview é renderizado dentro de um `<iframe>` com ID `vortex-preview-frame`.
  - **Ação:** Mapear em `vortex-studio.js` a lógica de injeção.

- [x] **Microetapa 1.1.b — Implementar o mecanismo de contenção adequado**
  - Aplicar Estratégia B (Wrapper em PostMessage/Injeção) para iFrames.

- [x] **Microetapa 1.1.c — Implementar o FallbackPanel**
  - Interface amigável para sinalizar falhas de renderização sem quebrar a IDE.

**Meta:** Nenhuma falha de componente gerado pela IA pode travar a IDE inteira. A sessão de trabalho é inviolável.

---

### Módulo 1.2 — Naked Protocol no System Prompt

**Problema:** O LLM gasta tokens em boilerplate (imports, exports, interfaces TypeScript) que não são necessários no sandbox de preview.

- [x] **Microetapa 1.2.a — Alterar o system prompt em `vortex.js`**
- [x] **Microetapa 1.2.b — Validar o impacto no consumo de tokens**
- [x] **Microetapa 1.2.c — Ajustar o Preview Shell para expor as dependências no escopo global**

**Meta:** Redução mensurável de latência e custo por requisição.

---

### Módulo 1.3 — Continue Motor com Validação Dupla

**Problema:** Quando o Gemini trunca a resposta, o código chega incompleto e quebra o parser.

- [x] **Microetapa 1.3.a — Implementar a flag `isTruncated`**
  - **Status:** CONCLUÍDO. Backend sinaliza truncamento via SSE.
- [x] **Microetapa 1.3.b — Implementar `isSyntacticallyComplete`**
  - **Status:** CONCLUÍDO. Implementado validador robusto base-stack em `vortex-studio.js`.
- [x] **Microetapa 1.3.c — Implementar o Continue Motor**
  - **Status:** CONCLUÍDO. Emenda automática de fragmentos de código via buffer `preContinuationCode`.
- [x] **Microetapa 1.3.d — Definir limite de tentativas**
  - **Status:** CONCLUÍDO. Implementado `MAX_CONTINUATIONS = 3` com recuperação automática silenciosa.

**Meta:** Zero intervenção manual do usuário em falhas de geração. CONCLUÍDO.

---

## ⚠️ Alertas Críticos de Execução

- **Dualidade do Babel (Fase II):** O sistema utiliza Babel em dois contextos distintos. No **Frontend (Preview Shell)** para transpilação e execução, e no **Backend (Trans-Mapper)** para extração e hidratação. Deve-se garantir paridade absoluta de versões e plugins suportados.
- **Sonda Sintática (1.3.b):** A validação de truncamento deve ser resiliente a falsos positivos (como chaves dentro de `console.log("{")`). O parser é o único juiz confiável.
- **Ponto de Falha Único (2.2.d):** O Trans-Mapper é o gargalo de qualidade. Erros de injeção de imports aqui inviabilizam o código de produção. Testes unitários de hidratação são mandatórios nesta etapa.

---

## 🔴 Fase II — Soberania Sintática (AST Migration)

**Objetivo:** Substituir a extração frágil por regex por parsing real via AST, eliminando falhas silenciosas de extração de código e garantindo que o "Naked Protocol" entregue código de produção 100% válido.

---

- [x] **Módulo 2.1 — Infraestrutura AST (Babel Standalone)**
  - [x] **Microetapa 2.1.a — Carga Dinâmica do Babel na IDE Shell**
    - Implementar em `vortex-studio.js` o carregamento de `babel.min.js` no host (IDE).
  - [x] **Microetapa 2.1.b — Bridge de Análise em `hydration-map.js`**
    - Criar wrapper `analyzeCodeWithAST(code)` que utiliza `Babel.packages.parser`.

- [x] **Módulo 2.2 — Bridge de Análise Estrutural**
  - [x] Substituir RegEx por `Babel.traverse` para extração de ícones Lucide.
  - [x] Refatorar detecção de `mainComponentName` para exportação automática.

- [x] **Módulo 2.3 — Validação de Soberania Sintática**
  - [x] Implementar `isSyntacticallyComplete` usando parser Babel (mais preciso que stack manual).
  - [x] Testar hidratação com componentes complexos.
  - [x] Garantir que o fallback para RegEx funcione caso o unpkg esteja offline.

**Meta:** Extração de código determinística. Fidelidade absoluta entre Preview e Produção.

---

## 🟢 Fase III — Infraestrutura de Escala (Escalabilidade e Resiliência)

- [x] **Módulo 3.1 — Singleton Queue para Rate Limit**
  - [x] Implementar Fila Singleton real em `shared.js` com suporte a Streams Sequenciais.
  - [x] Adicionar Retroalimentação (Backoff Exponencial) para erros 429/Exaustão.
  - [x] Garantir que apenas uma requisição de IA ocorra por vez (Governança de Concorrência).

---

## Sequência de Execução Checklist

```
[x] 1.1.a → [x] 1.1.b → [x] 1.1.c
              ↓
[x] 1.2.a → [x] 1.2.b → [x] 1.2.c
              ↓
[x] 1.3.a → [x] 1.3.b → [x] 1.3.c → [x] 1.3.d
              ↓
[x] 2.1.a → [x] 2.1.b
              ↓
[x] 2.2.a → [x] 2.2.b → [x] 2.2.c → [x] 2.2.d
              ↓
[x] 2.3.a → [x] 2.3.b → [x] 2.3.c
              ↓
[x] 3.1.a → [x] 3.1.b → [x] 3.1.c
```
