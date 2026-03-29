# 🚀 Plano de Execução: Projeto Vórtex (Next.js AI IDE)

Este plano define as etapas para a implementação do **Vórtex**, o segundo estúdio de criação do **NeuroEngine OS**, focado em engenharia de interface e produção de páginas nativas de alta performance via **Gemini 2.5 Pro**.

---

## 🏗️ Fase 1: Fundação (Infraestrutura Local-First)
*Core: Estabelecer a mesa de trabalho no navegador.*

*   **1.1. Virtual File System (VFS):** Configurar o **Dexie.js** (IndexedDB) para gerenciar o armazenamento persistente de arquivos no browser.
*   **1.2. Git-in-Browser:** Integrar `isomorphic-git` e `lightning-fs` para permitir operações de `clone`, `status` e `diff` sem servidor.
*   **1.3. Auth Proxy (Vercel Edge):** Criar a rota de API segura no backend para intermediar os tokens do GitHub (PAT), garantindo segurança total (Zero-Credential Exposure no cliente).
*   **1.4. Pipeline de Ingestão:** Implementar a lógica para "ler" o repositório físico e transpor para o VFS na inicialização.

---

## 🧠 Fase 2: Núcleo Cognitivo (Orquestração Gemini 2.5)
*Core: Ensinar a IA a "ver" o projeto inteiro.*

*   **2.1. Context Caching Hub:** Implementar o **Context Caching** da API do Google para armazenar a árvore de componentes e o Design System (economizando até 90% em tokens).
*   **2.2. Multi-Level Orchestrator:**
    *   **Pro (Brain):** Concepção de rotas dinâmicas e arquitetura de Silos.
    *   **Flash (Vibe):** Iterações visuais rápidas e ajustes de Tailwind CSS.
*   **2.3. Multimodal Design-to-Code:** Criar o módulo de processamento visual para converter prints/screenshots em componentes Next.js funcionais.

---

## 🎨 Fase 3: A Estação de Trabalho (IDE & Preview)
*Core: Criar a experiência de "Vibe Coding" (3 colunas).*

*   **3.1. Monaco Shell:** Integrar o editor do VS Code (Monaco) com suporte a Syntax Highlighting para `.tsx` e `.json`.
*   **3.2. Sandbox Preview (WebContainers):** Implementar o ambiente de execução in-browser para renderização instantânea do código gerado (Zero-Wait Preview).
*   **3.3. Painel de Controle Abidos:** Toggles laterais para ativar regras (H1 Limit, Prova Social, WhatsApp Button) que mudam o prompt de sistema em tempo real.

---

## 🛡️ Fase 4: O Guardião do Método (Auditoria & Compliance)
*Core: Garantir que a IA nunca quebre as regras do Dr. Victor Lawrence.*

*   **4.1. AST Validator (WebWorkers):** Implementar análise estática de código para:
    *   Impedir múltiplos `<h1>`.
    *   Exigir `alt` tags orientadas a SEO Local.
    *   Bloquear o uso de termos proibidos pelo CFP (Cura, Garantido).
*   **4.2. Telemetria Web Vitals:** Integrar monitoramento de LCP, CLS e INP diretamente no preview para garantir nota 100/100 no Lighthouse.
*   **4.3. Loop de Correção Automática:** Se a auditoria falhar, o Vórtex envia o erro de volta ao Gemini Flash para auto-reparo antes de mostrar ao usuário.

---

## 🚀 Fase 5: Sincronização e Lançamento (Deploy & Sync)
*Core: Da "Vibe" para a Produção na Vercel.*

*   **5.1. Global Silo Linker:** Lógica automatizada para editar páginas "Hub" existentes no VFS sempre que um novo "Spoke" for criado (Teia Semântica).
*   **5.2. Git Commit & Push:** Interface de aprovação final que faz o commit, assina com a autoria correta e faz o push para o GitHub.
*   **5.3. Vercel Watchtower:** Tela de acompanhamento do Build na Vercel dentro do Painel Vórtex.
*   **5.4. Master Index Update:** Integração final do Vórtex no menu "Produção" do NeuroEngine OS.

---

## 🏁 Critérios de Sucesso
1.  **Latência de Geração:** Alterações visuais via chat em menos de 5 segundos.
2.  **Fidelidade:** Código gerado segue 100% o Design System OLED Black.
3.  **Segurança:** Zero exposição de chaves de API / GitHub no frontend.
4.  **Autonomia:** Capacidade de criar um Silo de 5 páginas interconectadas em menos de 10 minutos.

---
**Nota:** Este plano é iterativo e prioriza a segurança dos dados (Local-First) antes da escala de IA.
