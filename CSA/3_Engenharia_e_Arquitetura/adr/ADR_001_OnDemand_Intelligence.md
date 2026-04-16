# Arquitetura de Inteligência On-Demand Pura

## Contexto e Problema
A versão 5x da plataforma **NeuroStrategy OS** contava com sistemas automatizados de fundo (background polling) para injetar vitalidade e proatividade:
1.  **Monitoramento Ativo Contínuo (`health-system.js`)**: Realizava `ping` periódico e preparava fluxos pesados no servidor a cada N segundos.
2.  **Cascata Autossuficiente de Inteligência (`ai-studio-template.js`)**: Requisições de refino que invocam, implicitamente, processos colaterais na IA (como buscas de "Mídias Inteligentes" acopladas no pós-processamento natural de textos).

**Repercussão Identificada**: Para contas pagas (Pay-As-You-Go) da API do Google AI Studio (Gemini), a geração contínua de "surtos concêntricos de conectividade" (Requests per Minute Bursting) ou acúmulo de processamento sobrecarregava as cotas momentâneas. Mais do que isso, essa automação removia o poder direcional do Engenheiro Chefe (O Usuário) – gastando tokens valiosos, tempo de conexão e desvirtuando execuções sem clareza tática de "QUANDO" atuar.

## A Solução (Antigravity Core)
Em consonância com as premissas da metodologia **Antigravity (Zero Lixo de Execução)**, instituiu-se formalmente o padrão **On-Demand Intelligence (Inteligência 100% Sob Demanda)**.

A partir de 07/04/2026:
- Nenhum agente de Inteligência Artificial deve atuar por padrão "quando lhe for conveniente ou por um gatilho oculto pós-execução" na produção clínica, de UX ou Saúde.
- Automações colaterais foram **neutralizadas** ou desacopladas, substituídas por interfaces puras orientadas a eventos (Buttons / Cliques Manuais Mapeados).
- O Heartbeat de Saúde passa a ser um pulso inicial ou solicitado estritamente pelo front (manual/diagnóstico ativo e não background eterno).

## Vantagens 
- **Eficácia Financeira Absoluta**: A API agora é processada apenas quando há intenção direta (evitando desvios ou custos colaterais na cama Pay-As-You-Go).
- **Sem Picos de Conexão Simultânea (DDoS Interno)**: Evita falhas ou bloqueios (Erros HTTP 429) por limites de burst (RPM).
- **Maior Transparência e Intencionalidade Operacional**: Se uma análise acontece, tem motivo forte provado pelo gatilho do acionador no frontend. 

*Implementado no patch autônomo (chore: perf).*
