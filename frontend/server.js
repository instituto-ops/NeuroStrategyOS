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

app.post('/api/chat', upload.single('screenshot'), async (req, res) => {
    try {
        const { message, htmlContext } = req.body;
        const model = genAI.getGenerativeModel({ model: VISION_MODEL });
        
        let promptText = `Atue como o Assistente Jules para a Clínica Victor Lawrence em Goiânia. Contexto: ${htmlContext ? 'Editando página' : 'Chat Geral'}. Mensagem: ${message}`;
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
        const result = await model.generateContent(`Gere HTML cru para uma landing page de: ${theme}`);
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
