const express = require('express');
const multer = require('multer');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const WebSocket = require('ws');
const cloudinary = require('cloudinary').v2;
const textToSpeech = require('@google-cloud/text-to-speech');
const { BetaAnalyticsDataClient } = require('@google-analytics/data');
require('dotenv').config({ path: '../.env' });

const { 
    genAI, getAIModel, wrapModel, extractJSON, trackUsage,
    LITE_MODEL, MAIN_MODEL, PRO_MODEL, GoogleAICacheManager,
    modelFlash, modelPro, fs, path: sharedPath 
} = require('./shared');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');

let ttsClient;
try {
    ttsClient = new textToSpeech.TextToSpeechClient();
} catch (err) {
    console.warn("⚠️ [TTS] Falha ao inicializar TTS Client (sem credenciais):", err.message);
}

// Inicializa cliente GA4 se as credenciais existirem
let analyticsClient;
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
        analyticsClient = new BetaAnalyticsDataClient();
        console.log("📊 [ANALYTICS] Motor GA4 Inicializado com Sucesso.");
    } catch (err) {
        console.warn("⚠️ [ANALYTICS] Falha ao inicializar motor GA4:", err.message);
    }
}

if (!process.env.GOOGLE_CLOUD_PROJECT && !process.env.GEMINI_API_KEY) {
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    console.error("!!! ERRO CRÍTICO: Variáveis de ambiente GOOGLE_CLOUD_PROJECT e GEMINI_API_KEY não foram definidas.");
    console.error("!!! Por favor, adicione-as ao seu arquivo .env");
    console.error("!!! O Antigravity Agent não funcionará corretamente sem isso.");
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
}

const { registerAgentRoutes } = require('./agent-bridge');

const app = express();
const port = 3000;

registerAgentRoutes(app);

// Memória temporária para Previews
const tempPreviews = {};

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
});

// Rotas de Preview Temporárias
app.post('/api/previews/save', (req, res) => {
    try {
        const { html, title } = req.body;
        const id = Date.now().toString();
        tempPreviews[id] = { html, title, timestamp: Date.now() };

        Object.keys(tempPreviews).forEach(k => {
            if (Date.now() - tempPreviews[k].timestamp > 1800000) delete tempPreviews[k];
        });

        res.json({ success: true, previewId: id });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/previews/get/:id', (req, res) => {
    const preview = tempPreviews[req.params.id];
    if (preview) {
        res.json(preview);
    } else {
        res.status(404).json({ error: "Preview expirado ou não encontrado no servidor." });
    }
});

// 1. SERVIR ARQUIVOS ESTÁTICOS
app.use(express.static(path.join(__dirname, 'public')));
app.use('/templates', express.static(path.join(__dirname, '../templates')));

// [VÓRTEX CONFIG] Dynamic injection of API Key
app.get('/js/vortex-config.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.send(`window.VORTEX_API_KEY = "${process.env.VORTEX_API_KEY || ''}";`);
});

const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }
});

// [SMART MEDIA] Cloudinary Config
const isCloudinaryActive = !!process.env.CLOUDINARY_API_KEY;
if (isCloudinaryActive) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
    console.log("☁️  [SMART MEDIA] Cloudinary Engine: ON");
} else {
    console.log("📂 [SMART MEDIA] Cloudinary Engine: OFF");
}

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

// [PHASE 1.4 CONCLUÍDA] Modelos agora centralizados no shared.js
const VISION_MODEL = MAIN_MODEL;
const HEAVY_MODEL = PRO_MODEL;
const draftsDb = []; // In-memory store for newly generated drafts

// [FASE 3: SISTEMA DE RELATÓRIOS E AUTODIAGNÓSTICO]
const REPORTS_DIR = path.join(__dirname, 'relatorios');

// Rota de Salvamento de Relatório Longitudinal
app.post('/api/system/report/save', (req, res) => {
    try {
        const report = req.body;
        const now = new Date();
        const year = now.getFullYear().toString();
        const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        const month = monthNames[now.getMonth()];

        const yearDir = path.join(REPORTS_DIR, year);
        const monthDir = path.join(yearDir, month);

        if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
        if (!fs.existsSync(yearDir)) fs.mkdirSync(yearDir, { recursive: true });
        if (!fs.existsSync(monthDir)) fs.mkdirSync(monthDir, { recursive: true });

        const filename = `Relatório_${now.getHours().toString().padStart(2, '0')}-${now.getMinutes().toString().padStart(2, '0')}_${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${year.slice(-2)}.json`;
        const filePath = path.join(monthDir, filename);

        fs.writeFileSync(filePath, JSON.stringify(report, null, 2));

        const criticalModules = report.modules.filter(m => m.status.includes('❌'));
        const criticalApis = report.apis.filter(a => a.status.includes('❌'));

        const latestInfo = {
            filename: filename,
            timestamp: report.timestamp,
            critical_alerts: criticalModules.length + criticalApis.length,
            summary: criticalModules.map(m => m.name).concat(criticalApis.map(a => a.name)).join(', ') || "Tudo operacional!"
        };
        fs.writeFileSync(path.join(REPORTS_DIR, 'latest_status.json'), JSON.stringify(latestInfo, null, 2));

        res.json({ success: true, path: filePath });
    } catch (e) {
        console.error("❌ Erro ao salvar relatório:", e);
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/seo/abidos-report', (req, res) => {
    try {
        const ABIDOS_REPORT_FILE = path.join(REPORTS_DIR, 'abidos_report_latest.md');
        let response = { success: true };
        if (fs.existsSync(ABIDOS_REPORT_FILE)) {
            response.report = fs.readFileSync(ABIDOS_REPORT_FILE, 'utf8');
            const stats = fs.statSync(ABIDOS_REPORT_FILE);
            response.timestamp = stats.mtime.toLocaleString();
        }
        const universalJsonPath = path.join(REPORTS_DIR, 'abidos_universal_latest.json');
        if (fs.existsSync(universalJsonPath)) {
            response.universalAudit = JSON.parse(fs.readFileSync(universalJsonPath, 'utf8'));
        }
        if (response.report || response.universalAudit) {
            res.json(response);
        } else {
            res.status(404).json({ error: "Nenhum relatório Abidos encontrado." });
        }
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/seo/abidos-report', (req, res) => {
    try {
        const { report, universalAudit } = req.body;
        const ABIDOS_REPORT_FILE = path.join(REPORTS_DIR, 'abidos_report_latest.md');
        if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
        fs.writeFileSync(ABIDOS_REPORT_FILE, report);
        const universalJsonPath = path.join(REPORTS_DIR, 'abidos_universal_latest.json');
        fs.writeFileSync(universalJsonPath, JSON.stringify(universalAudit || {}, null, 2));
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/system/report/latest', (req, res) => {
    try {
        const latestFile = path.join(REPORTS_DIR, 'latest_status.json');
        if (fs.existsSync(latestFile)) {
            const data = JSON.parse(fs.readFileSync(latestFile, 'utf8'));
            res.json(data);
        } else {
            res.json({ critical_alerts: 0, summary: "Nenhum relatório pendente." });
        }
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/system/report/history', (req, res) => {
    try {
        const year = new Date().getFullYear().toString();
        const yearDir = path.join(REPORTS_DIR, year);
        let history = [];
        if (fs.existsSync(yearDir)) {
            const months = fs.readdirSync(yearDir);
            for (const month of months) {
                const monthDir = path.join(yearDir, month);
                const files = fs.readdirSync(monthDir).filter(f => f.endsWith('.json'));
                for (const file of files) {
                    const content = JSON.parse(fs.readFileSync(path.join(monthDir, file), 'utf8'));
                    history.push({
                        date: content.timestamp,
                        alerts: (content.modules.filter(m => m.status.includes('❌')).length + content.apis.filter(a => a.status.includes('❌')).length),
                        summary: content.modules.filter(m => m.status.includes('❌')).map(m => m.name).concat(content.apis.filter(a => a.status.includes('❌')).map(a => a.name)).join(', ') || "Integridade Confirmada"
                    });
                }
            }
        }
        res.json(history.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

const PRINTS_DIR = path.join(__dirname, '../docs/prints');
app.post('/api/dev/screenshot', (req, res) => {
    try {
        const { image, filename, folder } = req.body;
        if (!image) return res.status(400).json({ error: "Imagem ausente" });
        const now = new Date();
        const dateFolder = folder || `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
        const timeFolder = now.getHours().toString().padStart(2, '0') + '-' + now.getMinutes().toString().padStart(2, '0');
        const finalDir = path.join(PRINTS_DIR, dateFolder, timeFolder);
        if (!fs.existsSync(finalDir)) fs.mkdirSync(finalDir, { recursive: true });
        const base64Data = image.replace(/^data:image\/png;base64,/, "");
        const filePath = path.join(finalDir, filename || `screenshot_${Date.now()}.png`);
        fs.writeFileSync(filePath, base64Data, 'base64');
        res.json({ success: true, path: filePath });
    } catch (e) {
        console.error("❌ Erro ao salvar screenshot:", e);
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/ai/health', async (req, res) => {
    try {
        if (!process.env.GEMINI_API_KEY) throw new Error("API Key Ausente");
        res.json({ status: "OK", engine: "Gemini 2.5 Hub", auth: "Validada" });
    } catch (e) { res.status(503).json({ status: "OFFLINE", error: e.message }); }
});

app.get('/api/media/health', (req, res) => {
    try {
        const hasCloudinary = !!(process.env.CLOUDINARY_URL || (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY));
        res.json({ status: "OK", storage: "Cloudinary/FS", cloudinary: hasCloudinary });
    } catch (e) { res.status(503).json({ status: "ERROR", error: e.message }); }
});

const TEMPLATE_CATALOG = [
    { id: "01", filename: "master_template_01_dark_glass.html", name: "01 — Dark Glass: Autoridade Clínica e Serviços", type: "landing", designSummary: "Dark Glass, Teal-Glow, Luxo Clínico", fonts: "Inter", palette: "Black + Teal + Cream" },
    { id: "02", filename: "master_template_02_artigo_editorial.html", name: "02 — Artigo Editorial: Post de Blog Padrão", type: "artigo", designSummary: "Editorial Clean, Tipografia Serif, Foco em Leitura", fonts: "Inter + Lora", palette: "Slate + Teal Brand" },
    { id: "03", filename: "master_template_03_editorial_premium.html", name: "03 — Editorial Premium: Artigo de Capa / Editorial", type: "artigo", designSummary: "Premium, Warm Cream, Drop Cap Lora", fonts: "Inter + Lora", palette: "Warm Cream + Teal Brand" },
    { id: "04", filename: "master_template_04_artigo_imersivo.html", name: "04 — Artigo Imersivo: Relatos e Reflexões Imersivas", type: "artigo", designSummary: "Hero Parallax, Forest Theme, Narrativa Visual", fonts: "DM Sans + Playfair", palette: "Forest + Cream + Sage" },
    { id: "05", filename: "master_template_05_techeditorial.html", name: "05 — Tech Editorial: Lançamentos e Tecnologia", type: "artigo", designSummary: "Tech-Modern, Fundo Escuro, Estilo Documentação", fonts: "Mono + Sans", palette: "Dark Tech" },
    { id: "06", filename: "master_template_06_artigo_organico.html", name: "06 — Artigo Orgânico: Bem-estar e Saúde Mental", type: "artigo", designSummary: "Tons Terrosos, Design Natural, Legibilidade", fonts: "Editorial Serif", palette: "Orgânico / Earth" },
    { id: "07", filename: "master_template_07_ensaio_vintage.html", name: "07 — Ensaio Vintage: Ensaio Acadêmico / Denso", type: "artigo", designSummary: "Vintage Editorial, Grain, Estética Jornalística", fonts: "Fraunces + Manrope", palette: "Ink + Paper + Rust" },
    { id: "08", filename: "master_template_08_ethereal_glass.html", name: "08 — Ethereal Glass: Criatividade e Potencial", type: "artigo", designSummary: "Glassmorphism Etéreo, Cristalino, Futurista", fonts: "Plus Jakarta", palette: "Ethereal / White" },
    { id: "09", filename: "master_template_09_luxury_dark.html", name: "09 — Luxury Dark: Mentoria e Consultoria Premium", type: "artigo", designSummary: "Luxuoso Escuro, Dourado/Champagne, Tipografia Elite", fonts: "Premium Serif", palette: "Black + Gold" },
    { id: "10", filename: "master_template_10_tech_focus.html", name: "10 — Tech Focus: Documentação e Whitepapers", type: "artigo", designSummary: "Minimalismo Tech, Foco em Dados, Blue/Slate", fonts: "Geometric Sans", palette: "Blue Tech" },
    { id: "11", filename: "master_template_11_landing_abidos.html", name: "11 — Landing Abidos: Landing Page de Conversão (Ads)", type: "landing", designSummary: "SaaS Moderno, Clean White, Botões 3D", fonts: "Plus Jakarta", palette: "White + Indigo" }
];

const SITE_REPO_PATH = path.join(__dirname, '../../HipnoLawrence-Site/src/app');
const deps = { SITE_REPO_PATH, TEMPLATE_CATALOG, analyticsClient, upload };

require('./routes/acervo')(app, deps);
require('./routes/ai-generation')(app, deps);
require('./routes/health-marketing')(app, deps);
require('./routes/operations')(app, deps);
require('./routes/vortex')(app, deps);

app.use('/api/*', (req, res) => {
    res.status(404).json({ success: false, error: "Endpoint não encontrado." });
});

const server = app.listen(port, () => {
    console.log(`\n🚀 AntiGravity CMS: Mission Control Ativo!`);
    console.log(`📡 Frontend & API rodando em http://localhost:${port}`);
    wss = new WebSocket.Server({ server });
    wss.on('connection', (ws) => {
        ws.on('message', (message) => { console.log('📩 WS:', message.toString()); });
    });
});
