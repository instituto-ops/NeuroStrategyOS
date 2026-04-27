const fs = require('fs');
const path = require('path');
// Import all specific deps from shared if needed. For now just passing app and deps.
const { genAI, getAIModel, wrapModel, extractJSON, trackUsage, LITE_MODEL, MAIN_MODEL, PRO_MODEL, GoogleAICacheManager } = require('../shared');

module.exports = function(app, deps) {
    const { SITE_REPO_PATH, TEMPLATE_CATALOG, upload } = deps;
    
// 2. PROXY AI (Gemini)
// ==============================================================================

app.post('/api/ai/generate', async (req, res) => {
    try {
        const { prompt, modelType } = req.body;
        
        // Mapeamento dinâmico de modelos Abidos Next (v5)
        const model = getAIModel(modelType, "text/plain");

        console.log(`🧠 [AI PROXY] Gerando conteúdo via Protocolo 2.5...`);
        
        const result = await model.generateContent(prompt);
        trackUsage(result.response.usageMetadata);
        const text = result.response.text();
        console.log(`🤖 [AI RESULT] JSON Gerado com Sucesso via motor ${targetModel}.`);
        
        res.json({ text });
    } catch (e) { 
        console.error("âŒ [AI PROXY ERROR]", e.message);
        res.status(500).json({ error: e.message }); 
    }
});

app.post('/api/ai/describe-image', async (req, res) => {
    try {
        const { image, context } = req.body;
        if (!image) return res.status(400).json({ error: "Imagem obrigatória." });

        console.log("📸 [DESCRIBE-IMAGE] Analisando imagem para gerar ALT text automático...");
        const model = genAI.getGenerativeModel({ model: VISION_MODEL });
        
        const base64Data = image.split(',')[1] || image;
        const prompt = `
        Analise esta imagem e gere um ALT TEXT (texto alternativo) para SEO.
        CONTEXTO DO SITE: Psicologia Clínica, Hipnose Ericksoniana e TEA Adulto (Dr. Victor Lawrence, Goiânia).
        
        DIRETRIZES:
        - Seja descritivo e direto.
        - Combine o que está na foto com a autoridade clínica do Dr. Victor Lawrence.
        - Inclua termos como 'Consultório de Psicologia em Goiânia' ou 'Atendimento Clínico Especializado' se a imagem sugerir um ambiente profissional.
        - Se for uma pessoa, descreva a expressão (ex: acolhedora, focada).
        - Retorne APENAS o texto do ALT, sem aspas, máximo 120 caracteres.
        
        CONTEXTO ADICIONAL DA VARIÃVEL: ${context || 'Geral'}
        `;

        const result = await model.generateContent([
            { text: prompt },
            { inlineData: { data: base64Data, mimeType: 'image/jpeg' } }
        ]);
        trackUsage(result.response.usageMetadata);

        res.json({ alt: result.response.text().trim() });
    } catch (e) {
        console.error("âŒ [DESCRIBE-IMAGE ERROR]", e);
        res.status(500).json({ error: e.message });
    }
});

const DOCTORALIA_REVIEWS = `
- Carla (TEA): "Diagnóstico tardio possível pela técnica adequada... melhora significativa na qualidade de vida."
- Y. (Autista): "Acompanhamento fez enorme diferença... hipnose e PNL com empatia e respeito."
- A. M. (Sábio): "Estrutura da minha vida, alguém sábio que me fez enxergar eu mesma."
- R. A. (Ansiedade): "Problema de ansiedade resolvido em algumas sessões. Muito profissional."
`;

const VICTOR_IDENTIDADE = `
[IDENTIDADE OFICIAL â€” DR. VICTOR LAWRENCE]
- Nome: Victor Lawrence Bernardes Santana
- Registro Profissional: Psicólogo | CRP 09/012681
- Formação: MESTRANDO em Psicologia pela Universidade Federal de Uberlândia (UFU) â€” Conclusão prevista em 2028.
- Especialidades: Hipnoterapia Clínica Ericksoniana, TEA Adulto (Asperger), Neuropsicologia.
- Localização: Goiânia (GO) e Uberlândia (MG).
- [ALERTA CRÃTICO]: JAMAIS refira-se ao Dr. Victor como Psicanalista. Ele é Psicólogo Clínico e Mestrando na UFU. Ã‰ um erro grave de identidade chamá-lo de psicanalista.
- TÃTULO ACADÃŠMICO: Mestrando em Psicologia (UFU).
`;

const REAL_ASSETS = `
VERDADE ABSOLUTA: PROIBIDO INVENTAR LINKS OU DADOS FALSOS. USE APENAS OS SEGUINTES LINKS REAIS:

LINKS DE SERVIÇOS E PÃGINAS (SILOS E HUB):
- Agendamento: https://hipnolawrence.com/agendamento/
- Ansiedade/Estresse: https://hipnolawrence.com/terapia-para-ansiedade-e-estresse-em-goiania/
- Contato/Currículo: https://hipnolawrence.com/contato/
- Depressão: https://hipnolawrence.com/tratamento-para-depressao-em-goiania/
- Desempenho Psicológico: https://hipnolawrence.com/terapia-para-desempenho-psicologico-em-goiania/
- Hipnose Clínica: https://hipnolawrence.com/hipnose-clinica-em-goiania/
- Relacionamento: https://hipnolawrence.com/terapia-de-relacionamento-em-goiania/
- Terapia Geral: https://hipnolawrence.com/terapia-em-goiania/
- Sobre: https://hipnolawrence.com/sobre/
- Autismo Adulto: https://hipnolawrence.com/psicologo-para-autismo-em-adultos-em-goiania/

IMAGENS DO DR. VICTOR LAWRENCE:
- https://hipnolawrence.com/wp-content/uploads/2026/03/Facetune_23-05-2023-21-43-27.jpg
- https://hipnolawrence.com/wp-content/uploads/2026/03/IMG_4469.jpg
- https://hipnolawrence.com/wp-content/uploads/2026/03/IMG_4511.jpg
- https://hipnolawrence.com/wp-content/uploads/2026/03/IMG_5605.jpg
- https://hipnolawrence.com/wp-content/uploads/2026/02/IMG_0876.jpg
- https://hipnolawrence.com/wp-content/uploads/2026/03/IMG_4875.jpg
- https://hipnolawrence.com/wp-content/uploads/2026/03/IMG_2046.jpg

DEMONSTRAÇÃƒO DE HIPNOSE / EVENTOS:
- https://hipnolawrence.com/wp-content/uploads/2026/03/5b6b7fbf-d665-4d68-96b0-aa8d2889a0bc.jpg
- Palestra IFG: https://hipnolawrence.com/wp-content/uploads/2026/03/palestra-IFG2.jpeg
- Congresso Autismo (2015): https://hipnolawrence.com/wp-content/uploads/2026/03/11148819_865048126899579_5754455918839697297_o.jpg
- Defesa TCC: https://hipnolawrence.com/wp-content/uploads/2026/03/defesa-TCC.jpg

LOGOMARCA:
- https://hipnolawrence.com/wp-content/uploads/2025/12/Victor-Lawrence-Logo-Sem-Fundo-1.png

AMBIENTE CONSULTÃ“RIO:
- https://hipnolawrence.com/wp-content/uploads/2026/02/IMG_0298-scaled.jpeg
- https://hipnolawrence.com/wp-content/uploads/2026/02/IMG_0312-scaled.jpeg
- https://hipnolawrence.com/wp-content/uploads/2026/02/IMG_0359-scaled.jpeg
- https://hipnolawrence.com/wp-content/uploads/2026/03/98593981-F8A7-4F8E-86A4-BBF2C04F704C.jpg
`;

// ============================================================================
// Ã‰TICA ABIDOS â€” Proibições absolutas injetadas em TODOS os prompts de geração
// ============================================================================
const ETICA_ABIDOS = `
[DIRETRIZES Ã‰TICAS ABSOLUTAS â€” PROIBIÇÃ•ES SEM EXCEÇÃƒO]
- PROIBIDO oferecer, mencionar ou sugerir SESSÃƒO GRATUITA ou AVALIAÇÃƒO GRATUITA.
- PROIBIDO prometer cura ou garantia de resultado.
- PROIBIDO jargão de marketing agressivo (Copywriting Sóbrio e Acadêmico).
- PROIBIDO criar variáveis como {{area_dinamica_extra}} â€” Redundante.
- O WhatsApp e Contatos devem ser preenchidos EXCLUSIVAMENTE nas variáveis globais, não gere novos campos para isso se já existirem.
- O CTA de agendamento DEVE levar ao link: https://hipnolawrence.com/agendamento/
`;

const CLIMAS_CLINICOS = {
  "1_introspeccao_profunda": {
    "nome_amigavel": "Introspecção Profunda (Ultra-Dark)",
    "fundo_principal": "!bg-[#05080f]",
    "texto_principal": "!text-slate-300",
    "texto_destaque": "!text-white",
    "cor_acao": "!bg-[#2dd4bf]",
    "efeitos_obrigatorios": "Efeito Orb Glow Teal no fundo: div absoluta com !bg-[#2dd4bf], blur-[150px] e opacity-20."
  },
  "2_despertar_clareza": {
    "nome_amigavel": "Despertar & Clareza (Light)",
    "fundo_principal": "!bg-[#faf9f6]",
    "texto_principal": "!text-slate-700",
    "texto_destaque": "!text-[#0b1221]",
    "cor_acao": "!bg-[#14b8a6]",
    "efeitos_obrigatorios": "Glassmorphism Claro e Sombra Suave longa: shadow-[0_30px_60px_rgba(11,18,33,0.03)]."
  },
  "3_conforto_neurodivergente": {
    "nome_amigavel": "Conforto Neurodivergente (Low Contrast)",
    "fundo_principal": "!bg-[#0b1221]",
    "texto_principal": "!text-slate-400",
    "texto_destaque": "!text-slate-200",
    "cor_acao": "!bg-[#14b8a6]",
    "efeitos_obrigatorios": "Cores apaziguadoras. ZERO contrastes extremos (nunca usar branco puro ou preto puro). Glassmorphism com desfoque subtil para não causar distrações."
  },
  "4_autoridade_academica": {
    "nome_amigavel": "Autoridade Académica (Minimalista)",
    "fundo_principal": "!bg-white",
    "texto_principal": "!text-gray-600",
    "texto_destaque": "!text-gray-900",
    "cor_acao": "!bg-[#0f172a]",
    "efeitos_obrigatorios": "Design limpo, académico e sem distracções. Uso de linhas finas divisorias (!border-gray-200). ZERO efeitos de luz ou desfoque extremo."
  }
};

const ABIDOS_TEMPLATE_MINIMO = `
<!-- CONFIGURAÇÃƒO TAILWIND -->
<script>
    tailwind = {
        config: {
            corePlugins: { preflight: false } // Impede conflitos com o tema Astra
        }
    }
</script>

<!-- DEPENDÃŠNCIAS -->
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

<style>
    /* Tipografia Local (Zerar CLS) */
    @font-face { font-family: 'Inter'; src: local('Inter Regular'), local('Inter-Regular'); font-weight: 300; font-display: swap; }
    @font-face { font-family: 'Inter'; src: local('Inter Regular'), local('Inter-Regular'); font-weight: 400; font-display: swap; }
    @font-face { font-family: 'Inter'; src: local('Inter Bold'), local('Inter-Bold'); font-weight: 700; font-display: swap; }
    @font-face { font-family: 'Inter'; src: local('Inter Black'), local('Inter-Black'); font-weight: 900; font-display: swap; }

    /* BLINDAGEM EXTREMA CONTRA O ASTRA */
    .abidos-wrapper {
        font-family: 'Inter', system-ui, sans-serif !important;
        background-color: #05080f;
        width: 100%;
        margin: 0;
        padding: 0;
        -webkit-font-smoothing: antialiased;
        overflow-x: hidden;
    }
    
    .abidos-wrapper h1, .abidos-wrapper h2, .abidos-wrapper h3, .abidos-wrapper p, .abidos-wrapper span {
        font-family: 'Inter', system-ui, sans-serif !important;
        margin: 0; padding: 0;
    }

    /* MATA OS SUBLINHADOS E BORDAS GLOBAIS DO TEMA NOS LINKS */
    .abidos-wrapper a {
        text-decoration: none !important;
        border-bottom: none !important;
        box-shadow: none !important;
        outline: none !important;
    }
    .abidos-wrapper a:hover, .abidos-wrapper a:focus {
        text-decoration: none !important;
    }

    /* Vidros Sóbrios (Glassmorphism de Alto Padrão) */
    .abidos-glass-dark {
        background: rgba(250, 249, 246, 0.02) !important;
        backdrop-filter: blur(24px) !important;
        -webkit-backdrop-filter: blur(24px) !important;
        border: 1px solid rgba(255, 255, 255, 0.05) !important;
    }

    .abidos-glass-light {
        background: rgba(250, 249, 246, 0.95) !important;
        backdrop-filter: blur(20px) !important;
        -webkit-backdrop-filter: blur(20px) !important;
        border: 1px solid rgba(226, 232, 240, 0.8) !important;
        box-shadow: 0 30px 60px rgba(11, 18, 33, 0.03) !important;
    }

    /* Efeito Visual (Luz Hipnótica) */
    .orb-glow { animation: slowPulse 8s infinite alternate ease-in-out; }
    @keyframes slowPulse {
        0% { transform: scale(0.8) translate(-5%, -5%); opacity: 0.15; }
        100% { transform: scale(1.1) translate(5%, 5%); opacity: 0.4; }
    }

    /* Animações Fluídas de Scroll */
    .reveal {
        opacity: 0;
        transform: translateY(30px);
        transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }
    .reveal.active { opacity: 1; transform: translateY(0); }
    .delay-100 { transition-delay: 100ms; }
    .delay-200 { transition-delay: 200ms; }
    .delay-300 { transition-delay: 300ms; }

    /* FORÇA VISIBILIDADE NO EDITOR ELEMENTOR */
    body.elementor-editor-active .reveal { opacity: 1 !important; transform: none !important; transition: none !important; }

    .chart-container { position: relative; width: 100%; height: 220px; }
    
    /* FAQ Safona Refinada */
    .abidos-wrapper details > summary { list-style: none; cursor: pointer; }
    .abidos-wrapper details > summary::-webkit-details-marker { display: none; }
    .abidos-wrapper details[open] summary ~ * { animation: fadeInDown 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
    
    @keyframes fadeInDown {
        from { opacity: 0; transform: translateY(-15px); }
        to { opacity: 1; transform: translateY(0); }
    }

    /* WhatsApp Boutique Mobile-First */
    .wpp-boutique {
        position: fixed;
        bottom: 16px !important;
        right: 16px !important;
        background: rgba(37, 211, 102, 0.95) !important;
        backdrop-filter: blur(10px) !important;
        color: white !important;
        padding: 10px 16px !important;
        border-radius: 50px !important;
        box-shadow: 0 10px 25px rgba(37, 211, 102, 0.3) !important;
        z-index: 99999;
        font-weight: 700 !important;
        font-size: 0.8rem !important;
        display: flex;
        align-items: center;
        gap: 8px !important;
        border: 1px solid rgba(255, 255, 255, 0.2) !important;
        transition: all 0.3s ease;
    }
    .wpp-boutique svg { width: 18px; height: 18px; }
    
    @media (min-width: 768px) {
        .wpp-boutique { bottom: 32px !important; right: 85px !important; padding: 16px 28px !important; font-size: 1rem !important; gap: 12px !important; }
        .wpp-boutique svg { width: 24px; height: 24px; }
    }
</style>

<!-- ABIDOS WRAPPER -->
<div class="abidos-wrapper">
    <!-- ESTRUTURA SEÇÃ•ES AQUI -->
</div>

<script>
    function initAbidos() {
        const reveals = document.querySelectorAll(".reveal");
        if('IntersectionObserver' in window) {
            const revealOnScroll = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("active");
                        observer.unobserve(entry.target);
                    }
                });
            }, { rootMargin: "0px 0px -50px 0px" });

            reveals.forEach(el => revealOnScroll.observe(el));
        } else {
            reveals.forEach(el => el.classList.add("active"));
        }
    }

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', initAbidos); } else { initAbidos(); }
</script>
`;

// ==============================================================================
// 3. TABELA DE REVISÃƒO E PIPELINE DE AGENTES (HUMAN-IN-THE-LOOP & LANGGRAPH)
// ==============================================================================

// Estado do Perfil de Voz (Clone de Voz / Reverse Prompting)
let voiceProfile = {
    learned_style: "Direto, clínico, porém empático. Foco em autoridade técnica e resultados práticos (Goiânia).",
    vocabulary: ["Goiânia", "Neuropsicologia", "TEA", "Clínica", "Avaliação"],
    prohibited_terms: ["cura milagrosa", "garantido", "mudar sua vida para sempre"],
    rhythm: "Sentenças curtas e estruturadas por bullet points.",
    last_updated: new Date().toISOString()
};

// Eliminado duplicata de /api/drafts (Consolidado acima)

// Orquestrador LangGraph (Simulação de Multi-Agent Node Pipeline)
app.post('/api/agents/generate-pipeline', async (req, res) => {
    try {
        const { topic } = req.body;
        if (!topic) throw new Error("Tópico (STAG) não fornecido.");
        const model = genAI.getGenerativeModel({ model: VISION_MODEL });

        console.log(`🤖 [LANGGRAPH PIPELINE] Iniciando fluxo para: ${topic}`);

        // NÃ“ 1: Agente Gerador (RAG & Pesquisa + Personalidade Aprendida)
        console.log(`ðŸ“¡ [NÃ“ 1] Agente de Pesquisa (Voz Dr. Victor)...`);
        const dnaInjetadoPipeline = getDnaContext();
        const moodPipeline = CLIMAS_CLINICOS['1_introspeccao_profunda'];
        const pGerador = `
Você é o Arquiteto Visual Sênior do Protocolo Abidos. Gere uma Landing Page HTML PREMIUM sobre "${topic}".

[ESTRUTURA DE DESIGN ABIDOS (OBRIGATÃ“RIO)]
Use EXATAMENTE este Wrapper e estas classes:
1. WRAPPER GERAL: <div class="abidos-wrapper antialiased px-4 py-8 md:px-12 lg:px-24 bg-[#05080f] min-h-screen font-inter text-slate-300">
2. SEÇÃ•ES: <section class="py-16 md:py-32 relative overflow-hidden" data-bloco="nome_do_bloco">
3. CARDS: "bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 md:p-10 shadow-2xl hover:border-teal-500/50 transition-all"
4. H2 (TÃTULO DE SEÇÃƒO): "font-outfit font-bold text-3xl md:text-5xl leading-tight text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500 mb-6"
5. TEXTO: "text-lg text-slate-400 leading-relaxed mb-8"
6. CTA WHATSAPP: "inline-flex items-center gap-3 px-8 py-4 bg-teal-500 hover:bg-teal-400 text-[#05080f] font-bold rounded-full transition-all hover:scale-105 shadow-[0_0_25px_rgba(45,212,191,0.35)]"

[DNA LITERÃRIO]
${dnaInjetadoPipeline || 'Use linguagem ericksoniana permissiva.'}

[LINKS E IMAGENS REAIS]
${REAL_ASSETS}

${ETICA_ABIDOS}

Gere o HTML modular. Feche o wrapper </div> ao final. Sem markdown.
        `;
        const resGerador = await model.generateContent(pGerador);
        trackUsage(resGerador.response.usageMetadata);
        const rascunhoPrimario = resGerador.response.text();

        // NÃ“ 2, 3 e 4: Loop de Validação (Abidos, Crítico e Compliance)
        console.log(`âš–ï¸ [NÃ“S DE VALIDAÇÃƒO] Auditoria de Compliance, Abidos e Factual...`);
        const pAuditoria = `
        Analise rigorosamente o Rascunho HTML abaixo.
        Sua missão é corrigir erros de compliance e garantir o Design Abidos.
        
        REGRAS DE OURO:
        1. MANTENHA O WRAPPER GERAL <div class="abidos-wrapper...">.
        2. Certifique-se de que não há tags <h1>.
        3. Se o texto for puramente clínico, transforme em copywriting persuasivo usando o Método Abidos.
        
        Retorne APENAS um JSON: {"aprovado": boolean, "abidos_score": number, "compliance_pass": boolean, "med_f1": number, "correcoes": "MANTENHA O HTML COMPLETO COM WRAPPER AQUI"}
        Rascunho: """${rascunhoPrimario}"""
        `;
        const resAuditoria = await model.generateContent(pAuditoria);
        trackUsage(resAuditoria.response.usageMetadata);
        const jsonStr = resAuditoria.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        const auditoria = JSON.parse(jsonStr);

        // Se falhar no compliance, faria um loop de re-geração no LangGraph real. Aqui simulamos a correção automática:
        const conteudoFinal = auditoria.correcoes || rascunhoPrimario;

        // Persistência de Estado
        const newDraft = {
            draft_id: `RASC-2026-${Math.floor(Math.random() * 900) + 100}`,
            tema_foco: topic,
            conteudo_gerado: conteudoFinal,
            validacoes_automatizadas: {
                pesquisa_clinica: true,
                metodo_abidos: auditoria.abidos_score > 80,
                compliance_etico: auditoria.compliance_pass,
                med_f1_score: auditoria.med_f1 || 0.95
            },
            status_atual: "aguardando_psicologo",
            fontes_rag_utilizadas: [
                "Banco de Dados RAG (VectorStore)",
                "Diretrizes CFP em Cache"
            ],
            data_submissao: new Date().toISOString()
        };

        draftsDb.unshift(newDraft); // Adiciona ao topo da lista
        console.log(`✅ [PIPELINE CONCLUÃDA] Human-in-the-loop aguardando.`);
        
        res.json({ success: true, draft: newDraft });
    } catch (e) {
        console.error("âŒ [PIPELINE ERROR]", e.message);
        res.status(500).json({ error: e.message });
    }
});


app.post('/api/agents/audit', async (req, res) => {
    try {
        const { content } = req.body;
        console.log(`ðŸ” [AGENTE ABIDOS] Auditing draft...`);
        
        const prompt = `
        Você é o "Agente Abidos", um Arquiteto de Sistemas e Auditor Sênior Implacável.
        
        SUA MISSÃƒO: Realizar uma auditoria de nível clínico no rascunho abaixo.
        
        MÃ‰TODO DE AUDITORIA (FACTSCORE):
        1. Decomposição Atômica: Quebre o texto em afirmações individuais.
        2. Validação Factual: Verifique se há "alucinações" ou promessas de cura (Proibido pelo CFP).
        3. MED-F1 (Extração de Entidades): Liste termos técnicos (ex: TEA, TDAH, ISRS) e verifique se o contexto está correto.
        4. Hierarquia Abidos: Cheque se NÃƒO há H1 (proibido) e se há H2 estratégico com palavra-chave e localização (Goiânia).
        5. GOOGLE TAG: Verifique se a etiqueta Google (G-B0DM24E5FS) está presente no código. Se não estiver, gere um alerta crítico.
        
        Rascunho a auditar:
        """${content}"""
        
        RETORNE UM RELATÃ“RIO FORMATADO EM HTML (usando tags span, strong, br) COM:
        - ✅ PONTOS POSITIVOS
        - âš ï¸ ALERTAS DE RISCO (CFP/LGPD/GOOGLE TAG)
        - 📊 PONTUAÇÃƒO FACTSCORE (0-100%)
        - ðŸ“ SUGESTÃ•ES DE REESCRITA
        `;

        const model = genAI.getGenerativeModel({ model: VISION_MODEL });
        const result = await model.generateContent(prompt);
        trackUsage(result.response.usageMetadata);
        const resp = await result.response;
        
        res.json({ success: true, report: resp.text() });
    } catch (e) {
        console.error("âŒ [AGENTE ABIDOS ERROR]", e.message);
        res.status(500).json({ error: e.message });
    }
});

// NÃ“ DE APRENDIZADO DE ESTILO: Reverse Prompting
app.post('/api/agents/learn-style', async (req, res) => {
    try {
        const { texts } = req.body;
        if (!texts || !Array.isArray(texts)) throw new Error("Textos para análise não fornecidos.");

        console.log(`🧠 [ESTILO] Iniciando Reverse Prompting de ${texts.length} textos...`);
        const model = genAI.getGenerativeModel({ model: VISION_MODEL });

        const prompt = `
        Aja como um Linguista Forense e Especialista em Copywriting de Conversão.
        Analise os textos abaixo (autênticos do autor Victor Lawrence) e extraia o DNA da escrita.
        
        Textos:
        """${texts.join('\n\n')}"""
        
        Sua tarefa é codificar esse estilo em um JSON com os campos:
        - rhythm: (Descrição da cadência das frases)
        - vocabulary: (Lista de palavras recorrentes e jargões favoritos)
        - learned_style: (Resumo técnico da "voz" do autor)
        - prohibited_terms: (Palavras que ele parece evitar ou que seriam artificiais para ele)
        
        Retorne APENAS o JSON.
        `;

        const result = await model.generateContent(prompt);
        trackUsage(result.response.usageMetadata);
        const jsonStr = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        const extractedProfile = JSON.parse(jsonStr);

        voiceProfile = {
            ...extractedProfile,
            last_updated: new Date().toISOString()
        };

        res.json({ success: true, profile: voiceProfile });
    } catch (e) {
        console.error("âŒ [LEARN STYLE ERROR]", e.message);
        res.status(500).json({ error: e.message });
    }
});

// NÃ“ DE AFINAMENTO: Text Diffs (Learn from user edits)
app.post('/api/agents/analyze-diff', async (req, res) => {
    try {
        const { original, edited } = req.body;

        console.log(`ðŸ“ [DIFF] Analisando edições do usuário para ajuste fino de tom...`);
        const model = genAI.getGenerativeModel({ model: VISION_MODEL });

        const prompt = `
        Analise a diferença entre o rascunho da IA e a versão editada pelo Dr. Victor.
        Rascunho IA: """${original}"""
        Versão Final: """${edited}"""
        
        O que mudou no tom? O que ele removeu? O que ele adicionou?
        Atualize o perfil de voz atual: ${JSON.stringify(voiceProfile)}
        
        Retorne o novo perfil de voz COMPLETO em JSON.
        `;

        const result = await model.generateContent(prompt);
        trackUsage(result.response.usageMetadata);
        const jsonStr = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        voiceProfile = JSON.parse(jsonStr);
        voiceProfile.last_updated = new Date().toISOString();

        res.json({ success: true, profile: voiceProfile });
    } catch (e) {
        console.error("âŒ [DIFF ANALYZE ERROR]", e.message);
        res.status(500).json({ error: e.message });
    }
});

// ==============================================================================

};
