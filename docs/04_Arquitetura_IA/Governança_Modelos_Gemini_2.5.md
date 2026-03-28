# 🤖 Governança de Modelos de IA: Ecossistema Gemini 2.5 (V5.6)

Este documento oficializa a decisão arquitetural de padronização tecnológica do **NeuroEngine OS**, estabelecendo a família **Gemini 2.5** como a única infraestrutura de inteligência permitida, garantindo conformidade, performance e otimização de custos (Abidos Economy).

---

## 🏛️ 1. Diretriz de Governança "Zero 1.5"

A partir de Março de 2026, todos os módulos do ecossistema foram blindados contra o uso de modelos legados (Gemini 1.5). A infraestrutura agora opera exclusivamente sob a orquestração centralizada do **Gemini 2.5 Hub**.

### 1.1. Motivação Técnica
*   **Janela de Contexto Superior:** Expansão para até 2 milhões de tokens (Pro), permitindo a análise integral de silos de conteúdo complexos sem perda de "fio da meada".
*   **Latência Otimizada:** Redução significativa no tempo de primeira resposta (TTFT), essencial para a UX do Dr. Victor Lawrence.
*   **Abidos Native:** Alinhamento total com as heurísticas de neuromarketing e conformidade clínica exigidas pelo método.

---

## 📊 2. Especificações da Família Gemini 2.5

O sistema utiliza três perfis distintos de processamento, selecionáveis via interface (Global ou Local):

| Modelo | Identificador | Capacidade (Contexto) | Caso de Uso Ideal |
| :--- | :--- | :--- | :--- |
| **🧠 Gemini 2.5 Pro** | `gemini-2.5-pro` | **2,000,000+ tokens** | Auditoria Clínica Final, Geração de Elite, Análise de Longo Prazo, Refinamento de Copy Complexo. |
| **⚡ Gemini 2.5 Flash** | `gemini-2.5-flash` | **1,048,576 tokens** | **Padrão (Default)**. Orquestração de Silos, Geração de Páginas Abidos, CRM & Doctoralia. |
| **⚡ Gemini 2.5 Flash-Lite** | `gemini-2.5-flash-lite` | **1,048,576 tokens** | Chat interativo rápido, Sumarização de Logs, Consultas de Baixa Complexidade, Alta Frequência. |

---

## ⚙️ 3. Arquitetura de Implementação

A inteligência é governada por uma hierarquia de dois níveis, garantindo controle total ao usuário (Dr. Victor Lawrence):

### 3.1. Orquestrador Global (Master Switch)
Localizado na tela inicial (Dashboard), define o modelo "soberano" para todas as seções que estiverem configuradas como **"USAR GLOBAL"**. O padrão de fábrica é o **Flash 2.5**.

### 3.2. Seletores de Seção (Local Selectors)
Cada módulo (AI Studio, Analytics, Doctoralia, etc.) possui autonomia para desviar do padrão global caso uma tarefa específica exija mais (Pro) ou menos (Flash-Lite) poder computacional.

### 3.3. Backend Blindado (`getAIModel`)
O servidor central (`server.js`) atua como o **Guardião de Protocolo**, impedindo que requisições externas ou legadas ignorem a política de modelos 2.5. Toda chamada à API do Google GenAI passa obrigatoriamente por este filtro.

---

## 🛡️ 4. Norma Operacional: Economia de Tokens (Abidos Economy)

Para garantir a sustentabilidade financeira do ecossistema e a máxima eficiência de processamento, todo o desenvolvimento deve seguir a **Norma de Economia de Tokens**:

### 4.1. Priorização de Motores (SOP - Standard Operating Procedure)
1.  **Padrão Criativo (FLASH):** 90% das gerações de texto, copy e estruturação de seções devem utilizar o **Gemini 2.5 Flash**. É o equilíbrio ideal entre custo e "inteligência de mercado".
2.  **Padrão de Interação (FLASH-LITE):** Chatbots rápidos, sumarização de logs de servidor e triagens iniciais devem utilizar o **Flash-Lite**. É o custo-benefício máximo para volume.
3.  **Padrão de Elite (PRO):** Reservado estritamente para:
    *   **Auditoria Clínica:** Validação final de conformidade ética e técnica.
    *   **Refinamento Abidos de Alta Performance:** Quando o Flash não atingir o tom de copy desejado após 2 tentativas.
    *   **Análise de Longo Contexto:** Quando for necessário cruzar dados de múltiplos arquivos de silos simultaneamente.

### 4.2. Diretrizes de Ingestão de Dados
*   **Prompt Granular:** Evite enviar todo o conteúdo da página para correção de uma única vírgula. Utilize a geração modular (por bloco) conforme implementado no AI Studio.
*   **Deduplicação de Variáveis:** O sistema limpa automaticamente variáveis redundantes (ex: campos de contato repetidos) antes de enviar o payload para a IA.
*   **Zero Text-Markdown:** As respostas da IA devem ser solicitadas em JSON puro ou texto limpo, reduzindo o volume de tokens de saída desperdiçados com formatação Markdown visual.

---

**Última Atualização:** 28 de Março de 2026  
**Responsável:** Antigravity IA Engine  
**Status:** 🟢 IMPLEMENTADO & ATIVO
