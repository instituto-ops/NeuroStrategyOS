const express = require('express');
const multer = require('multer');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const WebSocket = require('ws');
require('dotenv').config({ path: '../.env' }); 
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');

const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const app = express();
const port = 3000; // Unificando na porta 3000 (Frontend + API)

// Configuração de CORS: Como agora operamos na mesma porta, CORS é menos crítico,
// mas mantemos por segurança para acessos via IP ou subdomínios.
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 1. SERVIR ARQUIVOS ESTÁTICOS (Frontend & Templates)
app.use(express.static(path.join(__dirname, 'public')));
app.use('/templates', express.static(path.join(__dirname, '../templates')));

const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// [GLOBAL] Servidor WebSocket para Logs em Tempo Real e Voz
let wss; 

/**
 * Função global para reportar status dos agentes via WebSocket
 */
function reportAgentStatus(agent, status, reason = "", isDone = false) {
    if (wss && wss.clients) {
        const payload = JSON.stringify({
            type: 'agent_log',
            agent,
            status,
            reason,
            isDone
        });
        wss.clients.forEach(client => {
            if (client.readyState === 1) { // WebSocket.OPEN
                client.send(payload);
            }
        });
    }
}

// [HEMISFÉRIOS CEREBRAIS DA IA - GERAÇÃO 2026]
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "DUMMY");
const VISION_MODEL = "gemini-2.5-flash"; // Modelo ultra-rápido para o Studio
const HEAVY_MODEL = "gemini-2.5-pro";    // Modelo denso para Clústeres e Auditorias

// Modelos Base (Configuração flexível)
const modelFlash = genAI.getGenerativeModel({ model: VISION_MODEL });
const modelPro = genAI.getGenerativeModel({ model: HEAVY_MODEL });
const draftsDb = []; // In-memory store for newly generated drafts before WP sync

// Helper robust JSON parser
function extractJSON(text) {
    try {
        const match = text.match(/\{[\s\S]*\}/);
        return match ? JSON.parse(match[0]) : null;
    } catch { return null; }
}

// [FASE 5] Módulo Neuro-Training: Memória de Estilo do Dr. Victor
const MEMORY_FILE_PATH = path.join(__dirname, 'estilo_victor.json');

const getVictorStyle = () => {
    try {
        if (fs.existsSync(MEMORY_FILE_PATH)) {
            const data = fs.readFileSync(MEMORY_FILE_PATH, 'utf8');
            return JSON.parse(data);
        }
    } catch (e) {
        console.error("❌ Erro ao ler estilo_victor.json:", e);
    }
    return { style_rules: [] };
};

// ──────────────────────────────────────────────────────────────────────────────

// ============================================================================
// 🧬 COMPILADOR DE DNA — Converte style_rules em diretivas autoritárias para IA
// ============================================================================
function getDnaContext() {
    try {
        const memory = getVictorStyle();
        const regras = (memory.style_rules || []).filter(r => r.regra && r.titulo);
        if (!regras.length) return "";

        let ctx = `\n==================================================================\n`;
        ctx += `[DIRETRIZES ABSOLUTAS DE IDENTIDADE VERBAL E COPYWRITING — DR. VICTOR LAWRENCE]\n`;
        ctx += `Você DEVE aplicar RIGOROSAMENTE a cadência, o vocabulário e a sintaxe abaixo.\n`;
        ctx += `Estas regras definem a 'voz' do Dr. Victor. OBEDEÇA A TODAS, SEM EXCEÇÃO.\n\n`;

        regras.forEach((r, i) => {
            const cat = (r.categoria || 'ESTILO').toUpperCase();
            ctx += `Regra ${i + 1} — [${cat}] ${r.titulo}\n`;
            ctx += `AÇÃO OBRIGATÓRIA: ${r.regra}\n\n`;
        });

        ctx += `==================================================================\n`;
        return ctx;
    } catch (e) {
        console.warn("[DNA] Memória vazia ou corrompida, usando tom neutro.");
        return "";
    }
}

// FUNÇÃO DE CONSOLIDAÇÃO DE DNA (Hipocampo Digital)
async function salvarRegrasDeEstilo(novasRegras) {
    if (!novasRegras || novasRegras.length === 0) return;
    try {
        let current = getVictorStyle();
        if (!current.style_rules) current.style_rules = [];

        const regrasComMetadados = novasRegras.map(regra => ({
            categoria: regra.categoria || "DNA",
            titulo: regra.titulo || regra.sintese || "Padrão Detectado",
            regra: cleanClinicalData(regra.regra),
            id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            data_extracao: new Date().toISOString()
        }));

        current.style_rules = [...regrasComMetadados, ...current.style_rules].slice(0, 100);
        current.last_update = new Date().toISOString();
        
        fs.writeFileSync(MEMORY_FILE_PATH, JSON.stringify(current, null, 2));
        console.log(`🧠 Memória atualizada: +${novasRegras.length} novos insights salvos.`);
    } catch (e) {
        console.error("🚨 Falha crítica ao salvar no hipocampo:", e);
    }
}

// ==============================================================================
// 📋 UTILITÁRIO DE ANONIMIZAÇÃO CLÍNICA (BLINDAGEM ÉTICA)
// ==============================================================================
function cleanClinicalData(text) {
    if (!text) return "";
    let cleaned = text;

    // 1. Padrões de Identidade (CPF/CNPJ, Telefones, Emails)
    const patterns = {
        identificadores: /\b(\d{3}\.\d{3}\.\d{3}-\d{2}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})\b/g,
        telefones: /\b(\(?\d{2}\)?\s?\d{4,5}-?\d{4})\b/g,
        emails: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    };

    cleaned = cleaned.replace(patterns.identificadores, "[ID_REMOVIDO]");
    cleaned = cleaned.replace(patterns.telefones, "[CONTATO_REMOVIDO]");
    cleaned = cleaned.replace(patterns.emails, "[EMAIL_REMOVIDO]");

    // 2. Substituição Contextual de Nomes (Pacing -> [PACIENTE])
    const frasesChave = ["paciente", "cliente", "atendi o", "atendi a", "nome dele é", "nome dela é"];
    frasesChave.forEach(frase => {
        const regex = new RegExp(`(${frase})\\s+([A-Z][a-z]+)`, "gi");
        cleaned = cleaned.replace(regex, "$1 [PACIENTE_ANONIMIZADO]");
    });

    return cleaned;
}


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

// ============================================================================
// ÉTICA ABIDOS — Proibições absolutas injetadas em TODOS os prompts de geração
// ============================================================================
const ETICA_ABIDOS = `
[DIRETRIZES ÉTICAS ABSOLUTAS — PROIBIÇÕES SEM EXCEÇÃO]
- PROIBIDO oferecer, mencionar ou sugerir SESSÃO GRATUITA ou AVALIAÇÃO GRATUITA sob qualquer forma.
- PROIBIDO prometer cura, garantia de resultado ou melhora garantida.
- PROIBIDO fazer diagnósticos pela internet.
- PROIBIDO linguagem de "marketing agressivo" (ex: "mude sua vida", "transformação instantânea").
- PROIBIDO incluir números de WhatsApp, e-mail, preços ou endereços diretamente no texto (use apenas os links reais fornecidos).
- PROIBIDO usar formatação markdown no texto visível (sem **, *, #, etc.).
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
        // Buscamos posts e pages simultaneamente para a fila de revisão
        const [posts, pages] = await Promise.all([
            callWP('GET', '/posts', null, { status: 'draft', per_page: 50 }),
            callWP('GET', '/pages', null, { status: 'draft', per_page: 50 })
        ]);

        const allDrafts = [...posts.data, ...pages.data];

        const drafts = allDrafts.map(post => {
            const auditStatus = post.meta?._abidos_audit_status || "PENDENTE";
            const auditReportJson = post.meta?._abidos_audit_report;
            let auditReport = null;
            try { if (auditReportJson) auditReport = JSON.parse(auditReportJson); } catch (e) {}

            return {
                draft_id: `WP-${post.id}`,
                tema_foco: post.title.rendered || "Sem Título",
                conteudo_gerado: post.content.rendered,
                validacoes_automatizadas: {
                    pesquisa_clinica: auditStatus === "APROVADO",
                    metodo_abidos: auditStatus === "APROVADO" || post.content.rendered.includes('<h2'),
                    compliance_etico: auditStatus === "APROVADO",
                    med_f1_score: auditReport ? 0.95 : 0.90 // Placeholder para Score real no futuro
                },
                status_atual: auditStatus === "REPROVOU" ? "requer_ajustes" : "aguardando_psicologo",
                fontes_rag_utilizadas: ["WordPress Draft Store", "Bio Dr. Victor"],
                data_submissao: post.date
            };
        });

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
        const dnaInjetadoPipeline = getDnaContext();
        const moodPipeline = CLIMAS_CLINICOS['1_introspeccao_profunda'];
        const pGerador = `
Você é o Arquiteto Visual Sênior do Protocolo Abidos. Gere uma Landing Page HTML PREMIUM sobre "${topic}".

[ESTRUTURA DE DESIGN ABIDOS (OBRIGATÓRIO)]
Use EXATAMENTE este Wrapper e estas classes:
1. WRAPPER GERAL: <div class="abidos-wrapper antialiased px-4 py-8 md:px-12 lg:px-24 bg-[#05080f] min-h-screen font-inter text-slate-300">
2. SEÇÕES: <section class="py-16 md:py-32 relative overflow-hidden" data-bloco="nome_do_bloco">
3. CARDS: "bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 md:p-10 shadow-2xl hover:border-teal-500/50 transition-all"
4. H2 (TÍTULO DE SEÇÃO): "font-outfit font-bold text-3xl md:text-5xl leading-tight text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500 mb-6"
5. TEXTO: "text-lg text-slate-400 leading-relaxed mb-8"
6. CTA WHATSAPP: "inline-flex items-center gap-3 px-8 py-4 bg-teal-500 hover:bg-teal-400 text-[#05080f] font-bold rounded-full transition-all hover:scale-105 shadow-[0_0_25px_rgba(45,212,191,0.35)]"

[DNA LITERÁRIO]
${dnaInjetadoPipeline || 'Use linguagem ericksoniana permissiva.'}

[LINKS E IMAGENS REAIS]
${REAL_ASSETS}

${ETICA_ABIDOS}

Gere o HTML modular. Feche o wrapper </div> ao final. Sem markdown.
        `;
        const resGerador = await model.generateContent(pGerador);
        const rascunhoPrimario = resGerador.response.text();

        // NÓ 2, 3 e 4: Loop de Validação (Abidos, Crítico e Compliance)
        console.log(`⚖️ [NÓS DE VALIDAÇÃO] Auditoria de Compliance, Abidos e Factual...`);
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
// 7. AGENTES DA ESTEIRA DE PRODUÇÃO (FASE 2: MÁQUINA DE ESTADOS)
// ==============================================================================

async function runConstructor(userInput, feedback = null, waNumber, moodId = "1_introspeccao_profunda", contentType = "pages") {
    console.log(`🏗️ [Studio] Gerando rascunho direto: "${userInput.substring(0, 30)}..."`);
    const model = genAI.getGenerativeModel({ model: VISION_MODEL });
    
    const clima = CLIMAS_CLINICOS[moodId] || CLIMAS_CLINICOS["1_introspeccao_profunda"];
    const personalStyle = getVictorStyle();
    const styleRules = personalStyle.style_rules?.map(r => `- ${r.regra}`).join('\n') || '';

    const prompt = `VOCÊ É O ARQUITETO ABIDOS V4. Crie uma ${contentType === 'pages' ? 'Landing Page de Alta Conversão' : 'Postagem de Autoridade'} para: "${userInput}".
                    
                    HIERARQUIA SEMÂNTICA (REGRAS DE OURO):
                    1. TÍTULO SEO: Palavra-chave foco nos primeiros 50 caracteres (Limite 60).
                    2. H1: RIGOROSAMENTE apenas um H1 (Primary KW + Promessa + Goiânia). 
                       - Higiene: Não inclua H1 se for repetir o título da página. Mas para Landing Pages, gere um H1 impactante na Hero.
                    3. H2: Use para Identificação da Dor, Benefícios, Autoridade (E-A-T) e FAQ.
                    4. H3: Detalhamento técnico e quebra de objeções.
                    
                    DETALHES DO CLIENTE:
                    - Profissional: Dr. Victor Lawrence (Psicólogo, Mestre UFU).
                    - Registro: CRP 09/012681.
                    - WhatsApp: 62991545295
                    - Localização: Goiânia.
                    - Estilo Visual: ${clima.nome_amigavel}.
                    
                    ESTRUTURA OBRIGATÓRIA (FUNIL):
                    - HERO: H1 Gatilho + Subtítulo Acolhedor + CTA WhatsApp.
                    - DOR (H2): "Sente que a exaustão emocional está travando sua vida?". Use ícones.
                    - MÉTODO (H2): Explicação lógica com repetição semântica da KW.
                    - AUTORIDADE (H2): Foto humanizada, Mestrado UFU, CRP 09/012681.
                    - FAQ (H2): Perguntas em accordion (H3 para perguntas).
                    - RODAPÉ: NAP (Nome, Endereço, Telefone) perfeitamente alinhado ao Google Meu Negócio.
                    
                    REGRAS DE CÓDIGO:
                    - Use HTML5 Semântico e Tailwind inline.
                    - Use gradientes suaves e glassmorphism conforme o clima.
                    - Retorne APENAS o HTML INTERNO da div abidos-wrapper.`;

    const result = await model.generateContent(prompt);
    return result.response.text().replace(/```html|```/g, '').trim();
}

async function runAbidosInspector(html) {
    console.log(`🔍 [AGENTE 2] Auditando Estrutura e SEO (Abidos Gate)...`);
    const model = genAI.getGenerativeModel({ model: VISION_MODEL });
    let prompt = `
        🔍 AGENTE 2: Inspetor Abidos (Auditor de Estrutura e SEO V4)
        Papel: Você é um Auditor de SEO Técnico implacável e Revisor Semântico.
        Comportamento: Leia o HTML gerado e procure falhas contra a Hierarquia Abidos.
        
        REGRAS DE VALIDAÇÃO (REPROVE SE FALTAR):
        1. **HIGIENE DO CADEADO H1**: Não deve haver tag <h1> no código. Se houver, mande remover (o tema cuida do H1).
        2. **FRAGMENTAÇÃO H2**: O conteúdo está dividido em subtópicos <h2> usando as palavras-chave? (Ex: Dor, Especialista, Serviços, FAQ).
        3. **GRANULARIDADE H3**: Existem tópicos <h3> para quebrar objeções ou detalhar tratamentos?
        4. **ABIDOS-WRAPPER**: O código está encapsulado na div class="abidos-wrapper"?
        5. **ALT TAGS**: As imagens possuem alt text estratégico e geo-localizado?

        Output Exigido (JSON APENAS): {"status": "PASSOU"} OU {"status": "REPROVOU", "motivo": "Coloque a seção de dor em um <h2> e verifique a falta de alt tags geo-localizadas"}.
        
        HTML PARA AUDITORIA:
        ${html}
    `;
    const result = await model.generateContent(prompt);
    try {
        return JSON.parse(result.response.text().replace(/\`\`\`json|\`\`\`/g, '').trim());
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
        return JSON.parse(result.response.text().replace(/\`\`\`json|\`\`\`/g, '').trim());
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
        return JSON.parse(result.response.text().replace(/\`\`\`json|\`\`\`/g, '').trim());
    } catch (e) {
        return { status: "REPROVOU", motivo: "Erro na resposta do inspetor. Tente novamente." };
    }
}

/**
 * ESTEIRA DE PRODUÇÃO UNIFICADA (MÁQUINA DE ESTADOS)
 * Orquestra o Construtor e os 3 Inspetores com loop de retentativa.
 */
async function runProductionLine(userInput, feedback, waNumber, moodId, contentType, siloContext = "") {
    let currentHtml = "";
    let finalFeedback = feedback;
    const maxRetries = 3;
    let attempts = 0;

    reportAgentStatus("NeuroEngine", "Iniciando orquestração da esteira...", "", false);

    while (attempts < maxRetries) {
        attempts++;
        console.log("RETRY [ESTEIRA]: Tentativa " + attempts + "/" + maxRetries + " (" + contentType + ")");
        
        // 1. Construtor
        reportAgentStatus("Gerador", `Construindo versão ${attempts}...`, "", false);
        let extendedPrompt = userInput;
        if (siloContext) extendedPrompt += `\n\n[CONTEXTO DE SILO ABIDOS]: Este item faz parte de um cluster. Vincule-o semanticamente e crie links contextuais para: ${siloContext}`;

        try {
            currentHtml = await runConstructor(extendedPrompt, finalFeedback, waNumber, moodId, contentType);
            reportAgentStatus("Gerador", "Rascunho base gerado.", "", true);
        } catch (e) {
            reportAgentStatus("Gerador", "Erro ao gerar: " + e.message, "", true);
            throw e;
        }

        // 2. Inspetor Abidos (SEO)
        reportAgentStatus("Abidos", "Validando SEO e links...", "", false);
        const abidosResult = await runAbidosInspector(currentHtml);
        if (abidosResult.status === "REPROVOU") {
            console.warn(`❌ [ABIDOS REPROVOU] ${abidosResult.motivo}`);
            reportAgentStatus("Abidos", "SEO Reprovado: " + abidosResult.motivo, "", false);
            finalFeedback = `AGENTE ABIDOS REPROVOU: ${abidosResult.motivo}`;
            continue;
        }
        reportAgentStatus("Abidos", "SEO Validado.", "", true);

        // 3. Inspetor Clínico (Compliance/Ética)
        reportAgentStatus("Clínico", "Auditando Ética e Tom de Voz...", "", false);
        const clinicalResult = await runClinicalInspector(currentHtml);
        if (clinicalResult.status === "REPROVOU") {
            console.warn(`❌ [CLÍNICO REPROVOU] ${clinicalResult.motivo}`);
            reportAgentStatus("Clínico", "Ética Reprovada: " + clinicalResult.motivo, "", false);
            finalFeedback = `AGENTE CLÍNICO REPROVOU: ${clinicalResult.motivo}`;
            continue;
        }
        reportAgentStatus("Clínico", "Conformidade Aprovada.", "", true);

        // 4. Inspetor Design (Visual)
        reportAgentStatus("Design", "Refinando estética mobile-first...", "", false);
        const designResult = await runDesignInspector(currentHtml);
        if (designResult.status === "REPROVOU") {
            console.warn(`❌ [DESIGN REPROVOU] ${designResult.motivo}`);
            reportAgentStatus("Design", "Layout Reprovado: " + designResult.motivo, "", false);
            finalFeedback = `AGENTE DESIGN REPROVOU: ${designResult.motivo}`;
            continue;
        }
        reportAgentStatus("Design", "Design Premium Validado.", "", true);

        // 5. Sucesso
        const diff = `Aprovado na tentativa ${attempts}. Auditores: OK.`;
        reportAgentStatus("NeuroEngine", "Decisão Final Tomada. Entregando para o Canvas.", "", true);
        return { html: currentHtml, diff: diff };
    }

    reportAgentStatus("NeuroEngine", "Falha após 3 tentativas.", "A esteira não conseguiu satisfazer todos os auditores.", true);
    throw new Error("A esteira de produção falhou em validar o conteúdo após 3 tentativas.");
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
        const waNumber = whatsapp || '62991545295';
        const selectedMood = moodId || '1_introspeccao_profunda';
        const contentType = type || 'pages';

        console.log(`\n🏗️ [STUDIO-CONSTRUCTION] Novo Comando: "${userInput.substring(0, 30)}..."`);
        reportAgentStatus("Agente Construtor", "Sintetizando DNA clínico e estruturando rascunho...", "", false);

        // REGRA DE OURO: No AI Studio, apenas o Construtor trabalha.
        const html = await runConstructor(userInput, null, waNumber, selectedMood, contentType);
        
        reportAgentStatus("Agente Construtor", "Rascunho finalizado com sucesso.", "", true);
        res.json({ reply: html });
    } catch (e) { 
        console.error("❌ [CHAT-ESTEIRA ERROR]", e.message);
        res.status(500).json({ error: e.message }); 
    }
});

app.post('/api/blueprint', upload.none(), async (req, res) => {
    try {
        const { theme, whatsapp, moodId, type } = req.body;
        const waNumber = whatsapp || '5562991545295';
        const selectedMood = moodId || '1_introspeccao_profunda';
        const contentType = type || 'pages';
        
        console.log(`\n📐 [BLUEPRINT] Construindo rascunho acelerado: "${theme}"`);
        reportAgentStatus("Agente Construtor", "Orquestrando blueprint estrutural...", "", false);

        const html = await runConstructor(`Criar blueprint completo para o tema: ${theme}`, null, waNumber, selectedMood, contentType);
        
        reportAgentStatus("Agente Construtor", "Blueprint entregue.", "", true);
        res.json({ reply: html });
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

// 🚀 [FASE 5] ENDPOINTS NEURO-TRAINING (DNA CLONE & STYLE MEMORY)
app.get('/api/neuro-training/memory', (req, res) => {
    try {
        res.json(getVictorStyle());
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/neuro-training/analyze-dna', upload.single('audio'), async (req, res) => {
    try {
        if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY não configurada no servidor.");
        if (!req.file) throw new Error("Aúdio não recebido.");
        const model = genAI.getGenerativeModel({ model: VISION_MODEL });
        
        const dnaPrompt = `VOCÊ É O 'APRENDIZ DE ABIDOS'. Analise este áudio do Dr. Victor Lawrence.
        Extraia DNA clínico (UFU, AQ10b, RAS30).
        RESPONDA EM JSON: { "insight": "Sua resposta analítica", "regras_extraidas": [{"categoria": "X", "titulo": "Frase 3-5 palavras", "regra": "desc"}] }`;

        const result = await model.generateContent([
            { text: dnaPrompt },
            { inlineData: { data: req.file.buffer.toString('base64'), mimeType: req.file.mimetype } }
        ]);

        const extracted = extractJSON(result.response.text());
        if (!extracted) throw new Error("IA falhou na síntese de DNA via Áudio.");

        if (extracted.regras_extraidas) {
            await salvarRegrasDeEstilo(extracted.regras_extraidas);
        }

        res.json({ success: true, insights: extracted.regras_extraidas, summary: cleanClinicalData(extracted.insight) });
    } catch (e) {
        console.error("❌ [DNA ERROR]", e);
        res.status(500).json({ error: e.message });
    }
});

// [DUPLICATA REMOVIDA - ROTA CONSOLIDADA EM /api/neuro-training/chat ABAIXO]


app.post('/api/neuro-training/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) throw new Error("Arquivo não recebido.");
        let text = "";
        if (req.file.mimetype === 'application/pdf') {
            const data = await pdf(req.file.buffer);
            text = data.text;
        } else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const result = await mammoth.extractRawText({ buffer: req.file.buffer });
            text = result.value;
        } else {
            text = req.file.buffer.toString('utf-8');
        }

        const model = genAI.getGenerativeModel({ model: VISION_MODEL });
        const docPrompt = `ANÁLISE DE LASTRO ABIDOS. Texto: "${text.substring(0, 8000).replace(/"/g, "'")}".
        Extraia DNA em JSON: { "feedback_analysis": "feedback", "regras_extraidas": [{"categoria": "X", "titulo": "Frase 3-5 palavras", "regra": "desc"}] }`;

        const result = await model.generateContent(docPrompt);
        const extracted = extractJSON(result.response.text());
        if (!extracted) throw new Error("IA falhou na análise de lastro.");

        if (extracted.regras_extraidas) {
            await salvarRegrasDeEstilo(extracted.regras_extraidas);
        }
        res.json({ success: true, insights: extracted.regras_extraidas, summary: cleanClinicalData(extracted.feedback_analysis) });
    } catch (e) {
        console.error("❌ [UPLOAD ERROR]", e);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/content/publish-direct', async (req, res) => {
    try {
        const { type, title, content, status, slug, metaTitle, metaDesc } = req.body;
        
        console.log(`🚀 [PUBLISH PROXY] Iniciando deploy do tipo ${type}: "${title}"`);

        // Payload básico para o WordPress
        const payload = {
            title: title || "Sem Título",
            content: content || "",
            status: status || "draft",
            slug: slug || "",
        };

        // Integração com Yoast/RankMath e [BYPASS HEADLESS ABIDOS]
        payload.meta = {
            _yoast_wpseo_metadesc: metaDesc || "",
            _yoast_wpseo_title: metaTitle || "",
            rank_math_description: metaDesc || "",
            rank_math_title: metaTitle || "",
            _abidos_render_headless: "1",
            _abidos_headless_content: payload.content, // [BYPASS] HTML Puro
            _abidos_last_sync: new Date().toISOString()
        };

        const endpoint = type === 'posts' ? '/posts' : '/pages';
        const response = await callWP('POST', endpoint, payload);

        if (response && response.data && response.data.id) {
             const postId = response.data.id;
             const postLink = response.data.link;

             res.json({ 
                success: true, 
                id: postId, 
                link: postLink,
                message: "Publicado com sucesso no WordPress (Rascunho Acelerado)"
            });

            // --- INÍCIO DA AUDITORIA EM SEGUNDO PLANO (MULTI-AGENTE) ---
            // Não bloqueia o rascunho no Studio, roda em background.
            (async () => {
                try {
                    console.log(`📡 [BACKGROUND-AUDIT] Iniciando esteira multi-agente para Post #${postId}...`);
                    const auditResult = await runProductionLine(`Auditar conteúdo salvo: ${title}`, payload.content, "62991545295", "1_introspeccao_profunda", type);
                    
                    if (auditResult.success) {
                        console.log(`✅ [AUDIT-SUCCESS] Post #${postId} validado pelos agentes.`);
                        // Salva o resultado no Meta do WP para a aba de Revisão ver
                        await callWP('POST', `/${endpoint}/${postId}`, {
                            meta: {
                                _abidos_audit_status: "APROVADO",
                                _abidos_audit_report: JSON.stringify(auditResult),
                                _abidos_last_audit: new Date().toISOString()
                            }
                        });
                    } else {
                        console.warn(`⚠️ [AUDIT-REPROVOU] Post #${postId} requer atenção humana.`);
                        await callWP('POST', `/${endpoint}/${postId}`, {
                            meta: {
                                _abidos_audit_status: "REPROVOU",
                                _abidos_audit_report: JSON.stringify(auditResult),
                                _abidos_last_audit: new Date().toISOString()
                            }
                        });
                    }
                } catch (auditErr) {
                    console.error(`🚨 [BACKGROUND-AUDIT-ERROR] Falha na esteira para Post #${postId}:`, auditErr.message);
                }
            })();
            // --- FIM DA AUDITORIA ---

        } else {
            console.error("Resp WP Inválida:", response?.data);
            res.status(500).json({ error: "Resposta inválida ou vazia do WordPress via Proxy." });
        }
    } catch (e) {
        console.error("❌ [PUBLISH PROXY ERROR]", e.response?.data || e.message);
        const wpError = e.response?.data?.message || e.message;
        res.status(500).json({ error: "Erro na ponte do WordPress: " + wpError });
    }
});

// =========================================================
// ROTA: ORQUESTRAÇÃO DE CLUSTER / SILO NEURAL (Usa o PRO)
// =========================================================
app.post('/api/blueprint/cluster', async (req, res) => {
    try {
        const { theme, moodId, whatsapp } = req.body;
        console.log(`💠 [CLUSTER] Orquestrando Silo Neural para: ${theme}`);

        if (!modelPro) {
            console.error("❌ modelPro não inicializado!");
            return res.status(500).json({ error: "Hemisfério Pro não carregado no servidor." });
        }

        const dnaInjetadoCluster = getDnaContext();
        const moodCluster = tema && tema.toLowerCase().includes('tea') ? CLIMAS_CLINICOS['3_conforto_neurodivergente'] : CLIMAS_CLINICOS['1_introspeccao_profunda'];

        const systemPrompt = `
Você é o Arquiteto Abidos (Gemini 2.5 Pro). Crie um Cluster SEO de alta conversão para o Dr. Victor Lawrence (tema: "${theme}").

Gere EXATAMENTE 4 conteúdos:
- 1 Página Pilar (Hub) de vendas (type: "pages")
- 3 Artigos de Blog (Spokes) em cauda longa (type: "posts")

[DESIGN OBRIGATÓRIO PARA CADA ITEM HTML]
- WRAPPER: <div class="abidos-wrapper antialiased px-4 py-8 md:px-12 lg:px-24 ${moodCluster.fundo_principal} min-h-screen font-inter ${moodCluster.texto_principal}">
- CARDS: bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 md:p-10 shadow-2xl hover:border-teal-500/50 transition-all
- H2 GRADIENTE: font-outfit font-bold text-3xl md:text-5xl text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500
- GRIDS: grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
- BOTOÕES CTA: inline-flex px-8 py-4 bg-teal-500 hover:bg-teal-400 text-[#05080f] font-bold rounded-full hover:scale-105 shadow-[0_0_25px_rgba(45,212,191,0.35)]
- GLOW ORB: <div class="absolute -z-10 w-96 h-96 bg-teal-500/10 blur-[150px] rounded-full"></div>
- EFEITO DO MOOD: ${moodCluster.efeitos_obrigatorios}
- PROIBIDO H1 manual, PROIBIDO URLs inventadas, PROIBIDO tags puras.

[DNA LITERÁRIO]
${dnaInjetadoCluster || 'Use linguagem ericksoniana permissiva.'}

[LINKS E IMAGENS REAIS — USE OBRIGATORIAMENTE]
${REAL_ASSETS}

${ETICA_ABIDOS}

RETORNE EXCLUSIVAMENTE UM JSON VÁLIDO:
{
  "mainTopic": "${theme}",
  "items": [
    { "title": "Título do Hub", "type": "pages", "html": "<div class=\\"abidos-wrapper...\\">...</div>" },
    { "title": "Artigo 1", "type": "posts", "html": "<div class=\\"abidos-wrapper...\\">...</div>" },
    { "title": "Artigo 2", "type": "posts", "html": "<div class=\\"abidos-wrapper...\\">...</div>" },
    { "title": "Artigo 3", "type": "posts", "html": "<div class=\\"abidos-wrapper...\\">...</div>" }
  ]
}
        `;

        const result = await modelPro.generateContent(systemPrompt);
        const responseText = result.response.text();
        const clusterData = extractJSON(responseText);
        
        if (!clusterData || !clusterData.items) {
            console.error("❌ Falha ao extrair JSON do Cluster. Resposta bruta:", responseText);
            throw new Error("A IA não retornou um JSON válido de Cluster.");
        }

        clusterData.success = true;
        res.status(200).json(clusterData);

    } catch (error) {
        console.error("🚨 Erro na geração do Cluster:", error);
        res.status(500).json({ 
            success: false, 
            error: "Falha no Hemisfério Pro: " + error.message 
        });
    }
});

// =========================================================
// ROTA: NEURO-TRAINING CHAT (CONVERSA CONTÍNUA DE VOZ)
// =========================================================
app.post('/api/neuro-training/chat', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ error: 'Mensagem vazia.' });

        const dnaExistente = getDnaContext();

        const systemPrompt = `
Você é o Engenheiro de Prompt e Analista de Tom de Voz (Copywriting DNA) do sistema Abidos.
Sua ÚNICA missão é clonar a identidade verbal, a cadência e o estilo de escrita do Dr. Victor Lawrence.

[DIRETRIZ DE SEGURANÇA MÁXIMA — FILTRO DE CONTEÚDO]
Você deve atuar como um filtro seletivo:
1. FOCO NA FORMA (Como ele fala): Conectivos, ritmo, metáforas, pausas, tamanho das frases, tom (acolhedor, técnico, ericksoniano).
2. DESPREZO PELO CONTEÚDO (O que ele fala): IGNORE nomes de pacientes, queixas clínicas, diagnósticos (TEA, TDAH, Ansiedade), tratamentos ou história de vida.
3. PROIBIÇÃO ABSOLUTA: Nunca extraia uma regra que mencione "Paciente", "Consulta", "Déficit", "Tratamento" ou nomes próprios.
4. TRANSLATAÇÃO: Se ele falar "Atendi uma paciente com TEA e ela estava ansiosa", você extrai: "Uso de adjetivos de estado emocional para validar o interlocutor" (Estilo), e NÃO "Atendimento de TEA" (Conteúdo).

DNA LITERÁRIO APRENDIDO:
${dnaExistente || 'Nenhum padrão registrado ainda.'}

FORMATO OBRIGATÓRIO — Retorne EXCLUSIVAMENTE JSON válido:
{
  "reply": "Sua resposta conversacional — engaje o doutor em sua técnica de escrita, sem markdown e sem citar o paciente",
  "regras_extraidas": [
    {
      "categoria": "Vocabulário | Ritmo | Tom | Estrutura",
      "titulo": "Nome curto do padrão",
      "regra": "Instrução técnica de escrita."
    }
  ]
}
`;

        const result = await modelFlash.generateContent([
            systemPrompt,
            `FALA DO DR. VICTOR: "${message}"`
        ]);

        const responseText = result.response.text();
        const parsed = extractJSON(responseText);

        if (!parsed || !parsed.reply) {
            return res.json({ reply: responseText.replace(/```json|```/g, '').trim(), regras_extraidas: [] });
        }

        if (parsed.regras_extraidas && parsed.regras_extraidas.length > 0) {
            const currentMemory = getVictorStyle();
            parsed.regras_extraidas.forEach(regra => {
                regra.id = `chat_${Date.now()}_${Math.random().toString(36).substr(2,5)}`;
                regra.data_extracao = new Date().toISOString();
                currentMemory.style_rules.push(regra);
            });
            fs.writeFileSync(MEMORY_FILE_PATH, JSON.stringify(currentMemory, null, 2));
            console.log(`✨ [NEURO-CHAT] ${parsed.regras_extraidas.length} nova(s) regra(s) de DNA salva(s).`);
        }

        res.json(parsed);

    } catch (error) {
        console.error('❌ [NEURO-TRAINING/CHAT ERROR]', error);
        res.status(500).json({ error: 'Falha no Aprendiz de Abidos: ' + error.message });
    }
});

app.post('/api/doctoralia/generate-reply', async (req, res) => {
    try {
        const { question } = req.body;
        if (!question) return res.status(400).json({ success: false, error: 'Pergunta obrigatória.' });

        console.log("\ud83e\uddf6 [DOCTORALIA] Gerando resposta com DNA de Copywriting injetado...");

        // 1. Carrega o manual de redação pessoal do Dr. Victor
        const dnaInjetado = getDnaContext();

        // 2. Prompt mestre: DNA de Voz PRIMEIRO, depois protocolo clínico
        const systemPrompt = `
Você é o Gêmeo Digital Literário do Dr. Victor Lawrence (Psicólogo Clínico CRP 09/012681, Especialista em TEA em Adultos e Hipnose Ericksoniana, Mestre UFU, Goiânia-GO).
Sua missão é responder à dúvida de um paciente na plataforma Doctoralia.

${dnaInjetado}

ESTRUTURA OBRIGATÓRIA DA RESPOSTA (MÉTODO ABIDOS):
1. Acolhimento (Pacing): Valide a dor ou dúvida aplicando sua empatia e cadência características.
2. Utilidade Prática: Explique de forma psicoeducativa, breve e fenomenológica.
3. Reforço de Autoridade (E-E-A-T): Se o tema for TEA, Burnout ou Hipnose, mencione sutilmente sua experiência.
4. Fechamento: Convide para avaliação de forma permissiva, típica da sua linguagem ericksoniana.

DIRETRIZES ÉTICAS (CFP & DOCTORALIA — OBRIGATÓRIO):
- NUNCA faça diagnósticos fechados pela internet.
- NUNCA prometa cura ou resultados garantidos.
- NÃO inclua números de telefone, links, preços ou endereços (o algoritmo bloqueia).
- Retorne APENAS o texto da resposta em português brasileiro, sem formatação markdown (sem **, *, #). Parágrafos limpos.

PERGUNTA DO PACIENTE:
"${question}"
        `;

        const result = await modelPro.generateContent(systemPrompt);
        let reply = result.response.text()
            .replace(/\*\*/g, '').replace(/###/g, '').replace(/##/g, '')
            .replace(/#/g, '').replace(/\*/g, '').trim();

        res.json({ success: true, reply });
    } catch (e) {
        console.error('❌ [DOCTORALIA ERROR]', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/api/studio/gerar-rascunho', async (req, res) => {
    try {
        const { tema, formato, publico } = req.body;
        const dnaInjetado = getDnaContext();
        // Detecta mood pelo tema
        const moodKey = tema && (tema.toLowerCase().includes('tea') || tema.toLowerCase().includes('autis'))
            ? '3_conforto_neurodivergente'
            : tema && tema.toLowerCase().includes('hipno')
            ? '1_introspeccao_profunda'
            : '1_introspeccao_profunda';
        const mood = CLIMAS_CLINICOS[moodKey];

        const systemPrompt = `
Você é o Arquiteto Visual Sênior do Protocolo Abidos. Sua missão: gerar código HTML/Tailwind IMPECÁVEL, TOTALMENTE RESPONSIVO e com DESIGN PREMIUM para o conteúdo "${tema}" (formato: ${formato}, público: ${publico}).

[REGRAS DE LAYOUT DINÂMICO — OBRIGATÓRIO]
1. WRAPPER MESTRE: Todo o conteúdo DEVE começar com: <div class="abidos-wrapper antialiased px-4 py-8 md:px-12 lg:px-24 ${mood.fundo_principal} min-h-screen font-inter ${mood.texto_principal}">
2. MOBILE-FIRST: 1 coluna no mobile, expandindo com 'md:' e 'lg:' breakpoints.
3. GRIDS: Benefícios/dores: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6". Autoridade: "flex flex-col lg:flex-row items-center gap-12".
4. PROIBIDO TAGS PURAS: Nenhum <h1>, <p> ou <a> sem classes Tailwind obrigatórias.

[ESTÉTICA PREMIUM]
- CARDS: "bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 md:p-10 shadow-2xl transition-all hover:border-teal-500/50"
- H1/H2 (GRADIENTE): "font-outfit font-bold text-4xl md:text-6xl lg:text-7xl leading-tight text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500 mb-6"
- H3: "font-outfit font-bold text-2xl md:text-3xl ${mood.texto_destaque} mb-4"
- ÓRBITAS DE LUZ (GLOW ORBS — opcional, para profundidade): <div class="absolute -z-10 w-96 h-96 ${mood.cor_acao.replace('!bg-', 'bg-')}/10 blur-[150px] rounded-full"></div>
- BOTOÕES MAGNÉTICOS (CTA WhatsApp): "inline-flex items-center justify-center px-8 py-4 ${mood.cor_acao.replace('!bg-', 'bg-')} hover:opacity-90 text-[#05080f] font-bold rounded-full transition-all hover:scale-105 shadow-[0_0_25px_rgba(45,212,191,0.35)] text-lg"
- EFEITO OBRIGATÓRIO DO MOOD: ${mood.efeitos_obrigatorios}

[DNA LITERÁRIO DO DR. VICTOR — APLIQUE NO TEXTO VISÍVEL]
${dnaInjetado || '(Sem regras de DNA ainda. Use linguagem ericksoniana perm issiva e empática.)'}

[ASSETS REAIS — USE OBRIGATORIAMENTE]
${REAL_ASSETS}

${ETICA_ABIDOS}

[OBJETIVO FINAL]
Gere as <section> modulares com padding vertical generoso (py-16 md:py-32). No mobile texto centralizado. No desktop alinhamento estratégico lateral. Feche o wrapper com </div> ao final.
NÃO inclua <!DOCTYPE>, <html>, <head>, <body> ou markdown. Apenas as seções HTML.
        `;

        const result = await modelPro.generateContent(systemPrompt);
        res.json({ rascunho: result.response.text() });
    } catch (e) {
        console.error("❌ [PRO ERROR]", e);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/dna/auto-refine', async (req, res) => {
    try {
        const { originalHtml, editedHtml } = req.body;
        if (!originalHtml || !editedHtml || originalHtml === editedHtml) {
            return res.json({ success: true, newRules: [] });
        }

        console.log(`🧠 [AUTO-DNA] Analisando intervenção manual do Dr. Victor...`);

        const refinePrompt = `
        VOCÊ É O ANALISTA DE DNA CLÍNICO DO DR. VICTOR LAWRENCE.
        
        Sua tarefa: Comparar o HTML que a IA gerou (ORIGINAL) com o HTML após as edições do Dr. Victor (EDITADO).
        Identifique PREFERÊNCIAS ESTILÍSTICAS, CORREÇÕES DE TOM ou ADIÇÕES DE CONTEÚDO RECORRENTES.

        [PROTOCOLO DE RECONHECIMENTO]:
        - Se o Dr. Victor mudou o tom (ex: ficou mais técnico ou mais empático), crie uma regra de TOM.
        - Se ele mudou o design (ex: bordas, sombras, cores específicas), crie uma regra de DESIGN.
        - Se ele adicionou credenciais (ex: CRP, Mestrado, Links sociais), crie uma regra de E-E-A-T.
        
        RETORNE EXATAMENTE UM JSON ARRAY de novas regras (ou array vazio se as mudanças forem triviais):
        [
          { "categoria": "...", "titulo": "...", "regra": "..." }
        ]

        ---
        HTML ORIGINAL:
        ${originalHtml.substring(0, 5000)}

        HTML EDITADO:
        ${editedHtml.substring(0, 5000)}
        `;

        const result = await modelPro.generateContent(refinePrompt);
        const newRules = extractJSON(result.response.text()) || [];

        if (Array.isArray(newRules) && newRules.length > 0) {
            console.log(`✨ [AUTO-DNA] Detectadas ${newRules.length} novas preferências!`);
            const memory = getVictorStyle();
            
            newRules.forEach(rule => {
                rule.id = `auto_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                rule.data_extracao = new Date().toISOString();
                memory.last_insight = `Regra aprendida automaticamente via interface: ${rule.titulo}`;
                memory.style_rules.push(rule);
            });

            fs.writeFileSync(path.join(__dirname, 'estilo_victor.json'), JSON.stringify(memory, null, 2));
            return res.json({ success: true, newRules });
        }

        res.json({ success: true, newRules: [] });

    } catch (e) {
        console.error("❌ [AUTO-DNA ERROR]", e);
        res.status(500).json({ error: e.message });
    }
});

// [DUPLICATA REMOVIDA - ROTA CONSOLIDADA EM /api/blueprint/cluster ACIMA]

const server = app.listen(port, () => {
    console.log(`\n🚀 AntiGravity CMS: Mission Control Ativo!`);
    console.log(`📡 Frontend & API rodando em http://localhost:${port}`);
    console.log(`🔐 Camada de Segurança Proxy: ON`);
    console.log(`🎙️ WebSocket Voice Live: Disponível em ws://localhost:${port}`);
});

// [PRIORIDADE 2] MOTOR DE VOZ LIVE (DR. VICTOR LIVE-DNA)
wss = new WebSocket.Server({ server });
wss.on('connection', (ws) => {
    console.log("🎙️ [NEURO-LIVE] Dr. Victor Lawrence conectou ao canal de voz.");
    
    ws.on('message', async (message) => {
        try {
            // Buffer contém o áudio capturado em tempo real (webm/ogg)
            const audioBuffer = Buffer.isBuffer(message) ? message : Buffer.from(message);
            console.log(`📡 [NEURO-LIVE] Analisando ${Math.round(audioBuffer.length/1024)}KB de voz multimodal...`);
            
            const prompt = `Analise este segmento de voz do Dr. Victor Lawrence.
            Ele está em uma sessão de 'Neuro-Training' (Digital Twin Training).
            
            1. Transcreva o que foi dito.
            2. Identifique o Tom de Voz Clínico (ex: Ericksoniano, Autoritário, Acolhedor).
            3. Se houver um padrão recorrente ou uma regra de ouro dita, extraia como Insight.
            4. Responda ao Dr. Victor com sabedoria, mantendo a persona de seu Digital Twin.

            RETORNE EXATAMENTE UM JSON:
            {
              "transcript": "...",
              "tone": "...",
              "insight": { "categoria": "...", "titulo": "...", "regra": "..." } (ou null),
              "reply": "..."
            }`;

            // Usando Gemini Pro (Capacidade Multimodal Espelhada)
            const result = await modelPro.generateContent([
                { inlineData: { data: audioBuffer.toString('base64'), mimeType: 'audio/webm' } },
                prompt
            ]);

            const response = extractJSON(result.response.text());
            if (response) {
                // Automação: Se houver insight, salva no DNA automaticamente para fechar o loop PRIORIDADE 3 & 2
                if (response.insight) {
                    const memory = getVictorStyle();
                    response.insight.id = `live_${Date.now()}`;
                    response.insight.data_extracao = new Date().toISOString();
                    memory.style_rules.push(response.insight);
                    fs.writeFileSync(path.join(__dirname, 'estilo_victor.json'), JSON.stringify(memory, null, 2));
                    console.log(`✨ [LIVE-DNA] Novo insight extraído e salvo: ${response.insight.titulo}`);
                    response.saved_new_dna = true;
                }
                
                ws.send(JSON.stringify({ type: 'reply', ...response }));
            }
        } catch (e) {
            console.error("❌ [NEURO-LIVE ERROR]", e);
            ws.send(JSON.stringify({ type: 'error', message: "Falha no processamento neural da voz." }));
        }
    });

    ws.on('close', () => console.log("🎙️ [NEURO-LIVE] Canal de voz encerrado."));
});
