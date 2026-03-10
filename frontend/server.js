const express = require('express');
const multer = require('multer');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: '../.env' }); 
const { GoogleGenerativeAI } = require('@google/generative-ai');

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
const VISION_MODEL = 'gemini-1.5-flash';

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
    return await axios({
        method,
        url,
        data,
        params,
        headers: {
            'Authorization': `Basic ${WP_AUTH}`,
            'Content-Type': 'application/json'
        }
    });
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

// ==============================================================================
// 2. PROXY AI (Gemini)
// ==============================================================================

app.post('/api/ai/generate', async (req, res) => {
    try {
        const { prompt, config } = req.body;
        const model = genAI.getGenerativeModel({ model: VISION_MODEL });
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: config || { temperature: 0.7, maxOutputTokens: 1000 }
        });
        const resp = await result.response;
        res.json({ text: resp.text() });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

const DOCTORALIA_REVIEWS = `
- Carla (TEA): "Diagnóstico tardio possível pela técnica adequada... melhora significativa na qualidade de vida."
- Y. (Autista): "Acompanhamento fez enorme diferença... hipnose e PNL com empatia e respeito."
- A. M. (Sábio): "Estrutura da minha vida, alguém sábio que me fez enxergar eu mesma."
- R. A. (Ansiedade): "Problema de ansiedade resolvido em algumas sessões. Muito profissional."
- L. F. S.: "Resultados nítidos e precisos. Indico fortemente."
`;

app.post('/api/chat', upload.single('screenshot'), async (req, res) => {
    try {
        const { message, htmlContext, currentKeyword } = req.body;
        const model = genAI.getGenerativeModel({ model: VISION_MODEL });
        
        let promptText = `
        VOCÊ É JULES, ASSISTENTE ELITE DA CLÍNICA VICTOR LAWRENCE (GOIÂNIA).
        SUA MISSÃO: CRIAR LANDING PAGES DE ALTA CONVERSÃO USANDO O MÉTODO ABIDOS.
        
        REGRAS DE OURO:
        1. ESTRUTURA SEMPRE EM 4 SEÇÕES:
           - Seção 1 (Hero): H1 (Keyword exata + Benefício + Goiânia), Subtítulo, CTA WhatsApp (62982171845).
           - Seção 2 (Jornada/Corpo): H2 (Identificação da Dor), Texto H2 (Serviços), H3 (Quebra de Objeções).
           - Seção 3 (E-E-A-T): H2 (Apresentação), H2 (Ambiente), Prova Social (USE AS REVIEWS ABAIXO).
           - Seção 4 (Retenção): H2 (FAQ), Link Interno estilo "Veja também" para Silos de Conteúdo.
        
        2. PROVA SOCIAL (DOCTORALIA):
        ${DOCTORALIA_REVIEWS}
        
        3. DESIGN: Use Tailwind, cores profissionais (#1e293b, #0ea5e9). Imagens: use tags <img src="URL" alt="SEO Description">.
        
        CONTEXTO ATUAL:
        - Keyword: ${currentKeyword || 'Não especificada'}
        - HTML Atual: ${htmlContext || 'Vazio'}
        - Mensagem do Usuário: ${message}
        
        SE O USUÁRIO PEDIR PARA CRIAR OU GERAR, RETORNE O HTML COMPLETO SEGUINDO O MÉTODO.
        SE O USUÁRIO PEDIR PARA TROCAR IMAGEM, SUGIRA UMA NOVA URL DE IMAGEM OU REMOVA A ATUAL.
        `;
        
        let parts = [{ text: promptText }];
        if (req.file) {
            parts.push({ inlineData: { data: req.file.buffer.toString('base64'), mimeType: req.file.mimetype } });
        }

        const result = await model.generateContent({ contents: [{ role: 'user', parts }] });
        const resp = await result.response;
        res.json({ reply: resp.text() });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/blueprint', async (req, res) => {
    try {
        const { theme } = req.body;
        const model = genAI.getGenerativeModel({ model: VISION_MODEL });
        const prompt = `
        GERE UM BLUEPRINT HTML COMPLETO (4 SEÇÕES ABIDOS) PARA: ${theme}.
        LOCAÇÃO: Goiânia. 
        WHATSAPP: 62982171845.
        REVIEWS: Inclua depoimentos reais da Doctoralia (Carla, Y, etc).
        ESTRUTURA: 
        1. Hero (H1 Estratégico)
        2. Jornada (Dor e Benefícios)
        3. Autoridade (Quem é Victor Lawrence + Clientes)
        4. FAQ + Silos.
        RETORNE APENAS O HTML CRU.
        `;
        const result = await model.generateContent(prompt);
        const resp = await result.response;
        res.json({ html: resp.text().replace(/```html|```/g, '').trim() });
    } catch (e) { res.status(500).json({ error: e.message }); }
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

app.listen(port, () => {
    console.log(`\n🚀 AntiGravity CMS: Mission Control Ativo!`);
    console.log(`📡 Frontend & API rodando em http://localhost:${port}`);
    console.log(`🔐 Camada de Segurança Proxy: ON`);
});
