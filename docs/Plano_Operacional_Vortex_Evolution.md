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

- [ ] **Microetapa 1.1.b — Implementar o mecanismo de contenção adequado**
  - Aplicar Estratégia B (Wrapper em PostMessage/Injeção) para iFrames.

- [ ] **Microetapa 1.1.c — Implementar o FallbackPanel**
  - Interface amigável para sinalizar falhas de renderização sem quebrar a IDE.

**Meta:** Nenhuma falha de componente gerado pela IA pode travar a IDE inteira. A sessão de trabalho é inviolável.

---

### Módulo 1.2 — Naked Protocol no System Prompt

**Problema:** O LLM gasta tokens em boilerplate (imports, exports, interfaces TypeScript) que não são necessários no sandbox de preview.

- [ ] **Microetapa 1.2.a — Alterar o system prompt em `vortex.js`**
- [ ] **Microetapa 1.2.b — Validar o impacto no consumo de tokens**
- [ ] **Microetapa 1.2.c — Ajustar o Preview Shell para expor as dependências no escopo global**

**Meta:** Redução mensurável de latência e custo por requisição.

---

### Módulo 1.3 — Continue Motor com Validação Dupla

**Problema:** Quando o Gemini trunca a resposta, o código chega incompleto e quebra o parser.

- [ ] **Microetapa 1.3.a — Implementar a flag `isTruncated`**
- [ ] **Microetapa 1.3.b — Implementar `isSyntacticallyComplete`**
- [ ] **Microetapa 1.3.c — Implementar o Continue Motor**
- [ ] **Microetapa 1.3.d — Definir limite de tentativas**

**Meta:** Zero intervenção manual do usuário em falhas de geração.

---

## 🟡 Fase II — Soberania Sintática (Média Prioridade)

**Objetivo:** Substituir a extração frágil por regex por parsing real via AST, eliminando falhas silenciosas de extração de código.

---

### Módulo 2.1 — Decisão de Biblioteca (Babel via AST)

- [ ] **Microetapa 2.1.a — Reaproveitar Base Pre-Existente**
- [ ] **Microetapa 2.1.b — Instalar dependencia caso não englobada em módulos locais.**

---

### Módulo 2.2 — Substituição do RegEx por AST em `hydration-map.js` e Trans-Mapper (Hydrate NextJS)

- [ ] **Microetapa 2.2.a — Mapear regex atuais**
- [ ] **Microetapa 2.2.b — Implementar o extrator via AST**
- [ ] **Microetapa 2.2.c — Implementar tratamento de falhas**
- [ ] **Microetapa 2.2.d — Trans-Mapper Base (Fronteira Oculta/Hydration)**

**Meta:** Extração de código determinística. Componentes prontos para uso em produção.

---

## 🟢 Fase III — Infraestrutura de Escala (Baixa Prioridade / Condicional)

- [ ] **Módulo 3.1 — Singleton Queue para Rate Limit**
  - Acionar somente se gatilho de erros 429 ou multi-usuário for detectado.

---

## Sequência de Execução Checklist

```
[x] 1.1.a → [ ] 1.1.b → [ ] 1.1.c
              ↓
[ ] 1.2.a → [ ] 1.2.b → [ ] 1.2.c
              ↓
[ ] 1.3.a → [ ] 1.3.b → [ ] 1.3.c → [ ] 1.3.d
              ↓
[ ] 2.1.a → [ ] 2.1.b
              ↓
[ ] 2.2.a → [ ] 2.2.b → [ ] 2.2.c → [ ] 2.2.d
              ↓
[ ] 3.1.a → [ ] 3.1.b
```
