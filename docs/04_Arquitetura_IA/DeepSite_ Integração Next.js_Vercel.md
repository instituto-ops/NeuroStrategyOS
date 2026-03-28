# **Análise Técnica e Arquitetural do Ecossistema DeepSite: Repositórios, Implementação Next.js e Evolução do Vibecoding para Geração de Aplicações Web**

O cenário do desenvolvimento de software contemporâneo atravessa uma transformação estrutural impulsionada pela convergência entre modelos de linguagem de grande escala (LLMs) e frameworks de front-end de alta performance. No epicentro desta mudança reside o DeepSite, uma plataforma que transcende a mera geração de código para estabelecer o que a comunidade técnica denomina "vibecoding".1 Este termo, embora coloquial, descreve uma mudança de paradigma onde a intenção e a descrição em linguagem natural substituem a sintaxe manual como o principal motor da criação de aplicações.1 A análise detalhada das versões desenvolvidas por Enzo (enzostvs) e seus forks subsequentes revela um ecossistema rico, variando de geradores de página única a sistemas complexos de multi-páginas capazes de sustentar blogs, landing pages e aplicações SaaS completas.3

## **A Gênese e Evolução das Arquiteturas DeepSite**

A trajetória do DeepSite é marcada por um refinamento constante tanto na interface do usuário quanto na sofisticação da orquestração de arquivos. O projeto original, hospedado predominantemente no Hugging Face Spaces, evoluiu através de marcos técnicos significativos que definem as capacidades de cada versão disponível atualmente para a comunidade de código aberto.3

### **DeepSite v2: A Fundação em Vite e Express**

A versão v2 estabeleceu o padrão para o que se esperava de um gerador de sites assistido por IA. Construída sobre uma stack moderna composta por React, TypeScript, Vite e Express, a v2 focava na velocidade de iteração e na visualização em tempo real.4 O motor desta versão era desenhado para interpretar descrições simples e convertê-las em aplicações web funcionais em questão de segundos.4 Uma das inovações críticas desta fase foi a integração do Monaco Editor, permitindo que desenvolvedores ajustassem manualmente o código gerado sem sair da plataforma.4

Em termos de implantação, a v2 foi projetada com uma mentalidade de containerização, oferecendo suporte robusto para Docker e Docker Compose.4 Isso permitiu que a ferramenta fosse executada em diversos ambientes, desde servidores locais até nuvens privadas, utilizando variáveis de ambiente para configurar chaves de API e limites de taxa (rate limiting) para proteção contra abusos de custos.4

### **DeepSite v3 e a Ascensão do DeepSeek-V3**

Com a introdução do DeepSeek-V3 como motor central, a versão v3 do DeepSite representou um salto na qualidade da codificação gerada. O modelo DeepSeek-V3-0324 demonstrou uma compreensão superior de frameworks de estilização como o Tailwind CSS e uma capacidade aprimorada de gerar layouts responsivos que se adaptam automaticamente a dispositivos móveis e desktops.2 Nesta fase, o DeepSite começou a ser reconhecido não apenas como uma ferramenta de prototipagem, mas como um assistente capaz de produzir código pronto para produção, integrando práticas de SEO (Search Engine Optimization) diretamente na estrutura HTML gerada.5

A v3 também refinou o sistema de visualização, onde as alterações solicitadas via chat eram aplicadas de forma incremental, permitindo que o usuário "esculturasse" o site através de refinamentos sucessivos.8 Este processo iterativo é fundamental para a criação de landing pages complexas, onde o posicionamento de elementos e a paleta de cores exigem ajustes finos que a geração em um único passo nem sempre alcança com perfeição.8

### **DeepSite v4: Arquitetura Multi-Página e Integração Next.js**

A iteração mais avançada do projeto oficial, a v4, marca a transição definitiva para sistemas de múltiplas páginas e roteamento dinâmico.3 Enquanto as versões anteriores eram limitadas por uma estrutura de arquivo único ou geravam aplicações estáticas simples, a v4 introduz a capacidade de criar sites interconectados com navegação fluida.3 A análise dos repositórios de arquivos revela uma migração significativa para a estrutura de diretórios app/, indicando o uso do Next.js App Router.10

Esta versão também otimiza o processo de implantação automática (auto-deploy), permitindo que mudanças no código sejam publicadas instantaneamente em ambientes de hospedagem gratuita com CDN global.3 Para o desenvolvedor que busca integração com o ecossistema Vercel, a v4 representa o auge da compatibilidade, utilizando recursos nativos de otimização de fontes e renderização no lado do servidor (SSR).11

| Componente Técnico | DeepSite v2 | DeepSite v4 (Hugging Face) |
| :---- | :---- | :---- |
| Framework Base | React \+ Vite | Next.js / Astro 4 |
| Backend Runtime | Node.js / Express | Next.js API Routes / Server Actions 4 |
| Persistência | Memória Volátil / LocalStorage | Supabase / IndexedDB / Hub API 13 |
| Gestão de Arquivos | Arquivo Único (SPA) | Multi-arquivos / Virtual File System 3 |
| Modelos de IA | GPT-4, DeepSeek-V2 | DeepSeek-V3, R1, MiniMax, Kimi 3 |
| Deployment Alvo | Docker / Local | Vercel / Hugging Face Spaces 4 |

## **Análise Comparativa de Repositórios para Integração Next.js/Vercel**

Para o objetivo específico de criar blogs, seções de páginas e landing pages em um sistema Next.js/Vercel, nem todos os repositórios DeepSite são equivalentes. É necessário distinguir entre o gerador (a aplicação que cria sites) e a estrutura gerada (o código que compõe o site final).16

### **O Repositório rakibulrocky14/deepsite2.0**

Atualmente, o repositório rakibulrocky14/deepsite2.0 destaca-se como a implementação mais robusta e pronta para produção fora do ambiente fechado do Hugging Face.13 Este projeto é um fork aprimorado do MadScientist85/Mydeepsite2 e foi especificamente arquitetado para facilitar a implantação na Vercel com um clique.13

As inovações técnicas presentes neste repositório incluem um sistema de suporte multi-provedor que permite alternar entre OpenAI, OpenRouter, XAI (Grok), Groq e Perplexity.13 Esta redundância é vital para garantir a disponibilidade do serviço caso um provedor específico sofra instabilidades ou atinja limites de cota.13 Além disso, a integração com o Supabase permite a persistência real das conversas e do estado dos projetos, transformando o DeepSite de um brinquedo de demonstração em uma ferramenta de desenvolvimento persistente.13

### **DeepStudio e o Sistema de Arquivos Virtual (VFS)**

O repositório deepstudio (agora evoluindo para osw-studio) oferece uma abordagem distinta, focada em capacidades agenticas.14 Baseado inicialmente em um fork da v2, o DeepStudio introduziu um Sistema de Arquivos Virtual que armazena arquivos em IndexedDB, permitindo que a IA manipule múltiplos arquivos HTML, CSS e JS de forma coordenada.14

Embora o DeepStudio seja voltado para sites estáticos, sua lógica de "agente" — capaz de executar comandos de shell e realizar edições granulares no código — fornece o blueprint necessário para criar sistemas de blog onde novos arquivos de posts precisam ser gerados e vinculados dinamicamente.14 Para a integração com Next.js, a arquitetura do DeepStudio demonstra como gerenciar sessões de edição complexas que podem ser posteriormente exportadas para o sistema de arquivos da Vercel através de rotas de API.14

### **LocalSite: Desenvolvimento Privado e Local**

Para desenvolvedores preocupados com privacidade ou custos de API em larga escala, o repositório Korben00/LocalSite oferece uma ponte para o Ollama.6 Ele permite utilizar modelos locais como o deepseek-r1:7b para gerar código, o que é ideal para fases de teste intensivo antes da implantação final na nuvem.6 Esta versão mantém a compatibilidade com o ecossistema DeepSite, permitindo a exportação do código gerado para estruturas Next.js padrão.6

## **Implementação Técnica em Ambiente Next.js e Vercel**

A integração de um gerador DeepSite em um projeto Next.js hospedado na Vercel exige a configuração precisa de rotas de API e variáveis de ambiente para garantir a performance e a segurança.

### **Configuração de API Routes e Streaming**

Nas versões mais recentes, como observado no código do DeepSite v4, a comunicação com a IA é realizada através de rotas de streaming no Next.js.10 A rota app/api/ask-ai/route.ts é responsável por gerenciar o fluxo de tokens provenientes do provedor de inferência (como Hugging Face Inference ou OpenAI) e enviá-los em tempo real para o cliente.10 Isso permite que a interface do usuário mostre o código sendo gerado progressivamente, o que é essencial para o feedback visual imediato característico do vibecoding.5

Para o sucesso da implantação na Vercel, o parâmetro maxDuration nas configurações do projeto deve ser estendido. Modelos de raciocínio como o DeepSeek-R1 podem levar mais tempo para processar solicitações complexas de design, e o limite padrão de 10 segundos da conta gratuita da Vercel pode causar falhas nas requisições.4 Configurar este valor para 60 segundos é uma prática recomendada para evitar timeouts durante a geração de seções extensas de blog ou landing pages.4

### **Gerenciamento de Variáveis de Ambiente**

O ecossistema DeepSite depende fortemente de variáveis de ambiente para orquestrar os diferentes provedores e serviços auxiliares.4

| Variável | Descrição | Importância para Next.js/Vercel |
| :---- | :---- | :---- |
| OPENAI\_API\_KEY | Chave para modelos GPT ou DeepSeek (via API compatibility) | Essencial para o motor de geração de código 4 |
| OPENAI\_BASE\_URL | URL do endpoint (ex: api.deepseek.com/v1) | Permite usar modelos de baixo custo com a SDK da OpenAI 4 |
| OPENAI\_MODEL | Identificador do modelo (ex: deepseek-chat) | Define a qualidade e o estilo do código gerado 4 |
| SUPABASE\_URL | Endpoint da instância Supabase | Necessário para persistência de projetos e histórico 13 |
| IP\_RATE\_LIMIT | Limite de requisições por IP | Crucial para evitar custos inesperados em sites públicos 4 |
| APP\_PORT | Porta de execução da aplicação | Geralmente 3000 para Next.js na Vercel 4 |

### **Arquitetura de Pastas e Componentes**

A organização do código gerado deve seguir as convenções do Next.js para garantir a máxima compatibilidade com a Vercel. O repositório rakibulrocky14/deepsite2.0 utiliza uma estrutura que separa claramente a lógica do servidor (actions/ e api/) da lógica do cliente (components/ e app/).13

Para a criação de blogs e landing pages, a IA deve ser instruída — através do arquivo lib/prompts.ts — a gerar componentes modulares utilizando Tailwind CSS.15 Isso evita o acúmulo de classes super longas em um único arquivo HTML, permitindo que cada seção (hero, grade de posts do blog, formulário de contato) seja tratada como um componente Next.js independente.15

## **Estratégias de Prompt Engineering para Blogs e Landing Pages**

O coração da funcionalidade do DeepSite reside em seu sistema de prompts. O arquivo prompts.ts atua como o manual de instruções para o LLM, definindo restrições de estilo, requisitos de performance e padrões de UX/UI.15

### **Geração de Seções e Blogs**

Para criar uma seção de blog funcional, o prompt do sistema no DeepSite v4 e versões subsequentes impõe que o código gerado seja sempre responsivo e amigável para dispositivos móveis.15 O modelo é instruído a imaginar a melhor solução possível mesmo quando os detalhes fornecidos pelo usuário são escassos, garantindo que elementos como navegação, paginação e meta tags de SEO sejam incluídos por padrão.8

A análise das interações em fóruns de usuários indica que a melhor forma de gerar blogs complexos é através da iteração progressiva.8 O usuário pode iniciar com um comando como "Crie um blog minimalista para notícias de tecnologia" e, em seguida, solicitar refinamentos específicos: "Adicione uma seção de posts em destaque com hover effects" ou "Mude o sistema de navegação para uma barra lateral sticky".8 O sistema de "Vibe-coding" otimizado para o DeepSeek-V3 permite que estas mudanças sejam aplicadas mantendo a consistência do design anterior.2

### **Otimização de Imagens e Ativos**

Um desafio comum na geração automática de sites é o tratamento de ativos visuais. O ecossistema DeepSite lida com isso através de "mentions" e placeholders inteligentes.19 Em uma integração Next.js, é recomendável substituir os links de imagem genéricos gerados pela IA pelo componente next/image, permitindo otimização automática de tamanho e carregamento preguiçoso (lazy loading) na infraestrutura da Vercel.11

## **O Papel dos Modelos Open Source na Performance de Codificação**

A escolha do modelo é o fator determinante na qualidade da saída do DeepSite. Em 2025, os modelos da família DeepSeek tornaram-se o padrão ouro para ferramentas de geração de sites devido à sua eficiência em tarefas de codificação competitiva e raciocínio lógico.2

### **Comparativo de Performance de Modelos em Geração de Código**

| Modelo | Pipeline de Tarefa | Performance em Codificação | Recomendação de Uso |
| :---- | :---- | :---- | :---- |
| DeepSeek-V3-0324 | Text-to-App | Alta (Especialista em Tailwind) 2 | Landing pages e prototipagem rápida 2 |
| DeepSeek-R1-0528 | Reasoning-first | Muito Alta (Lógica de Backend) 2 | Lógica de blogs e sistemas multi-página 2 |
| OlympicCoder-7B | Competitive Coding | Excepcional em algoritmos 2 | Otimização de scripts JS complexos 2 |
| Qwen 2.5 Omni | Multimodal | Equilibrada (Texto/Visão) 7 | Interfaces interativas com suporte a imagem 7 |
| GPT-4o | Generalista | Consistente e Estável 4 | Orquestração de API e fluxos complexos 4 |

A integração destes modelos via OpenRouter ou Hugging Face Inference Endpoints permite que o DeepSite acesse o estado da arte da IA sem a necessidade de infraestrutura local massiva.13 Para o usuário de Vercel, o uso de provedores de API externos é ideal, pois as funções serverless do Next.js podem atuar apenas como intermediárias, reduzindo o consumo de memória no servidor de borda.13

## **Fluxo de Trabalho: Do Repositório Hugging Face para a Vercel**

Para obter a versão mais avançada e funcional para integração em 2025, o processo recomendado envolve a manipulação direta do Space oficial de enzostvs ou seus forks qualificados.18

### **Passo 1: Duplicação e Extração de Código**

O ponto de partida ideal é o Space enzostvs/deepsite no Hugging Face.18 Devido à licença MIT, o código pode ser duplicado e modificado livremente.6 Através da CLI do Hugging Face (hf download), o desenvolvedor pode baixar o snapshot completo do repositório para o ambiente de desenvolvimento local.25

Este processo de extração revela a estrutura interna do projeto, permitindo a remoção de dependências específicas de execução no Hugging Face (como configurações de login internas) e a adaptação para uma aplicação Next.js pura que pode ser enviada para o GitHub.10

### **Passo 2: Adaptação para o Framework Next.js**

Muitas versões do DeepSite utilizam Vite para o front-end, mas a migração para Next.js é facilitada pelo fato de ambos usarem React e TypeScript.4 Ao mover o código para um template Next.js, o desenvolvedor deve:

1. Migrar os componentes do gerador para a pasta components/.  
2. Converter as rotas do Express para Next.js API Routes (utilizando app/api/).  
3. Implementar o Server-Side Streaming para a geração de código, garantindo que o tempo de resposta seja otimizado para a infraestrutura da Vercel.10

### **Passo 3: Deployment e Automação**

Uma vez que o código esteja no GitHub em um formato compatível com Next.js, a integração com a Vercel torna-se trivial. O repositório rakibulrocky14/deepsite2.0 já inclui os arquivos necessários para esta automação, permitindo que cada commit no branch main resulte em uma nova implantação estável.13 A utilização de ações do GitHub (GitHub Actions) pode ser configurada para automatizar testes e garantir que as alterações no motor de IA não quebrem a geração de seções e blogs.4

## **Considerações sobre UX, SEO e Design Gerado**

Um dos maiores diferenciais das versões v3 e v4 do DeepSite é o foco em "Perfect UX" e "SEO Ready".3 Para aplicações de blog e landing pages, isso significa que a IA não gera apenas o conteúdo visual, mas também a semântica correta.

### **Semântica e Acessibilidade**

O motor de geração é programado para utilizar tags HTML5 semânticas como \<header\>, \<article\>, \<section\> e \<footer\>.8 Além disso, o uso de Tailwind CSS garante que as classes de responsividade (como md:, lg:) sejam aplicadas corretamente, garantindo que o site funcione em qualquer dispositivo sem intervenção manual.4 Para blogs, o sistema pode ser instruído a gerar automaticamente o esquema de dados JSON-LD, o que melhora significativamente a classificação nos mecanismos de busca.5

### **Velocidade de Carregamento e Performance na Borda**

Ao hospedar a aplicação na Vercel, o DeepSite se beneficia da computação na borda (edge computing) e do cache inteligente.3 Como o Next.js permite o Static Site Generation (SSG) e o Incremental Static Regeneration (ISR), as páginas de blog geradas podem ser servidas com velocidade quase instantânea, enquanto novos posts podem ser criados dinamicamente via IA e publicados sem a necessidade de um rebuild completo de todo o projeto.3

## **Conclusões sobre a Melhor Abordagem Técnica**

Para desenvolvedores e empresas que buscam o melhor repositório DeepSite hoje para integração Next.js/Vercel, a evidência técnica aponta para uma estratégia híbrida. O repositório rakibulrocky14/deepsite2.0 oferece a base de infraestrutura mais sólida para deployment imediato, com suporte nativo a bancos de dados como o Supabase e configuração completa de variáveis de ambiente para a Vercel.13

Contudo, para capturar as funcionalidades mais recentes de múltiplas páginas e roteamento dinâmico — essenciais para blogs e aplicações SaaS — o desenvolvedor deve integrar elementos do código fonte do DeepSite v4 disponível no Hugging Face.3 Esta versão v4, embora exija uma adaptação manual mais cuidadosa do Space original de enzostvs, fornece os módulos de ações e API routes necessários para um sistema de gerenciamento de conteúdo moderno alimentado por IA.10

A escolha do modelo DeepSeek-V3 ou R1, aliada a uma stack Next.js/Tailwind e hospedagem Vercel, cria um ambiente de desenvolvimento onde o tempo entre a ideia e a página de blog funcional é reduzido em cerca de 95% em comparação aos métodos tradicionais.2 O futuro do desenvolvimento web, como demonstrado pelo ecossistema DeepSite, reside nesta simbiose entre a precisão da IA e a performance dos frameworks modernos, permitindo que a criatividade humana se concentre no valor do negócio enquanto a infraestrutura de código é gerada de forma autônoma e otimizada.2

#### **Trabalhos citados**

1. enzo enzostvs \- GitHub, acesso a março 28, 2026, [https://github.com/enzostvs](https://github.com/enzostvs)  
2. HuggingFaceEvalInternal (HuggingFaceEval), acesso a março 28, 2026, [https://huggingface.co/organizations/HuggingFaceEvalInternal/activity/all](https://huggingface.co/organizations/HuggingFaceEvalInternal/activity/all)  
3. DeepSite | Build with AI, acesso a março 28, 2026, [https://enzostvs-deepsite.hf.space/](https://enzostvs-deepsite.hf.space/)  
4. deepsite2.0/README.en.md at main · rakibulrocky14/deepsite2.0 · GitHub, acesso a março 28, 2026, [https://github.com/rakibulrocky14/deepsite2.0/blob/main/README.en.md](https://github.com/rakibulrocky14/deepsite2.0/blob/main/README.en.md)  
5. DeepSite AI \- Free Online Responsive Website Generator AI, No Coding Required, acesso a março 28, 2026, [https://deepsiteai.com/](https://deepsiteai.com/)  
6. Korben00/LocalSite \- GitHub, acesso a março 28, 2026, [https://github.com/Korben00/LocalSite](https://github.com/Korben00/LocalSite)  
7. $41B raised today (OpenAI @ 300b, Cursor @ 9.5b, Etched @ 1.5b) | AINews, acesso a março 28, 2026, [https://news.smol.ai/issues/25-03-31-ainews-greaterdollar41b-raised-today-openai-300b-cursor-95b-etched-15b/](https://news.smol.ai/issues/25-03-31-ainews-greaterdollar41b-raised-today-openai-300b-cursor-95b-etched-15b/)  
8. DeepSite In-Depth: A Secure & Efficient AI Builder in 2025? \- Skywork.ai, acesso a março 28, 2026, [https://skywork.ai/skypage/en/DeepSite-In-Depth-A-Secure-Efficient-AI-Builder-in-2025/1976564422615822336](https://skywork.ai/skypage/en/DeepSite-In-Depth-A-Secure-Efficient-AI-Builder-in-2025/1976564422615822336)  
9. I Built 5 Different Websites in 5 Minutes With Deepsite v2 (You Won't Believe What Happened) : r/AISEOInsider \- Reddit, acesso a março 28, 2026, [https://www.reddit.com/r/AISEOInsider/comments/1m0bctj/i\_built\_5\_different\_websites\_in\_5\_minutes\_with/](https://www.reddit.com/r/AISEOInsider/comments/1m0bctj/i_built_5_different_websites_in_5_minutes_with/)  
10. enzostvs/deepsite · Upload 35 files \- Hugging Face, acesso a março 28, 2026, [https://huggingface.co/spaces/enzostvs/deepsite/discussions/197/files](https://huggingface.co/spaces/enzostvs/deepsite/discussions/197/files)  
11. note4yaoo/lib-ai-app-examples-saas-apps.md at main · uptonking, acesso a março 28, 2026, [https://github.com/uptonking/note4yaoo/blob/main/lib-ai-app-examples-saas-apps.md](https://github.com/uptonking/note4yaoo/blob/main/lib-ai-app-examples-saas-apps.md)  
12. linusorii/deepsite-v2 at 13ae717 \- initial commit \- Hugging Face, acesso a março 28, 2026, [https://huggingface.co/spaces/linusorii/deepsite-v2/commit/13ae7170d05b98a3306ae9f2f0fff9d4de8dac5e](https://huggingface.co/spaces/linusorii/deepsite-v2/commit/13ae7170d05b98a3306ae9f2f0fff9d4de8dac5e)  
13. rakibulrocky14/deepsite2.0: Enhanced Deepsite \- GitHub, acesso a março 28, 2026, [https://github.com/rakibulrocky14/deepsite2.0](https://github.com/rakibulrocky14/deepsite2.0)  
14. DeepStudio \- Google AI Studio's App Builder at home (for static html ..., acesso a março 28, 2026, [https://www.reddit.com/r/LocalLLaMA/comments/1nokxsj/deepstudio\_google\_ai\_studios\_app\_builder\_at\_home/](https://www.reddit.com/r/LocalLLaMA/comments/1nokxsj/deepstudio_google_ai_studios_app_builder_at_home/)  
15. acesso a março 28, 2026, [https://huggingface.co/spaces/enzostvs/deepsite/raw/main/lib/prompts.ts](https://huggingface.co/spaces/enzostvs/deepsite/raw/main/lib/prompts.ts)  
16. How to edit website after huggingface has built it \- Beginners \- Hugging Face Forums, acesso a março 28, 2026, [https://discuss.huggingface.co/t/how-to-edit-website-after-huggingface-has-built-it/153781](https://discuss.huggingface.co/t/how-to-edit-website-after-huggingface-has-built-it/153781)  
17. How many files and how many pages \- Beginners \- Hugging Face Forums, acesso a março 28, 2026, [https://discuss.huggingface.co/t/how-many-files-and-how-many-pages/153480](https://discuss.huggingface.co/t/how-many-files-and-how-many-pages/153480)  
18. deepsite\_nocode\_dup.md · John6666/forum1 at ... \- Hugging Face, acesso a março 28, 2026, [https://huggingface.co/datasets/John6666/forum1/blob/5cb0839c96e6db2b98cd603a2914a1c3b5bd6e93/deepsite\_nocode\_dup.md](https://huggingface.co/datasets/John6666/forum1/blob/5cb0839c96e6db2b98cd603a2914a1c3b5bd6e93/deepsite_nocode_dup.md)  
19. enzostvs/deepsite · Update index.html \- Hugging Face, acesso a março 28, 2026, [https://huggingface.co/spaces/enzostvs/deepsite/discussions/67/files](https://huggingface.co/spaces/enzostvs/deepsite/discussions/67/files)  
20. Open Agents \- Hugging Face, acesso a março 28, 2026, [https://huggingface.co/organizations/open-agents/activity/all](https://huggingface.co/organizations/open-agents/activity/all)  
21. What do people use for simple one-page websites these days? : r/webdev \- Reddit, acesso a março 28, 2026, [https://www.reddit.com/r/webdev/comments/1l8dxse/what\_do\_people\_use\_for\_simple\_onepage\_websites/](https://www.reddit.com/r/webdev/comments/1l8dxse/what_do_people_use_for_simple_onepage_websites/)  
22. enzostvs/deepsite at main \- Hugging Face, acesso a março 28, 2026, [https://huggingface.co/spaces/enzostvs/deepsite/tree/main/lib](https://huggingface.co/spaces/enzostvs/deepsite/tree/main/lib)  
23. Open Source: AI News Week Ending 04/04/2025 \- Ethan B. Holland, acesso a março 28, 2026, [https://ethanbholland.com/2025/04/04/open-source-ai-news-week-ending-04-04-2025/](https://ethanbholland.com/2025/04/04/open-source-ai-news-week-ending-04-04-2025/)  
24. acesso a março 28, 2026, [https://huggingface.co/datasets/John6666/forum1/resolve/b227959a3c2fd1e3a99d31261abc0e8e133fc457/deepsite\_nocode\_dup.md?download=true](https://huggingface.co/datasets/John6666/forum1/resolve/b227959a3c2fd1e3a99d31261abc0e8e133fc457/deepsite_nocode_dup.md?download=true)  
25. hugging-face-cli | Skills Marketplace \- LobeHub, acesso a março 28, 2026, [https://lobehub.com/it/skills/techwavedev-agi-agent-kit-hugging-face-cli](https://lobehub.com/it/skills/techwavedev-agi-agent-kit-hugging-face-cli)  
26. skills/skills/hugging-face-cli/references/examples.md at main · huggingface/skills \- GitHub, acesso a março 28, 2026, [https://github.com/huggingface/skills/blob/main/skills/hugging-face-cli/references/examples.md](https://github.com/huggingface/skills/blob/main/skills/hugging-face-cli/references/examples.md)  
27. huggingface\_hub/docs/source/en/guides/cli.md at main \- GitHub, acesso a março 28, 2026, [https://github.com/huggingface/huggingface\_hub/blob/main/docs/source/en/guides/cli.md](https://github.com/huggingface/huggingface_hub/blob/main/docs/source/en/guides/cli.md)  
28. Command Line Interface (CLI) \- Hugging Face, acesso a março 28, 2026, [https://huggingface.co/docs/huggingface\_hub/guides/cli](https://huggingface.co/docs/huggingface_hub/guides/cli)  
29. deepsite2.0/.dockerignore at main · rakibulrocky14/deepsite2.0 · GitHub, acesso a março 28, 2026, [https://github.com/rakibulrocky14/deepsite2.0/blob/main/.dockerignore](https://github.com/rakibulrocky14/deepsite2.0/blob/main/.dockerignore)