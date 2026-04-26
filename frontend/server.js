const express = require('express');
const multer = require('multer');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const WebSocket = require('ws');
const cloudinary = require('cloudinary').v2;
const textToSpeech = require('@google-cloud/text-to-speech');
let ttsClient;
try {
    ttsClient = new textToSpeech.TextToSpeechClient();
} catch (err) {
    console.warn("⚠️ [TTS] Falha ao inicializar TTS Client (sem credenciais):", err.message);
}
const { BetaAnalyticsDataClient } = require('@google-analytics/data');
require('dotenv').config({ path: '../.env' });

// [QUEUE SYSTEM LEGADO REMOVIDO DAQUI - METODOLOGIA ANTIGRAVITY]
// Toda a orquestração de fila agora reside no shared.js de forma Singleton.;

// Inicializa cliente GA4 se as credenciais existirem
let analyticsClient;
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
        analyticsClient = new BetaAnalyticsDataClient();
        console.log("📊 [ANALYTICS] Motor GA4 Inicializado com Sucesso.");
    } catch (err) {
        console.warn("âš ï¸ [ANALYTICS] Falha ao inicializar motor GA4:", err.message);
    }
}

if (!process.env.GOOGLE_CLOUD_PROJECT && !process.env.GEMINI_API_KEY) {
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    console.error("!!! ERRO CRÍTICO: Variáveis de ambiente GOOGLE_CLOUD_PROJECT e GEMINI_API_KEY não foram definidas.");
    console.error("!!! Por favor, adicione-as ao seu arquivo .env");
    console.error("!!! O Antigravity Agent não funcionará corretamente sem isso.");
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
}

const { 
    genAI, getAIModel, wrapModel, extractJSON, trackUsage,
    LITE_MODEL, MAIN_MODEL, PRO_MODEL, GoogleAICacheManager,
    modelFlash, modelPro, fs, path: sharedPath 
} = require('./shared');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');

const app = express();
const port = 3000;

// Memória temporária para Previews
const tempPreviews = {};

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
});

// Rotas de Preview
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
    res.type('application/javascript');
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
    console.log("â˜ï¸ [SMART MEDIA] Cloudinary Engine: ON");
} else {
    console.log("ðŸ“ [SMART MEDIA] Cloudinary Engine: OFF");
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
const draftsDb = []; // In-memory store for newly generated drafts (Vercel-ready)

// [REDUNDÂNCIAS REMOVIDAS - AGORA UTILIZANDO SHARED.JS]
// Funções extractJSON, repairTruncatedJSON, trackUsage e telemetria migradas para ./shared.js

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

        // Criar estrutura de pastas: relatorios/ANO/MES
        const yearDir = path.join(REPORTS_DIR, year);
        const monthDir = path.join(yearDir, month);

        if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
        if (!fs.existsSync(yearDir)) fs.mkdirSync(yearDir, { recursive: true });
        if (!fs.existsSync(monthDir)) fs.mkdirSync(monthDir, { recursive: true });

        // Nome: Relatório_HH-mm_DD-MM-AA.json
        const filename = `Relatório_${now.getHours().toString().padStart(2, '0')}-${now.getMinutes().toString().padStart(2, '0')}_${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${year.slice(-2)}.json`;
        const filePath = path.join(monthDir, filename);

        fs.writeFileSync(filePath, JSON.stringify(report, null, 2));

        // Atualizar o ponteiro de "Último Alerta" para o Dashboard
        const criticalModules = report.modules.filter(m => m.status.includes('âŒ'));
        const criticalApis = report.apis.filter(a => a.status.includes('âŒ'));

        const latestInfo = {
            filename: filename,
            timestamp: report.timestamp,
            critical_alerts: criticalModules.length + criticalApis.length,
            summary: criticalModules.map(m => m.name).concat(criticalApis.map(a => a.name)).join(', ') || "Tudo operacional!"
        };
        fs.writeFileSync(path.join(REPORTS_DIR, 'latest_status.json'), JSON.stringify(latestInfo, null, 2));

        res.json({ success: true, path: filePath });
    } catch (e) {
        console.error("âŒ Erro ao salvar relatório:", e);
        res.status(500).json({ error: e.message });
    }
});

// [ABIDOS] Persistência do Último Relatório Estratégico
const ABIDOS_REPORT_FILE = path.join(REPORTS_DIR, 'abidos_report_latest.md');

// Rota para recuperar o último relatório Abidos + Base Universal
app.get('/api/seo/abidos-report', (req, res) => {
    try {
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
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Rota para salvar relatório Abidos (Markdown + Universal JSON)
app.post('/api/seo/abidos-report', (req, res) => {
    try {
        const { report, universalAudit } = req.body;
        if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });

        fs.writeFileSync(ABIDOS_REPORT_FILE, report);

        // Também salvar a base universal em JSON para persistência servidor se necessário
        const universalJsonPath = path.join(REPORTS_DIR, 'abidos_universal_latest.json');
        fs.writeFileSync(universalJsonPath, JSON.stringify(universalAudit || {}, null, 2));

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Rota para pegar o último status para o Dashboard
app.get('/api/system/report/latest', (req, res) => {
    try {
        const latestFile = path.join(REPORTS_DIR, 'latest_status.json');
        if (fs.existsSync(latestFile)) {
            const data = JSON.parse(fs.readFileSync(latestFile, 'utf8'));
            res.json(data);
        } else {
            res.json({ critical_alerts: 0, summary: "Nenhum relatório pendente." });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Rota para pegar o histórico completo para a análise longitudinal
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
                        alerts: (content.modules.filter(m => m.status.includes('âŒ')).length + content.apis.filter(a => a.status.includes('âŒ')).length),
                        summary: content.modules.filter(m => m.status.includes('âŒ')).map(m => m.name).concat(content.apis.filter(a => a.status.includes('âŒ')).map(a => a.name)).join(', ') || "Integridade Confirmada"
                    });
                }
            }
        }
        res.json(history.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10)); // Top 10 recentes
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// [FASE 6: DIAGNÓSTICO E BACKUP VISUAL]
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
        console.error("âŒ Erro ao salvar screenshot:", e);
        res.status(500).json({ error: e.message });
    }
});

// Health Checks (Simples)
app.get('/api/ai/health', async (req, res) => {
    try {
        if (!process.env.GEMINI_API_KEY) throw new Error("API Key Ausente");
        const model = genAI.getGenerativeModel({ model: MAIN_MODEL });
        res.json({ status: "OK", engine: "Gemini 2.5 Hub", auth: "Validada" });
    } catch (e) {
        res.status(503).json({ status: "OFFLINE", error: e.message });
    }
});

app.get('/api/media/health', (req, res) => {
    try {
        const hasCloudinary = !!(process.env.CLOUDINARY_URL || (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY));
        res.json({ status: "OK", storage: "Cloudinary/FS", cloudinary: hasCloudinary });
    } catch (e) {
        res.status(503).json({ status: "ERROR", error: e.message });
    }
});

// [FASE 5] Módulo Neuro-Training: Memória de Estilo do Dr. Victor
const MEMORY_FILE_PATH = path.join(__dirname, 'estilo_victor.json');


const PROMPT_TREINAMENTO_ISOLADO = `[SISTEMA DE CLONAGEM DE SINTAXE - MODO DIGITAL TWIN]
Missão: Extrair as REGRAS ESTRUTURAIS da fala do Dr. Victor Lawrence (P2).
Proibição Absoluta: Não comente, não resuma e não extraia regras sobre CONTEÚDO (sentimentos, grávidas, prazos, trabalho, psiquiatria).

[DIRETRIZES DE RECONHECIMENTO]
1. Identifique o Falante Alvo: P2 (Profissional). Ignore P1 (Paciente).
2. Proibição Semântica: Se a regra contiver palavras do texto original que não sejam termos linguísticos, ela está ERRADA.
3. Foco Estrutural: Analise como as frases são unidas. (Ex: "Usa o 'Pacing' repetindo a última palavra do interlocutor antes de uma pergunta socrática").

[CATEGORIAS OBRIGATÓRIAS]
- Cadência (Ritmo e Pontuação)
- Sintaxe (Estrutura de Frases e Conectivos)
- Vocabulário de Identidade (Palavras-âncora estruturais)
- Tonabilidade Estrutural (Acolhimento via forma, não via palavras)

FORMATO OBLIGATÓRIO (JSON):
{
  "regras_extraidas": [
    {
      "categoria": "[Categorias Acima]",
      "titulo": "Nome LINGUÍSTICO (ex: Ancoragem de Sintaxe)",
      "regra": "Descrição técnica para o Gêmeo Digital clonar."
    }
  ],
  "reply": "REPORTE TÉCNICO: Mapeei o padrão [TÍTULO] do Dr. Victor. Ele agora faz parte do núcleo de identidade verbal."
}`;

const getVictorStyle = () => {
    try {
        if (fs.existsSync(MEMORY_FILE_PATH)) {
            const data = fs.readFileSync(MEMORY_FILE_PATH, 'utf8');
            return JSON.parse(data);
        }
    } catch (e) {
        console.error("âŒ Erro ao ler estilo_victor.json:", e);
    }
    return { style_rules: [] };
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// [AI STUDIO NEXT-GEN] Catálogo de Templates Estratégicas
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

// Helper: Tenta agrupar variáveis em módulos semânticos (Lógica do Studio Next)
function getModuleForVar(varName) {
    const modules = {
        seo: { order: 0, title: "Fundação SEO & Meta" },
        ui_titulo: { order: 1, title: "Hero / Título Visual" },
        hero: { order: 1, title: "Hero / Título Visual" },
        nav: { order: 1, title: "Navegação" },
        link: { order: 1, title: "Hero / Título Visual" }, // Links de agendamento agora no Hero
        dor: { order: 2, title: "Identificação da Dor" },
        beneficios: { order: 3, title: "Benefícios & Método" },
        autoridade: { order: 4, title: "Autoridade (E-E-A-T)" },
        faq: { order: 5, title: "FAQ" },
        silo: { order: 5, title: "Silos & Links" },
        cta: { order: 6, title: "CTA & Conversão" },
        whatsapp: { order: 6, title: "WhatsApp & Contato" }, // WhatsApp agora é um módulo claro
        ambiente: { order: 4, title: "Autoridade (E-E-A-T)" },
        autor: { order: 7, title: "Autor & Dados" },
        artigo: { order: 2, title: "Corpo do Artigo" },
        secao: { order: 3, title: "Seções do Artigo" }
    };
    const parts = varName.split("_");
    for (let i = parts.length; i >= 1; i--) {
        const prefix = parts.slice(0, i).join("_");
        if (modules[prefix]) return modules[prefix];
    }
    return { order: 99, title: "Outras Variáveis" };
}

// [API] Listar Catálogo
app.get('/api/templates', (req, res) => {
    res.json({ templates: TEMPLATE_CATALOG });
});

// [API] Detalhes e Variáveis da Template
app.get('/api/templates/:id', async (req, res) => {
    const entry = TEMPLATE_CATALOG.find(t => t.id === req.params.id);
    if (!entry) return res.status(404).json({ error: "Template não encontrada" });

    try {
        const filePath = path.join(__dirname, '../templates', entry.filename);
        const html = fs.readFileSync(filePath, "utf-8");
        const regex = /\{\{(\w+)\}\}/g;
        const seen = new Set();
        const allVars = [];
        let match;
        while ((match = regex.exec(html)) !== null) {
            if (!seen.has(match[1])) {
                seen.add(match[1]);
                allVars.push(match[1]);
            }
        }
        const modules = {};
        allVars.forEach(v => {
            const mod = getModuleForVar(v);
            if (!modules[mod.title]) modules[mod.title] = { ...mod, variables: [] };
            modules[mod.title].variables.push(v);
        });
        const sorted = Object.values(modules).sort((a, b) => a.order - b.order);
        res.json({ template: entry, totalVariables: allVars.length, modules: sorted });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// [API] Gerar Preview Final (Processador de Variáveis)
function generateTOC(htmlContent) {
    const regex = /<h2[^>]*>(.*?)<\/h2>/gi;
    let match;
    const tocItems = [];
    let modifiedHtml = htmlContent;
    let index = 1;

    while ((match = regex.exec(htmlContent)) !== null) {
        const cleanTitle = match[1].replace(/<[^>]+>/g, '').trim();
        if (cleanTitle && cleanTitle.length > 5 && !cleanTitle.includes('{{')) {
            const anchorId = `secao-${index}-${cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
            tocItems.push({ label: cleanTitle, url: `#${anchorId}` });
            const originalH2 = match[0];
            const newH2 = originalH2.replace('<h2', `<h2 id="${anchorId}"`);
            modifiedHtml = modifiedHtml.replace(originalH2, newH2);
            index++;
        }
    }

    return { modifiedHtml, tocItems };
}

app.post('/api/templates/preview', async (req, res) => {
    const { templateId, values, menuId } = req.body;
    const entry = TEMPLATE_CATALOG.find(t => t.id === templateId);
    if (!entry) return res.status(404).json({ error: "Template não encontrada" });

    try {
        const filePath = path.join(__dirname, '../templates', entry.filename);
        let html = fs.readFileSync(filePath, "utf-8");

        // 1. Injetar Variáveis (exceto o menu dinâmico que tem lógica própria)
        for (const [key, value] of Object.entries(values || {})) {
            if (key === 'nav_menu_dinamico') continue;
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            html = html.replace(regex, value || "");
        }

        // 2. Auto-TOC
        const { modifiedHtml, tocItems } = generateTOC(html);
        html = modifiedHtml;

        // 3. Injetar Menu Dinâmico
        let menuHtml = '';
        if (menuId && typeof generateMenuHtmlForTemplate === 'function') {
            menuHtml = generateMenuHtmlForTemplate(menuId, templateId, { slug: "preview", title: values.SEO_TITLE || '' });

            // Auto-TOC append (preview mode)
            if (tocItems.length > 0 && (templateId === '02' || templateId === '03' || templateId === '04' || templateId === '05' || templateId === '06' || templateId === '07' || templateId === '10')) {
                const tocMenuHtml = `
                    <div class="fixed bottom-4 left-4 z-50 glass-panel lg:hidden p-3 rounded-2xl max-w-[200px]">
                        <div class="text-[10px] font-bold uppercase text-slate-400 mb-2 tracking-widest">+ Tópicos Neste Artigo</div>
                        <ul class="flex flex-col gap-1">
                            ${tocItems.map(i => `<li><a href="${i.url}" class="text-xs text-slate-500 hover:text-[#14b8a6] line-clamp-1">${i.label}</a></li>`).join('')}
                        </ul>
                    </div>`;
                menuHtml += tocMenuHtml;
            }
        }

        if (html.includes('{{nav_menu_dinamico}}')) {
            html = html.replace('{{nav_menu_dinamico}}', menuHtml);
        } else if (html.includes('<main')) {
            html = html.replace('<main', menuHtml + '\n    <main');
        } else {
            html = menuHtml + html;
        }

        html = html.replace(/\{\{\w+\}\}/g, "");
        res.send(html);
    } catch (e) {
        console.error(e);
        res.status(500).send("Erro ao gerar preview.");
    }
});


// ==============================================================================
// ORQUESTRADOR MODULAR - ROTAS & DEPENDENCIAS
// ==============================================================================
const SITE_REPO_PATH = path.join(__dirname, '../../HipnoLawrence-Site/src/app');

// Shared deps for injected routes
const deps = {
    SITE_REPO_PATH,
    TEMPLATE_CATALOG,
    analyticsClient,
    upload
};

// Modulos Injetados Automaticamente
require('./routes/acervo')(app, deps);
require('./routes/ai-generation')(app, deps);
require('./routes/health-marketing')(app, deps);
require('./routes/operations')(app, deps);
require('./routes/vortex')(app, deps);

// CATCH-ALL API (Movido para o final para nao quebrar rotas dinamicas)
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        error: `Endpoint '${req.originalUrl}' nao encontrado no ecossistema NeuroEngine (Protocolo V5). Verifique se o backend esta atualizado e se a rota existe no server.js.`
    });
});

const server = app.listen(port, () => {
    console.log(`\n🚀 AntiGravity CMS: Mission Control Ativo!`);
    console.log(`📡 Frontend & API rodando em http://localhost:${port}`);
    console.log(`🛡️ Camada de Seguranca Proxy: ON`);

    // Inicializar WebSocket Server
    wss = new WebSocket.Server({ server });
    console.log(`🎙️ WebSocket Voice Live: Disponivel em ws://localhost:${port}`);

    wss.on('connection', (ws) => {
        console.log('🔌 Conexao WebSocket estabelecida');
        ws.on('message', (message) => {
            console.log('📩 Mensagem WS recebida:', message.toString());
        });
    });
});
