# **Arquitetura de Estados Cognitivos (CSA): Padrão de Integração e Orquestração para Agentes LLM**

## **1\. Visão Geral e Objetivo**

A *Cognitive State Architecture* (CSA) é um padrão de arquitetura de software projetado para orquestrar fluxos de trabalho de agentes baseados em *Large Language Models* (LLMs) em projetos de longa duração. Em vez de propor novos algoritmos de inteligência artificial, a CSA atua como um framework de **integração**, unindo conceitos estabelecidos de engenharia de contexto, gestão de estado, e tolerância a falhas para resolver gargalos práticos enfrentados por desenvolvedores.

O desenvolvimento autônomo baseado em sessões de chat longas falha frequentemente devido à saturação da janela de contexto, perda de instruções sistêmicas e timeouts de API.1 A CSA mitiga esses problemas externalizando o estado do agente, forçando a execução em etapas atômicas (microtarefas) e exigindo validação humana (modelo *Human-in-the-Loop* \- HITL) em pontos críticos de decisão, garantindo que o código ou a pesquisa gerada não divirja dos requisitos originais.

## **2\. Problemas Práticos em LLMs de Larga Escala**

A interação convencional em LLMs baseia-se na injeção contínua de histórico na janela de contexto. Em tarefas complexas, essa abordagem desencadeia falhas documentadas:

* **Fadiga de Contexto (*Lost in the Middle*):** Modelos de linguagem apresentam dificuldade acentuada em recuperar informações (como regras de negócio ou restrições arquiteturais) posicionadas no meio de *prompts* extensos, levando ao desvio de instrução.2
* **Envenenamento de Contexto (*Context Poisoning*):** Quando o modelo comete um erro (uma alucinação técnica ou um bug) e essa saída é realimentada no histórico do chat, o erro passa a servir como um exemplo positivo ("few-shot") não intencional, contaminando as inferências subsequentes.
* **Exaustão de Infraestrutura e Limites de Taxa (Erros 503/429):** Solicitar a reescrita de arquivos monolíticos massivos de uma só vez gera picos de demanda de inferência e de VRAM, resultando em quedas de conexão ou recusas pelo balanceador de carga da API.3

## **3\. Gestão de Estado Externalizado e a Fonte Única de Verdade (SSOT)**

Para resolver a degradação de contexto, a CSA abandona o armazenamento de conhecimento no histórico do chat. O contexto longo é substituído por uma arquitetura de estado externalizada baseada em arquivos (uma Fonte Única de Verdade \- SSOT), frequentemente acessada via **Model Context Protocol (MCP)**.4

O MCP padroniza a comunicação entre o LLM e as fontes de dados locais ou remotas, permitindo que o agente leia e escreva apenas as informações necessárias para a tarefa atual.5 O ecossistema SSOT é tipicamente estruturado assim:

* regras\_base.md / arquitetura\_de\_estado.md: Diretrizes fixas do projeto.
* estado\_atual.md: O *scratchpad* (memória de trabalho temporária), contendo apenas a microtarefa atual e limpo a cada ciclo para evitar o acúmulo de tokens irrelevantes.1
* changelog.md / ADRs/: Registros permanentes de decisões e alterações.

## **4\. Raciocínio Estruturado e Tags de Delimitação**

A CSA adota padrões de design de *prompts* estruturados (inspirados em frameworks como LangGPT) para induzir a separação explícita entre o planejamento do modelo e a sua execução prática.6

Isso é feito exigindo que o LLM utilize tags XML para seu processo de meta-raciocínio antes de invocar qualquer ferramenta:

* \<thinking\>: Análise da tarefa solicitada e do arquivo estado\_atual.md.
* \<critique\>: Revisão interna (ex: "Isso quebra alguma regra definida na SSOT?").
* \<action\>: Invocação das ferramentas (via MCP) para alterar o código cirurgicamente.

## **5\. Resolução de Falhas de Coordenação Multi-Agente**

Em sistemas com múltiplos agentes (ex: um agente codificador e um agente revisor), é comum que surjam divergências sobre a implementação, onde agentes entram em *loops* reescrevendo o trabalho um do outro com base em heurísticas próprias conflitantes.8

Em vez de permitir debates não estruturados, a CSA força a convergência através do **Ciclo de Criação e Auditoria (*Creation-Audit Loop*)**.9 O agente auditor não avalia a "intenção" abstrata do codificador; ele executa testes, *linters* ou *checklists* documentados na SSOT diretamente contra os artefatos gerados. Se o teste falhar, o artefato é rejeitado.

## **6\. O Protocolo de Execução Atômica (PEA) e a Decomposição**

A principal defesa da CSA contra erros de infraestrutura (503/429) e perda de precisão é o **Protocolo de Execução Atômica (PEA)**. A regra do PEA é simples: ![][image1].1 Pedidos de geração macroscópica são proibidos.

Para sistematizar essa quebra de tarefas, a CSA apoia-se em conceitos do framework **ACONIC** (*Analysis of CONstraint-Induced Complexity*). O ACONIC modela tarefas complexas de LLMs como Problemas de Satisfação de Restrições (CSP) e utiliza decomposição de árvores para minimizar a complexidade (*treewidth*) de cada etapa isolada.10

**Limitação de Inicialização (Bootstrapping):** É imperativo notar que a geração autônoma do grafo de restrições (a decomposição inicial via ACONIC) ainda é um desafio em aberto.12 Na prática da CSA, essa fase de *bootstrapping* requer um *prompt* estratégico altamente restrito focado apenas no planejamento, ou intervenção direta do operador humano para aprovar o plano fragmentado antes que a execução do código comece.

## **7\. Tolerância a Falhas e Rollbacks (Padrão SagaLLM)**

Fluxos fragmentados correm o risco de deixar o sistema em um estado inconsistente caso uma falha ocorra no meio do processo. A CSA adapta o framework **SagaLLM**, que leva o padrão de transações distribuídas (Saga) para a orquestração de LLMs.13

Em vez de exigir transações ACID estritas, o sistema mantém o estado através de *checkpoints* atômicos.14 Se o agente injetar um erro na etapa 5 de um plano de 10 passos, o sistema não instrui o LLM a "tentar consertar o código quebrado" (o que frequentemente gera alucinações em cascata). Em vez disso, invoca-se uma ação compensatória: um *rollback* via controle de versão (ex: Git) para restaurar a SSOT ao último estado limpo e funcional.15

## **8\. Resiliência de API e Economia de Tokens**

Para estabilizar a comunicação com provedores em nuvem, a infraestrutura da CSA deve implementar:

* **Espera Exponencial com Jitter (*Exponential Backoff with Full Jitter*):** Para lidar com códigos 429 ou 503, as bibliotecas de requisição não devem retentar imediatamente, o que causa o efeito "manada estrondosa" (*thundering herd*) nos servidores. O atraso entre as tentativas deve crescer exponencialmente e incluir variação aleatória (*jitter*) para dessincronizar requisições simultâneas.16
* **Token Efficiency Ratio (TER):** Métrica focada em avaliar o custo-benefício da arquitetura.17 Modelos menores e mais baratos são roteados para edições simples e atômicas de código, enquanto modelos de fronteira pesados ficam reservados para as fases analíticas de validação e planejamento.18

![][image2]

## **9\. Protocolo Operacional de Implementação (Metodologia de Execução)**

A execução prática da CSA exige que o agente atue sob o modelo **Human-in-the-Loop (HITL)** em pontos críticos de mudança de estado. O protocolo a seguir é mandatório:

### **9.1. Topologia do Ecossistema**

📁 CSA/                      \# Ecossistema de Contexto Cognitivo
├── 📁 1\_Diretrizes\_e\_Memoria/ \# Fonte Única de Verdade (SSOT)
│   ├── regras\_base.md       \# Identidade e Proibições
│   ├── manual\_do\_arquiteto.md \# Padrões de Negócio
│   └── arquitetura\_de\_estado.md \# Topologia da aplicação
├── 📁 2\_Estrategia\_e\_Produto/
│   ├── roadmap\_evolucao.md  \# Horizontes de crescimento
│   └── sugestoes\_agente.md  \# Registro de melhorias sugeridas pela IA
├── 📁 3\_Engenharia\_e\_Arquitetura/
│   ├── adr/                 \# Architecture Decision Records
│   └── doc\_integracoes.md   \# Documentação de APIs
├── 📁 4\_Execucao\_e\_Historico/
│   ├── changelog.md         \# Log de alterações estruturais
│   └── Backup/              \# Snapshots de estado\_atual.md
└── estado\_atual.md          \# Scratchpad (Memória RAM limpa a cada ciclo)

### **9.2. Fluxo de Inicialização (Bootstrap)**

1. **Leitura de Ancoragem:** O agente lê via MCP os arquivos regras\_base.md e arquitetura\_de\_estado.md para carregar o contexto estrito.
2. **Sincronização de Estado:** O agente consulta o estado\_atual.md para identificar a tarefa exata e a posição no grafo de dependências.1

### **9.3. Ciclo de Materialização Atômica (HITL)**

Para cada microtarefa, o sistema segue o fluxo:

1. **Planejamento e Autocrítica:** O modelo gera seu monólogo interno (\<thinking\> e \<critique\>).
2. **Execução Isolada:** A alteração é feita em um único arquivo de destino.
3. **Validação Humana (HITL):** O processo é pausado. O Arquiteto (humano) revisa a modificação atômica. O agente só avança após o *commit* da etapa.
4. **Atualização do Scratchpad:** O estado\_atual.md é atualizado e o histórico da sessão efêmera é descartado (flush), garantindo que a próxima etapa comece sem o peso dos tokens anteriores.1

### **9.4. Recuperação de Erros**

Se a validação humana ou os testes automatizados falharem, o sistema descarta a alteração local e aplica o *rollback* tático (via pasta Backup/ ou *git reset*) para o ponto anterior do plano, solicitando uma nova rota.1

## **10\. IA como Objeto de Pesquisa (AI-RO) e Auditoria**

Para ambientes regulados ou pesquisas acadêmicas, a CSA alinha-se ao paradigma **AI-RO** (*AI as a Research Object*).19 Isso significa que a IA não é tratada como uma caixa-preta geradora de respostas, mas como um componente de software estruturado e inspecionável.20

A validação do trabalho não se baseia na confiança sobre o modelo, mas na auditoria de seus artefatos: as decisões técnicas ficam imortalizadas na pasta adr/, os passos de execução no changelog.md e a configuração de versão e *prompts* utilizados são empacotados de acordo com os princípios FAIR para permitir reprodutibilidade.21

## **11\. Conclusão**

A *Cognitive State Architecture* reconhece que escalar o uso de agentes autônomos na engenharia de software não depende de *prompts* verbosos ou janelas de contexto infinitas, mas de disciplina e governança de estado.

Ao tratar o LLM como um processador funcional isolado (*stateless*) e delegar a memória e o direcionamento para uma infraestrutura de arquivos estrita (SSOT), o Protocolo de Execução Atômica e transações do tipo Saga, a CSA oferece um *framework* pragmático para que desenvolvedores e pesquisadores extraiam o máximo de confiabilidade das APIs atuais. O resultado é um ambiente de desenvolvimento co-pilotado, sistemático, auditável e resiliente a falhas comuns de infraestrutura e deriva semântica.

#### **Trabalhos citados**

1. Arquitetura de Estados Cognitivos para Agentes Sintéticos.docx
2. Lost in the Middle: How Language Models Use Long Contexts \- ResearchGate, acesso a abril 16, 2026, [https://www.researchgate.net/publication/378284067\_Lost\_in\_the\_Middle\_How\_Language\_Models\_Use\_Long\_Contexts](https://www.researchgate.net/publication/378284067_Lost_in_the_Middle_How_Language_Models_Use_Long_Contexts)
3. LLM API Resilience in Production: Rate Limits, Failover, and the Hidden Costs of Naive Retry Logic \- TianPan.co, acesso a abril 16, 2026, [https://tianpan.co/blog/2026-03-11-llm-api-resilience-production](https://tianpan.co/blog/2026-03-11-llm-api-resilience-production)
4. Basic Features \- Tuya Developer, acesso a abril 16, 2026, [https://developer.tuya.com/en/docs/iot/basic-features?id=Kaumiwx9b4kkp](https://developer.tuya.com/en/docs/iot/basic-features?id=Kaumiwx9b4kkp)
5. Advancing Multi-Agent Systems Through Model Context Protocol: Architecture, Implementation, and Applications \- arXiv, acesso a abril 16, 2026, [https://arxiv.org/html/2504.21030v1](https://arxiv.org/html/2504.21030v1)
6. NeurIPS Poster Self Iterative Label Refinement via Robust Unlabeled Learning, acesso a abril 16, 2026, [https://neurips.cc/virtual/2025/poster/115910](https://neurips.cc/virtual/2025/poster/115910)
7. Large Language Model Prompt Datasets: An In-depth Analysis and Insights \- arXiv, acesso a abril 16, 2026, [https://arxiv.org/html/2510.09316v1](https://arxiv.org/html/2510.09316v1)
8. The Three-AI Orchestra: Lessons from Coordinating Multiple AI Agents | by christian crumlish | Building Piper Morgan | Medium, acesso a abril 16, 2026, [https://medium.com/building-piper-morgan/the-three-ai-orchestra-lessons-from-coordinating-multiple-ai-agents-0aeb570e3298](https://medium.com/building-piper-morgan/the-three-ai-orchestra-lessons-from-coordinating-multiple-ai-agents-0aeb570e3298)
9. (PDF) Gym-Anything: Turn any Software into an Agent Environment \- ResearchGate, acesso a abril 16, 2026, [https://www.researchgate.net/publication/403605485\_Gym-Anything\_Turn\_any\_Software\_into\_an\_Agent\_Environment](https://www.researchgate.net/publication/403605485_Gym-Anything_Turn_any_Software_into_an_Agent_Environment)
10. An Approach for Systematic Decomposition of Complex LLM Tasks \- OpenReview, acesso a abril 16, 2026, [https://openreview.net/attachment?id=XVtEWXnsIB\&name=pdf](https://openreview.net/attachment?id=XVtEWXnsIB&name=pdf)
11. An Approach for Systematic Decomposition of Complex LLM Tasks \- arXiv, acesso a abril 16, 2026, [https://arxiv.org/html/2510.07772v1](https://arxiv.org/html/2510.07772v1)
12. An Approach for Systematic Decomposition of Complex LLM Tasks \- arXiv, acesso a abril 16, 2026, [https://arxiv.org/html/2510.07772v3](https://arxiv.org/html/2510.07772v3)
13. SagaLLM: Context Management, Validation, and Transaction Guarantees for Multi-Agent LLM Planning \- VLDB Endowment, acesso a abril 16, 2026, [https://www.vldb.org/pvldb/vol18/p4874-chang.pdf](https://www.vldb.org/pvldb/vol18/p4874-chang.pdf)
14. SagaLLM: Context Management, Validation, and Transaction Guarantees for Multi-Agent LLM Planning | alphaXiv, acesso a abril 16, 2026, [https://www.alphaxiv.org/overview/2503.11951v3](https://www.alphaxiv.org/overview/2503.11951v3)
15. 𝖲𝖺𝗀𝖺𝖫𝖫𝖬: Context Management, Validation, and Transaction Guarantees for Multi-Agent LLM Planning \- arXiv, acesso a abril 16, 2026, [https://arxiv.org/html/2503.11951v2](https://arxiv.org/html/2503.11951v2)
16. Exponential Backoff and Jitter: Enhancing System Resilience | by Suraj Rajput | Medium, acesso a abril 16, 2026, [https://medium.com/@surajrajput\_46910/exponential-backoff-and-jitter-enhancing-system-resilience-fcd21c00c118](https://medium.com/@surajrajput_46910/exponential-backoff-and-jitter-enhancing-system-resilience-fcd21c00c118)
17. Reducing hallucinations of large language models via hierarchical semantic piece, acesso a abril 16, 2026, [https://www.researchgate.net/publication/391274019\_Reducing\_hallucinations\_of\_large\_language\_models\_via\_hierarchical\_semantic\_piece](https://www.researchgate.net/publication/391274019_Reducing_hallucinations_of_large_language_models_via_hierarchical_semantic_piece)
18. Designing and Implementing a Complete LLM Cost Optimization Pipeline \- Codersarts, acesso a abril 16, 2026, [https://www.codersarts.com/post/designing-and-implementing-a-complete-llm-cost-optimization-pipeline](https://www.codersarts.com/post/designing-and-implementing-a-complete-llm-cost-optimization-pipeline)
19. Inspectable AI for Science: A Research Object Approach to Generative AI Governance | Scilit, acesso a abril 16, 2026, [https://www.scilit.com/publications/8bd4dd7d5cd8ab126a9b19e2edd0ece9](https://www.scilit.com/publications/8bd4dd7d5cd8ab126a9b19e2edd0ece9)
20. ChatGPT is fun, but not an author \- ResearchGate, acesso a abril 16, 2026, [https://www.researchgate.net/publication/367463407\_ChatGPT\_is\_fun\_but\_not\_an\_author](https://www.researchgate.net/publication/367463407_ChatGPT_is_fun_but_not_an_author)
21. Inspectable AI for Science: A Research Object Approach to Generative AI Governance, acesso a abril 16, 2026, [https://arxiv.org/html/2604.11261v1](https://arxiv.org/html/2604.11261v1)
