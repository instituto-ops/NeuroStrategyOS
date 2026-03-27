# 🛠️ Relatório de Solução: Recursão Fatal no showSection

## 📎 Descrição do Problema (Sintoma)
O sistema entrava em um loop infinito ao tentar trocar de seção, travando o navegador com erro de `Maximum call stack size exceeded`. Nenhuma página carregava e o menu ficava inoperante.

## 🔍 Diagnóstico Técnico
A função `window.showSection` estava sendo definida de forma a chamar a si mesma recursivamente ou disparar eventos de navegação que reiniciavam o ciclo. Além disso, a lógica de atualização da URL (`pushState`) estava sendo disparada antes da renderização completa, gerando inconsistência no estado global do `app.js`.

## 🚀 Resolução (Workflow)
1.  **Refatoração do Núcleo:** Re-implementação da `showSection` com guardas de estado (state guards) para evitar chamadas duplicadas.
2.  **Isolamento de Estilos:** Substituição do display manual por uma classe CSS `.active` combinada com `!important` no arquivo `dashboard.css`.
3.  **Debouncing:** Adicionado um pequeno delay na atualização de componentes pesados (como o Grafo) para garantir que a transição de seção terminou antes de iniciar o processamento de dados.

## 💡 Prevenção
*   Nunca chamar disparadores globais de navegação dentro de funções de renderização.
*   Utilizar `sessionStorage` para persistir a "última seção ativa" de forma segura apenas no final da transição bem-sucedida.

---
**Data da Fix:** 2026-03-27 (NeuroEngine V5.1)
**Status:** ✅ RESOLVIDO
