## Relatório Completo de Soluções — Texto Bagunçado na Postagem do Elementor


***

## PARTE 1 — PANORAMA DO QUE FOI INVESTIGADO

Antes de apresentar as soluções, um resumo confirmatório do que foi constatado nas investigações:[^1][^2][^3]


| Dado | O que foi encontrado |
| :-- | :-- |
| **Tema** | Astra FREE VERSION [^4] |
| **Elementor** | Versão 6.9.1, FREE [^5] |
| **Estrutura do post no Elementor** | 1 Seção → 1 Coluna → 1 widget "Editor de Texto" |
| **Conteúdo no widget** | HTML completo com `<section>`, `<h1>`, `<h2>`, `<h3>`, `<ul>`, `<img>`, `<button>`, `<a>` (7 seções completas) |
| **Conteúdo no editor Gutenberg** | O mesmo HTML também existe no banco de dados como conteúdo do post no WP |
| **Causa visual do erro** | `<h1>` nativo do Astra + `<h1>` do HTML se sobrepõem no mesmo espaço |


***

## PARTE 2 — AS 3 SOLUÇÕES (do mais simples ao mais profissional)


***

### ✅ SOLUÇÃO 1 — CORREÇÃO IMEDIATA (Emergencial — 15 min)

**Remover o `<h1>` duplicado e os wrappers desnecessários do HTML**

Esta é a solução mais rápida para parar o texto bagunçado **sem reconstruir nada**.

**O que fazer:**

No editor do Elementor, aba **Código** do widget "Editor de Texto", localizar e remover apenas estas partes do HTML:

```
**① Remover a primeira `<section>` (Hero) inteira** — ela contém o `<h1>` problemático e o parágrafo introdutório, pois o Astra já renderiza o título do post automaticamente no topo da página. Ou, alternativamente, **substituir o `<h1>` por `<p>` ou `<h2>`**:
```

```html
<!-- ANTES (causa o conflito): -->
<h1 style="font-size: 2.8em; color: #1a202c; ...">Terapia para Adulto que Descobriu...</h1>

<!-- DEPOIS (corrigido): -->
<h2 style="font-size: 1.8em; color: #1a202c; ...">Terapia para Adulto que Descobriu...</h2>
```

```
**② Remover o `<div class="lw-page-wrapper">` e `</div>` que envolvem tudo** — esse wrapper nunca vai ter CSS carregado pois as classes `lw-*` não existem no tema Astra.
```

**Resultado esperado:** O texto de sobreposição (bagunça visual) desaparece imediatamente. O conteúdo permanece funcional, mas sem estilização perfeita.

**Limitação desta solução:** O layout ainda ficará "cru" pois os estilos inline nas `<section>` do HTML foram pensados para uma página standalone, não para o container do Astra/Elementor.

***

### ✅ SOLUÇÃO 2 — CORREÇÃO ESTRUTURAL (Recomendada — 1 a 2 horas)

**Migrar o HTML para widgets nativos do Elementor**

Esta é a solução correta para esta postagem. O HTML tem 7 seções bem definidas que mapeiam perfeitamente para widgets do Elementor:

**Mapeamento do HTML → Widgets do Elementor:**


| Seção no HTML atual | Widget Elementor equivalente |
| :-- | :-- |
| `<section>` Hero com `<h1>` e `<p>` intro | ❌ Eliminar — o Astra já gera isso com o título do post |
| `<section>` "Você se Reconhece..." com `<h2>`, `<p>`, `<ul>`, `<img>` | ✅ Widget **Título** + Widget **Editor de Texto** + Widget **Imagem** |
| `<section>` "O que a Terapia Pode Fazer..." com `<h2>`, `<h3>`, `<p>`, `<ul>` | ✅ Widget **Título** + Widget **Editor de Texto** |
| `<section>` "Conheça o Psicólogo..." com `<h2>`, `<img>`, `<p>` | ✅ Widget **Título** + Widget **Imagem** + Widget **Editor de Texto** |
| `<section>` "Espaço Acolhedor..." com galeria de imagens | ✅ Widget **Galeria** ou 3x Widget **Imagem** |
| `<section>` FAQ com `<button>` accordion | ✅ Widget **Accordion** nativo do Elementor |
| `<section>` CTA Final com `<h2>`, `<a>` | ✅ Widget **Título** + Widget **Botão** |

**Vantagens desta abordagem:**

- Zero conflito de CSS — o Elementor gerencia todo o layout
- Responsividade automática (mobile, tablet, desktop)
- Edição visual sem precisar escrever HTML
- Os CTAs do WhatsApp viram widgets de Botão com controle de cor, hover etc.
- O FAQ vira um Accordion nativo funcional (sem precisar de JavaScript manual)

**Como executar:**

1. No Elementor, deletar o widget "Editor de Texto" atual
2. Adicionar uma nova Seção para cada bloco de conteúdo
3. Usar os widgets correspondentes listados acima
4. Copiar apenas o **texto** do HTML atual para cada widget (sem tags HTML)

***

### ✅ SOLUÇÃO 3 — SOLUÇÃO PRO (Para futuros posts com HTML gerado por IA — 30 min por post)

**Usar o widget "HTML" do Elementor em vez do "Editor de Texto"**

Quando for inevitável usar HTML bruto gerado externamente (por IA, por template, etc.), **o widget correto é o "HTML" (também chamado "Código HTML")**, não o "Editor de Texto".

**Diferença crítica entre os dois widgets:**


| Característica | Widget **Editor de Texto** | Widget **HTML** |
| :-- | :-- | :-- |
| Processa o HTML? | Parcialmente — o TinyMCE modifica/sanitiza o código | Sim — renderiza o HTML exatamente como está |
| Suporta `<section>`, `<button>`, `<script>`? | NÃO — remove ou quebra tags não-padrão | SIM |
| Interfere com o layout do Elementor? | SIM — conflita com os wrappers internos | Menos — mas ainda herda CSS do tema |
| Ideal para? | Textos formatados (negrito, listas, links simples) | Blocos HTML completos, scripts, embeds |

**Porém**, mesmo com o widget HTML, o `<h1>` duplicado ainda causa problema. A regra de ouro é:

```
> **Nunca usar `<h1>` dentro de conteúdo de post no WordPress/Elementor. O `<h1>` pertence exclusivamente ao título do post, gerado pelo tema.**
```


***

## PARTE 3 — PROTOCOLO PARA NOVOS POSTS COM HTML GERADO POR IA

Este é o protocolo definitivo para evitar que o erro se repita em qualquer postagem futura.

***

### 📋 CHECKLIST ANTES DE COLAR HTML NO ELEMENTOR

**1. Verificar hierarquia de títulos**

```
❌ NÃO use <h1> — já existe no título do post (Astra o gera)
✅ Use <h2> para títulos de seção
✅ Use <h3> para subtítulos
✅ Use <h4> para itens menores
```

**2. Remover wrappers de página completa**

```
❌ Remover: <div class="page-wrapper">, <div class="lw-page-wrapper">
❌ Remover: <html>, <head>, <body>
❌ Remover: <div class="container"> ou <div class="lw-container">
✅ Manter apenas o conteúdo interno das seções
```

**3. Remover seções Hero com título repetido**

```
❌ Qualquer <section> que contenha o mesmo texto do título do post
   deve ser eliminada — ela SEMPRE vai duplicar com o título do Astra
```

**4. Não usar classes CSS inexistentes no tema**

```
❌ Classes como .lw-hero-section, .lw-container, .lw-cta-button
   não existem no Astra — não têm efeito ou causam conflito
✅ Use apenas estilos inline ou classes nativas do Elementor/Astra
```

**5. Usar o widget correto**

```
Para textos simples (p, h2, h3, ul, ol, a): → Widget "Editor de Texto"
Para HTML complexo (section, button, script): → Widget "HTML"
Para landing pages completas: → Criar Página (não Post) com Elementor
```


***

### 🤖 PROMPT PADRÃO PARA GERAÇÃO DE HTML COMPATÍVEL COM WORDPRESS/ASTRA/ELEMENTOR

Quando solicitar HTML para um post a uma IA, inclua sempre estas instruções:

```
Gere o HTML para o corpo de um post WordPress que usa tema Astra 
e editor Elementor (widget Editor de Texto). 

REGRAS OBRIGATÓRIAS:
1. NÃO incluir <html>, <head>, <body>, <div class="wrapper"> nem nenhum 
   container de página completa
2. NÃO usar <h1> — o título já existe no tema
3. Começar diretamente com o primeiro <h2> ou <section> de conteúdo
4. Usar apenas estilos inline nas tags
5. NÃO criar classes CSS customizadas (não serão carregadas no tema)
6. NÃO duplicar o título do post no conteúdo
7. Para FAQ/accordion, usar apenas HTML simples (<details>/<summary>) 
   pois o JavaScript customizado não funciona no widget
8. O HTML deve funcionar dentro de um <div> já existente com max-width 
   e padding definidos pelo tema
```


***

### 🗂️ ESTRUTURA IDEAL DE UM POST HTML PARA WORDPRESS/ASTRA/ELEMENTOR

```html
<!-- ✅ CORRETO: Começa sem wrapper, sem <h1>, sem container -->

<!-- Seção 1: Introdução -->
<h2 style="font-size: 1.8em; color: #1a202c; margin-bottom: 20px;">
  Você se Reconhece Nestes Sinais?
</h2>
<p style="font-size: 1.1em; line-height: 1.6; margin-bottom: 20px;">
  Texto introdutório...
</p>

<!-- Seção 2: Lista -->
<ul style="list-style: disc; margin-left: 20px; font-size: 1.1em;">
  ><strong>Item:</strong> Descrição</li>
</ul>

<!-- Seção 3: CTA -->
<div style="text-align: center; margin: 40px 0;">
  <a href="https://wa.me/..." 
     style="display: inline-block; background-color: #007bff; 
            color: white; padding: 15px 30px; border-radius: 5px; 
            text-decoration: none; font-weight: bold;">
    Agende sua Consulta
  </a>
</div>

<!-- Seção 4: FAQ com HTML nativo (sem JavaScript) -->
<details style="margin-bottom: 10px; border: 1px solid #ddd; border-radius: 5px; padding: 15px;">
  <summary style="font-weight: bold; cursor: pointer; font-size: 1.1em;">
    Pergunta frequente?
  </summary>
  <p style="margin-top: 10px;">Resposta...</p>
</details>
```


***

## PARTE 4 — DECISÃO ARQUITETURAL: POST vs. PÁGINA

O problema mais profundo revelado por esta investigação é uma **decisão arquitetural equivocada**: um conteúdo que é uma **landing page** (com Hero, benefícios, autoridade, FAQ, CTA) foi criado como um **Post de blog**.

**Quando usar Post (Blog):**

- Conteúdo editorial, artigos, notícias
- SEO de cauda longa informacional
- Estrutura simples: título + texto + imagens
- O Astra controla o layout (cabeçalho do post, breadcrumb, comentários)

**Quando usar Página:**

- Landing pages de serviço (como esta de TEA adultos)
- Conteúdo com layout totalmente customizado
- Seções Hero, galeria, FAQ, múltiplos CTAs
- Elementor controla o layout completo (incluindo suprimir o título nativo)

**Recomendação estratégica:** Para conteúdos do tipo "Terapia para X em Goiânia", considere criar como **Página** no WordPress e não como Post. Nas Páginas, o Elementor tem a opção de ocultar o título nativo do tema nas configurações do post, e você tem controle total do layout sem os conflitos que um Post gera. Se o objetivo for SEO de blog, mantenha como Post mas adapte o HTML para a estrutura simples de post (sem seção Hero, sem `<h1>`).

***

## RESUMO EXECUTIVO

| Problema | Solução |
| :-- | :-- |
| `<h1>` duplicado sobrepostos | Remover o `<h1>` do HTML ou trocar por `<h2>` |
| Classes `lw-*` sem CSS | Remover wrappers `lw-page-wrapper` e `lw-container` |
| HTML de página inteira em widget | Migrar para widgets nativos do Elementor |
| Widget errado sendo usado | Usar widget "HTML" para código complexo |
| Seção Hero repetindo o título | Eliminar toda seção Hero do HTML do post |
| Futuros posts com HTML de IA | Usar o prompt padrão documentado acima |
| Estrutura Post vs. Página | Criar landing pages de serviço como "Página", não "Post" |



[^1]: https://hipnolawrence.com/wp-admin/post.php?post=898\&action=elementor

[^2]: https://hipnolawrence.com/wp-admin/post.php?post=898\&action=edit

[^3]: https://hipnolawrence.com/wp-admin/post.php?post=898\&action=edit

[^4]: https://hipnolawrence.com/wp-admin/admin.php?page=astra

[^5]: https://hipnolawrence.com/wp-admin/admin.php?page=elementor-settings

