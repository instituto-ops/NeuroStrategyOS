const fs = require('fs');
const path = require('path');
// Import all specific deps from shared if needed. For now just passing app and deps.
const { genAI, getAIModel, wrapModel, extractJSON, trackUsage, LITE_MODEL, MAIN_MODEL, PRO_MODEL, GoogleAICacheManager } = require('../shared');

module.exports = function(app, deps) {
    const { SITE_REPO_PATH, TEMPLATE_CATALOG, upload } = deps;
    
// ðŸ§¬ COMPILADOR DE DNA â€” Converte style_rules em diretivas autoritÃ¡rias para IA
// ============================================================================
function getDnaContext() {
    try {
        const memory = getVictorStyle();
        const regras = (memory.style_rules || []).filter(r => r.regra && r.titulo);
        if (!regras.length) return "";

        let ctx = `\n==================================================================\n`;
        ctx += `[DIRETRIZES ABSOLUTAS DE IDENTIDADE VERBAL E COPYWRITING â€” DR. VICTOR LAWRENCE]\n`;
        ctx += `VocÃª DEVE aplicar RIGOROSAMENTE a cadÃªncia, o vocabulÃ¡rio e a sintaxe abaixo.\n`;
        ctx += `Estas regras definem a 'voz' do Dr. Victor. OBEDEÃ‡A A TODAS, SEM EXCEÃ‡ÃƒO.\n\n`;

        regras.forEach((r, i) => {
            const cat = (r.categoria || 'ESTILO').toUpperCase();
            ctx += `Regra ${i + 1} â€” [${cat}] ${r.titulo}\n`;
            ctx += `AÃ‡ÃƒO OBRIGATÃ“RIA: ${r.regra}\n\n`;
        });

        ctx += `==================================================================\n`;
        return ctx;
    } catch (e) {
        console.warn("[DNA] MemÃ³ria vazia ou corrompida, usando tom neutro.");
        return "";
    }
}

// FUNÃ‡ÃƒO DE CONSOLIDAÃ‡ÃƒO DE DNA (Hipocampo Digital)
async function salvarRegrasDeEstilo(novasRegras) {
    if (!novasRegras || novasRegras.length === 0) return;
    try {
        let current = getVictorStyle();
        if (!current.style_rules) current.style_rules = [];

        const regrasComMetadados = novasRegras.map(regra => ({
            categoria: regra.categoria || "DNA",
            titulo: regra.titulo || regra.sintese || "PadrÃ£o Detectado",
            regra: cleanClinicalData(regra.regra),
            id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            data_extracao: new Date().toISOString()
        }));

        current.style_rules = [...regrasComMetadados, ...current.style_rules].slice(0, 100);
        current.last_update = new Date().toISOString();
        
        fs.writeFileSync(MEMORY_FILE_PATH, JSON.stringify(current, null, 2));
        console.log(`ðŸ§  MemÃ³ria atualizada: +${novasRegras.length} novos insights salvos.`);
    } catch (e) {
        console.error("ðŸš¨ Falha crÃ­tica ao salvar no hipocampo:", e);
    }
}

// ==============================================================================
// ðŸ“‹ UTILITÃRIO DE ANONIMIZAÃ‡ÃƒO CLÃNICA (BLINDAGEM Ã‰TICA)
// ==============================================================================
function cleanClinicalData(text) {
    if (!text) return "";
    let cleaned = text;

    // 1. PadrÃµes de Identidade (CPF/CNPJ, Telefones, Emails)
    const patterns = {
        identificadores: /\b(\d{3}\.\d{3}\.\d{3}-\d{2}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})\b/g,
        telefones: /\b(\(?\d{2}\)?\s?\d{4,5}-?\d{4})\b/g,
        emails: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    };

    cleaned = cleaned.replace(patterns.identificadores, "[ID_REMOVIDO]");
    cleaned = cleaned.replace(patterns.telefones, "[CONTATO_REMOVIDO]");
    cleaned = cleaned.replace(patterns.emails, "[EMAIL_REMOVIDO]");

    // 2. SubstituiÃ§Ã£o Contextual de Nomes (Pacing -> [PACIENTE])
    const frasesChave = ["paciente", "cliente", "atendi o", "atendi a", "nome dele Ã©", "nome dela Ã©"];
    frasesChave.forEach(frase => {
        const regex = new RegExp(`(${frase})\\s+([A-Z][a-z]+)`, "gi");
        cleaned = cleaned.replace(regex, "$1 [PACIENTE_ANONIMIZADO]");
    });

    return cleaned;
}


// ConfiguraÃ§Ãµes WordPress do .env
// [DESATIVADO] Protocolo WordPress (TransiÃ§Ã£o Headless)
// const WP_URL = (process.env.WP_URL || 'https://hipnolawrence.com/').replace(/\/$/, '');
// const WP_API_BASE = `${WP_URL}/wp-json/wp/v2`;
const WP_AUTH = Buffer.from(`${process.env.WP_USERNAME}:${process.env.WP_APP_PASSWORD}`).toString('base64');

// ==============================================================================
// 1. PROXY WORDPRESS (SeguranÃ§a: Credenciais nunca saem do servidor)
// ==============================================================================

// Helper para chamadas WP
const callWP = async (method, endpoint, data = null, params = {}) => {
    const url = `${WP_API_BASE}${endpoint}`;
    const headers = {
        'Authorization': `Basic ${WP_AUTH}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
    };

    if (method !== 'GET' && data) {
        headers['Content-Type'] = 'application/json';
    }

    console.log(`ðŸ“¡ [WP PROXY] ${method} ${url} ${params ? JSON.stringify(params) : ''}`);

    try {
        return await axios({
            method,
            url,
            data,
            params,
            headers
        });
    } catch (e) {
        if (e.response?.status === 403) {
            console.warn("âš ï¸ [WP PROXY] Acesso negado pelo WordPress (403).");
        }
        return { error_silent: true, data: [] }; 
    }
};

// Endpoints GenÃ©ricos (GET, POST, PUT, DELETE)
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

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ENDPOINT DEDICADO: Busca conteÃºdo completo contornando WAF/ModSecurity 403
// EstratÃ©gia: duas chamadas menores em vez de uma grande com content=HTML
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.get('/api/api-content/:type/:id', async (req, res) => {
    try {
        const { type, id } = req.params;
        console.log(`ðŸ“„ [CONTENT] Buscando ${type}/${id} com estratÃ©gia anti-WAF...`);

        // Chamada 1: Metadados leves (nunca 403)
        const metaResp = await callWP('GET', `/${type}/${id}`, null, {
            _fields: 'id,title,excerpt,status,link,featured_media,date,modified'
        });
        const meta = metaResp.data;

        // Chamada 2: Apenas o campo content (sem context=edit â€” evita 403 extra do mod_security)
        let contentRendered = '';
        let rawContent = '';
        try {
            const contentResp = await callWP('GET', `/${type}/${id}`, null, {
                _fields: 'content'
                // NÃƒO usar context=edit â€” isso dispara 403 no Hostinger/ModSecurity
            });
            contentRendered = contentResp.data?.content?.rendered || '';
            rawContent      = contentResp.data?.content?.raw      || contentRendered;
        } catch (contentErr) {
            const status = contentErr.response?.status;
            console.warn(`âš ï¸ [CONTENT] Falha ao buscar content (HTTP ${status}). Retornando vazio.`);
            // NÃ£o re-lanÃ§a â€” retorna apenas os metadados
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
        console.error('âŒ [CONTENT ERROR]', e.message);
        res.status(e.response?.status || 500).json({ error: e.message });
    }
});

// Endpoints de ConfiguraÃ§Ã£o AntiGravity
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
// Endpoint especial para Upload de MÃ­dia (Multipart/Form-Data)
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

};
