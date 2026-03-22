# 🧠 Dossiê Mestre: NeuroEngine OS v2.0 & Protocolo Abidos v3.2
> **Documento Master de Operação, Engenharia e Conversão Clínica**
> **Versão:** 4.0 (Março 2026 - Pós-Migração Vercel)
> **Propriedade:** Dr. Victor Lawrence | Instituto OPS
> **Status:** Ativo, Auditado e em Produção.

---

## 🏛️ PREFÁCIO: A TRANSIÇÃO PARA O PARADIGMA JAMSTACK
O **NeuroEngine OS** evoluiu de um "monolito convidado" operando sobre WordPress (via Servidores Hostinger e plugins como Astra/Elementor) para uma arquitetura **Jamstack (Next.js 16 + TypeScript + Vercel)**. Esta evolução erradicou os gargalos de performance e segurança do PHP/MySQL legados, inaugurando uma era de Edge Computing.

### A Nova Stack de Alta Fidelidade
1.  **Core e Roteamento:** **Next.js 16 (React 19)** permite *Server Components* e *Static Site Generation* (SSG), resultando em páginas que carregam instantaneamente (Latência Zero na Borda da Vercel).
2.  **UI & Animação:** **Tailwind CSS 4** em conjunto com **Framer Motion 12** substituiu o *DOM Bloat* (inchaço de código) gerado pelo Elementor. As interfaces agora utilizam componentes limpos de React, permitindo micro-animações de "nível cinematográfico" e design Dark Premium sem sacrificar milissegundos de carregamento.
3.  **Segurança Intrinseca:** A eliminação do painel `/wp-admin` e da WP REST API aberta anula vetores de ataque de Força Bruta e varredura de *bots*. A comunicação de dados é feita via *Server Actions* seguras no Next.js.
4.  **SEO Code-First:** Metadados, *Sitemaps* e *Robots.txt* são gerados dinamicamente via código (`metadataBase`), assegurando uma leitura estruturada perfeita pelos indexadores do Google.

---

## 🧠 PARTE I: ARQUITETURA DE INTELIGÊNCIA E AGENTES AUTÔNOMOS
O sistema não utiliza instâncias monolíticas de IA (um único chat), mas sim uma **Orquestração Multiagente baseada no padrão LangGraph** adaptado.

### 1.1 O Sistema de Dois Hemisférios
Para maximizar performance e reduzir custos de inferência, o NeuroEngine divide as cargas cognitivas:
*   **Hemisfério Esquerdo (Gemini 2.5 Flash - O Trabalhador de Precisão):** Modelo ultra-rápido. Encarregado de funções de processamento imediato: transcrição de áudio, leitura de PDFs, análise visual de componentes (html2canvas) e extração de regras em sintaxe JSON estrita.
*   **Hemisfério Direito (Gemini 2.5 Pro - O Arquiteto Clínico):** Modelo denso. Atua nas malhas complexas: raciocínio clínico para artigos (E-E-A-T), orquestração de campanhas publicitárias e geração de respostas resolutivas para o Doctoralia.

### 1.2 Padrão de Revisão Contínua (Reviewer and Critique)
Nenhum texto gerado vai ao ar na primeira iteração (Zero-Shot). O fluxo de criação submete-se a um pipeline de correção em *loop*:
1.  **Agente Construtor:** Rascunha o conteúdo ou HTML injetando o contexto clínico.
2.  **Inspetor Abidos (SEO/Design):** Audita a hierarquia de tags (H1 único, aninhamento correto) e design (validação das classes Tailwind).
3.  **Inspetor de Compliance Ético:** Filtra o texto contra heurísticas estritas (ex: CFP, CFM, LGPD).
*O sistema força até 3 loops automáticos de autocorreção antes de sinalizar a finalização ao humano.*

### 1.3 Validação Factual e RAG Acadêmico
O sistema utiliza conceitos avançados de validação para mitigar alucinações perigosas em saúde:
*   **FactScore:** A saída da IA é decomposta em "afirmações atômicas". Cada frase médica gerada é auditada. Afirmações "missing" ou "contradict" disparam imediato *rollback*.
*   **MED-F1 (Extração de Entidades Nomeadas):** Assegura que entidades clínicas (como TEA, TDAH, ISRS) não tenham sua polaridade invertida nas negações (ex: confundir "paciente com febre" e "paciente sem febre").

---

## 🧬 PARTE II: NEURO-TRAINING E CLONAGEM AUTÊNTICA DE VOZ
Para evitar o "tom de IA corporativo" (asséptico, padronizado, repleto de conectivos plastificados), o NeuroEngine possui um módulo passivo e ativo de neuro-aprendizado.

### 2.1 O Hipocampo Digital (`estilo_victor.json`)
Todas as diretrizes capturadas formam o "DNA" persistente. É uma memória vetorial/JSON local que dita a "Voz de Lawrence": estruturada, permissiva (ericksoniana), acadêmica e focada na eficácia em Goiânia.

### 2.2 Reverse Prompt Engineering (RPE) e Diffs Textuais
*   **Extração Ativa:** Análise profunda de rascunhos anteriores do especialista. A IA extrai "O que não fazer" (banindo jargões plásticos e excesso de emojis) e "Como fazer" (cadência, pausas emocionais).
*   **Aprendizado Passivo (Diffs):** Sempre que o Dr. Victor edita um rascunho da IA antes de publicar, o sistema computa um *Text Diff* (diferença entre a versão da IA e a versão final humana). O Hemisfério Pro deduz ativamente: *"Ah, ele removeu este jargão comercial e usou uma voz mais acolhedora. Atualizando as diretrizes no json."*

---

## ⚖️ PARTE III: COMPLIANCE, STARTUP LGPD E DIRETRIZES DO CFP
O *Automated Ethics Compliance Checker* atua como um juiz final:
1.  **Resolução CFP nº 11/2000 (Vedação Comercial):** Bloqueio sistemático de mercantilização rasa. Proibição severa de promessas de taxa de sucesso ("cure sua ansiedade"), gatilhos comerciais agressivos ("vagas limitando", "oferta") e sessões oferecidas como degustação gratuita.
2.  **Nota Técnica CFP nº 01/2022 (Diretrizes Virtuais):** Erradicação de provas sociais não auditadas (depoimentos em vídeo de pacientes) por violação de sigilo profissional. A prova social leiga é integralmente substituída pela **Autoridade E-E-A-T** (exibição de Registro, Mestrado UFU, desenvolvimento da Escala AQ10b).
3.  **LGPD Atômica:** O sistema opera sob um filtro de anonimização (substituição via Regex) para qualquer histórico clínico submetido à triagem: CPFs, Telefones e Nomes de Pacientes (*"Maria" -> [PACIENTE_ANONIMIZADO]*) são expurgados do prompt antes de alcançar as APIs do Gemini, impedindo vazamentos transversais de sigilo médico.

---

## 🎯 PARTE IV: METODOLOGIA ABIDOS v3.2 (CONVERSÃO DE ELITE)
O **Método Abidos** define a ciência de conversão e arquitetura da interface, desdobrando-se nas seguintes camadas cirúrgicas:

### 4.1 A Arquitetura de Silos e Teia Semântica (Hub and Spoke)
*   **Isolamento Semântico:** Cada patologia reside m um Silo Fechado ("Spoke"). O conteúdo da Landing Page de "Ansiedade" é hermético; não diverge para falar de TEA, evitando "canibalização de palavras-chave".
*   **Geomodificadores:** Todas as URLs e Títulos focam a nível local de dominação (Long-Tail e Cidades - ex: `/psicologo-para-autismo-em-adultos-em-goiania/`).
*   **Dwell Time e "Veja Também":** Ligação transversal de links internos parametrizados mantendo o usuário na jornada lógica sem becos sem saída, injetando relevância sistêmica para o Indexador.

### 4.2 SEO On-Page Pragmático (H1 e Schema)
*   **A Ditadura do H1 Único:** Exige-se perfeitamente apenas um `<h1>` estruturado matematicamente: `Palavra-chave Direta + Promessa Clínica + Geo-Localização`.
*   **Schema Markup E-E-A-T:** Código JSON-LD do tipo *LocalBusiness* e *MedicalWebPage* preenchido via script. Utilização imperativa de links `sameAs` conectando a entidade digital do site diretamente ao Currículo Lattes e ResearchGate do Dr. Victor.

### 4.3 SEO Visual (A Terceira Fronteira Oculta)
*   **Extensão Zero-Weight:** Imagens imperativamente processadas em WebP (< 100KB, Lazy load nato pelo Next/Image).
*   **Metadados em Kebab-case:** Arquivos sobem restritamente organizados (ex: `terapia-de-casal-consultorio-goiania.webp`).
*   **Alt-Text Semântico:** Riqueza situacional em cada tag (ex: *"Dr. Victor Lawrence no consultório clínico higienizado em Goiânia durante atendimento de TCC"*).

### 4.4 Copywriting e UX (Fricção Zero para Ansiosos)
*   A página mapeia a dor (H2 focal), expõe a segurança presencial/física (Silo de Fotos Claras do Consultório) e acalma o pensamento racional através do racional clínico.
*   **Accordion FAQ:** Aborda dores pragmáticas da conversão economizando espaço na tela: "Como funciona online? Há sigilo? Quanto tempo?".
*   **Tato Mobile First:** Em vez de botões imperativos corporativos ("Compre", "Envie"), CTAs confortantes voltadas ao polegar: "Toque aqui para agendar sua avaliação".

### 4.5 Engenharia de Anúncios e STAGs (Google Ads)
*   **STAGs (Single Theme Ad Groups):** A separação modular dos anúncios onde cada variação do problema aponta não para a "Home", mas fura diretamente o Silo Semântico específico da palavra pesquisada ("O Efeito Espelho" de índice de qualidade 10/10).
*   **Bloqueio Categórico de Orçamento:** Uso paranoico de palavras nervativas exatas (`grátis, sus, amil, faculdade, unimed, barato, pdf, cura`).

### 4.6 O Fechamento Magnético (Protocolo WhatsApp em 4 Fases)
*   **Parametrização Passiva:** Link do botão do WhatsApp vem pré-preenchido para o ansioso não travar pensando na mensagem: `wa.me/...&text=Olá, vim pelo site...`
*   **Script de 4 Passos:** Abandono imediato do envio frio de "tabela de preços". O time de recepção segue:
    1.  *Acolhimento:* Parabeniza a decisão e iniciativa do paciente.
    2.  *Qualificação:* Entende com precisão a magnitude da dor.
    3.  *Valorização:* Ancoragem científica (Terapia Focal, Sigilo, Experiência USP/UFU, Diferencial).
    4.  *Honorário:* Somente após o degrau de autoridade firmado o investimento da "Avaliação Inicial" (e não o pacote genérico) é exibido, justificando o custo.

---

## 🎨 PARTE V: PADRÕES VISUAIS E NEUROMARKETING THEME
A transição estética abraça o conceito de "Clínica Boutique & Refúgio Neurodivergente":

*   **Paleta Mestra:**
    *   **Midnight Dark (`#05080f`):** Fundo predominante. Causa conforto visual imediato.
    *   **Off-White (`#faf9f6`):** Fundos intercalados para contraste tátil sem cansaço (eye-strain).
    *   **Teal Clinical (`#2dd4bf` & `#14b8a6`):** As Cores de Ação (CTAs, botões e spans). Representam calmaria neurológica e saúde imponente.
*   **Efeitos Premium e Tipografia:**
    *   **Tipografia Integral:** Uso exato e nativo da fonte `Inter` (peso 400 normal, 700/900 H1 brilhantes), eliminando atrasos.
    *   **Morfismo em Vidro Sóbrio (Glassmorphism):** Fundo translúcido para *cards*, combinando `backdrop-blur-xl` a uma frágil borda `border-white/10`.
    *   **Pacing de Tela (Luzes Orb Glow):** Animações em background CSS criando esferas suaves que respiram via mudança demorada de opacidade, induzindo metaforicamente transe/calma.

---

## 🔗 PARTE VI: ESTEIRA DE ATIVOS REAIS (O ALICERCE DA VERDADE)
O NeuroEngine **absolutamente não** gera *placeholders*. Todo dado de contato ou lastro visual utilizado na orquestração deve obrigatoriamente consumir as URLs e arquivos validados do histórico do Instituto:

**Links Ouro (Hub Navigation):**
*   **Agendamento:** `https://hipnolawrence.com/agendamento/`
*   **Especialidade TEA Geral:** `https://hipnolawrence.com/psicologo-para-autismo-em-adultos-em-goiania/`
*   **Contato:** `https://hipnolawrence.com/contato/`

**Arquivos Ouro Físicos e E-E-A-T (Galeria RAG):**
*   *Consultório Real (Setor Sul):* Fazer uso primário das fotografias do ID (`IMG_0298-scaled.jpeg`, `IMG_0359-scaled.jpeg`).
*   *Titulação Acadêmica (UFU/TCC/IFG)*: Recuperar arquivos diretos perante demonstração do valor (ex: `11148819_865048126899579_5754455918839697297_o.jpg` Congresso Autismo).
*   *Apresentação Profissional Pessoal (Victor Lawrence)*: Injeção seletiva da série `IMG_4511.jpg` e logotipia isenta de background.

---

## 🏁 CONCLUSÃO SINTÉTICA (STATUS DE PRODUÇÃO V4)
Com a erradicação sistêmica das latências das linguagens pregressas e com a fusão paramétrica do LLM de linguagem Google Gemini aos frameworks autênticos baseados em Grafos LangChain e React 19 Frontend — O **NeuroEngine V2.0** transbordou a camada de ferramenta simples de postagem para solidificar-se como a espinha dorsal de um Diretor Criativo, Avaliador Ético de Automação Jurídica e Gestor Clínico operando de modo simbiótico à mente do especialista. 

*Frictionless Experience. Absolute Domination.*
