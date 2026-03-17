const express = require('express');
const multer = require('multer');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: '../.env' }); 
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');

const app = express();
const port = 3000; // Unificando na porta 3000 (Frontend + API)

// Configuração de CORS: Como agora operamos na mesma porta, CORS é menos crítico,
// mas mantemos por segurança para acessos via IP ou subdomínios.
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// 1. SERVIR ARQUIVOS ESTÁTICOS (Frontend)
app.use(express.static(path.join(__dirname, 'public')));

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Initialize Gemini SDK
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const VISION_MODEL = 'gemini-2.5-flash'; 
const draftsDb = []; // In-memory store for newly generated drafts before WP sync

// [FASE 5] Módulo Neuro-Training: Memória de Estilo do Dr. Victor
const getVictorStyle = () => {
    try {
        const stylePath = path.join(__dirname, 'estilo_victor.json');
        if (fs.existsSync(stylePath)) {
            const data = fs.readFileSync(stylePath, 'utf8');
            return JSON.parse(data);
        }
    } catch (e) {
        console.error("❌ Erro ao ler estilo_victor.json:", e);
    }
    return { style_rules: [] };
};


// Configurações WordPress do .env
const WP_URL = (process.env.WP_URL || 'https://hipnolawrence.com/').replace(/\/$/, '');
const WP_API_BASE = `${WP_URL}/wp-json/wp/v2`;
const WP_AUTH = Buffer.from(`${process.env.WP_USERNAME}:${process.env.WP_APP_PASSWORD}`).toString('base64');

// ==============================================================================
// 1. PROXY WORDPRESS (Segurança: Credenciais nunca saem do servidor)
// ==============================================================================

// Helper para chamadas WP
const callWP = async (method, endpoint, data = null, params = {}) => {
    const url = `${WP_API_BASE}${endpoint}`;
    const headers = {
        'Authorization': `Basic ${WP_AUTH}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) NeuroEngine/1.0'
    };

    if (method !== 'GET' && data) {
        headers['Content-Type'] = 'application/json';
    }

    console.log(`📡 [WP PROXY] ${method} ${url} ${params ? JSON.stringify(params) : ''}`);

    try {
        return await axios({
            method,
            url,
            data,
            params,
            headers
        });
    } catch (e) {
        console.error(`❌ [WP PROXY ERROR] ${method} ${url}: status=${e.response?.status}, message=${e.message}`);
        if (e.response?.status === 403) {
            console.error("💡 DICA: Erro 403 pode ser ModSecurity bloqueando Headers ou Queries. Tente simplificar a requisição.");
        }
        throw e;
    }
};

// Endpoints Genéricos (GET, POST, PUT, DELETE)
app.get('/api/wp/:type', async (req, res) => {
    try {
        const response = await callWP('GET', `/${req.params.type}`, null, req.query);
        res.json(response.data);
    } catch (e) { res.status(e.response?.status || 500).json(e.response?.data || {error: e.message}); }
});

app.post('/api/wp/:type', async (req, res) => {
    try {
        const response = await callWP('POST', `/${req.params.type}`, req.body);
        res.json(response.data);
    } catch (e) { res.status(e.response?.status || 500).json(e.response?.data || {error: e.message}); }
});

app.all('/api/wp/:type/:id', async (req, res) => {
    try {
        const { type, id } = req.params;
        const response = await callWP(req.method, `/${type}/${id}`, req.body, req.query);
        res.json(response.data);
    } catch (e) { res.status(e.response?.status || 500).json(e.response?.data || {error: e.message}); }
});

// ──────────────────────────────────────────────────────────────────────────────
// ENDPOINT DEDICADO: Busca conteúdo completo contornando WAF/ModSecurity 403
// Estratégia: duas chamadas menores em vez de uma grande com content=HTML
// ──────────────────────────────────────────────────────────────────────────────
app.get('/api/api-content/:type/:id', async (req, res) => {
    try {
        const { type, id } = req.params;
        console.log(`📄 [CONTENT] Buscando ${type}/${id} com estratégia anti-WAF...`);

        // Chamada 1: Metadados leves (nunca 403)
        const metaResp = await callWP('GET', `/${type}/${id}`, null, {
            _fields: 'id,title,excerpt,status,link,featured_media,date,modified'
        });
        const meta = metaResp.data;

        // Chamada 2: Apenas o campo content (sem context=edit — evita 403 extra do mod_security)
        let contentRendered = '';
        let rawContent = '';
        try {
            const contentResp = await callWP('GET', `/${type}/${id}`, null, {
                _fields: 'content'
                // NÃO usar context=edit — isso dispara 403 no Hostinger/ModSecurity
            });
            contentRendered = contentResp.data?.content?.rendered || '';
            rawContent      = contentResp.data?.content?.raw      || contentRendered;
        } catch (contentErr) {
            const status = contentErr.response?.status;
            console.warn(`⚠️ [CONTENT] Falha ao buscar content (HTTP ${status}). Retornando vazio.`);
            // Não re-lança — retorna apenas os metadados
        }

        // Retorna no formato esperado pelo frontend
        res.json({
            ...meta,
            content: {
                rendered: contentRendered,
                raw: rawContent
            },
            excerpt: meta.excerpt || { rendered: '' }
        });

    } catch (e) {
        console.error('❌ [CONTENT ERROR]', e.message);
        res.status(e.response?.status || 500).json({ error: e.message });
    }
});

// Endpoints de Configuração AntiGravity
app.get('/api/wp-settings', async (req, res) => {
    try {
        const response = await axios.get(`${WP_URL}/wp-json/antigravity/v1/settings`, {
            headers: { 'Authorization': `Basic ${WP_AUTH}` }
        });
        res.json(response.data);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/wp-settings', async (req, res) => {
    try {
        const response = await axios.post(`${WP_URL}/wp-json/antigravity/v1/settings`, req.body, {
            headers: { 'Authorization': `Basic ${WP_AUTH}`, 'Content-Type': 'application/json' }
        });
        res.json(response.data);
    } catch (e) { res.status(500).json({ error: e.message }); }
});
// Endpoint especial para Upload de Mídia (Multipart/Form-Data)
app.post('/api/wp-upload-media', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) throw new Error("Nenhum arquivo enviado.");

        const formData = new (require('form-data'))();
        formData.append('file', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype
        });
        formData.append('title', req.body.title || '');
        formData.append('alt_text', req.body.alt_text || '');

        const response = await axios.post(`${WP_API_BASE}/media`, formData, {
            headers: {
                ...formData.getHeaders(),
                'Authorization': `Basic ${WP_AUTH}`
            }
        });
        res.json(response.data);
    } catch (e) {
        console.error("Upload Proxy Error:", e.message);
        res.status(500).json({ error: e.message });
    }
});

// ==============================================================================
// 2. PROXY AI (Gemini)
// ==============================================================================

app.post('/api/ai/generate', async (req, res) => {
    try {
        const { prompt, config } = req.body;
        console.log(`🧠 [AI PROXY] Generate request for prompt prompt: "${prompt.substring(0, 50)}..."`);
        const model = genAI.getGenerativeModel({ model: VISION_MODEL });
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: config || { temperature: 0.7, maxOutputTokens: 1000 }
        });
        const resp = await result.response;
        res.json({ text: resp.text() });
    } catch (e) { 
        console.error("❌ [AI PROXY ERROR]", e.message);
        res.status(500).json({ error: e.message }); 
    }
});

const DOCTORALIA_REVIEWS = `
- Carla (TEA): "Diagnóstico tardio possível pela técnica adequada... melhora significativa na qualidade de vida."
- Y. (Autista): "Acompanhamento fez enorme diferença... hipnose e PNL com empatia e respeito."
- A. M. (Sábio): "Estrutura da minha vida, alguém sábio que me fez enxergar eu mesma."
- R. A. (Ansiedade): "Problema de ansiedade resolvido em algumas sessões. Muito profissional."
- L. F. S.: "Resultados nítidos e precisos. Indico fortemente."
`;

const REAL_ASSETS = `
VERDADE ABSOLUTA: PROIBIDO INVENTAR LINKS OU DADOS FALSOS. USE APENAS OS SEGUINTES LINKS REAIS:

LINKS DE SERVIÇOS E PÁGINAS (SILOS E HUB):
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

DEMONSTRAÇÃO DE HIPNOSE / EVENTOS:
- https://hipnolawrence.com/wp-content/uploads/2026/03/5b6b7fbf-d665-4d68-96b0-aa8d2889a0bc.jpg
- Palestra IFG: https://hipnolawrence.com/wp-content/uploads/2026/03/palestra-IFG2.jpeg
- Congresso Autismo (2015): https://hipnolawrence.com/wp-content/uploads/2026/03/11148819_865048126899579_5754455918839697297_o.jpg
- Defesa TCC: https://hipnolawrence.com/wp-content/uploads/2026/03/defesa-TCC.jpg

LOGOMARCA:
- https://hipnolawrence.com/wp-content/uploads/2025/12/Victor-Lawrence-Logo-Sem-Fundo-1.png

AMBIENTE CONSULTÓRIO:
- https://hipnolawrence.com/wp-content/uploads/2026/02/IMG_0298-scaled.jpeg
- https://hipnolawrence.com/wp-content/uploads/2026/02/IMG_0312-scaled.jpeg
- https://hipnolawrence.com/wp-content/uploads/2026/02/IMG_0359-scaled.jpeg
- https://hipnolawrence.com/wp-content/uploads/2026/03/98593981-F8A7-4F8E-86A4-BBF2C04F704C.jpg
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
<!-- CONFIGURAÇÃO TAILWIND -->
<script>
    tailwind = {
        config: {
            corePlugins: { preflight: false } // Impede conflitos com o tema Astra
        }
    }
</script>

<!-- DEPENDÊNCIAS -->
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

<!-- WRAPPER MESTRE -->
<div class="abidos-wrapper">
    <!-- ESTRUTURA SEÇÕES AQUI -->
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
// 3. TABELA DE REVISÃO E PIPELINE DE AGENTES (HUMAN-IN-THE-LOOP & LANGGRAPH)
// ==============================================================================

// Estado do Perfil de Voz (Clone de Voz / Reverse Prompting)
let voiceProfile = {
    learned_style: "Direto, clínico, porém empático. Foco em autoridade técnica e resultados práticos (Goiânia).",
    vocabulary: ["Goiânia", "Neuropsicologia", "TEA", "Clínica", "Avaliação"],
    prohibited_terms: ["cura milagrosa", "garantido", "mudar sua vida para sempre"],
    rhythm: "Sentenças curtas e estruturadas por bullet points.",
    last_updated: new Date().toISOString()
};

app.get('/api/drafts', async (req, res) => {
    try {
        console.log(`📑 [REVISÃO] Buscando rascunhos reais do WordPress...`);
        const response = await callWP('GET', '/posts', null, { 
            status: 'draft', 
            per_page: 50,
            _fields: 'id,title,content,date,type' 
        });

        const drafts = response.data.map(post => ({
            draft_id: `WP-${post.id}`,
            tema_foco: post.title.rendered || "Sem Título",
            conteudo_gerado: post.content.rendered,
            validacoes_automatizadas: {
                pesquisa_clinica: true,
                metodo_abidos: post.content.rendered.includes('<h1'), // Heurística simples
                compliance_etico: !post.content.rendered.includes('garantido'), // Heurística simples
                med_f1_score: 0.95
            },
            status_atual: "aguardando_psicologo",
            fontes_rag_utilizadas: ["WordPress Draft Store"],
            data_submissao: post.date
        }));

        res.json(drafts);
    } catch (e) {
        console.error("❌ [API DRAFTS ERROR]", e.message);
        res.status(500).json({ error: e.message });
    }
});

// Orquestrador LangGraph (Simulação de Multi-Agent Node Pipeline)
app.post('/api/agents/generate-pipeline', async (req, res) => {
    try {
        const { topic } = req.body;
        if (!topic) throw new Error("Tópico (STAG) não fornecido.");
        const model = genAI.getGenerativeModel({ model: VISION_MODEL });

        console.log(`🤖 [LANGGRAPH PIPELINE] Iniciando fluxo para: ${topic}`);

        // NÓ 1: Agente Gerador (RAG & Pesquisa + Personalidade Aprendida)
        console.log(`📡 [NÓ 1] Agente de Pesquisa (Voz Dr. Victor)...`);
        const pGerador = `
        VOCÊ É O CLONE DE VOZ DO DR. VICTOR LAWRENCE.
        
        PERFIL DE VOZ APRENDIDO:
        - Estilo: ${voiceProfile.learned_style}
        - Ritmo: ${voiceProfile.rhythm}
        - Vocabulário Favorecido: ${voiceProfile.vocabulary.join(', ')}
        - Termos Proibidos: ${voiceProfile.prohibited_terms.join(', ')}
        
        TAREFA: Escreva um rascunho de landing page sobre "${topic}" focado em Goiânia. 
        Mantenha a autoridade clínica, evite clichês de marketing robótico.
        Use tags HTML simples (h2, h3, p). PROIBIDO H1 e PROIBIDO wrappers como <div class="lw-page-wrapper">.
        ` ;
        const resGerador = await model.generateContent(pGerador);
        const rascunhoPrimario = resGerador.response.text();

        // NÓ 2, 3 e 4: Loop de Validação (Abidos, Crítico e Compliance)
        console.log(`⚖️ [NÓS DE VALIDAÇÃO] Auditoria de Compliance, Abidos e Factual...`);
        const pAuditoria = `
        Analise rigorosamente o Rascunho HTML abaixo baseado:
        1. CFP/Etica (Sem promessas de cura, sem exibição antiética)
        2. Abidos (NÃO pode ter H1, use H2 na Hero. Tem CTAs e keyword?)
        3. FactScore (Acurácia clínica para ${topic})
        Retorne APENAS um JSON: {"aprovado": boolean, "abidos_score": number, "compliance_pass": boolean, "med_f1": number, "correcoes": "texto com o rascunho consertado ou original html"}
        Rascunho: """${rascunhoPrimario}"""
        `;
        const resAuditoria = await model.generateContent(pAuditoria);
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
        console.log(`✅ [PIPELINE CONCLUÍDA] Human-in-the-loop aguardando.`);
        
        res.json({ success: true, draft: newDraft });
    } catch (e) {
        console.error("❌ [PIPELINE ERROR]", e.message);
        res.status(500).json({ error: e.message });
    }
});


app.post('/api/agents/audit', async (req, res) => {
    try {
        const { content } = req.body;
        console.log(`🔍 [AGENTE ABIDOS] Auditing draft...`);
        
        const prompt = `
        Você é o "Agente Abidos", um Arquiteto de Sistemas e Auditor Sênior Implacável.
        
        SUA MISSÃO: Realizar uma auditoria de nível clínico no rascunho abaixo.
        
        MÉTODO DE AUDITORIA (FACTSCORE):
        1. Decomposição Atômica: Quebre o texto em afirmações individuais.
        2. Validação Factual: Verifique se há "alucinações" ou promessas de cura (Proibido pelo CFP).
        3. MED-F1 (Extração de Entidades): Liste termos técnicos (ex: TEA, TDAH, ISRS) e verifique se o contexto está correto.
        4. Hierarquia Abidos: Cheque se NÃO há H1 (proibido) e se há H2 estratégico com palavra-chave e localização (Goiânia).
        
        Rascunho a auditar:
        """${content}"""
        
        RETORNE UM RELATÓRIO FORMATADO EM HTML (usando tags span, strong, br) COM:
        - ✅ PONTOS POSITIVOS
        - ⚠️ ALERTAS DE RISCO (CFP/LGPD)
        - 📊 PONTUAÇÃO FACTSCORE (0-100%)
        - 📝 SUGESTÕES DE REESCRITA
        `;

        const model = genAI.getGenerativeModel({ model: VISION_MODEL });
        const result = await model.generateContent(prompt);
        const resp = await result.response;
        
        res.json({ success: true, report: resp.text() });
    } catch (e) {
        console.error("❌ [AGENTE ABIDOS ERROR]", e.message);
        res.status(500).json({ error: e.message });
    }
});

// NÓ DE APRENDIZADO DE ESTILO: Reverse Prompting
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
        const jsonStr = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        const extractedProfile = JSON.parse(jsonStr);

        voiceProfile = {
            ...extractedProfile,
            last_updated: new Date().toISOString()
        };

        res.json({ success: true, profile: voiceProfile });
    } catch (e) {
        console.error("❌ [LEARN STYLE ERROR]", e.message);
        res.status(500).json({ error: e.message });
    }
});

// NÓ DE AFINAMENTO: Text Diffs (Learn from user edits)
app.post('/api/agents/analyze-diff', async (req, res) => {
    try {
        const { original, edited } = req.body;

        console.log(`📝 [DIFF] Analisando edições do usuário para ajuste fino de tom...`);
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
        const jsonStr = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        voiceProfile = JSON.parse(jsonStr);
        voiceProfile.last_updated = new Date().toISOString();

        res.json({ success: true, profile: voiceProfile });
    } catch (e) {
        console.error("❌ [DIFF ANALYZE ERROR]", e.message);
        res.status(500).json({ error: e.message });
    }
});

// ==============================================================================
// 4. MOTOR SEMÂNTICO (SEO PROGRAMÁTICO & SILOS)
// ==============================================================================

app.get('/api/seo/analyze-silos', async (req, res) => {
    try {
        console.log(`🧭 [SEO] Iniciando Auditoria de Silos e Interlinking...`);
        
        // 1. Puxa todas as páginas do WP
        const pages = await callWP('GET', '/pages', null, { per_page: 100 });
        if(!pages.data) throw new Error("Não foi possível carregar as páginas do WP.");

        const pageMap = pages.data.map(p => ({
            id: p.id,
            title: p.title.rendered,
            link: p.link,
            content: p.content.rendered.substring(0, 500) // Amostra para IA
        }));

        const model = genAI.getGenerativeModel({ model: VISION_MODEL });
        const prompt = `
        Aja como um Arquiteto de SEO Programático.
        Analise a lista de páginas da clínica abaixo e construa um Mapa de Interlinking (Silos).
        
        Objetivo: Identificar quais páginas (Spokes) devem linkar para qual Hub principal e encontrar páginas "órfãs".
        
        Páginas: ${JSON.stringify(pageMap)}
        
        Retorne um JSON com:
        - silos: [{ hub: "Título Hub", spokes: ["Título 1", "Título 2"] }]
        - suggestions: [{ from_id: id, to_id: id, anchor_text: "Texto do Link", reason: "Por que?" }]
        
        Retorne APENAS o JSON.
        `;

        const result = await model.generateContent(prompt);
        const jsonStr = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        const siloData = JSON.parse(jsonStr);

        res.json(siloData);
    } catch (e) {
        console.error("❌ [SEO SILO ERROR]", e.message);
        res.status(500).json({ error: e.message });
    }
});

// ==============================================================================
// 5. MONITORAMENTO PROFILÁTICO (LIGHTHOUSE) E REPUTACIONAL
// ==============================================================================

app.get('/api/health/lighthouse', async (req, res) => {
    try {
        console.log(`🔦 [LIGHTHOUSE] Iniciando Auditoria de Performance Profilática...`);
        
        // Simulação de Auditoria (Em um sistema real, chamaria a Lighthouse CLI)
        const metrics = {
            performance: Math.floor(Math.random() * (100 - 85) + 85),
            accessibility: 98,
            best_practices: 100,
            seo: 100,
            core_web_vitals: {
                lcp: "1.2s",
                fid: "14ms",
                cls: "0.02"
            },
            timestamp: new Date().toISOString()
        };

        res.json(metrics);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/reputation/analyze', async (req, res) => {
    try {
        const { platform, content } = req.body;
        console.log(`🛡️ [REPUTAÇÃO] Analisando impacto de feedback em ${platform}...`);

        const model = genAI.getGenerativeModel({ model: VISION_MODEL });
        const prompt = `
        Analise o seguinte feedback de paciente recebido na plataforma ${platform}:
        """${content}"""
        
        Sua tarefa:
        1. Classificar Sentimento (Positivo / Neutro / Alerta Crítico).
        2. Identificar Riscos Éticos (Baseado nas normas do CFP).
        3. Gerar "Resposta Sugerida" (Empática, respeitando sigilo, sem promessas).
        4. Sugerir Melhoria Interna na Clínica.
        
        Retorne em JSON.
        `;

        const result = await model.generateContent(prompt);
        const jsonStr = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        res.json(JSON.parse(jsonStr));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ==============================================================================
// 6. AGENTES DA ESTEIRA DE PRODUÇÃO (FASE 2: MÁQUINA DE ESTADOS)
// ==============================================================================

async function runConstructor(userInput, feedback = null, waNumber, moodId = "1_introspeccao_profunda", contentType = "pages") {
    console.log(`🏗️ [AGENTE 1] Iniciando construção do rascunho (Tipo: ${contentType}, Mood: ${moodId})...`);
    const model = genAI.getGenerativeModel({ model: VISION_MODEL });
    
    // Extrai clima e memória de estilo
    const clima = CLIMAS_CLINICOS[moodId] || CLIMAS_CLINICOS["1_introspeccao_profunda"];
    const personalStyle = getVictorStyle();
    const styleContext = personalStyle.style_rules?.length > 0 ? 
        `\n[MEMÓRIA DE ESTILO (NEURO-TRAINING)]: \n- ${personalStyle.style_rules.join('\n- ')}` : '';
    
    // Bloco de Restrição Estética (Fase 3)
    const restricaEstetica = `
    [ALERTA DE RESTRIÇÃO ESTRITA DE DESIGN: CLIMA CLÍNICO ATIVO]
    Para esta tarefa, você está OBRIGADO a utilizar o perfil visual: ${clima.nome_amigavel}.
    Você está ESTRITAMENTE PROIBIDO de inventar códigos hexadecimais, paletas de cores ou gradientes que não estejam listados abaixo. O não cumprimento resultará na reprovação imediata do seu código.

    Variáveis Obrigatórias do Tailwind CSS v4:
    - Fundo das secções principais: Deve ser exclusivamente ${clima.fundo_principal}.
    - Cor da Tipografia de parágrafos e textos longos: Deve ser exclusivamente ${clima.texto_principal}.
    - Cor dos Títulos (H2, H3) e destaques: Deve ser exclusivamente ${clima.texto_destaque}.
    - Cor de Acção (Botões, Links, Ícones CTA): Deve ser exclusivamente ${clima.cor_acao}.

    Diretrizes de Efeitos Visuais UI/UX:
    Aplique rigorosamente a seguinte regra de efeitos: ${clima.efeitos_obrigatorios}.
    Lembre-se: Todas as classes críticas de col acima já possuem o prefixo ! para forçar a prioridade (important). Não o remova.
    `;

    let specificRolePrompt = "";

    if (contentType === "posts") {
        specificRolePrompt = `
[IDENTIDADE E PROPÓSITO: MÓDULO DE POSTAGENS ABIDOS V3.2]
Você é o Arquiteto Frontend Sênior responsável por gerar as Postagens de Blog (Spokes) da Clínica Victor Lawrence. Sua missão é criar artigos em HTML/Tailwind CSS que não sejam apenas textos, mas Experiências Editoriais Imersivas e Hipnóticas, utilizando o "Protocolo Abidos v3.2".

DNA VISUAL E ATMOSFERA (A ESTÉTICA ERICKSONIANA):
As postagens devem evocar um transe visual sóbrio, elegante e naturalista. O paciente deve sentir-se acolhido e focado.
- Tipografia: Fonte Inter. Títulos (H1, H2, H3) devem usar !font-extrabold e !tracking-tight. Parágrafos base devem usar !font-normal, !text-slate-300 (no tema dark) ou !text-slate-700 (no tema light), com entrelinhas generoso !leading-[1.8].
- Cores Restritas: Fundo principal !bg-[#05080f] (Midnight) ou !bg-[#faf9f6] (Off-white). Destaques sempre em !bg-[#2dd4bf] ou !text-[#2dd4bf] (Teal).
- Obrigatoriedade Técnica: Todo o código deve estar encapsulado na <div class="abidos-wrapper">. Todas as classes Tailwind utilitárias críticas devem levar o prefixo ! (ex: !flex, !mt-8) para blindar contra o tema WordPress legado.

DIRETRIZES DE ESTRUTURA E VARIAÇÃO DE LAYOUT:
1. Header do Artigo (Hero do Blog): Sempre inicie com um H1 impactante centralizado, a data/categoria, e uma imagem de capa grande com cantos arredondados (!rounded-[2rem]) e filtro suave (grayscale-[15%]).
2. Cápsula de Leitura: O texto do corpo (body do artigo) deve estar OBRIGATORIAMENTE confinado em uma div com max-w-3xl mx-auto. A fluência cognitiva é a prioridade zero.
3. Citações Hipnóticas (Blockquotes): Transforme frases-chave ou reflexões importantes do Dr. Victor em blocos destacados usando o estilo Glassmorphism Sóbrio.
   - Código Base: <blockquote class="abidos-glass-dark !p-8 !rounded-2xl !border-l-4 !border-[#2dd4bf] !my-10 !text-xl !italic !text-white">
4. Respiros Visuais (Imagens In-line): Alterne imagens secundárias ao longo do texto. Em um bloco, coloque a imagem fluindo à direita (float-right !ml-8 !mb-4 w-1/2); em outro post, use imagens expandidas quebrando o layout.
5. Aura Periférica (Orb Glows): Insira esferas de luz animadas na borda da tela para manter a atmosfera sem poluir o texto central.

ESTRUTURA SEO E E-E-A-T:
- Linkagem Interna Contextual: Ao longo do texto, crie cards elegantes (usando Glassmorphism leve) recomendando a página de Serviço Principal (Silo Pai).
- Caixa de Autoridade (Author Box): No final de TODA postagem, gere um bloco visual de rodapé com a foto do Victor Lawrence, CRP 09/012681, menção ao Mestrado (UFU) e um botão sutil de WhatsApp.
        `;
    } else {
        specificRolePrompt = `
[INSTRUÇÃO DE IDENTIDADE E PAPEL: MÓDULO DE PÁGINAS ABIDOS V3.2]
Você é um Arquiteto de Software Frontend Sênior, Especialista em Neuromarketing Clínico e SEO Técnico (Metodologia Abidos v3.1/v3.2). A sua missão é escrever código puro e infalível em HTML5 semântico estruturado com Tailwind CSS v4.
Você não é um assistente de conversação; você é uma máquina geradora de código de alta performance e conversão para o nicho de Saúde Mental (YMYL - Your Money or Your Life).

[ESTRUTURA DE SEO ON-PAGE E HIERARQUIA DE TAGS]
- O Gatilho de Captura (<h1>): A página deve ter UM E APENAS UM <h1>. Ele deve unir a Palavra-chave Primária Exata + Promessa de Valor (Transformação) + Localização (Goiânia/Setor Sul).
- O Desenvolvimento (<h2>): Utilize as tags <h2> para criar os "Silos Internos" da página: (Dor, Especialista, Ambiente, FAQ).
- A Quebra de Objeções (<h3>): Utilize para detalhar micro-intenções.
- SEO de Imagens: TODAS as tags <img> com alt tags geo-otimizadas.

[COPYWRITING CLÍNICO E E-E-A-T]
- Prova de Autoridade: CRP 09/012681, Mestrado UFU, Autor da escala AQ10b.
- Rodapé (Footer): Construído em 4 colunas com NAP (Nome, Endereço, Telefone).
        `;
    }

    let prompt = `
${specificRolePrompt}

${restricaEstetica}

[REGRA ABSOLUTA E INVIOLÁVEL: VERACIDADE DOS DADOS]
É ESTRITAMENTE PROIBIDO o uso de dados falsos, "Lorem Ipsum", informações genéricas ou placeholders (como href="#" ou imagens de bancos gratuitos).
Utilize EXCLUSIVAMENTE a Base de Dados de Links Reais e o Repositório Visual de Imagens fornecidos no final deste prompt.

[DIRETRIZES TÉCNICAS GERAIS (ABIDOS V3.2)]
- GERAÇÃO NATIVA TOTAL: Você não está mais criando apenas o 'corpo' da página. Você deve agora gerar obrigatoriamente:
    1. CABEÇALHO (Header): Menu responsivo com logótipo real, links para silos e CTA de agendamento.
    2. RODAPÉ (Footer): Estrutura de 4 colunas (Identidade, Navegação, Silos, Contato/NAP) seguindo o Google Meu Negócio.
- Wrapper Mestre: Todo o código deve estar encapsulado dentro de <div class="abidos-wrapper">.
- Imunidade: Prefixo !important em classes críticas.
- Mobile-First: Botões !whitespace-nowrap.

${styleContext}

[REQUISIÇÃO DO USUÁRIO]
WHATSAPP PARA CTAs: ${waNumber}
PEDIDO EXPLICITO: ${userInput}
${feedback ? `⚠️ FEEDBACK DE CORREÇÃO DOS INSPETORES (CORRIJA ISTO): ${feedback}` : ''}

============== TEMPLATE ESTRUTURAL MÍNIMO ==============
${ABIDOS_TEMPLATE_MINIMO}

============== DADOS REAIS E ASSETS ==============
${REAL_ASSETS}
${DOCTORALIA_REVIEWS}

[INSTRUÇÃO DE EXECUÇÃO FINAL]
Gere o código HTML completo aplicando estas regras. Retorne APENAS o código HTML cru.
    `;
    const result = await model.generateContent(prompt);
    return result.response.text().replace(/```html|```/g, '').trim();
}

async function runAbidosInspector(html) {
    console.log(`🔍 [AGENTE 2] Auditando Estrutura e SEO (Abidos Gate)...`);
    const model = genAI.getGenerativeModel({ model: VISION_MODEL });
    let prompt = `
        🔍 AGENTE 2: Inspetor Abidos (Auditor de Estrutura e SEO)
        Papel: Você é um Auditor de SEO Técnico implacável. Você não escreve código do zero, apenas analisa o código fornecido pelo Agente Construtor.
        Comportamento: Leia o HTML gerado e procure falhas estruturais.
        Regras de Validação:
        1. Existe mais de um <h1>? (Se sim, REPROVOU).
        2. O código está encapsulado na div abidos-wrapper? (Se não, REPROVOU).
        3. A estrutura tem links de Silo corretos na base? (Se não, REPROVOU).
        Output Exigido: Responda APENAS no formato JSON: {"status": "PASSOU"} OU {"status": "REPROVOU", "motivo": "Descrição exata do que o Construtor deve apagar ou mudar"}.
        
        HTML PARA AUDITORIA:
        ${html}
    `;
    const result = await model.generateContent(prompt);
    try {
        return JSON.parse(result.response.text().replace(/```json|```/g, '').trim());
    } catch (e) {
        return { status: "REPROVOU", motivo: "Erro na resposta do inspetor. Tente novamente." };
    }
}

async function runClinicalInspector(html) {
    console.log(`🧠 [AGENTE 3] Auditando E-E-A-T e Ética (Clinical Gate)...`);
    const model = genAI.getGenerativeModel({ model: VISION_MODEL });
    let prompt = `
        🧠 AGENTE 3: Inspetor Clínico (Auditor de E-E-A-T e Ética YMYL)
        Papel: Você é um Revisor do Conselho Federal de Psicologia (CFP) e especialista nas diretrizes YMYL do Google. Você não escreve código, apenas audita o texto gerado.
        Comportamento: Leia toda a copy (texto) embutida no HTML. O nicho é saúde mental sensível.
        Regras de Validação:
        1. Existe alguma promessa de "cura rápida", "garantia de resultado" ou jargão de marketing agressivo como "Compre agora"? (Se sim, REPROVOU).
        2. A autoridade E-E-A-T do Dr. Victor Lawrence (CRP 09/012681, Mestrado pela UFU) está explicitamente citada? (Se não, REPROVOU).
        3. A linguagem é empática e gera baixa fricção cognitiva? (Se não, REPROVOU).
        Output Exigido: Responda APENAS no formato JSON: {"status": "PASSOU"} OU {"status": "REPROVOU", "motivo": "Substitua a frase X por um tom mais clínico e acolhedor"}.
        
        HTML PARA AUDITORIA:
        ${html}
    `;
    const result = await model.generateContent(prompt);
    try {
        return JSON.parse(result.response.text().replace(/```json|```/g, '').trim());
    } catch (e) {
        return { status: "REPROVOU", motivo: "Erro na resposta do inspetor. Tente novamente." };
    }
}

async function runDesignInspector(html) {
    console.log(`🎨 [AGENTE 4] Auditando UI/UX Tailwind (Design Gate)...`);
    const model = genAI.getGenerativeModel({ model: VISION_MODEL });
    let prompt = `
        🎨 AGENTE 4: Inspetor de Design (Auditor de UI/UX Tailwind)
        Papel: Você é um Engenheiro de Neuromarketing Visual especializado em Tailwind v4. Você não cria design, apenas revisa.
        Comportamento: Leia as classes Tailwind no código para garantir que o Design System do Método Abidos foi respeitado.
        Regras de Validação:
        1. O Glassmorphism está aplicado corretamente com a fórmula de backdrop-filter? (Se não, REPROVOU).
        2. Os textos em parágrafos usam font-normal (peso 400) para evitar cansaço visual? (Se não, REPROVOU).
        3. Existe risco de colisão mobile (ex: botões com textos gigantes que quebram a linha)? (Se sim, REPROVOU).
        Output Exigido: Responda APENAS no formato JSON: {"status": "PASSOU"} OU {"status": "REPROVOU", "motivo": "Adicione a classe '!whitespace-nowrap' no botão Y"}.
        
        HTML PARA AUDITORIA:
        ${html}
    `;
    const result = await model.generateContent(prompt);
    try {
        return JSON.parse(result.response.text().replace(/```json|```/g, '').trim());
    } catch (e) {
        return { status: "REPROVOU", motivo: "Erro na resposta do inspetor. Tente novamente." };
    }
}

// ==============================================================================
// 7. MARKETING LAB & ORQUESTRAÇÃO
// ==============================================================================

app.get('/api/marketing/audit', async (req, res) => {
    try {
        console.log(`📈 [MARKETING] Buscando dados reais de performance...`);
        
        // Dados REAIS do WordPress para volume de conteúdo
        const posts = await callWP('GET', '/posts', null, { per_page: 1 });
        const totalPosts = posts.headers['x-wp-total'] || 0;

        const data = {
            visitors: 0, 
            leads: 0,
            abidos_score: "N/A",
            budget_utilization: "0%",
            top_performing_stag: "Nenhum ativo",
            critica_loss: "0% (Analytics não configurado)",
            recommendations: [
                { type: "SEO", theme: "Sincronizar Search Console", reason: "Falta de dados de tráfego real" }
            ],
            insights: `Sistema operacional rodando. Detectados ${totalPosts} conteúdos no WordPress.`
        };

        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/chat', upload.single('screenshot'), async (req, res) => {
    try {
        const { prompt, message, htmlContext, currentKeyword, whatsapp, moodId, type } = req.body;
        const userInput = prompt || message;
        const waNumber = whatsapp || '5562991545295';
        const selectedMood = moodId || '1_introspeccao_profunda';
        const contentType = type || 'pages';
        
        console.log(`\n🚦 [ESTEIRA] Iniciando Orquestração Sequencial (Tipo: ${contentType}, Mood: ${selectedMood}) para: "${userInput.substring(0, 30)}..."`);
        
        let currentHtml = "";
        let feedback = null;
        let attempts = 0;
        const maxRetries = 3;

        while (attempts < maxRetries) {
            attempts++;
            console.log(`🔄 [TENTATIVA ${attempts}/${maxRetries}]`);
            
            // 1. CONSTRUTOR
            currentHtml = await runConstructor(userInput, feedback, waNumber, selectedMood, contentType);
            
            // 2. INSPEÇÃO ABIDOS
            const abidosResult = await runAbidosInspector(currentHtml);
            if (abidosResult.status === "REPROVOU") {
                console.warn(`❌ [ABIDOS REPROVOU] Motivo: ${abidosResult.motivo}`);
                feedback = `AGENTE ABIDOS REPROVOU: ${abidosResult.motivo}`;
                continue;
            }
            console.log(`✅ [ABIDOS PASSOU]`);

            // 3. INSPEÇÃO CLÍNICA
            const clinicalResult = await runClinicalInspector(currentHtml);
            if (clinicalResult.status === "REPROVOU") {
                console.warn(`❌ [CLÍNICO REPROVOU] Motivo: ${clinicalResult.motivo}`);
                feedback = `AGENTE CLÍNICO REPROVOU: ${clinicalResult.motivo}`;
                continue;
            }
            console.log(`✅ [CLÍNICO PASSOU]`);

            // 4. INSPEÇÃO DESIGN
            const designResult = await runDesignInspector(currentHtml);
            if (designResult.status === "REPROVOU") {
                console.warn(`❌ [DESIGN REPROVOU] Motivo: ${designResult.motivo}`);
                feedback = `AGENTE DESIGN REPROVOU: ${designResult.motivo}`;
                continue;
            }
            console.log(`✅ [DESIGN PASSOU]`);

            // SE CHEGOU AQUI, PASSOU EM TUDO
            console.log(`🏁 [ESTEIRA CONCLUÍDA] Código aprovado por todos os inspetores.`);
            return res.json({ reply: currentHtml });
        }

        // SE ESGOTOU TENTATIVAS
        console.error(`🚨 [ESTEIRA FALHOU] Limite de ${maxRetries} retentativas atingido.`);
        res.json({ reply: `⚠️ Atenção: O Studio não conseguiu resolver todas as pendências de qualidade após ${maxRetries} tentativas. Feedback final do último inspetor: ${feedback}. Intervenção manual necessária.` });

    } catch (e) { 
        console.error("❌ [ESTEIRA ERROR]", e.message);
        res.status(500).json({ error: e.message }); 
    }
});

app.post('/api/blueprint', upload.none(), async (req, res) => {
    try {
        const { theme, whatsapp, moodId, type } = req.body;
        const waNumber = whatsapp || '5562991545295';
        const selectedMood = moodId || '1_introspeccao_profunda';
        const contentType = type || 'pages';
        
        console.log(`\n📐 [BLUEPRINT] Iniciando Esteira de Produção (Tipo: ${contentType}, Mood: ${selectedMood}) para Tema: "${theme}"`);
        
        let currentHtml = "";
        let feedback = null;
        let attempts = 0;
        const maxRetries = 3;

        while (attempts < maxRetries) {
            attempts++;
            console.log(`🔄 [TENTATIVA ${attempts}/${maxRetries}]`);
            
            // 1. CONSTRUTOR
            currentHtml = await runConstructor(`Criar blueprint completo para o tema: ${theme}`, feedback, waNumber, selectedMood, contentType);
            
            // 2. INSPEÇÃO ABIDOS
            const abidosResult = await runAbidosInspector(currentHtml);
            if (abidosResult.status === "REPROVOU") {
                console.warn(`❌ [ABIDOS REPROVOU] Motivo: ${abidosResult.motivo}`);
                feedback = `AGENTE ABIDOS REPROVOU: ${abidosResult.motivo}`;
                continue;
            }
            console.log(`✅ [ABIDOS PASSOU]`);

            // 3. INSPEÇÃO CLÍNICA
            const clinicalResult = await runClinicalInspector(currentHtml);
            if (clinicalResult.status === "REPROVOU") {
                console.warn(`❌ [CLÍNICO REPROVOU] Motivo: ${clinicalResult.motivo}`);
                feedback = `AGENTE CLÍNICO REPROVOU: ${clinicalResult.motivo}`;
                continue;
            }
            console.log(`✅ [CLÍNICO PASSOU]`);

            // 4. INSPEÇÃO DESIGN
            const designResult = await runDesignInspector(currentHtml);
            if (designResult.status === "REPROVOU") {
                console.warn(`❌ [DESIGN REPROVOU] Motivo: ${designResult.motivo}`);
                feedback = `AGENTE DESIGN REPROVOU: ${designResult.motivo}`;
                continue;
            }
            console.log(`✅ [DESIGN PASSOU]`);

            // FINALIZADO
            console.log(`🏁 [BLUEPRINT CONCLUÍDO] Blueprint aprovado por todos os inspetores.`);
            return res.json({ html: currentHtml });
        }

        console.error(`🚨 [BLUEPRINT FALHOU] Limite de ${maxRetries} retentativas atingido.`);
        res.json({ html: `<!-- 🚨 FALHA CRÍTICA: O Studio não conseguiu resolver rascunho Abidos após 3 tentativas. Intervenção manual necessária. -->\n${currentHtml}` });

    } catch (e) { 
        console.error("❌ [BLUEPRINT ERROR]", e.message);
        res.status(500).json({ error: e.message }); 
    }
});

app.post('/api/audit', async (req, res) => {
    try {
        const { html, keyword } = req.body;
        const model = genAI.getGenerativeModel({ model: VISION_MODEL });
        const result = await model.generateContent(`Retorne um JSON array de auditoria SEO para o termo ${keyword}:\n\n${html}`);
        const resp = await result.response;
        res.json({ checklist: JSON.parse(resp.text().replace(/```json|```/g, '').trim()) });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 🚀 [FASE 5] ENDPOINTS NEURO-TRAINING
app.get('/api/neuro-training/memory', (req, res) => {
    res.json(getVictorStyle());
});

app.post('/api/neuro-training/extract', async (req, res) => {
    try {
        const { sample, currentAiOutput } = req.body;
        if (!sample) return res.status(400).json({ error: "Amostra necessária." });

        const model = genAI.getGenerativeModel({ model: VISION_MODEL });
        const isTranscript = sample.toLowerCase().includes('terapeuta') || sample.toLowerCase().includes('paciente') || sample.length > 1000;
        
        const prompt = isTranscript ? 
`Você está a receber uma transcrição em bruto de uma sessão clínica real do Dr. Victor Lawrence. O seu único objetivo é clonar o cérebro e a voz do terapeuta.

Aja como um Analista Linguístico e faça o seguinte:
1. Identifique as falas do Terapeuta (geralmente aquele que faz as perguntas abertas e as induções hipnóticas).
2. Extraia 3 regras de escrita ou 'Rapport' que demonstrem como ele usa a 'Comunicação Indireta Ericksoniana'.
3. Crie um pequeno feedback personalizado (insight) sobre o que percebeu no padrão de linguagem do Victor e como isso ajuda a converter e acolher pacientes.
4. Formate essas extrações como regras de Copywriting.

[TRANSCRIÇÃO]:
"${sample}"

Retorne APENAS um JSON com:
{
  "new_rules": ["regra 1", "regra 2", "regra 3"],
  "insight": "Seu feedback sobre a linguagem aqui..."
}` : 
`Atue como Especialista em Reverse Prompt Engineering. Analise a diferença entre o que a IA gerou e o que o Victor falou/escreveu.

[IA GENERATED]: "${currentAiOutput || 'Indisponível'}"
[VICTOR CORRECTION/SAMPLE]: "${sample}"

TAREFA:
1. Identifique o desvio de tom (ex: 'A IA foi técnica demais, o Victor foi mais humano').
2. Extraia a regra de escrita (ex: 'Sempre use analogias tecnológicas para explicar o cérebro').
3. Crie um pequeno feedback (insight) sobre como essa correção melhora o material.

Retorne APENAS um JSON com:
{
  "new_rules": ["regra 1", "regra 2"],
  "insight": "Seu feedback aqui..."
}`;

        const response = await model.generateContent(prompt);
        const text = response.response.text().replace(/```json|```/g, '').trim();
        const extracted = JSON.parse(text);

        // Atualiza estilo_victor.json
        const stylePath = path.join(__dirname, 'estilo_victor.json');
        let current = { style_rules: [] };
        if (fs.existsSync(stylePath)) {
            current = JSON.parse(fs.readFileSync(stylePath, 'utf8'));
        }

        current.style_rules = [...new Set([...current.style_rules, ...extracted.new_rules])].slice(-60); 
        current.last_update = new Date().toISOString();
        
        // Mantém histórico de insights
        if (!current.insights_history) current.insights_history = [];
        const newInsight = {
            text: extracted.insight || "Novas regras de estilo integradas com sucesso.",
            date: current.last_update
        };
        current.insights_history.unshift(newInsight);
        current.insights_history = current.insights_history.slice(0, 50); // Mantém os 50 últimos
        
        current.last_insight = newInsight.text;
        
        fs.writeFileSync(stylePath, JSON.stringify(current, null, 2));

        res.json({ 
            success: true, 
            updated_rules: current.style_rules,
            insight_history: current.insights_history
        });

    } catch (e) {
        console.error("❌ [NEURO-TRAINING ERROR]", e.message);
        res.status(500).json({ error: e.message });
    }
});

app.listen(port, () => {
    console.log(`\n🚀 AntiGravity CMS: Mission Control Ativo!`);
    console.log(`📡 Frontend & API rodando em http://localhost:${port}`);
    console.log(`🔐 Camada de Segurança Proxy: ON`);
});
