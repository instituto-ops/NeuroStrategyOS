# 🧠 Manual de Execução: Cognitive State Architecture (CSA) v3.3 (Claude Mindset)

Este é o documento definitivo da **Cognitive State Architecture (CSA)**. A versão 3.3 descarta a cerimônia corporativa e foca inteiramente na precisão, economia de *tokens* e comportamento pragmático de engenharia de software autônoma.

---

## 1. O Que é a CSA v3.3?
A CSA é uma arquitetura homeostática para IAs generativas. O princípio fundamental é **Externalização Mínima Viável de Contexto**. 
Em vez de sobrecarregar a janela de contexto com manuais longos a cada iteração, a CSA v3.3 foca na "Memória RAM" (`estado_atual.md`), na Autodepuração contra alucinações e no **Chain-of-Thought (CoT)** topológico.

---

## 2. A Estrutura de Diretórios (SSOT)
A pasta `CSA/` deve ser ignorada no Git (`.gitignore`), exceto pelo arquivo raiz `estado_atual.md`. Toda cerimônia inútil (relatórios de sessão por escrever, changelogs burocráticos) foi abolida.

*   **`CSA/1_Diretrizes_e_Memoria/`:** Dicionários e glossários. As antigas "regras_base" foram absorvidas pelo System Prompt nativo do Agente.
*   **`CSA/2_Estrategia_e_Produto/`:** Roadmaps e backlog. 
*   **`CSA/3_Engenharia_e_Arquitetura/`:** Registros vitais de arquitetura (ADRs). Apenas para decisões estruturais severas.
*   **`CSA/4_Execucao_e_Historico/`:** **A Morgue.** Contém o `registro_de_falhas.md` para aprendizado contínuo.
*   **`CSA/5_Pesquisa_e_Embasamento/`:** Deep research para evitar alucinações.
*   **`CSA/6_Skills_e_Especializacoes/`:** Módulos sob demanda. O Agente só lê o manual de Frontend se for codar Frontend.
*   **`CSA/Scripts/`:** Quality Gates locais (Testes, Linters) obrigatórios antes do término da task.
*   **`estado_atual.md` (A "Memória RAM"):** Na raiz. O ÚNICO arquivo lido sistematicamente em todo boot. Contém a "Verdade Atual, Restrições e Filas Ativas".

---

## 3. O "Claude Mindset" de Engenharia
Na v3.3, o agente age com a pragmática do modelo "Claude":
1.  **Sem Monólogos:** O agente não narra o que está pensando para o usuário. Ele usa 1-2 frases para atualizar o status e vai direto ao código.
2.  **Contexto Ativo:** Se a ordem é "alterar a cor", ele não dá dicas, ele acha o arquivo CSS e edita.
3.  **Executing with Care:** Ele é livre para ler, escrever e rodar testes locais. Mas **PARA E PEDE PERMISSÃO** para ações irreversíveis (Deletar branches, `rm -rf`, alterar histórico git, *Drop tables*).

---

## 4. O Grafo Topológico como Chain-of-Thought
Antes de qualquer refatoração que quebre dependências (ex: alterar a assinatura de uma função usada em 5 arquivos), o agente não age impulsivamente.
1.  **Investigação:** Usa `grep`, `ripgrep` ou seu conhecimento de terminal para achar os arquivos impactados.
2.  **Blast Radius:** O agente desenha um diagrama *Mermaid* das dependências no bloco `<blast_radius>` na sua saída. 
**Nota:** Isso não é um ritual de "Motor de Grafo", é um andaime cognitivo que força a rede neural a enxergar as interconexões antes de mexer no código, evitando quebras estruturais.

---

## 5. Autodepuração (Continuous Learning)
Se o agente enfrentar um loop de erro (corrige A quebra B, corrige B quebra A) ou quebrar o *build*:
1. Aborte o ciclo. Não force.
2. Escreva uma análise de "Causa Raiz" no arquivo `CSA/4_Execucao_e_Historico/registro_de_falhas.md`.
3. Use essa "autópsia" nas sessões futuras para imunizar o sistema contra os mesmos erros.
