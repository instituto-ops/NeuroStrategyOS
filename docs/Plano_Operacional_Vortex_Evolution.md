# 🌀 Plano de Execução Operacional: Vórtex Studio (Evolução v3.2)

O **Manifesto da Arquitetura Generativa** (documento *Análise Profunda do Vórtex Studio.md*) descreveu um estado da arte em resiliência. Porém, sob a ótica de **Engenharia de Produto e Retorno sobre Esforço (ROI)**, a prioridade foi refinada.

Este plano consolida o roteiro de execução (Protocolo PEA) focado puramente em gerar valor imediato, redução de custos (tokens) e mitigação da "Tela Branca da Morte" sem over-engineering precoce.

---

## 🔴 Fase I: Ação Imediata (Alta Prioridade / Alto ROI)
**Objetivo:** Impactar imediatamente o consumo de tokens e a resiliência orgânica contra "cortes de resposta" da nuvem, além de proteger a UI de travamentos irreversíveis.

*   **Microetapa 1.1: ErrorBoundary no Preview Sandbox**
    *   **Ação:** Encapsular o iFrame injetor do Preview Shell em um Fallback Seguro de React/Vanilla. Prevenir que loops ou componentes mal gerados pela IA congelem a IDE inteira.
    *   **Meta:** Estabilidade absoluta da sessão de trabalho.
*   **Microetapa 1.2: Institucionalizar o *Naked Protocol***
    *   **Ação:** Alteração cirúrgica no `System Prompt` do Orquestrador (`vortex.js`). Forçar a recusa de *boilerplate* (import/export, Interfaces). A IA gerará puramente JSX/Lógica interna com suposição de Window-based injection.
    *   **Meta:** Corte massivo de latência e custo por requisição.
*   **Microetapa 1.3: *Continue Motor* Baseado em Flag (`isTruncated`)**
    *   **Ação:** Acoplar no final da recepção SSE a verificação: recebemos o `</fim>` semântico? Se falso, o frontend ou backend faz o fatiamento (*Anchoring* dos 200 caracteres finais) e faz auto-re-prompt: "continue exatamente o código interrompido a partir deste techo...". 
    *   **Meta:** Nenhuma interação manual do usuário perante falhas do Gemini. Apenas fluidez ininterrupta.

---

## 🟡 Fase II: O Equilíbrio Orgânico (Média Prioridade)
**Objetivo:** Elevar o nível da segurança léxica sem corromper a velocidade de entrega atual, mitigando os "hacks" de regex em uso no parser.

*   **Microetapa 2.1: Injeção do Parser Léxico (AST Parser)**
    *   **Ação:** Assim que o motor básico estiver blindado ao truncamento, aboliremos o RegEx de `hydration-map.js`. Utilizaremos a biblioteca *acorn.js* ou o *Babel Interno* para extrair perfeitamente as funções React e gerar grafos dirigidos em vez de strings fatiadas.
    *   **Meta:** Soberania sintática garantida e injeção do VFS perfeita.

---

## 🟢 Fase III: Infraestrutura Lateral (Baixa Prioridade)
**Objetivo:** Lidar com cenários de multi-threading (escalabilidade de múltiplos usuários na mesma instância) ou arquiteturas remotas independentes.

*   **Microetapa 3.1: *Singleton Queue* Rate/Limit Defesa**
    *   **Ação:** Se (e somente se) houver transição de "single-instance tool" para plataforma escalável, recriar a arquitetura de requisição do `shared.js` sob uma gestão estande de *Singleton*, alinhando e enfileirando pedidos em lote para não desintegrar limites de quota da API 429.

---

**Nota Operacional:** Nós, subscritos sob o Protocolo PEA e CSA *Cognitive State Architecture*, prosseguiremos linearmente a partir da **🔴 Fase I**. 

Autor: *Antigravity — Agente de Engenharia.*
Data: *16/04/2026*
Status: **EM EXECUÇÃO - PENDENTE MÓDULO 1.1**
