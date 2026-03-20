# 🛰️ AntiGravity AI Studio V4: Manual de Operação Técnica (2026)

Este documento descreve como o **AI Studio** (Mission Control V4) opera na prática sob a programação atual, detalhando o comportamento dos agentes, a lógica de decisão e os "superpoderes" técnicos do sistema.

---

## 🔬 1. O Sistema de "Dois Hemisférios" (Core AI)
A maior inovação da V4 é a separação cognitiva para maximizar performance e economia:

*   **Hemisfério Esquerdo (Gemini 2.5 Flash):** É o "Trabalhador de Precisão". 
    *   **O que faz:** Transcreve áudio, analisa documentos PDF/Word e extrai o JSON da **Memória de Estilo**. 
    *   **Capacidade:** Processamento instantâneo de metadados e detecção de padrões de escrita (DNA).
*   **Hemisfério Direito (Gemini 2.5 Pro):** É o "Arquiteto Clínico".
    *   **O que faz:** Redige landing pages completas, gera respostas para o Doctoralia e resolve problemas complexos de SEO.
    *   **Capacidade:** Raciocínio profundo sobre ética clínica (CFP) e autoridade técnica (E-E-A-T).

---

## 🏗️ 2. A Esteira de Produção Multipassos (Pipeline)
Quando você pede para gerar um Blueprint ou um conteúdo, o sistema não faz apenas um comando. Ele inicia um fluxo de **Agentes de Autocorreção**:

1.  **Agente Construtor:** Recebe o seu pedido e consulta o arquivo `estilo_victor.json`. Ele escreve o código HTML/Tailwind bruto injetando seu tom de voz.
2.  **Inspetor Abidos (SEO):** Analisa o código e verifica: "Tem mais de um H1? Está encapsulado no wrapper Abidos?". Se houver erro, ele manda o Construtor refazer.
3.  **Inspetor Clínico (Ética):** Verifica: "Há promessa de cura? O CRP está presente? O tom é empático?". Se falhar, ele detecta a frase problemática e exige correção.
4.  **Inspetor de Design (UX):** Garante que os botões não quebrem no celular e que o **Glassmorphism** (efeito de vidro) esteja perfeito.

> **Nota:** O sistema tenta se auto-corrigir até **3 vezes** antes de entregar o resultado final para garantir que o código seja perfeito para o WordPress.

---

## 🧠 3. Neuro-Training: O Aprendizado Contínuo
O AI Studio não esquece quem você é. A programação atual permite:

*   **Extração Atômica:** Cada áudio ou conversa gera uma conta no "Hipocampo Digital" (`estilo_victor.json`).
*   **Injeção de Contexto:** Sempre que você gera um conteúdo novo, o sistema lê as últimas 100 regras de ouro que aprendeu com você e as usa como manual de estilo.
*   **Blindagem Ética:** Antes de qualquer regra ser salva ou enviada para a nuvem, o sistema aplica um filtro de anonimização que remove CPFs, nomes de pacientes e dados sensíveis.

---

## 🌐 4. Orquestração WordPress (Anti-WAF)
Como o servidor Hostinger possui filtros de segurança (ModSecurity) que costumam bloquear códigos HTML complexos, o AI Studio opera via **Proxy Inteligente**:

*   **Bypass de Segurança:** O servidor Node.js (seu Mission Control local) atua como um escudo. Ele recebe os dados brutos e os "limpa" antes de tentar sincronizar com o WordPress.
*   **Segmentação de Dados:** Em vez de pedir a página inteira de uma vez, ele separa metadados (título, autor) do conteúdo real (HTML), contornando os erros 403 (Proibido).

---

## 🛠️ Habilidades e Limitações Práticas

| Habilidade | O que faz na prática |
| :--- | :--- |
| **Output Limpo** | Respostas para Doctoralia sem marcas de IA (Plain Text). |
| **Clima Clínico** | Muda as cores e fontes de todo o site com um clique (Moods). |
| **Visão Abidos** | Gera layouts que o Google ama (SEO Programático) por padrão. |
| **Memória Ativa** | Aprende termos técnicos novos (ex: UFU, RAS30, AQ10b) e os usa corretamente. |

**Atualmente Operacional:** 🟢 Sim. Todos os motores estão em 2.5 Pro/Flash, sincronizados com o repositório remoto e prontos para produção.
