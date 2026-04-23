# 📜 Changelog (Registro de Materialização)

## [16/04/2026] - v3.1.1-SAGA (Protocolo de Resiliência)

### ✅ Adicionado
- **SAGA-LLM (Fase Inicial):** Estrutura de backups preventivos em `CSA/4_Execucao_e_Historico/Backup/`.
- **Checkpoint de Estado:** Criado snapshot `pre-SAGA` dos arquivos SSOT.

### 🛠️ Alterado
- **Controle de Versão:** Sincronização de `estado_atual.md` para o novo roadmap de resiliência.


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
