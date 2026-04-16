# 🔍 Diagnóstico de Engenharia: Bloqueio do Preview Vórtex

**Status:** Crítico (Interrupção de Fluxo)
**Data:** 16/04/2026
**Arquiteto:** Antigravity (CSA Agent)

---

## 1. Descrição do Problema (Hipotése do Usuário)
O sistema interrompe a criação do preview após gerar o código Next.js porque tenta "converter" ou "criar" uma versão HTML paralela, o que excede o limite de tokens da API Gemini e causa o aborto da operação.

## 2. Análise Técnica do Diagnóstico

### A. Anatomia do Output (Onde os Tokens Vazão)
Pela análise do arquivo `frontend/routes/vortex.js`, o sistema utiliza as seguintes diretrizes:
- **Constraint Negativa:** Instruções explícitas (`NUNCA gere bloco <preview>`) estão presentes no System Prompt (Linhas 163 e 286).
- **Paradoxo do Parser:** O front-end (`vortex-studio.js`, linha 1248) ainda possui lógica ativa para capturar blocos `<preview>`. Isso cria uma *vulnerabilidade semântica*: se o LLM alucinar ou o prompt do usuário for complexo, ele pode ignorar a instrução negativa e gerar o HTML, dobrando o consumo de tokens.

### B. O Conflito Next.js vs. Preview Browser
- O Vórtex gera código **Next.js (JSX/TSX)**. O navegador não entende esse código nativamente.
- **Estratégia Atual:** O `buildReactSandbox` (Client-side) tenta transpilar o código usando Babel Standalone e ESM Maps.
- **Gargalho Identificado:** Se o código gerado for muito complexo (múltiplos arquivos ou imports complexos), o Sandbox local falha ou "congela", dando a impressão de que o sistema abortou.

### C. A "Segunda Chamada" Oculta (Audit Semantic)
- Identificamos uma chamada redundante em `auditSemantic` (`vortex-studio.js`, linha 781).
- **Impacto:** Após gerar o código, o sistema envia o código INTEIRO de volta para o Gemini para uma auditoria de compliance do CFP. Isso não apenas consome o dobro de tokens, mas cria uma latência que frequentemente resulta em timeout no preview.

## 3. Conclusão do Diagnóstico

O sistema não aborta por "tentar criar um HTML" deliberadamente, mas sim por:
1. **Hallucination Payload:** O LLM às vezes gera o HTML por inércia, estourando a janela de contexto.
2. **Double-Dipping de Tokens:** A auditoria semântica pós-geração consome tokens desnecessários em uma segunda requisição síncrona.
3. **MIME Type Error (CDN):** O erro do Lucide (identificado anteriormente) faz com que o `srcdoc` falhe silenciosamente no console, impedindo a renderização final mesmo que o código esteja correto.

## 4. Próxima Etapa Lógica (Proposta)

**Implementar a "Zero-Token Preview Strategy":**
1. **Expurgar o Parser:** Remover totalmente a busca por `<preview>` no front-end, eliminando qualquer "tentação" para o LLM.
2. **Auditoria Inline:** Mover a auditoria para dentro do prompt principal (Single Pass) em vez de uma chamada separada.
3. **Virtual Sandbox:** O timming de atualização do preview deve ser desacoplado da finalização do chat (Progressive Preview).

---
> [!IMPORTANT]
> O diagnóstico confirma que a carga cognitiva do sistema está sobrecarregada por redundâncias de validação e CDN mal configurado, simulando uma falha de "excesso de tokens" que, na verdade, é uma falha de orquestração.
