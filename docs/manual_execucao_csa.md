# 🧠 Manual de Execução: Cognitive State Architecture (CSA) v3.2

Este é o documento definitivo da **Cognitive State Architecture (CSA)**. Ele descreve detalhadamente as metodologias, ferramentas e regras para agentes de Engenharia de Software operarem com precisão cirúrgica, evitando alucinações ("Efeito Rashomon") e instabilidades sistêmicas.

---

## 1. O Que é a CSA?
A CSA é uma arquitetura desenhada para mitigar os gargalos das IAs generativas de fronteira (como perdas de contexto, duplicação de raciocínio, alucinação topológica e viés de intermediariedade). O princípio primário é: **O conhecimento não deve residir unicamente na "memória" preexistente do modelo de linguagem, mas deve ser externalizado, consultado e operado fisicamente (SSOT - Single Source of Truth)**.

A arquitetura dita a transição da Geração Macro ("escreva e substitua o arquivo inteiro") para a **Execução Atômica e Fragmentada**, baseada no framework ACONIC, operando com restrições rígidas.

---

## 2. A Estrutura de Diretórios (SSOT)
Todo projeto governado pela CSA possui um ecossistema de arquivos em uma pasta isolada chamada `CSA/`. O sistema de controle de versão (Git) ignora esta pasta (`.gitignore`), exceto pelo arquivo raiz `estado_atual.md`.

*   **`CSA/1_Diretrizes_e_Memoria/`:** Contém as regras fundacionais (`regras_base.md`), os dicionários (`dicionario_de_termos.md`) e os diagramas em tempo real (`arquitetura_de_estado.md`).
*   **`CSA/2_Estrategia_e_Produto/`:** Armazena o `roadmap_evolucao.md` e o `backlog_ideias.md`. A IA nunca deve se desviar do escopo; ideias paralelas são registradas no backlog.
*   **`CSA/3_Engenharia_e_Arquitetura/`:** Repositório dos ADRs (*Architecture Decision Records*) e contratos de API (`doc_integracoes.md`). 
*   **`CSA/4_Execucao_e_Historico/`:** Contém o Changelog cirúrgico, o `Backup/` para snapshots da memória e a `Grafos_de_Evolucao/` para arquivos Mermaid.
*   **`CSA/5_Pesquisa_e_Embasamento/`:** Destinada à validação científica e deep research (`wiki_conhecimento.md`).
*   **`estado_atual.md` (A "Memória RAM"):** Fica na raiz do projeto. Ele é a única fonte que dita "Onde estamos e qual é o próximo passo atômico". É limpo a cada fim de ciclo.

---

## 3. O Fluxo de Meta-Raciocínio (AI-RO)
Antes de agir fisicamente em qualquer arquivo, o Agente CSA deve registrar os seus processos lógicos sob o paradigma de *AI as a Research Object (AI-RO)* usando blocos no chat de interação:

*   `<thinking>`: Análise profunda e lógica da requisição baseada na leitura do `estado_atual.md`.
*   `<blast_radius>`: **[Crucial]** Cálculo explícito de danos topológicos. O agente formaliza um diagrama *Mermaid* das dependências antes de alterar código.
*   `<critique>`: Um momento de autoavaliação adversarial ("Minha solução é atômica? Estou quebrando uma dependência mapeada?").
*   `<action>`: Lista final e estrita de comandos executados com ferramentas de edição e substituição de texto.

---

## 4. O Efeito Rashomon e a Topologia Offline (Circuit Breaker Ativo)
Em ecossistemas multi-agente, as IAs sofrem do **Efeito Rashomon**: interpretam o "texto" de formas diferentes, gerando *loops* de refatoração infinitos e quebrados. Para contornar isso, a CSA exige a análise relacional causal (AST).

*   **Topologia Offline:** Ferramentas de terceiro ou de MCP (como sqlite/code-review-graph) são terminantemente **DESATIVADAS** devido a instabilidades em ambiente Windows e deadlocks.
*   **O Agente é o Motor de Grafo:** Toda alteração de código exige que o Agente faça buscas locais cirúrgicas (usando `grep`, `ripgrep`, `findstr` ou local node modules como `dependency-cruiser`).
*   **Max Depth (Aconic):** A pesquisa de impacto (Blast Radius) nunca excede 2 níveis de profundidade estrutural, a fim de proteger o consumo de *tokens* e garantir o isolamento atômico.
*   **O Desenho:** Após rodar as buscas locais pelo terminal, o agente desenha *manualmente* um diagrama de rede usando Markdown e Sintaxe Mermaid, avaliando explicitamente as partes que irão se romper.

---

## 5. Gatilhos de Anti-Alucinação (Deep Research)
A regra de ouro da CSA: **NÃO SUPONHA.**
Se o agente enfrentar uma barreira de conhecimento sobre uma nova API ou pacote, ele entra no estado de *Interrupção*:
1. Ele paralisa a engenharia.
2. Escreve a dúvida em `CSA/5_Pesquisa_e_Embasamento/pesquisas_profundas.md`.
3. Informa ao Arquiteto Humano: "Preciso de Deep Research externo sobre X".
4. Após o humano fornecer o contexto, o agente salva as provas na `wiki_conhecimento.md` antes de retomar.

---

## 6. O Encerramento Atômico de Sessão
Para que o ambiente não degrade, o Agente deve executar religiosamente a homeostase quando uma sessão acaba (ordem finalizada):
1. **Relatório:** Escrever o relato do que foi feito em `Relatorios_Sessao/`.
2. **Registro Topológico:** Caso houve mudança na estrutura, registrar os novos arquivos Mermaid no repositório `Grafos_de_Evolucao/`.
3. **Backup de RAM:** Fazer uma cópia isolada e datada do `estado_atual.md` (`Backup/estado_YYYY-MM-DD.md`).
4. **Limpeza Cirúrgica:** Esvaziar o conteúdo narrativo do `estado_atual.md`, garantindo que ele contenha exclusivamente a indicação enxuta: *Status: Em repouso* e *Próximo Passo Lógico*.
