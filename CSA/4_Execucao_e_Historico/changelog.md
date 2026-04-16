# 📜 Changelog (Registro de Materialização)

## [07/04/2026] - Refatoração de Desempenho e Arquitetura On-Demand

### ✅ Adicionado
- **Context Caching:** Suporte à flag `useCache: true` para economia de tokens no Gemini.
- **ADR_001:** Formalização da decisão de arquitetura sob demanda (`Antigravity/3_Engenharia_e_Arquitetura/adr/`).
- **Documentação Base:** Populamento dos arquivos de Metodologia Antigravity.

### 🛠️ Alterado
- **Neutralização de Heartbeat:** Removido o `setInterval` de 15s/60s no `health-system.js`. O diagnóstico agora é 100% manual.
- **Desacoplamento de Imagens:** A busca automática de mídias inteligentes foi removida do fluxo de geração de texto para evitar picos de concorrência.
- **Update Pulse:** Função de latência otimizada para ser puramente visual e reativa.

### 🛡️ Corrigido
- **Vazamento de Tokens:** Diagnóstico de consumo excessivo encerrado com sucesso. O problema era provocado por automações concorrentes e não por bugs de loop.
