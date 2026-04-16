# Plano de Execução Operacional — Vórtex Studio v3.2

**Protocolo:** PEA (Prioridade por Esforço e Impacto)
**Data:** 16/04/2026
**Status:** Em execução — pendente Módulo 1.1

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

**Microetapa 1.1.a — Identificar o ponto de montagem atual**
Mapear em `vortex.js` onde exatamente o componente gerado é injetado no DOM. Determinar: é dentro de um iframe? É direto na árvore React? Documentar a resposta antes de escrever qualquer código.

**Microetapa 1.1.b — Implementar o mecanismo de contenção adequado**
Dependendo do resultado de 1.1.a, aplicar uma das duas estratégias. Estratégia A (ErrorBoundary) para Host React, ou Estratégia B (Wrapper em PostMessage/Injeção) para iFrames.

**Microetapa 1.1.c — Implementar o FallbackPanel**
O painel de fallback deve mostrar: que houve um erro, a mensagem do erro, e um botão de "tentar novamente" que dispara um novo prompt para reparo.

**Meta:** Nenhuma falha de componente gerado pela IA pode travar a IDE inteira. A sessão de trabalho é inviolável.

---

### Módulo 1.2 — Naked Protocol no System Prompt

**Problema:** O LLM gasta tokens em boilerplate (imports, exports, interfaces TypeScript) que não são necessários no sandbox de preview.

**Microetapa 1.2.a — Alterar o system prompt em `vortex.js`**
Forçar o recebimento puramente Naked eliminando imports/exports, com escopo global pré-condicionado.

**Microetapa 1.2.b — Validar o impacto no consumo de tokens**
Após ativar o modo naked, documentar e comparar a redução nos metadados.

**Microetapa 1.2.c — Ajustar o Preview Shell para expor as dependências no escopo global**
Amarrar o `window.React` e bibliotecas externas dentro do ambiente que roda os componentes.

**Meta:** Redução mensurável de latência e custo por requisição. A IA gera apenas o que importa.

---

### Módulo 1.3 — Continue Motor com Validação Dupla

**Problema:** Quando o Gemini trunca a resposta, o código chega incompleto e quebra o parser.

**Microetapa 1.3.a — Implementar a flag `isTruncated`**
Ao finalizar o recebimento do stream SSE, verificar ambas `isCodeComplete` via tag de encerramento (`</fim>`) E validação sintática.

**Microetapa 1.3.b — Implementar `isSyntacticallyComplete`**
Uma verificação mínima de balanceamento de tags {} e () sem depender de AST completo.

**Microetapa 1.3.c — Implementar o Continue Motor**
Se `isTruncated === true`, realizar fatiamento dos últimos 200 arrays (anchoring text) e empurrar recursivamente sem a interface ser travada pelo usuário.

**Microetapa 1.3.d — Definir limite de tentativas**
Evitar Loops infitos da base `isTruncated`, atrelando uma variável contadora `MAX_CONTINUATIONS = 3`.

**Meta:** Zero intervenção manual do usuário em falhas de geração.

---

## 🟡 Fase II — Soberania Sintática (Média Prioridade)

**Objetivo:** Substituir a extração frágil por regex por parsing real via AST, eliminando falhas silenciosas de extração de código.

---

### Módulo 2.1 — Decisão de Biblioteca (Babel via AST)

**Microetapa 2.1.a — Reaproveitar Base Pre-Existente**
Como o Babel Standalone é supostamente invocado no projeto para Live Preview, ele será a dependência raiz extraindo a lógica via `@babel/parser`.

**Microetapa 2.1.b — Instalar dependencia caso não englobada em módulos locais.**

---

### Módulo 2.2 — Substituição do RegEx por AST em `hydration-map.js` e Trans-Mapper (Hydrate NextJS)

**Microetapa 2.2.a — Mapear regex atuais**
Listar cada regex em `hydration-map.js` que faz extração de blocos de código atualmente.

**Microetapa 2.2.b — Implementar o extrator via AST**
Uso recursivo do Grafo (AST Program Body) para separar as instâncias com Node Type de Arrays e Functions.

**Microetapa 2.2.c — Implementar tratamento de falhas**
Se o AST parser falhar, injetar mensagem pro usuário no FallbackPanel.

**Microetapa 2.2.d — Trans-Mapper Base (Fronteira Oculta)**
Com o AST recuperando a raiz base limpe, injetar (hidratar) as variáveis de Produção necessárias para a portabilidade ao mundo real (Imports/Exports) com Next.js na gravação do VFS.

**Meta:** Extração de código determinística. Falhas explícitas e interceptáveis. Componentes Prontos para uso.

---

## 🟢 Fase III — Infraestrutura de Escala (Baixa Prioridade / Condicional)

**Objetivo:** Preparar a arquitetura para múltiplos usuários via Rate/Limit.

### Módulo 3.1 — Singleton Queue para Rate Limit
*Gatilho:* Erros 429 persistentes e multiplos acessos.

---

## Sequência de Execução

```
1.1.a → 1.1.b → 1.1.c
         ↓
1.2.a → 1.2.b → 1.2.c
         ↓
1.3.a → 1.3.b → 1.3.c → 1.3.d
         ↓
2.1.a → 2.1.b
         ↓
2.2.a → 2.2.b → 2.2.c → 2.2.d (Trans-Mapper Inclusivo)
         ↓
3.1.a → 3.1.b  (somente se gatilho ativado)
```
