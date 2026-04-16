# 🔗 Documentação de Integrações

## 🧬 IA & Processamento
- **Core Engine:** Google Gemini (Generative Language API)
- **Modelos Ativos:**
  - `gemini-2.5-flash`: Operações rápidas, curadoria e mimetismo base.
  - `gemini-2.5-pro`: Auditoria clínica profunda e resoluções complexas.
- **Fila de Execução (aiQueue):** Implementada no `server.js`.
  - **Throttle:** 1 requisição por segundo.
  - **Retry:** Exponential backoff para erros 429.
- **Context Caching:** Habilitado via flag `useCache: true` para redução de TPB (Tokens Per Burst).

## 📡 Protocolos de Comunicação
- **REST API:** Express.js (Porta 3000).
- **WebSockets:** Implementado para relatórios em tempo real dos agentes.
- **Smart Media Hub:** Integração com Cloudinary para gestão de ativos visuais (v5).

## 🛡️ Segurança
- **API Keys:** Gerenciadas via `.env` (Ignorado pelo Git).
- **Sanitização de Prompt:** Filtros de mimetismo para evitar "jailbreak" das regras base do Dr. Victor.
