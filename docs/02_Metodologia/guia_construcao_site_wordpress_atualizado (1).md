# Guia Técnico de Construção do Site WordPress: Terapia em Goiânia

## Introdução

Este documento apresenta a versão atualizada e expandida do guia técnico de construção do site WordPress, agora incorporando a metodologia completa do "Método Abidos" para criação de landing pages de alta conversão. O guia anterior abordou a estrutura básica baseada na análise do arquivo JSON do Elementor, mas esta versão aprofunda significativamente todos os aspectos técnicos, incorporando as cinco camadas fundamentais que tornam um site verdadeiramente eficiente para captação de clientes locais.

A metodologia Abidos representa um dos frameworks mais testados e comprovados para construção de máquinas de vendas digitais no nicho de serviços locais. Baseada no caso de estudo do "Espaço Abidos Massagem", uma clínica de terapias corporais localizada em Goiânia, esta metodologia integra cinco camadas fundamentais de otimização que, quando aplicadas em conjunto, criam uma estrutura capaz de dominar as buscas locais e converter visitantes em clientes com alta eficiência.

Este guia técnico é destinado a desenvolvedores, profissionais de marketing digital e gestores de projetos que desejam implementar um site que vá além do design visual bonito, transformando-se em uma verdadeira ferramenta de captação de leads e vendas. Cada seção deste documento aborda um aspecto específico da construção, desde a configuração inicial do ambiente até os testes finais de qualidade, passando pela implementação de estratégias avançadas de SEO, copywriting persuasivo e otimização para conversão.

A aplicação correta deste guia resultará em um site que não apenas atrai visitantes através de buscas orgânicas e pagas, mas também converte esses visitantes em clientes através de uma jornada de usuário otimizada, elementos de confiança e chamadas para ação estratégicas.

---

## 1. Configuração do Ambiente WordPress

### 1.1 Requisitos do Servidor e Hospedagem

Antes de iniciar a construção do site, é fundamental garantir que o ambiente de hospedagem atenda aos requisitos mínimos para o WordPress funcionar de forma eficiente. Para um site baseado em Elementor com as funcionalidades planejadas, a hospedagem deve oferecer no mínimo PHP 8.0 ou superior, com limite de memória de pelo menos 256MB para garantir que o construtor visual opere sem problemas de performance.

O banco de dados deve ser configurado com MySQL 5.7 ou superior, ou alternativamente MariaDB 10.3 ou superior. Recomenda-se utilizar serviços de hospedagem que ofereçam suporte a SSL gratuito através do Let's Encrypt, essencial para a segurança do site e para o ranqueamento nos mecanismos de busca. A escolha de uma hospedagem com servidores localizados na região brasileira é recomendada para garantir tempos de carregamento mais rápidos para o público-alvo em Goiânia.

Recomenda-se também verificar se o plano de hospedagem inclui suporte para CDN (Content Delivery Network), que será fundamental para a entrega rápida de imagens e outros arquivos estáticos. Serviços como Cloudflare ou BunnyCDN podem ser configurados adicionalmente para melhorar ainda mais a performance global do site.

A configuração técnica recomendada para o servidor inclui: versão do PHP 8.2 ou superior, limites de memória de 512MB para operações mais pesadas, suporte a HTTP/2 para carregamento mais rápido de assets, e possibilidade de configuração de cache no nível do servidor através de plugins como LiteSpeed Cache ou similar.

### 1.2 Instalação do WordPress e Configurações Básicas

A instalação do WordPress deve ser realizada através do instalador automático oferecido pela hospedagem ou manualmente através do pacote disponível em wordpress.org. Após a instalação base, algumas configurações iniciais no painel administrativo são essenciais para preparar o ambiente para a construção com Elementor e implementação da metodologia Abidos.

Nas configurações gerais do WordPress, deve-se definir o título do site como "Terapia em Goiânia | Maryah Bernardes" e o slogan como "Psicoterapia com foco claro no problema, direção no processo e resultados consistentes". O fuso horário deve ser configurado como "América/São Paulo" para garantir que agendamentos e publicações sejam exibidos corretamente no horário local.

As configurações de permalink devem ser alteradas para o formato "Nome do post" para URLs mais amigáveis tanto para usuários quanto para mecanismos de busca. Esta configuração é fundamental para o SEO do site, pois cria URLs descritivas que incluem as palavras-chave relevantes para cada página. O formato recomendado deve seguir a estrutura de silos: /servico-em-cidade/ ou /categoria/servico/.

A configuração de HTTPS deve ser forçada através do arquivo .htaccess ou das configurações do plugin de cache, garantindo que todas as páginas sejam servidas através de conexão segura. Isso é importante tanto para a segurança quanto para o ranqueamento no Google.

### 1.3 Instalação e Configuração de Plugins Essenciais

A seleção adequada de plugins é crucial para garantir as funcionalidades necessárias sem comprometer a performance do site. O conjunto mínimo de plugins necessários inclui o Elementor Pro para a construção das páginas, o Rank Math SEO para todas as otimizações de SEO técnico, um plugin de formulários como WPForms ou Contact Form 7 para captura de leads, e um plugin de cache para otimização de performance.

O Rank Math SEO merece destaque especial na metodologia Abidos. Este plugin é considerado o "motor" do SEO dentro do site, oferecendo uma gama completa de funcionalidades que incluem: otimizações automáticas de SEO, configuração de Títulos, Descrições e Palavras-chave, monitor de erro 404 e redirecionamento automático, SEO de imagens com otimização de peso e tags, indexação instantânea que conecta o site diretamente ao Google Search Console, sitemaps e dados estruturados para melhor compreensão do conteúdo pelos mecanismos de busca.

Recomenda-se fortemente a aquisição da versão Pro do Rank Math, que é muito acessível (aproximadamente R$ 30 anuais) e oferece funcionalidades avançadas que fazem diferença significativa no ranqueamento. As funções avançadas incluem análise de conteúdo mais detalhada, módulos de SEO local, redirecionamentos avançados e suporte prioritário.

O Elementor Pro deve ser instalado e ativado com a licença válida para garantir acesso a todos os recursos avançados, incluindo o Theme Builder para criação de templates de header e footer, popups e widgets dinâmicos. A configuração inicial do Elementor deve incluir a ativação dos recursos experimentais recomendados, como os containers Flexbox e o Improved Asset Loading, que otimizam o carregamento dos arquivos CSS e JavaScript.

Para o tratamento de formulários, recomenda-se utilizar o WPForms na versão Pro para ter acesso a funcionalidades avançadas como notificações por SMS e integração com CRM. Caso opte pelo Contact Form 7, será necessário configurar um serviço SMTP como o WP Mail SMTP para garantir que os emails de contato sejam entregues corretamente sem cair na spam.

---

## 2. Arquitetura de Silos e Estrutura de URLs

### 2.1 Conceito de Silos na Metodologia Abidos

A arquitetura de silos é um dos pilares fundamentais da metodologia Abidos e representa uma das estratégias mais eficientes para dominação de buscas locais. O conceito baseia-se na organização do conteúdo em grupos temáticos relacionados, onde cada "silo" representa um tópico principal que se ramifica em páginas mais específicas.

O Google odeia sites confusos. A estrutura de "Silos" (também conhecida como Hub and Spoke) resolve esse problema criando uma arquitetura onde a página inicial serve como um grande cardápio que apresenta a autoridade do local e distribui o usuário e os robôs do Google para as páginas internas específicas. Os "Spokes" ou Ramos são as páginas ou seções internas dedicadas a cada serviço específico.

A vantagem prática desta estrutura é que se alguém pesquisa por um termo específico como "Hipnose Clínica em Goiânia", o Google não joga a pessoa na página inicial genérica. Ele manda direto para a página específica daquele serviço. Isso aumenta a relevância da busca, barateia o clique no Google Ads e melhora significativamente o ranqueamento orgânico.

A coesão dessa arquitetura de conteúdo reside na linkagem interna. Cada serviço principal atua como um silo isolado em termos de URL, mas eles são interconectados na base da página através de uma seção "Veja também" ou através de links contextuais no corpo do texto. Este modelo de rede semântica não apenas distribui o Link Equity homogeneamente pelo domínio, mas também induz o usuário a prolongar sua sessão explorando outros serviços, enviando ao Google um fortíssimo sinal de engajamento com alto Dwell Time e baixa Bounce Rate.

### 2.2 Estrutura de URLs Recomendada

A estrutura de URLs deve seguir um padrão consistente que inclua sempre o serviço combinado com a localização. Esta é uma das táticas mais poderosas de SEO local que o algoritmo do Google recompensa com melhores posicionamentos.

A estrutura recomendada segue o formato: dominio.com.br/servico-em-cidade/. Por exemplo: /terapia-para-ansiedade-em-goiania/, /tratamento-para-depressao-em-goiania/, /hipnose-clinica-em-goiania/ e /avaliacao-psicologica-goiania/.

Para páginas de categorias mais amplas, pode-se utilizar o formato: dominio.com.br/categoria/servico-especifico/. Por exemplo: /servicos/terapia-cognitivo-comportamental-goiania/ ou /tratamentos/terapia-breve-goiania/.

Cada URL deve ser curta, descritiva e incluir a palavra-chave principal. Evita-se o uso de números, datas ou caracteres especiais nas URLs. O slug deve refletir exatamente o conteúdo da página para garantir relevância máxima.

### 2.3 Mapa do Site

O mapa do site deve refletir a estrutura de silos, garantindo que tanto os usuários quanto os mecanismos de navegação consigam encontrar todas as páginas importantes. A estrutura recomendada inclui:

A página Home serve como hub central com marca, autoridade geral e links para os silos principais. Esta página deve ter o maior Volume de backlinks internos e externos, concentrando a autoridade do domínio.

As Páginas de Silo Pai são páginas pilares com conteúdo denso sobre um tema principal. Por exemplo: uma página sobre "Terapia em Goiânia" que abrange todos os tipos de terapia oferecida.

As Páginas de Silo Filho são variações geolocalizadas de cada serviço específico. Por exemplo: "Terapia Cognitivo-Comportamental em Goiânia", "Hipnose Clínica em Goiânia", "Terapia de Ansiedade em Goiânia".

O Blog deve servir como apoio com artigos respondendo dúvidas específicas (palavras-chave de cauda longa) que apontam para as páginas de silo através de links internos estratégicos.

---

## 3. Configuração do Sistema de Design Global

### 3.1 Definição das Cores Globais

O sistema de cores globais deve ser configurado diretamente no painel do Elementor através do recurso Site Settings, garantindo consistência visual em todas as páginas do site. A análise do arquivo JSON original e da metodologia Abidos revela uma estrutura de cores baseada em variáveis globais que deve ser replicada no ambiente WordPress.

A cor primária deve ser configurada como um tom escuro que transmita profissionalismo e seriedade, adequada para serviços de saúde mental. Recomenda-se a utilização de um hexadecimal próximo a #2A2A2A ou #1A1A1A para títulos e elementos principais que requerem alto contraste.

A cor de destaque deve ser configurada como um tom que crie contraste com o fundo e chame atenção para os elementos de chamada para ação. Pode-se utilizar um tom alaranjado (#F28C28) ou azul profissional (#0073E6) dependendo da identidade visual desejada.

As cores de fundo devem incluir um branco puro (#FFFFFF) para seções de conteúdo principal e tons mais suaves como #F9F9F9 para seções alternadas ou cards de informação. A cor de texto secundária deve ser configurada como um cinza médio para parágrafos e descrições que não requerem o mesmo peso visual dos títulos.

Todas estas cores devem ser configuradas como variáveis globais no Elementor, permitindo alterações centralized que se propagam por todo o site automaticamente.

### 3.2 Configuração da Tipografia Global

A tipografia do site deve ser configurada através do painel Global Fonts do Elementor, definindo famílias tipográficas que transmitam profissionalismo e sejam facilmente legíveis. A metodologia Abidos recomenda o uso de famílias limpas e modernas.

A família Sans-Serif como Montserrat, Poppins, Open Sans ou Hind Siliguri é recomendada para serviços modernos. A família deve ser configurada como fonte padrão para todos os elementos de texto, com peso variando entre 400 para texto normal e 500 ou 600 para enfatizações e botões.

Para os títulos principais (H1), recomenda-se configurar um tamanho entre 2.5em e 3em em desktop, reduzindo para 1.8em a 2em em dispositivos móveis. Os subtítulos (H2) devem ter aproximadamente 60% do tamanho do H1, enquanto os títulos de seção (H3) devem estar em torno de 50% do tamanho principal.

O espaçamento entre letras (letter-spacing) deve ser configurado com valores negativos sutis para títulos (-0.5px a -1px) para criar um appearance mais sofisticado, enquanto o espaçamento entre linhas (line-height) deve ser configurado entre 1.4 e 1.6 para garantir boa legibilidade nos parágrafos de texto corrido.

### 3.3 Configurações de Espaçamento e Layout

O sistema de espaçamento global deve ser configurado para garantir consistência vertical em todas as seções do site. O padding vertical padrão para seções deve ser definido entre 80px e 100px em desktop, reduzido para 60px em tablets e 40px em dispositivos móveis para manter a proporcionalidade em diferentes tamanhos de tela.

O gap padrão entre colunas e elementos deve ser configurado como 20px a 30px, dependendo da densidade visual desejada para cada seção. Containers com elementos mais densos, como grids de serviços, podem utilizar gaps menores, enquanto seções com elementos mais espaçados podem utilizar valores maiores.

A largura máxima do conteúdo deve ser configurada como 1200px para layouts boxed ou 1400px para layouts full-width, dependendo do design pretendido para cada seção. É importante manter consistência na largura utilizada para que o site apresente um appearance organizado e profissional em todas as páginas.

---

## 4. Estrutura do Header e Navegação

### 4.1 Configuração do Template Global de Header

O header do site deve ser configurado como um template global através do Theme Builder do Elementor Pro, permitindo que alterações sejam aplicadas automaticamente em todas as páginas. A metodologia Abidos enfatiza a importância de um header que transmita profissionalismo e facilite a navegação.

A estrutura recomendada para o header consiste em um container flexbox com três áreas principais: logo à esquerda, menu de navegação ao centro e botão de chamada para ação à direita. O container deve ter altura fixa de aproximadamente 80px a 100px em desktop, com padding horizontal de 20px a 30px para garantir espaçamento adequado dos elementos.

O comportamento sticky do header deve incluir um efeito de transição visual quando a página é rolada, como mudança na cor de fundo de transparente para sólido ou a adição de uma sombra sutil. Este efeito pode ser implementado através das configurações de Sticky do Elementor Pro ou através de custom CSS para maior controle sobre a transição.

O logo deve ser implementado como um widget de imagem com link para a home page, dimensões adequadas e atributo alt preenchido com palavras-chave relevantes como "Terapia em Goiânia | Maryah Bernardes". Caso o logo seja texto, deve-se utilizar o widget de Site Logo do Elementor para garantir a funcionalidade correta.

### 4.2 Configuração do Menu de Navegação

O menu de navegação deve ser implementado utilizando o Nav Menu do Elementor, que oferece diversas opções de personalização incluindo estilos de pointer, efeitos de hover e responsividade. Os itens do menu devem refletir a estrutura de silos do site, incluindo: Home, Sobre, Serviços (com submenu detalhado), Depoimentos, Blog e Contato.

A configuração de pointer deve utilizar o estilo "Underline" ou "Background" para indicar visualmente o item ativo ou com hover, criando uma experiência de usuário mais interativa e profissional. A cor do pointer deve corresponder à cor de destaque do site para manter consistência com a identidade visual.

Para dispositivos móveis, o menu deve ser configurado para aparecer como um hamburger toggle que abre um painel off-canvas ou dropdown. O painel mobile deve ter fundo sólido, listar todos os itens do menu com tamanho de fonte adequado para toque (mínimo 16px) e incluir o botão de contato direto via WhatsApp para facilitar a conversão.

### 4.3 Botão de Call-to-Action

O botão de call-to-action no header deve ser implementado utilizando o widget de Button do Elementor, com texto que incentive a ação direta como "Agendar Consulta" ou "Falar no WhatsApp". O botão deve ter fundo na cor de destaque e texto em branco para máximo contraste.

As dimensões do botão devem ser proporcionais ao header, com padding vertical de aproximadamente 10px a 15px e padding horizontal de 20px a 30px. O raio das bordas deve ser configurado para valores entre 25px e 50px para criar um appearance mais moderno e amigável.

O link do botão deve direcionar para a página de contato ou diretamente para o WhatsApp através do link wa.me com mensagem pré-configurada. O formato recomendado para o link é: https://wa.me/5562993112947?text=Olá%2C%20vim%20pelo%20site%2C%20gostaria%20de%20mais%20informa%C3%A7%C3%B5es

O botão deve incluir animação de hover que utilize a propriedade transform para criar um efeito de elevação ou scale, indicando interatividade ao usuário. A duração da transição deve ser configurada entre 0.2s e 0.3s para garantir uma resposta visual sem delay perceptível.

---

## 5. Construção da Landing Page Principal

### 5.1 Seção Hero

A seção hero é o elemento mais importante da landing page, sendo responsável pela primeira impressão do visitante e pela chamada inicial para ação. Esta seção deve ocupar toda a altura da tela (100vh) ou no mínimo 600px a 800px de altura, garantindo impacto visual imediato.

O H1 deve ser focado na intenção e localização, seguindo o modelo da metodologia Abidos: "Psicólogo Especialista em Goiânia: Supere a Ansiedade e Restaure seu Equilíbrio Mental". Esta formulação une a palavra-chave primária exata ("Psicólogo em Goiânia") ao formato de promessa de transformação.

O H2 deve ser acolhedor, mencionando atendimento presencial em bairro específico e teleconsulta com sigilo absoluto. Esta informação é crucial para、安心客户提供必要的信息。

O botão primário deve utilizar texto de ação direta como "Agendar Avaliação" ou "Quero Agendar Minha Consulta". Um botão flutuante onipresente do WhatsApp deve estar disponível em toda a página, configurado para abrir automaticamente a conversa.

É obrigatória a exibição do número de registro no CRP (Conselho Regional de Psicologia) para garantir conformidade ética e transmitir confiança ao visitante.

O fundo da seção hero deve utilizar uma imagem de alta qualidade relacionada ao tema de terapia e bem-estar, configurada como background-cover com posicionamento center-center. Um overlay escuro deve ser aplicado sobre a imagem de fundo com opacidade entre 0.6 e 0.7 para garantir que o texto branco tenha contraste adequado para legibilidade.

### 5.2 Seção de Identificação da Dor

A seção de identificação da dor é fundamental na metodologia Abidos porque aborda diretamente os problemas que o cliente potencial está enfrentando. Esta seção utiliza técnicas de copywriting para criar conexão emocional imediata.

O título deve ser um H2 que aborda diretamente os sintomas: "Sente que a exaustão emocional está travando sua vida?". Esta pergunta retórica captura a atenção de quem está sofrendo com problemas psicológicos não resolvidos.

O conteúdo deve listar sintomas específicos como: pânico, Burnout, insônia crônica, sensação de estar preso, ansiedade constante, dificuldade de relacionamento, baixa auto-estima, entre outros. Cada sintoma pode ser representado por um ícone minimalista para facilitar a identificação visual.

O design deve ser claro e clean, com muito "espaço em branco" para diminuir a sobrecarga visual. Esteja atento para não fazer falsas promessas de "cura definitiva" - o Conselho Federal de Psicologia proíbe esse tipo de comunicação.

### 5.3 Seção de Autoridade (E-A-T)

A seção de autoridade é crucial para estabelecer credibilidade, especialmente no nicho de saúde mental onde há muito ceticismo. O modelo Dr. Diogo Soares demonstra como construir essa autoridade acadêmica e profissional.

O título deve ser H2: "Conheça [Nome], seu Psicólogo e Especialista". Inclua o nome completo do profissional para humanização e identificação.

O currículo deve incluir: pós-graduações relevantes, tempo de experiência clínica, formações específicas (TCC, Psicanálise, EMDR, Hipnose), e qualquer publicação ou reconhecimento acadêmico. Esta informação constrói Expertise, Authoritativeness e Trustworthiness (E-A-T), os três pilares que o Google avalia para conteúdo de saúde.

Uma foto humanizada e sorridente do profissional deve ser exibida, com olhar direto para a câmera transmitindo empatia e confiança. Esta foto deve ter alt tag otimizada: "Psicólogo [Nome] no consultório em Goiânia".

Logos de universidades reconhecidas (UFG, PUC-GO) e de conselhos profissionais devem ser exibidos para reforçar a credibilidade institucional. Diferente do modelo Abidos de massagem que mostra "múltiplas terapeutas", no caso de psicologia single profissional, a estratégia é enfatizar "Único Especialista" com experiência específica.

### 5.4 Seção de Transparência e Consultório

A seção de ambiente seguro deve apresentar as instalações físicas do consultório, eliminando objeções relacionadas a privacidade, conforto e segurança. Esta é uma adaptação importante do modelo original para o nicho de psicologia.

O título deve ser H2: "Um ambiente seguro, ético e preparado para a sua evolução". Esta frase captura os três pilares fundamentais: segurança emocional, sigilo profissional e infraestrutura adequada.

Descreva a acústica (importante para sigilo), facilidade de acesso (estacionamento, proximidade de transporte público) e conforto das instalações (poltronas, iluminação, temperatura). Estes detalhes são importantes porque muitos pacientes têm vergonha de procurar terapia e querem um ambiente discreto.

Uma galeria de fotos de altíssima qualidade do consultório e fachada deve ser incluída. As fotos devem mostrar: a recepção acolhedora, a sala de atendimento com poltronas confortáveis, iluminação adequada para leitura, e qualquer elemento que transmita profissionalismo.

As Alt Tags das imagens devem ser extremamente detalhadas seguindo a metodologia Abidos: "Consultório acolhedor do psicólogo no Setor Bueno em Goiânia para tratamento de ansiedade" ou "Sala de atendimento psicológico com poltronas confortáveis em Goiânia".

### 5.5 Seção de FAQ e Quebra de Objeções

A seção de perguntas frequentes é essencial para neutralizar as objeções mais comuns que impedem o cliente de tomar a decisão de buscar ajuda profissional. O formato de accordion sanfona é recomendado para economia de espaço em telas de celulares.

As perguntas devem incluir: Como funciona o sigilo profissional? Quanto tempo dura o tratamento? Terapia online tem o mesmo efeito que a presencial? O que é abordado na primeira consulta? A terapia realmente funciona?

As respostas devem ser diretas, baseadas em literatura científica e sem promessas mirabolantes. Por exemplo, ao responder sobre tempo de tratamento, pode-se mencionar que a Terapia Cognitivo-Comportamental é focada e baseada no presente, podendo apresentar resultados significativos em menos tempo que abordagens tradicionais.

Esteja atento para não fazer promessas de cura definitiva, pois o CFP proíbe essa comunicação. Foque em benefícios como: melhoria na qualidade de vida, desenvolvimento de ferramentas para lidar com desafios, maior autoconhecimento.

### 5.6 Seção de Prova Social

Devido às restrições do CFP (Conselho Federal de Psicologia), não é possível utilizar depoimentos de pacientes com fotos e nomes. A metodologia Abidos foi adaptada para este nicho específico.

Em vez de depoimentos tradicionais, utilize: certificados técnicos verificados de forma visível, anos de dedicação à clínica destacados, artigos científicos publicados como lastro de credibilidade, e menções a reconhecimentos ou premiações profissionais.

Exiba o número de anos de experiência de forma proeminente: "Mais de 10 anos de experiência em psicologia clínica". Isso transmite segurança e expertise.

Utilize selos de instituições reconhecidas e links para perfis profissionais em conselhos (quando permitido). A integração com o Google Meu Negócio pode exibir as avaliações de forma automática, similar ao modelo Abidos.

---

## 6. Otimização Avançada de Imagens

### 6.1 SEO de Imagens: O Pulso do Gato

Uma das táticas mais poderosas e subestimadas do método Abidos é a masterclass em SEO de imagens. O Google não vê imagens - ele lê códigos. Portanto, a otimização das imagens é fundamental para dominação nos resultados de busca.

Os algoritmos de visão computacional modernos do Google são avançados, mas o mecanismo de busca ainda confia primariamente no contexto semântico circundante, no nome do arquivo físico e, sobretudo, no Alt Text para classificar ativos visuais no Google Imagens e nos resultados enriquecidos do Google Maps.

A injeção do modificador geográfico de forma implacável e descritiva em praticamente 100% dos ativos visuais associa técnicas específicas não apenas à marca, mas a áreas anatômicas e ao território local.

O método Abidos utiliza Alt Tags como: "cliente recebendo Massagem Relaxante em Goiânia por massagista do espaço abidos massagem", "aplicação de pedras quentes em cervical e trapézio em Goiânia", e "Terapeuta aplicando shiatsu em cervical e ombros em Goiânia".

Para o nicho de psicologia, as Alt Tags devem seguir o mesmo princípio: "Psicólogo [Nome] aplicando terapia cognitivo-comportamental em consultório em Goiânia", "Sala de atendimento psicológico com poltronas confortáveis no Setor Bueno em Goiânia", "Ambiente acolhedor para terapia de ansiedade em Goiânia".

### 6.2 Nomenclatura de Arquivos

O nome do arquivo físico da imagem é o primeiro elemento que o Google analisa. Arquivos com nomes genéricos como "foto1.jpg" ou "IMG_5432.jpg" não contribuem para o SEO.

O nome do arquivo deve seguir o formato: palavra-chave-principal-cidade.jpg ou .webp. Exemplos: "psicologo-ansiedade-goiania.jpg", "consultorio-psicologico-setor-bueno-goiania.jpg", "terapia-cognitivo-comportamental-goiania.jpg".

Separar palavras com hifens, não underscores. Todos os caracteres devem ser minúsculos. Evitar acentos e caracteres especiais quando possível para compatibilidade.

### 6.3 Configurações de Upload

O formato recomendado é WebP, que oferece compressão superior sem perda perceptível de qualidade. O tamanho máximo de cada imagem deve ser limitado a 100KB para imagens de conteúdo principal e 150KB para imagens de background.

O lazy loading deve ser ativado para todas as imagens através das configurações nativas do WordPress ou através de plugins dedicados. Esta técnica adia o carregamento de imagens fora da área visível inicial, melhorando significativamente o tempo de carregamento da página.

O atributo Title da imagem pode ser preenchido com informações adicionais, mas não é tão importante para SEO quanto o atributo Alt. Opcionalmente, pode-se incluir a palavra-chave principal no título da imagem.

---

## 7. Configurações de SEO Técnico

### 7.1 Configuração do Rank Math SEO

O Rank Math é a ferramenta central do arsenal de SEO na metodologia Abidos. Sua configuração correta é fundamental para o sucesso do ranqueamento.

Na configuração de Local SEO, deve-se ativar o módulo correspondente e preencher todos os dados NAP (Name, Address, Phone) de forma idêntica ao Google Meu Negócio. Qualquer discrepância entre o site e o Google Meu Negócio pode prejudicar o ranqueamento local.

O Sitemap XML deve ser configurado para incluir as páginas de silo e excluir páginas irrelevantes como política de privacidade e termos. A frequência de atualização deve ser configurada de acordo com a frequência de publicações.

O Monitor 404 e Redirecionamentos deve ser ativado para gerenciar links quebrados automaticamente. Configure redirecionamentos 301 para páginas movidas permanentemente e 302 para páginas temporárias.

Os Dados Estruturados (Schema Markup) devem ser configurados como "Local Business" ou "Service" em todas as páginas comerciais. Isso ajuda o Google a entender melhor a natureza do negócio e pode resultar em rich snippets nos resultados de busca.

### 7.2 Configurações de Title e Meta Description

As configurações de SEO devem ser implementadas através do Rank Math ou Yoast SEO. O título da home page deve seguir o formato: "[Serviço Principal] em [Cidade] | [Nome do Profissional/Clínica]"

A meta descrição deve resumir os serviços oferecidos em até 155 caracteres, incluindo palavras-chave relevantes e uma chamada para ação implícita. Exemplo: "Psicoterapia em Goiânia com foco em resultados. Atendimento humanizado com hipnoterapia. Sessão experimental gratuita. Agende sua consulta."

Cada página individual do site deve ter título e descrição otimizados seguindo as melhores práticas de SEO, incluindo palavras-chave relevantes no início do título e descrição.

### 7.3 Estrutura de Headings

A estrutura de headings (H1, H2, H3) deve ser implementada corretamente em todas as páginas para garantir que os mecanismos de busca compreendam a hierarquia do conteúdo. Cada página deve ter apenas um H1, que deve ser o título principal da página.

Os títulos de seções devem utilizar H2, com subtítulos utilizando H3 quando necessário para organizar o conteúdo. É importante incluir as palavras-chave principais nas tags de heading de forma natural, sem forçar a otimização.

O padrão recomendado na metodologia Abidos é: H1 com a promessa principal + localização, H2 com os benefícios ou categorias de serviços, H3 com detalhes específicos de cada serviço ou subtópicos.

### 7.4 Extensão SEO META in 1 CLICK

A extensão SEO META in 1 CLICK é uma ferramenta essencial para auditoria. Ela funciona como um "Raio-X" de qualquer site, permitindo verificar a estrutura de SEO de forma rápida.

A extensão mostra: tags H1, H2, H3 e assim sucessivamente, informações de title e description, e informações sobre as imagens da página.

Esta ferramenta serve para auditar o próprio site após a construção ou para analisar sites concorrentes. Ao verificar um concorrente, você pode ver se ele construiu a página com a estrutura correta e se preencheu as metatags essenciais.

Após publicar cada página, use a extensão para verificar se tudo está "certinho, bonitinho, encaixadinho com o SEO".

---

## 8. Estratégia de Google Ads

### 8.1 Estrutura de Campanhas STAGs

Para campanhas de Google Ads eficientes, a metodologia Abidos recomenda a estrutura Single Theme Ad Groups (STAGs). Esta abordagem isola intenções de buscas específicas para pareá-las com anúncios cirúrgicos e enviá-las para os silos corretos, garantindo 10/10 no Quality Score e reduzindo significativamente o CPA.

Cada grupo de anúncios deve focar em uma única intenção de busca. Por exemplo: um grupo para "psicólogo goiania", outro para "terapia ansiedade goiania", outro para "hipnose clínica goiania".

A estrutura STAGs garante que quando um usuário pesquisa por "terapia para ansiedade goiania", ele vê um anúncio específico sobre ansiedade que o leva diretamente para a página de silo correspondente. Esta congruência maximiza o Índice de Qualidade.

### 8.2 Mapeamento de Campanhas

O mapeamento de campanhas para a rede de pesquisa localizada em um raio de 15km em Goiânia deve seguir esta estrutura:

Grupo de Anúncio 1: Fundo de Funil Local com keywords em correspondência exata ou frase como "psicologo goiania", "[psicólogo no setor bueno]", "psicologo perto de mim", "clinica de psicologia em goiania".

Grupo de Anúncio 2: Foco em Patologia Específica (Ansiedade) com keywords como "terapia para ansiedade goiania", "[tratamento síndrome do pânico]", "psicologo especialista em ansiedade".

Grupo de Anúncio 3: Hipnose Clínica com keywords como "[hipnose clinica em goiania]", "hipnoterapeuta goiania", "tratamento de fobia com hipnose".

### 8.3 Blindagem de Orçamento

A inteligência da campanha exigirá a negação contínua de termos indesejados. Uma robusta lista de exclusão deve abranger: sus, gratis, gratuito, popular, faculdade, estágio, pdf, livro, vagas, sindicato e curso.

Estes termos atraem pessoas buscando serviços gratuitos ou informação acadêmica, não clientes reais. A exclusão destes termos protege o orçamento e garante que os cliques sejam de pessoas com intenção de contratação.

### 8.4 Extensões de Anúncio

As extensões de anúncio são fundamentais para aumentar a visibilidade e a taxa de clique. As recomendadas incluem:

Sitelinks: Links extras no anúncio que levam para páginas específicas como "Sobre", "Serviços", "Depoimentos", "Contato".

Local: Integrado com o Google Meu Negócio, mostrando o endereço no anúncio.

Callout: Extensões destacando benefícios como "Atendimento Humanizado", "Sigilo Absoluto", "Sessão Experimental".

---

## 9. Ferramentas de Análise e Concorrência

### 9.1 Ubersuggest

A extensão Ubersuggest, criada pelo especialista Neil Patel, é outra ferramenta fundamental do arsenal. Ela é voltada para análise de tráfego e concorrência.

Ao entrar no site de um concorrente e ativar a extensão, ela revela: tráfego orgânico (quantas visitas aquele site recebe por mês de graça), palavras-chave (para quais termos aquele site está ranqueando), autoridade de domínio (uma nota de 0 a 100 que diz o quão "forte" e confiável aquele site é aos olhos do Google), e backlinks (quantos links externos apontam para aquele site).

Use o Ubersuggest para espionar os concorrentes que estão na primeira página e ver o quão fortes eles são. Se a autoridade deles for baixa, você tem grandes chances de superá-los com o tempo.

### 9.2 PageSpeed Insights

A ferramenta PageSpeed Insights do Google é essencial para testar a velocidade e os Core Web Vitals do site. A velocidade é um fator de ranqueamento crítico, especialmente para mobile.

O LCP (Largest Contentful Paint) deve estar abaixo de 2.5 segundos para aprovação. O ideal é abaixo de 1 segundo.

O CLS (Cumulative Layout Shift) deve ser próximo de zero. Isso garante que o site não "pula" quando carrega, o que é crucial para mobile e retém o usuário.

O FID (First Input Delay) deve ser inferior a 100 milissegundos.

Use a ferramenta regularmente para monitorar a performance e identificar oportunidades de melhoria.

### 9.3 Wappalyzer

A extensão Wappalyzer é útil para detectar a tecnologia usada em qualquer site. Ela mostra: CMS utilizado (WordPress, Wix, etc.), tema, plugins instalados, linguagens de programação, e ferramentas de analytics.

Use esta ferramenta para analisar concorrentes e entender quais ferramentas eles utilizam. Isso pode revelar insights sobre a estratégia técnica deles.

---

## 10. Botões Flutuantes e CTAs

### 10.1 Botão Flutuante do WhatsApp

O botão flutuante de WhatsApp é um dos elementos mais importantes para conversão na metodologia Abidos. Ele deve acompanhar o usuário durante toda a navegação, sempre visível e acessível.

O botão deve utilizar uma mensagem pré-configurada que já introduce o contexto da visita: "Olá, vim pelo site, gostaria de saber mais sobre a terapia".

A posição recomendada é o canto inferior direito da tela, com um ícone do WhatsApp claramente visível. A cor do botão deve contrastar com o fundo do site para chamar atenção.

Plugins recomendados incluem "Join.chat" ou "Click to Chat" que oferecem diversas opções de personalização.

### 10.2 CTAs Mobile-First

A metodologia Abidos enfatiza o uso de linguagem mobile-first nos CTAs. Use "Toque aqui" em vez de "Clique aqui", pois a maioria das buscas locais acontece em smartphones.

Evite CTAs frios como "Enviar Mensagem" ou "Contato". Use CTAs emocionais e focados em benefícios como "Falar com o Psicólogo", "Agendar Minha Consulta", "Começar Minha Transformação".

Coloque CTAs estratégicos ao longo da página: após a seção de dor, após a seção de autoridade, e sempre após elementos de prova social.

---

## 11. Otimização de Performance

### 11.1 Cache e Minificação

Um plugin de cache deve ser instalado e configurado para garantir carregamento rápido em visitas subsequentes. Recomenda-se WP Rocket (pago) ou LiteSpeed Cache (gratuito), ambos oferecendo excelentes resultados de performance.

A minificação de CSS e JavaScript deve ser ativada para reduzir o tamanho dos arquivos e eliminar espaços em branco desnecessários. A maioria dos plugins de cache oferece esta funcionalidade automaticamente, mas deve ser testada cuidadosamente para garantir que não causequebras no layout.

O cache de browser deve ser configurado para armazenar recursos estáticos localmente no dispositivo do usuário por períodos prolongados. Isso inclui imagens, arquivos CSS, JavaScript e fontes, reduzindo requests ao servidor em visitas subsequentes.

### 11.2 Configurações de CDN

A configuração de um CDN é recomendada para sites com público-alvo distribuído geograficamente. O Cloudflare oferece um plano gratuito adequado para a maioria dos sites pequenos e médios.

A configuração básica do CDN envolve apontar os nameservers do domínio para o serviço de CDN, configurar as regras de cache para o site WordPress, e ativar a otimização de imagens e minificação através do painel do CDN quando disponível.

É importante configurar regras específicas de cache para páginas dinâmicas (como o admin e páginas de login) para evitar problemas de exibição, enquanto páginas públicas podem ter cache agressivo para máximo desempenho.

### 11.3 Otimização de Imagens para Performance

Todas as imagens devem ser otimizadas antes do upload. O formato recomendado é WebP, que oferece compressão superior sem perda perceptível de qualidade. Ferramentas como Squoosh.app ou plugins WordPress como Smush podem ser utilizados para otimização.

O tamanho máximo de cada imagem deve ser limitado a 100KB para imagens de conteúdo e 150KB para imagens de background. Imagens maiores devem ser redimensionadas antes do upload, mantendo as dimensões adequadas para o contexto de uso.

O lazy loading deve ser ativado para todas as imagens através das configurações nativas do WordPress ou através de plugins dedicados.

---

## 12. Integração com Google Meu Negócio

### 12.1 Configuração de NAP

O Nome, Endereço e Telefone (NAP) devem ser absolutamente consistentes entre o site e o Google Meu Negócio. Qualquer discrepância pode confundir os algoritmos do Google e prejudicar o ranqueamento local.

O endereço completo deve incluir: Rua, número, bairro, cidade e estado. No caso do exemplo: "Rua 94-D, 102 - Setor Sul - Goiânia GO".

O telefone deve ser apresentado com o código de área sem o zero: "62 99311-2947" ou "(62) 99311-2947". O link de telefone deve seguir o formato: tel:+5562993112947.

### 12.2 Schema Markup Local

O Rank Math permite configurar o schema de Local Business automaticamente. Isso adiciona dados estruturados que ajudam o Google a entender a localização física do negócio.

O schema deve incluir: geo coordinates (latitude e longitude do consultório), opening hours (horários de atendimento), price range (faixa de preço), e área de serviço (os bairros atendidos).

---

## 13. Protocolo de Atendimento e Fechamento

### 13.1 Integração WhatsApp

O sucesso da máquina de captação pode desmoronar se o protocolo de recepção falhar. O atendimento é o que decide o jogo, não importando se o Google Ads está perfeito.

O redirecionamento primário de todos os CTAs deve convergir para o WhatsApp Business da clínica através de um link pré-preenchido. Isso elimina a fricção de formulários longos e permite resposta imediata.

O WhatsApp Business deve ter uma mensagem automática de boas-vindas configurada: "Olá! Obrigado por entrar em contato. Em breve um de nossos atendentes responderá. Horário de atendimento: Segunda a Sexta, 8h às 18h."

### 13.2 Script de Recepção

O script de conversão deve seguir os preceitos clássicos de gestão de clínica:

Acolhimento Ativo: "Olá, [Nome]. Parabéns por tomar a decisão de cuidar de sua saúde mental hoje. Somos da Clínica [X], será um prazer acolhê-lo."

Qualificação e Escuta: "Antes de lhe passar as condições e agenda, poderia compartilhar de forma breve e superficial qual o momento pelo qual está passando, para garantir que somos os especialistas certos para o seu caso?"

Valorização da Metodologia: O atendente reitera que o profissional trabalha com a técnica específica, atinge a causa raiz em tratamentos focais, em ambiente perfeitamente sigiloso.

Apresentação do Honorário e Fechamento: Somente após demonstrar esse valor é que o investimento é apresentado, acompanhado de opções facilitadas para pacotes de tratamento ou avaliação inicial.

---

## 14. Checklist de Qualidade e Testes

### 14.1 Testes de SEO On-Page

Após a construção de cada página, realize os seguintes testes:

Verifique se a palavra-chave principal está no H1, no primeiro parágrafo e na URL. Confirme que as imagens possuem nomes de arquivo otimizados e Alt Text descritivos.

Verifique se o Rank Math está marcando pontuação acima de 80/100 (verde). Analise se a hierarquia de silo está respeitada na URL.

Use a extensão "SEO META in 1 CLICK" para validar a estrutura de headers.

### 14.2 Testes de Copywriting e Conversão

As três principais objeções do nicho foram respondidas no texto? Existe um CTA visível a cada duas dobras de rolagem? O formulário ou botão de WhatsApp funciona em 1 clique no mobile?

Teste todos os CTAs em diferentes dispositivos e navegadores.

### 14.3 Testes de Responsividade

O layout deve ser testado em múltiplos dispositivos e tamanhos de tela: 1920px (desktop large), 1366px (desktop padrão), 1024px (tablet landscape), 768px (tablet portrait), e 375px (mobile).

Elementos interativos como botões e links devem ter áreas de toque adequadas em dispositivos móveis (mínimo 44px por 44px).

Textos devem ser legíveis em todos os tamanhos de tela sem necessidade de zoom.

### 14.4 Testes de Performance

O tempo de carregamento da página deve ser testado utilizando ferramentas como Google PageSpeed Insights, GTmetrix ou Pingdom. O objetivo é atingir tempos de carregamento inferiores a 3 segundos para conexões de banda larga.

A pontuação de Core Web Vitals deve ser verificada, especialmente: LCP inferior a 2.5 segundos, FID inferior a 100 milissegundos, e CLS inferior a 0.1.

Imagens devem ser testadas para garantir que estão sendo servidas no formato mais eficiente (WebP quando suportado) e que o lazy loading está funcionando corretamente.

---

## Conclusão

Este guia técnico fornece todas as especificações necessárias para a construção completa do site "Terapia em Goiânia" utilizando WordPress, Elementor e a metodologia Abidos. A implementação deve seguir rigorosamente as configurações de design system, estrutura de silos, otimizações de SEO técnico, estratégias de copywriting persuasivo e otimizações de conversão descritas para garantir um produto final que atenda aos padrões de qualidade esperados.

A construção do site deve ser realizada em ambiente de staging antes do lançamento público, permitindo testes completos sem afetar o site de produção. Após a aprovação de todos os testes, a migração para o ambiente de produção deve ser realizada com configuração adequada de redirecionamentos se necessário.

O mantenimiento contínuo do site inclui atualizações regulares do WordPress, plugins e temas, monitoramento de performance com PageSpeed Insights, criação de conteúdo novo seguindo a estrutura de silos, e análise contínua de métricas de conversão e ranqueamento.

A aplicação correta deste guia, seguindo as cinco camadas da metodologia Abidos, resultará em um site que não apenas atrai visitantes através de buscas orgânicas e pagas, mas também converte esses visitantes em clientes através de uma jornada de usuário otimizada, elementos de confiança estrategicamente posicionados e chamadas para ação irresistíveis.

---

## Apêndice: Checklist de Implementação do Método Abidos

| Item | Descrição | Status |
|------|-----------|--------|
| Hospedagem Adequada | Servidor com PHP 8.0+, 256MB memória, SSL | ☐ |
| WordPress Instalado | Instalação limpa com configurações básicas | ☐ |
| Tema Hello Elementor | Tema leve instalado e ativado | ☐ |
| Elementor Pro | Construtor visual com licença ativa | ☐ |
| Rank Math SEO | Plugin de SEO instalado e configurado | ☐ |
| Rank Math Pro | Versão Pro instalada (recomendado) | ☐ |
| WPForms Pro | Plugin de formulários instalado | ☐ |
| Cache Plugin | LiteSpeed Cache ou WP Rocket instalado | ☐ |
| CDN Configurado | Cloudflare ou similar integrado | ☐ |
| Exact Match Domain | Domínio com palavra-chave + localização | ☐ |
| Estrutura de Silos | URLs separadas por serviço + localização | ☐ |
| H1 Otimizado | Palavra-chave exata + localização no título principal | ☐ |
| H2 por Categoria | Cada serviço principal como heading nível 2 | ☐ |
| Alt Tags de Imagens | Descrições detalhadas com localização | ☐ |
| Nomes de Arquivos | Imagens nomeadas com palavras-chave | ☐ |
| Botão Flutuante WhatsApp | Botão presente em toda a página | ☐ |
| CTAs Mobile-First | Linguagem "Toque aqui" utilizada | ☐ |
| Prova Social | Integração com Google Avaliações | ☐ |
| Seção Autoridade | Currículo e credenciais do profissional | ☐ |
| FAQ com Accordion | Perguntas frequentes organizadas | ☐ |
| NAP no Footer | Nome, Endereço, Telefone consistentes | ☐ |
| Google Meu Negócio | Ficha otimizada e verificada | ☐ |
| Schema Local | Dados estruturados de negócio local configurados | ☐ |
| Sitemap XML | Sitemap criado e submetido ao Google | ☐ |
| Indexação Google | Páginas indexadas rapidamente | ☐ |
| Mobile Responsivo | Layout testado em todos os dispositivos | ☐ |
| PageSpeed Mobile | Pontuação acima de 70 no mobile | ☐ |
| Core Web Vitals | LCP, CLS e FID dentro dos parâmetros | ☐ |
| SSL/HTTPS | Certificado instalado e forçado | ☐ |
| Teste de Conversão | CTAs testados em diferentes dispositivos | ☐ |

---

*Documento técnico atualizado com a metodologia Abidos completa, criado em março de 2026.*