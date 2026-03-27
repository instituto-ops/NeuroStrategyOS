# 📂 Documentação de Operação: NeuroEngine Mission Control V4

Este documento detalha a arquitetura técnica, a estrutura de arquivos e o funcionamento prático do ecossistema **NeuroEngine AI Studio**, operando sob a **Geração 2026 (Gemini 2.5)**.

---

## 🏗️ 1. Mapa de Infraestrutura (Árvore de Arquivos)

Abaixo, os componentes críticos do sistema e suas funções estratégicas no ecossistema:

### 🌐 Raiz do Projeto (`Modulo WordPress Publicação/`)
*   `.env`: **Cofre de Segurança.** Armazena as chaves da API Gemini e credenciais do WordPress. Nunca exposto ao frontend.
*   `ABRIR_PAINEL_ANTIGRAVITY.bat`: **Ignitor do Sistema.** Atalho um-clique para subir o servidor e abrir o dashboard no Windows.
*   `wordpress-plugin/`: Contém extensões customizadas para o site (hipnolawrence.com) para facilitar a injeção via REST API.

### 🧠 Backend Neural (`/frontend/`)
*   `server.js`: **O Grande Maestro.** O servidor Node.js que gerencia toda a lógica de segurança (Proxy WP), orquestra os modelos Gemini 2.5 e hospeda a API de Neuro-Training.
*   `estilo_victor.json`: **Hipocampo Digital.** Armazena o "DNA Literário" e as regras clínicas aprendidas com o Dr. Victor.
*   `package.json`: Gestão de dependências críticas (@google/generative-ai, axios, express).

### 🎨 Frontend & UI Studio (`/frontend/public/`)
*   `index.html`: **A Ponte de Comando.** Interface consolidada de todos os módulos (Dashboard, AI Studio, Doctoralia, Neuro-Training).
*   `css/dashboard.css`: Design System de alta fidelidade (V4) com suporte a vidromorfismo e dark mode.
*   `js/chat.js`: **Orquestrador de Agentes.** Gerencia o fluxo multi-agente do AI Studio e a lógica do Método Abidos.
*   `js/api.js`: **Ponte Segura.** Abstração das chamadas ao WP via Proxy, evitando bloqueios de segurança (ModSecurity).
*   `js/neuro-training.js`: **Módulo de Aprendizado.** Captura voz e arquivos para alimentar o Digital DNA.
*   `js/doctoralia.js`: **Assistente Clínico.** Especializado no protocolo "Abraço Técnico" para respostas humanizadas.
*   `js/gemini.js`: Wrapper de conexão frontend-backend para interações de IA.
*   `js/abidos-review.js`: Interface de revisão Human-in-the-Loop para rascunhos em lote.

---

## 🤖 2. Funcionamento Prático do AI Studio (Mission Control)

O AI Studio não é um simples gerador de texto; é um **Escritório de Engenharia de Conversão Autônomo**.

### 🧠 Operação Dual-Brain (Gemini 2.5)
O sistema opera com dois hemisférios cerebrais artificiais sincronizados:
1.  **Hemisfério Esquerdo (Flash):** Focado em velocidade e extração de dados. Ouve o áudio do Dr. Victor, analisa rascunhos e extrai o "DNA" (Regras de Estilo) para a base de conhecimento.
2.  **Hemisfério Direito (Pro):** Focado em criatividade e densidade clínica. Escreve os rascunhos de alta conversão, garante o tom ericksoniano e planeja a estrutura SEO Abidos.

### 🚀 Fluxo One-Click (Pilar de Automação)
Atualmente, a operação funciona no fluxo **Zero-Friction**:
1.  **Geração no Canvas:** O Dr. Victor comanda a IA no chat. A IA constrói o código HTML direto em uma "Folha Branca" de alta fidelidade no centro da tela.
2.  **Extração de SEO:** Ao clicar em **"Publicar"**, a IA automaticamente:
    *   Lê o H1 para definir o título do WP.
    *   Gera uma Meta Description de 160 caracteres focada em conversão.
    *   Sugere ou cria o Slug (URL) estratégica.
3.  **Deploy Bypass-WAF:** O servidor backend recebe o JSON e injeta diretamente no WordPress via Proxy. Isso evita o Erro 403 (ModSecurity) do Hostinger, pois a comunicação ocorre "Servidor para Servidor".

### 🧬 Neuro-Training e Humanização
O sistema mantém um **Loop de Aprendizado Contínuo**:
*   Cada vez que o Dr. Victor sobe um PDF ou grava um áudio contando um caso clínico, o sistema extrai regras lógicas (ex: "Sempre valide a dor antes de sugerir hipnose").
*   Essas regras são injetadas em todas as novas gerações de texto, garantindo que a IA nunca pareça um robô genérico, mas sim uma extensão da voz do terapeuta.

### 🔍 Auditoria Visual e Compliance
*   O AI Studio possui um **Inspector Visual**. Se um elemento estiver quebrado, a IA tira um "print" da tela (html2canvas) e envia para o Gemini Vision, que "enxerga" o erro e devolve o código CSS corrigido instantaneamente.
*   **Compliance:** O Agente de Ética audita cada rascunho para garantir que não existam promessas de cura, citações sensíveis ou infrações às normas do CFP/LGPD.

---

**Estado Atual:** Operacional em V4 (Pronto para escala de conteúdo e atendimento Doctoralia).
