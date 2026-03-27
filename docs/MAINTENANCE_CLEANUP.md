# NeuroEngine OS - Guia de Limpeza Pós-Desenvolvimento

Este documento lista todos os gadgets, botões e scripts temporários injetados para facilitar o desenvolvimento e a comunicação por prints.

## 🛠️ Ferramentas de Desenvolvimento (Remover)
- [ ] **Botão de Backup Visual (Print Silencioso)**: Localizado no Header ao lado de "ENGINE ATIVO".
- [ ] **Seção de Ferramentas de Dev**: Localizada no Dashboard (Card "Backup Visual do Sistema").
- [ ] **Script `dev-tools.js`**: Remover referência no `index.html` e deletar o arquivo `public/js/dev-tools.js`.
- [ ] **Dependência `html2canvas`**: Remover do `index.html` (CDN).

## 🧩 Refatoração e Código Morto
- [ ] **Logs de Console Estilizados**: Limpar comandos `console.log` com prefixos como `✨ [SPARK]`, `🧠 [STUDIO]`, etc.
- [ ] **Seções Ocultas**: Verificar se restou algum resquício da antiga "Arquitetura de Silos" no HTML que não foi completamente removido.

## 📝 Notas de Transição
A arquitetura de Silos foi consolidada na seção de **Planejamento**. O `menu-manager.js` agora foca apenas em árvores de navegação.
