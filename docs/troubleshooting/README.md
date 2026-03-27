# 📚 Base de Conhecimento de Engenharia (Troubleshooting)

Este diretório armazena o histórico de erros resolvidos e decisões técnicas críticas para sustentar a estabilidade do **NeuroEngine OS**.

## 🚀 Índice de Relatórios CRÍTICOS

| ID | Data | Descrição do Problema | Gravidade | Solução Rápida |
|:---|:---:|:---|:---:|:---|
| [001](./001-gap-layout-dom.md) | 27/03/2026 | GAP de Layout (Void) & Erro Redeclaração no Console | Média | Remover `</div>` extra e scripts duplicados no rodapé. |
| [002](./002-recursion-showsection.md) | 27/03/2026 | Loop de Navegação (`showSection` Recursion Error) | **ALTA** | Refatorar lógica com State Guards e `.active !important`. |
| [003](./003-studio-layout-bleeding.md)| 24/03/2026 | Conteúdo do Studio "Vazando" para outras seções | Média | Encapsular componentes fora do lugar em `<section>` e limpar IDs duplicados. |
| [004](#) | 27/03/2026 | Erros de Sincronização Headless (Acervo/Vercel) | **ALTA** | Implementar `Retry Policy` na API do CMS e correção de CSRF no `/api/cms`. |

---
**Instruções para o Agente:** 
Ao encontrar um erro reincidente, primeiro consulte esta tabela para verificar se já existe um protocolo de solução estabelecido. 
