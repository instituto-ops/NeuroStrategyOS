# 🚀 Plano de Execução: Vórtex Studio 3.1
**Caminho Crítico para Estabilização e Alta Performance**

---

## Fase I: Purge & Limpeza de Contexto
*Objetivo: Remover o overhead de tokens e lógicas legadas que causam conflitos.*

1.  **Remoção da Auditoria Síncrona:** Deletar a função `auditSemantic` no front-end e desativar a rota correspondente no backend.
2.  **Verificação de Dependências:** Executar um `grep` global para garantir que o backend/frontend não tenham outros consumidores dependentes da tag `<preview>` antes de removê-la.
3.  **Expurgo do Parser HTML:** Limpar `vortex-studio.js` de qualquer busca por blocos `<preview>`.
3.  **Hard Context Reset:** Configurar o gatilho no backend para ignorar histórico de gerações v2.0 ao ativar o motor 3.1.

### 📋 Checklist Fase I
- [x] Nenhum log de `auditSemantic` no console. ✅ Função removida + export removido
- [x] Parser ignorando tags `<preview>`. ✅ `previewMatch` eliminado do parser
- [ ] Prompt de sistema atualizado com a flag `# VÓRTEX ENGINE v3.1`. *(Fase V)*

---

## Fase II: Foundation (O Novo Shell)
*Objetivo: Criar o ambiente de renderização isolado e resiliente.*

1.  **Criação do `preview-shell.html`:** Arquivo estático em `frontend/public/`.
2.  **Injeção de Pinos (CDNs):** Configurar Tailwind v3.4.1, React v18.2 e demais libs via ESM.sh.
3.  **Camada de Mocks:** Implementar os mocks globais para `next/link`, `next/image` e `next/navigation`.
4.  **CSP (Content Security Policy):** Assegurar permissão `frame-src self` e domínios do ESM.sh no `next.config.js` (ou cabeçalhos de rota) para evitar quebras silenciosas.
5.  **Comunicação Iframe:** Definir protocolo de injeção rigoroso `host ↔ iframe` via `postMessage`.
6.  **Error Boundary:** Envolver o contêiner de renderização em um interceptor de erros.

### 📋 Checklist Fase II
- [x] Shell carregando via Iframe no Vórtex. ✅ `preview-shell.html` criado com `src` dinâmico
- [x] Ícones Lucide aparecendo sem imports. ✅ `window.Lucide = LucideIcons` no escopo global
- [x] Erros de código no preview não travando a UI principal. ✅ ErrorBoundary + postMessage de erro

---

## Fase III: Logic (O Mapper)
*Objetivo: Implementar a inteligência de transformação de código.*

1.  **Dicionário de Hidratação:** Criar o módulo `hydration-map.js` com o registro de tags/imports.
2.  **Stripping Logic:** Função para limpar códigos de preview (`strip(code: string) -> string`).
3.  **Hydration Logic:** Função que injeta `imports` e `types` mapeados (`hydrate(code: string) -> string`) ao salvar. Internamente, executa `extractLucideIcons(code: string) -> string[]`. Se a Regex detectar `window.Lucide` mas não extrair chaves (suspeita de destructuring não suportado), deverá engatilhar um Warning fallback para o console durante o teste.

### 📋 Checklist Fase III
- [ ] Mapper convertendo `window.Lucide.Camera` para `import { Camera }...`.
- [ ] Código salvo no disco sendo um Next.js válido.

---

## Fase IV: Validação de Estresse (Fase III.b)
*Objetivo: Garantir que o sistema aguenta o mundo real.*

1.  **Teste Nível 1:** Gerar componente estático simples (Hero Section).
2.  **Teste Nível 2:** Gerar componente com animações (Framer Motion).
3.  **Teste Nível 3:** Gerar componente com navegação e imagens (Links/Imagens Next.js).
4.  **Build Check:** Rodar `npm run build` no projeto real com os arquivos gerados.

### 📋 Checklist Fase IV
- [ ] Componentes renderizando no Sandbox v3.1 em < 2 segundos.
- [ ] Zero erros de build no projeto principal.

---

## Fase V: Launch & Governança
*Objetivo: Entrega final e monitoramento.*

1.  **Ativação do Prompt Baseline 3.1:** Substituir o prompt antigo pelo modelo Diamond/Stable.
2.  **Sincronização de Estado:** Atualizar `estado_atual.md` para o status "Estável".
3.  **Audit Log:** Sistema de métricas diário (revisado por sprint) de performance de tokens para assegurar as reduções previstas. Responsável: CSA Agent (automatizado).

---

**Autor:** Antigravity (CSA Agent)
**Data:** 16/04/2026
**SSOT:** c:\Users\artes\Documents\NeuroStrategy OS - VM\Núcleo de Marketing\Plano_Vortex_3.md
