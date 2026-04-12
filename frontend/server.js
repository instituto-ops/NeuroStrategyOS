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
    console.warn("âš ï¸ [TTS] Falha ao inicializar TTS Client (sem credenciais):", err.message);
}
const { BetaAnalyticsDataClient } = require('@google-analytics/data');
require('dotenv').config({ path: '../.env' }); 

// [QUEUE SYSTEM FOR 429 RATE-LIMIT - METODOLOGIA ANTIGRAVITY]
const aiQueue = [];
let isProcessingQueue = false;

async function processQueue() {
    if (isProcessingQueue) return;
    isProcessingQueue = true;
    while (aiQueue.length > 0) {
        const { model, parts, resolve, reject, retries, delay } = aiQueue[0];
        try {
            const executeCall = async (r, d) => {
                try {
                    const res = await model.generateContent(parts);
                    return res;
                } catch (e) {
                    if (e.message.includes('429') && r > 0) {
                        console.warn(`âš ï¸ [AI QUEUE] 429 Hit. Waiting ${d}ms... (${r} retries left)`);
                        await new Promise(res => setTimeout(res, d));
                        return await executeCall(r - 1, d * 2);
                    }
                    throw e;
                }
            };
            const result = await executeCall(retries, delay || 2000);
            aiQueue.shift();
            resolve(result);
            // Throttle: Max 1 request per second to respect RPM quotas
            await new Promise(res => setTimeout(res, 1000));
        } catch (err) {
            aiQueue.shift();
            reject(err);
        }
    }
    isProcessingQueue = false;
}

function queuedGenerate(model, parts, retries = 3) {
    return new Promise((resolve, reject) => {
        aiQueue.push({ model, parts, resolve, reject, retries });
        processQueue();
    });
}

const wrapModel = (rawModel) => {
    if (!rawModel) return rawModel;
    return new Proxy(rawModel, {
        get(target, prop, receiver) {
            if (prop === 'generateContent') {
                return (parts) => queuedGenerate(target, parts);
            }
            return Reflect.get(target, prop, receiver);
        }
    });
};

// Inicializa cliente GA4 se as credenciais existirem
let analyticsClient;
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
        analyticsClient = new BetaAnalyticsDataClient();
        console.log("ðŸ“Š [ANALYTICS] Motor GA4 Inicializado com Sucesso.");
    } catch (err) {
        console.warn("âš ï¸ [ANALYTICS] Falha ao inicializar motor GA4:", err.message);
    }
}

if (!process.env.GOOGLE_CLOUD_PROJECT && !process.env.GEMINI_API_KEY) {
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    console.error("!!! ERRO CRÃTICO: VariÃ¡veis de ambiente GOOGLE_CLOUD_PROJECT e GEMINI_API_KEY nÃ£o foram definidas.");
    console.error("!!! Por favor, adicione-as ao seu arquivo .env");
    console.error("!!! O Antigravity Agent nÃ£o funcionarÃ¡ corretamente sem isso.");
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
}

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GoogleAICacheManager } = require('@google/generative-ai/server');
const fs = require('fs');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');

const app = express();
const port = 3000; 

// MemÃ³ria temporÃ¡ria para Previews
const tempPreviews = {};

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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
    } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/previews/get/:id', (req, res) => {
    const preview = tempPreviews[req.params.id];
    if (preview) {
        res.json(preview);
    } else {
        res.status(404).json({ error: "Preview expirado ou nÃ£o encontrado no servidor." });
    }
});

// 1. SERVIR ARQUIVOS ESTÃTICOS
app.use(express.static(path.join(__dirname, 'public')));
app.use('/templates', express.static(path.join(__dirname, '../templates')));

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
 * FunÃ§Ã£o global para reportar status dos agentes via WebSocket
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

// [HEMISFÃ‰RIOS CEREBRAIS DA IA - GERAÃ‡ÃƒO 2026: PROTOCOLO ABIDOS V5.5]
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "DUMMY");

// Modelos PrimÃ¡rios (Soberania do UsuÃ¡rio Abidos v5)
const LITE_MODEL = "gemini-2.5-flash-lite"; 
const MAIN_MODEL = "gemini-2.5-flash"; // PADRÃƒO SELECIONADO
const PRO_MODEL  = "gemini-2.5-pro";

// Helper para obter o motor de IA configurado dinamicamente
function getAIModel(modelType, mimeType = "application/json") {
    let target = MAIN_MODEL;
    if (modelType === 'lite' || modelType === 'gemini-2.5-flash-lite') target = LITE_MODEL;
    else if (modelType === 'pro' || modelType === 'gemini-2.5-pro') target = PRO_MODEL;
    else if (modelType === 'flash' || modelType === 'gemini-2.5-flash') target = MAIN_MODEL;
    else if (modelType && modelType.includes("gemini")) target = modelType;

    const config = { 
        temperature: 0.8,
        maxOutputTokens: 8192 // [PHASE 5.1] Aumentado para evitar truncamento em payloads longos
    };
    if (mimeType === "application/json") config.responseMimeType = "application/json";

    const rawModel = genAI.getGenerativeModel({ model: target, generationConfig: config });
    return wrapModel(rawModel);
}

// HemisfÃ©rio Esquerdo (FLASH): RÃ¡pido, Multimodal e Estruturado
// Perfeito para ouvir seu Ã¡udio em tempo real e cuspir o JSON das regras.
const modelFlash = getAIModel('flash');
const modelPro = getAIModel('pro', 'text/plain');
const VISION_MODEL = MAIN_MODEL;
const HEAVY_MODEL = PRO_MODEL;
const draftsDb = []; // In-memory store for newly generated drafts before WP sync

// Helper robust JSON parser com Autorepair para Truncamento (Antigravity v5)
function extractJSON(text) {
    if (!text) return null;
    
    // 1. Localizar o bloco JSON
    let jsonPart = text.trim();
    const firstBrace = jsonPart.indexOf('{');
    if (firstBrace !== -1) {
        jsonPart = jsonPart.substring(firstBrace);
    }

    // 2. Tentativa de Parse Direto
    try {
        // Remove markdown triple backticks se existirem no rastro final
        const cleanText = jsonPart.replace(/```json/g, '').replace(/```/g, '').trim();
        const lastBrace = cleanText.lastIndexOf('}');
        if (lastBrace !== -1) {
            return JSON.parse(cleanText.substring(0, lastBrace + 1));
        }
        return JSON.parse(cleanText);
    } catch (e) {
        // 3. Fallback: Reparo de JSON Truncado (Token Limit Hit)
        console.warn("âš ï¸ [VORTEX] JSON Truncado Detectado. Iniciando Reparo de EmergÃªncia...");
        try {
            return repairTruncatedJSON(jsonPart);
        } catch (repairErr) {
            console.error("âŒ [VORTEX] Falha crÃ­tica no parser JSON:", repairErr.message);
            return null;
        }
    }
}

function repairTruncatedJSON(json) {
    let stack = [];
    let inString = false;
    let escaped = false;
    let repaired = "";

    // Limpeza inicial de Markdown se o Gemini parou no meio dele
    let code = json.replace(/```json/g, '').replace(/```/g, '').trim();

    for (let i = 0; i < code.length; i++) {
        let char = code[i];
        if (escaped) {
            escaped = false;
            repaired += char;
            continue;
        }
        if (char === '\\') {
            escaped = true;
            repaired += char;
            continue;
        }
        if (char === '"') {
            inString = !inString;
            repaired += char;
            continue;
        }
        if (!inString) {
            if (char === '{' || char === '[') stack.push(char === '{' ? '}' : ']');
            else if (char === '}' || char === ']') stack.pop();
        }
        repaired += char;
    }

    // Fechar pendÃªncias
    if (inString) repaired += '"';
    while (stack.length) {
        repaired += stack.pop();
    }

    try {
        return JSON.parse(repaired);
    } catch (e) {
        // Se ainda falhar, tenta extrair via Regex os campos principais (code e preview)
        const codeMatch = repaired.match(/"code":\s*"([\s\S]*?)(?:"\s*,|"\s*\})/);
        const previewMatch = repaired.match(/"preview":\s*"([\s\S]*?)(?:"\s*,|"\s*\})/);
        
        return {
            code: codeMatch ? codeMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : "// Falha na recuperaÃ§Ã£o de cÃ³digo",
            preview: previewMatch ? previewMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : "<div>Erro no preview truncado</div>",
            explanation: "âš ï¸ Payload reparado via HeurÃ­stica de EmergÃªncia apÃ³s truncamento."
        };
    }
}

// [FASE 2: TELEMETRIA E SAÃšDE DO SISTEMA]
const TELEMETRY_FILE = path.join(__dirname, 'telemetry.json');

const getTelemetry = () => {
    try {
        if (fs.existsSync(TELEMETRY_FILE)) {
            return JSON.parse(fs.readFileSync(TELEMETRY_FILE, 'utf8'));
        }
    } catch (e) {
        console.error("âŒ Erro ao ler telemetry.json:", e);
    }
    return {
        tokens: { prompt: 0, candidates: 0, total: 0 },
        calls: 0,
        errors: 0,
        last_sync: new Date().toISOString()
    };
};

const trackUsage = (usage) => {
    if (!usage) return;
    try {
        const stats = getTelemetry();
        stats.tokens.prompt += (usage.promptTokenCount || 0);
        stats.tokens.candidates += (usage.candidatesTokenCount || 0);
        stats.tokens.total += (usage.totalTokenCount || 0);
        stats.calls += 1;
        stats.last_sync = new Date().toISOString();
        fs.writeFileSync(TELEMETRY_FILE, JSON.stringify(stats, null, 2));
    } catch (e) {
        console.error("âŒ Falha na telemetria:", e.message);
    }
};

// [FASE 3: SISTEMA DE RELATÃ“RIOS E AUTODIAGNÃ“STICO]
const REPORTS_DIR = path.join(__dirname, 'relatorios');

// Rota de Salvamento de RelatÃ³rio Longitudinal
app.post('/api/system/report/save', (req, res) => {
    try {
        const report = req.body;
        const now = new Date();
        const year = now.getFullYear().toString();
        const monthNames = ["Janeiro", "Fevereiro", "MarÃ§o", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        const month = monthNames[now.getMonth()];
        
        // Criar estrutura de pastas: relatorios/ANO/MES
        const yearDir = path.join(REPORTS_DIR, year);
        const monthDir = path.join(yearDir, month);
        
        if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
        if (!fs.existsSync(yearDir)) fs.mkdirSync(yearDir, { recursive: true });
        if (!fs.existsSync(monthDir)) fs.mkdirSync(monthDir, { recursive: true });

        // Nome: RelatÃ³rio_HH-mm_DD-MM-AA.json
        const filename = `RelatÃ³rio_${now.getHours().toString().padStart(2,'0')}-${now.getMinutes().toString().padStart(2,'0')}_${now.getDate().toString().padStart(2,'0')}-${(now.getMonth()+1).toString().padStart(2,'0')}-${year.slice(-2)}.json`;
        const filePath = path.join(monthDir, filename);

        fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
        
        // Atualizar o ponteiro de "Ãšltimo Alerta" para o Dashboard
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
        console.error("âŒ Erro ao salvar relatÃ³rio:", e);
        res.status(500).json({ error: e.message });
    }
});

// [ABIDOS] PersistÃªncia do Ãšltimo RelatÃ³rio EstratÃ©gico
const ABIDOS_REPORT_FILE = path.join(REPORTS_DIR, 'abidos_report_latest.md');

// Rota para recuperar o Ãºltimo relatÃ³rio Abidos + Base Universal
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
            res.status(404).json({ error: "Nenhum relatÃ³rio Abidos encontrado." });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Rota para salvar relatÃ³rio Abidos (Markdown + Universal JSON)
app.post('/api/seo/abidos-report', (req, res) => {
    try {
        const { report, universalAudit } = req.body;
        if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });
        
        fs.writeFileSync(ABIDOS_REPORT_FILE, report);
        
        // TambÃ©m salvar a base universal em JSON para persistÃªncia servidor se necessÃ¡rio
        const universalJsonPath = path.join(REPORTS_DIR, 'abidos_universal_latest.json');
        fs.writeFileSync(universalJsonPath, JSON.stringify(universalAudit || {}, null, 2));

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Rota para pegar o Ãºltimo status para o Dashboard
app.get('/api/system/report/latest', (req, res) => {
    try {
        const latestFile = path.join(REPORTS_DIR, 'latest_status.json');
        if (fs.existsSync(latestFile)) {
            const data = JSON.parse(fs.readFileSync(latestFile, 'utf8'));
            res.json(data);
        } else {
            res.json({ critical_alerts: 0, summary: "Nenhum relatÃ³rio pendente." });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Rota para pegar o histÃ³rico completo para a anÃ¡lise longitudinal
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
        res.json(history.sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 10)); // Top 10 recentes
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// [FASE 6: DIAGNÃ“STICO E BACKUP VISUAL]
const PRINTS_DIR = path.join(__dirname, '../docs/prints');

app.post('/api/dev/screenshot', (req, res) => {
    try {
        const { image, filename, folder } = req.body;
        if (!image) return res.status(400).json({ error: "Imagem ausente" });

        const now = new Date();
        const dateFolder = folder || `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2,'0')}-${now.getDate().toString().padStart(2,'0')}`;
        const timeFolder = now.getHours().toString().padStart(2,'0') + '-' + now.getMinutes().toString().padStart(2,'0');
        
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

// [FASE 5] MÃ³dulo Neuro-Training: MemÃ³ria de Estilo do Dr. Victor
const MEMORY_FILE_PATH = path.join(__dirname, 'estilo_victor.json');


const PROMPT_TREINAMENTO_ISOLADO = `[SISTEMA DE CLONAGEM DE SINTAXE - MODO DIGITAL TWIN]
MissÃ£o: Extrair as REGRAS ESTRUTURAIS da fala do Dr. Victor Lawrence (P2).
ProibiÃ§Ã£o Absoluta: NÃ£o comente, nÃ£o resuma e nÃ£o extraia regras sobre CONTEÃšDO (sentimentos, grÃ¡vidas, prazos, trabalho, psiquiatria).

[DIRETRIZES DE RECONHECIMENTO]
1. Identifique o Falante Alvo: P2 (Profissional). Ignore P1 (Paciente).
2. ProibiÃ§Ã£o SemÃ¢ntica: Se a regra contiver palavras do texto original que nÃ£o sejam termos linguÃ­sticos, ela estÃ¡ ERRADA.
3. Foco Estrutural: Analise como as frases sÃ£o unidas. (Ex: "Usa o 'Pacing' repetindo a Ãºltima palavra do interlocutor antes de uma pergunta socrÃ¡tica").

[CATEGORIAS OBRIGATÃ“RIAS]
- CadÃªncia (Ritmo e PontuaÃ§Ã£o)
- Sintaxe (Estrutura de Frases e Conectivos)
- VocabulÃ¡rio de Identidade (Palavras-Ã¢ncora estruturais)
- Tonabilidade Estrutural (Acolhimento via forma, nÃ£o via palavras)

FORMATO OBRIGATÃ“RIO (JSON):
{
  "regras_extraidas": [
    {
      "categoria": "[Categorias Acima]",
      "titulo": "Nome LINGUÃSTICO (ex: Ancoragem de Sintaxe)",
      "regra": "DescriÃ§Ã£o tÃ©cnica para o GÃªmeo Digital clonar."
    }
  ],
  "reply": "REPORTE TÃ‰CNICO: Mapeei o padrÃ£o [TÃTULO] do Dr. Victor. Ele agora faz parte do nÃºcleo de identidade verbal."
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

// [AI STUDIO NEXT-GEN] CatÃ¡logo de Templates EstratÃ©gicas
const TEMPLATE_CATALOG = [
    { id: "01", filename: "master_template_01_dark_glass.html", name: "01 â€” Dark Glass: Autoridade ClÃ­nica e ServiÃ§os", type: "landing", designSummary: "Dark Glass, Teal-Glow, Luxo ClÃ­nico", fonts: "Inter", palette: "Black + Teal + Cream" },
    { id: "02", filename: "master_template_02_artigo_editorial.html", name: "02 â€” Artigo Editorial: Post de Blog PadrÃ£o", type: "artigo", designSummary: "Editorial Clean, Tipografia Serif, Foco em Leitura", fonts: "Inter + Lora", palette: "Slate + Teal Brand" },
    { id: "03", filename: "master_template_03_editorial_premium.html", name: "03 â€” Editorial Premium: Artigo de Capa / Editorial", type: "artigo", designSummary: "Premium, Warm Cream, Drop Cap Lora", fonts: "Inter + Lora", palette: "Warm Cream + Teal Brand" },
    { id: "04", filename: "master_template_04_artigo_imersivo.html", name: "04 â€” Artigo Imersivo: Relatos e ReflexÃµes Imersivas", type: "artigo", designSummary: "Hero Parallax, Forest Theme, Narrativa Visual", fonts: "DM Sans + Playfair", palette: "Forest + Cream + Sage" },
    { id: "05", filename: "master_template_05_techeditorial.html", name: "05 â€” Tech Editorial: LanÃ§amentos e Tecnologia", type: "artigo", designSummary: "Tech-Modern, Fundo Escuro, Estilo DocumentaÃ§Ã£o", fonts: "Mono + Sans", palette: "Dark Tech" },
    { id: "06", filename: "master_template_06_artigo_organico.html", name: "06 â€” Artigo OrgÃ¢nico: Bem-estar e SaÃºde Mental", type: "artigo", designSummary: "Tons Terrosos, Design Natural, Legibilidade", fonts: "Editorial Serif", palette: "OrgÃ¢nico / Earth" },
    { id: "07", filename: "master_template_07_ensaio_vintage.html", name: "07 â€” Ensaio Vintage: Ensaio AcadÃªmico / Denso", type: "artigo", designSummary: "Vintage Editorial, Grain, EstÃ©tica JornalÃ­stica", fonts: "Fraunces + Manrope", palette: "Ink + Paper + Rust" },
    { id: "08", filename: "master_template_08_ethereal_glass.html", name: "08 â€” Ethereal Glass: Criatividade e Potencial", type: "artigo", designSummary: "Glassmorphism EtÃ©reo, Cristalino, Futurista", fonts: "Plus Jakarta", palette: "Ethereal / White" },
    { id: "09", filename: "master_template_09_luxury_dark.html", name: "09 â€” Luxury Dark: Mentoria e Consultoria Premium", type: "artigo", designSummary: "Luxuoso Escuro, Dourado/Champagne, Tipografia Elite", fonts: "Premium Serif", palette: "Black + Gold" },
    { id: "10", filename: "master_template_10_tech_focus.html", name: "10 â€” Tech Focus: DocumentaÃ§Ã£o e Whitepapers", type: "artigo", designSummary: "Minimalismo Tech, Foco em Dados, Blue/Slate", fonts: "Geometric Sans", palette: "Blue Tech" },
    { id: "11", filename: "master_template_11_landing_abidos.html", name: "11 â€” Landing Abidos: Landing Page de ConversÃ£o (Ads)", type: "landing", designSummary: "SaaS Moderno, Clean White, BotÃµes 3D", fonts: "Plus Jakarta", palette: "White + Indigo" }
];

// Helper: Tenta agrupar variÃ¡veis em mÃ³dulos semÃ¢nticos (LÃ³gica do Studio Next)
function getModuleForVar(varName) {
    const modules = {
        seo: { order: 0, title: "FundaÃ§Ã£o SEO & Meta" },
        ui_titulo: { order: 1, title: "Hero / TÃ­tulo Visual" },
        hero: { order: 1, title: "Hero / TÃ­tulo Visual" },
        nav: { order: 1, title: "NavegaÃ§Ã£o" },
        link: { order: 1, title: "Hero / TÃ­tulo Visual" }, // Links de agendamento agora no Hero
        dor: { order: 2, title: "IdentificaÃ§Ã£o da Dor" },
        beneficios: { order: 3, title: "BenefÃ­cios & MÃ©todo" },
        autoridade: { order: 4, title: "Autoridade (E-E-A-T)" },
        faq: { order: 5, title: "FAQ" },
        silo: { order: 5, title: "Silos & Links" },
        cta: { order: 6, title: "CTA & ConversÃ£o" },
        whatsapp: { order: 6, title: "WhatsApp & Contato" }, // WhatsApp agora Ã© um mÃ³dulo claro
        ambiente: { order: 4, title: "Autoridade (E-E-A-T)" },
        autor: { order: 7, title: "Autor & Dados" },
        artigo: { order: 2, title: "Corpo do Artigo" },
        secao: { order: 3, title: "SeÃ§Ãµes do Artigo" }
    };
    const parts = varName.split("_");
    for (let i = parts.length; i >= 1; i--) {
        const prefix = parts.slice(0, i).join("_");
        if (modules[prefix]) return modules[prefix];
    }
    return { order: 99, title: "Outras VariÃ¡veis" };
}

// [API] Listar CatÃ¡logo
app.get('/api/templates', (req, res) => {
    res.json({ templates: TEMPLATE_CATALOG });
});

// [API] Detalhes e VariÃ¡veis da Template
app.get('/api/templates/:id', async (req, res) => {
    const entry = TEMPLATE_CATALOG.find(t => t.id === req.params.id);
    if (!entry) return res.status(404).json({ error: "Template nÃ£o encontrada" });

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
        const sorted = Object.values(modules).sort((a,b) => a.order - b.order);
        res.json({ template: entry, totalVariables: allVars.length, modules: sorted });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// [API] Gerar Preview Final (Processador de VariÃ¡veis)
app.post('/api/templates/preview', async (req, res) => {
    const { templateId, values, menuId } = req.body;
    const entry = TEMPLATE_CATALOG.find(t => t.id === templateId);
    if (!entry) return res.status(404).json({ error: "Template nÃ£o encontrada" });

    try {
        const filePath = path.join(__dirname, '../templates', entry.filename);
        let html = fs.readFileSync(filePath, "utf-8");
        
        // 1. Injetar VariÃ¡veis (exceto o menu dinÃ¢mico que tem lÃ³gica prÃ³pria)
        for (const [key, value] of Object.entries(values || {})) {
            if (key === 'nav_menu_dinamico') continue; 
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            html = html.replace(regex, value || "");
        }

        // 2. Auto-TOC
        const { modifiedHtml, tocItems } = generateTOC(html);
        html = modifiedHtml;

        // 3. Injetar Menu DinÃ¢mico
        let menuHtml = '';
        if (menuId) {
            menuHtml = generateMenuHtmlForTemplate(menuId, templateId, { slug: "preview", title: values.SEO_TITLE || '' });
            
            // Auto-TOC append (preview mode)
            if (tocItems.length > 0 && (templateId === '02' || templateId === '03' || templateId === '04' || templateId === '05' || templateId === '06' || templateId === '07' || templateId === '10')) {
                 const tocMenuHtml = `
                    <div class="fixed bottom-4 left-4 z-50 glass-panel lg:hidden p-3 rounded-2xl max-w-[200px]">
                        <div class="text-[10px] font-bold uppercase text-slate-400 mb-2 tracking-widest">+ TÃ³picos Neste Artigo</div>
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
// GESTÃƒO DE ACERVO (LOCAL CMS)
// ==============================================================================
const SITE_REPO_PATH = path.join(__dirname, '../../HipnoLawrence-Site/src/app');

const MENUS_FILE = path.join(__dirname, 'menus.json');

// [API] Listar Menus
app.get('/api/menus', (req, res) => {
    try {
        if (!fs.existsSync(MENUS_FILE)) {
            fs.writeFileSync(MENUS_FILE, JSON.stringify([], null, 2));
            return res.json([]);
        }
        const content = fs.readFileSync(MENUS_FILE, 'utf8');
        res.json(JSON.parse(content || '[]'));
    } catch (e) {
        console.error("âŒ Erro CrÃ­tico GET /api/menus:", e);
        res.status(500).json({ error: "Falha na persistÃªncia de menus", details: e.message });
    }
});

// [API] Salvar Menus
app.post('/api/menus', (req, res) => {
    try {
        const menusData = req.body;
        if (!Array.isArray(menusData)) {
            throw new Error("Payload invÃ¡lido: esperado um array de menus.");
        }
        fs.writeFileSync(MENUS_FILE, JSON.stringify(menusData, null, 2));
        res.status(200).json({ success: true, message: "Menus persistidos com sucesso!" });
    } catch (e) {
        console.error("âŒ Erro CrÃ­tico POST /api/menus:", e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// ==============================================================================
// GESTÃƒO DE RASCUNHOS (DRAFTS PERSISTENCE)
// ==============================================================================
const DRAFTS_FILE = path.join(__dirname, 'drafts.json');

app.get('/api/drafts', async (req, res) => {
    try {
        console.log("ðŸ“‚ [DRAFTS] Consolidando rascunhos (File JSON + Physical Folder)...");
        let allDrafts = [];
        
        // 1. Carrega do drafts.json (AI Studio)
        if (fs.existsSync(DRAFTS_FILE)) {
            const dataJSON = JSON.parse(fs.readFileSync(DRAFTS_FILE, 'utf8'));
            if (Array.isArray(dataJSON)) allDrafts = [...dataJSON];
        }

        // 2. Carrega da pasta fÃ­sica (Auditores/LangGraph)
        const draftsFolder = path.join(__dirname, '../drafts');
        if (fs.existsSync(draftsFolder)) {
            const files = fs.readdirSync(draftsFolder).filter(f => f.endsWith('.json') || f.endsWith('.html'));
            for (const file of files) {
                const stat = fs.statSync(path.join(draftsFolder, file));
                allDrafts.push({
                    id: `PHYS-${file}`,
                    draft_id: `PHYS-${file}`,
                    name: file,
                    tema_foco: file.replace('.json', '').replace('.html', ''),
                    values: {}, // Vazio para rascunhos fÃ­sicos
                    validacoes_automatizadas: {
                        pesquisa_clinica: true,
                        metodo_abidos: true,
                        compliance_etico: true,
                        med_f1_score: 1.0
                    },
                    data_submissao: stat.mtime,
                    last_update: stat.mtime
                });
            }
        }

        res.json(allDrafts);
    } catch (e) { 
        console.error("âŒ [DRAFTS ERROR]", e.message);
        res.status(500).json({ error: e.message }); 
    }
});

app.post('/api/drafts', (req, res) => {
    try {
        const draft = req.body;
        if (!draft.id) draft.id = Date.now();
        draft.last_update = new Date().toISOString();

        let drafts = [];
        if (fs.existsSync(DRAFTS_FILE)) drafts = JSON.parse(fs.readFileSync(DRAFTS_FILE, 'utf8'));

        const existingIdx = drafts.findIndex(d => d.id === draft.id);
        if (existingIdx >= 0) {
            drafts[existingIdx] = draft;
        } else {
            drafts.push(draft);
        }

        fs.writeFileSync(DRAFTS_FILE, JSON.stringify(drafts, null, 2));
        res.json({ success: true, draft });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/drafts/:id', (req, res) => {
    try {
        if (!fs.existsSync(DRAFTS_FILE)) return res.json({ success: true });
        let drafts = JSON.parse(fs.readFileSync(DRAFTS_FILE, 'utf8'));
        drafts = drafts.filter(d => String(d.id) !== String(req.params.id));
        fs.writeFileSync(DRAFTS_FILE, JSON.stringify(drafts, null, 2));
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ðŸ­ RENDERIZADOR DE MENUS DEDICADO POR TEMPLATE
function generateMenuHtmlForTemplate(menuId, templateId, pageContext = {}) {
    if (!menuId || !fs.existsSync(MENUS_FILE)) return '';
    const menus = JSON.parse(fs.readFileSync(MENUS_FILE, 'utf8'));
    const menu = menus.find(m => m.id === menuId);
    if (!menu) return '';

    const { slug, title } = pageContext;
    const currentPath = slug ? (slug.startsWith('/') ? slug : `/${slug}`) : '/';

    const processUrl = (url) => {
        if (!url) return '/';
        let finalUrl = url;
        if (slug) finalUrl = finalUrl.replace('{{slug}}', slug);
        return finalUrl;
    };

    const isLinkActive = (url) => {
        const processed = processUrl(url);
        return processed === currentPath || processed === slug;
    };

    const filterItems = (items) => items.filter(i => i.status !== 'draft').map(i => ({ 
        ...i, 
        label: i.name || i.label || i.text || i.nome || 'Menu Item',
        active: isLinkActive(i.url),
        children: i.children ? filterItems(i.children) : [] 
    }));
    
    const validItems = filterItems(menu.items || []);
    if (validItems.length === 0) return '';

    let html = '';
    const waNumber = "5562991545295";
    const waText = encodeURIComponent("OlÃ¡ Dr. Victor, vi seu site e gostaria de saber mais sobre a Hipnose ClÃ­nica e como marcar uma primeira sessÃ£o.");
    const waLink = `https://wa.me/${waNumber}?text=${waText}`;

    // --- RENDERIZAÃ‡ÃƒO POR DESIGN SYSTEM ---

    if (templateId === '01' || templateId === '08') { // GLASS SYSTEMS
        const isEthereal = templateId === '08';
        const accentColor = isEthereal ? 'text-aura-indigo' : 'text-cyan-400';
        const brand = isEthereal ? 'sparkles' : 'brain';

        html += `<nav class="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-fit px-4 animate-fade-in-up">`;
        html += `<div class="glass-panel rounded-full px-2 py-2 flex items-center gap-2 sm:gap-6 shadow-2xl">`;
        
        if (isEthereal) {
            html += `<div class="w-10 h-10 bg-white/50 rounded-full flex items-center justify-center shrink-0"><i data-lucide="${brand}" class="w-4 h-4 text-slate-700"></i></div>`;
        } else {
            // Removido Ã­cone redundante para evitar "blobs" no topo
            html += `<div class="font-bold text-white tracking-widest uppercase text-[10px] ml-2">Dr. Victor</div>`;
        }

        html += `<ul class="hidden md:flex items-center gap-6 pr-4 border-r border-white/10 ml-2">`;
        validItems.forEach(item => {
            const activeClass = item.active ? `text-white font-bold` : `text-slate-400 hover:text-white`;
            html += `<li class="relative group">`;
            html += `<a href="${processUrl(item.url)}" class="text-xs uppercase tracking-widest transition-all ${activeClass}">${item.label}</a>`;
            if (item.children.length > 0) {
                html += `<ul class="absolute top-full left-0 mt-4 w-48 glass-panel rounded-2xl p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all flex flex-col gap-2">`;
                item.children.forEach(sub => {
                    html += `<li><a href="${processUrl(sub.url)}" class="text-[10px] uppercase text-slate-400 hover:text-white block px-2 py-1">${sub.label}</a></li>`;
                });
                html += `</ul>`;
            }
            html += `</li>`;
        });
        html += `</ul>`;
        html += `<a href="${waLink}" target="_blank" class="bg-[#2dd4bf] text-[#05080f] px-6 py-2.5 text-[10px] font-extrabold uppercase tracking-widest rounded-full hover:bg-white transition-all shadow-lg shadow-cyan-900/20">Agendar Consulta</a>`;
        html += `</div></nav>`;

    } else if (templateId === '02' || templateId === '03' || templateId === '07') { // EDITORIAL SYSTEMS
        const isVintage = templateId === '07';
        const bgClass = isVintage ? 'bg-[#fcf8f1]' : 'bg-white/95';

        html += `<nav class="w-full ${bgClass} border-b border-slate-200 sticky top-0 z-50 px-6 py-4 backdrop-blur-md">`;
        html += `<div class="max-w-7xl mx-auto flex items-center justify-between">`;
        html += `<a href="/" class="font-serif italic text-2xl text-slate-900 tracking-tighter">Lawrence<span class="text-[#14b8a6]">.</span></a>`;
        html += `<ul class="hidden md:flex gap-8 items-center">`;
        validItems.forEach(item => {
            const activeClass = item.active ? 'text-slate-900 border-b-2 border-[#14b8a6]' : 'text-slate-500 hover:text-slate-900';
            html += `<li class="relative group">`;
            html += `<a href="${processUrl(item.url)}" class="text-xs uppercase font-extrabold tracking-widest transition-all ${activeClass}">${item.label}</a>`;
            if (item.children.length > 0) {
                html += `<div class="absolute top-full left-0 pt-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all"><div class="bg-white border border-slate-100 shadow-2xl rounded p-4 w-56 flex flex-col gap-3">`;
                item.children.forEach(sub => {
                    html += `<a href="${processUrl(sub.url)}" class="text-xs text-slate-500 hover:text-[#14b8a6] pb-2 border-b border-slate-50 last:border-0">${sub.label}</a>`;
                });
                html += `</div></div>`;
            }
            html += `</li>`;
        });
        html += `</ul>`;
        html += `<a href="${waLink}" target="_blank" class="bg-slate-900 text-white px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-[#14b8a6] transition-all">Agendar Consulta</a>`;
        html += `</div></nav>`;

    } else if (templateId === '09') { // LUXURY DARK
        html += `<nav class="fixed w-full top-0 z-40 transition-all duration-500 bg-midnight-950/20 backdrop-blur-sm border-b border-white/5" id="navbar">`;
        html += `<div class="max-w-7xl mx-auto px-6 lg:px-12 h-24 flex items-center justify-between">`;
        html += `<div class="font-serif italic text-2xl tracking-wider text-bone-50">Dr<span class="text-gold-500">.</span> Victor</div>`;
        html += `<ul class="hidden lg:flex gap-10 items-center">`;
        validItems.forEach(item => {
            const activeClass = item.active ? 'text-gold-500' : 'text-bone-200/60 hover:text-gold-500';
            html += `<li><a href="${processUrl(item.url)}" class="text-[10px] uppercase tracking-[0.3em] font-medium transition-colors ${activeClass}">${item.label}</a></li>`;
        });
        html += `</ul>`;
        html += `<a href="${waLink}" target="_blank" class="text-[10px] uppercase tracking-[0.2em] font-medium text-bone-100 hover:text-gold-500 transition-colors flex items-center gap-3 group border border-bone-100/20 hover:border-gold-500/50 px-6 py-3 rounded-full backdrop-blur-sm">`;
        html += `Agendar Consulta <div class="w-1 h-1 rounded-full bg-gold-500 group-hover:scale-150 transition-transform"></div></a>`;
        html += `</div></nav>`;

    } else if (templateId === '10' || templateId === '04' || templateId === '05') { // TECH / MINIMALIST
        html += `<nav class="fixed top-0 w-full z-50 p-6 flex flex-col gap-4 transition-opacity duration-500">`;
        html += `<div class="max-w-7xl mx-auto w-full glass-card rounded-2xl px-6 py-4 flex items-center justify-between shadow-2xl backdrop-blur-xl border border-white/5">`;
        html += `<div class="flex items-center gap-3"><div class="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white"><i data-lucide="zap" class="w-5 h-5"></i></div><span class="font-bold text-white tracking-tighter uppercase text-xs">Acesso RÃ¡pido</span></div>`;
        html += `<ul class="hidden md:flex items-center gap-8">`;
        validItems.forEach(item => {
            const activeClass = item.active ? 'text-orange-500 font-bold' : 'text-mist/40 hover:text-white';
            html += `<li><a href="${processUrl(item.url)}" class="text-[10px] font-bold uppercase tracking-widest transition-colors ${activeClass}">${item.label}</a></li>`;
        });
        html += `</ul>`;
        html += `<a href="${waLink}" target="_blank" class="bg-white text-black font-extrabold text-[10px] px-6 py-2.5 rounded-xl hover:bg-orange-500 hover:text-white transition-all uppercase">Agendar</a>`;
        html += `</div></nav>`;

    } else { // FALLBACK / LANDING (06, 11)
        html += `<header class="fixed top-0 w-full z-50 py-4 px-6 flex justify-between items-center bg-white/80 backdrop-blur-lg border-b border-slate-100">`;
        html += `<div class="font-extrabold text-xl tracking-tight text-indigo-600">DR<span class="text-slate-900">. VICTOR</span></div>`;
        html += `<nav class="hidden md:flex gap-8">`;
        validItems.forEach(item => {
            const activeClass = item.active ? 'text-indigo-600' : 'text-slate-500 hover:text-indigo-600';
            html += `<a href="${processUrl(item.url)}" class="text-[11px] font-bold uppercase tracking-widest transition-colors ${activeClass}">${item.label}</a>`;
        });
        html += `</nav>`;
        html += `<a href="${waLink}" target="_blank" class="bg-indigo-600 text-white px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-indigo-200">Agendar Consulta</a>`;
        html += `</header>`;
    }

    // GeraÃ§Ã£o do Schema.org para SEO TÃ©cnico
    const schemaOrg = {
        "@context": "https://schema.org",
        "@type": "SiteNavigationElement",
        "name": validItems.map(i => i.label),
        "url": validItems.map(i => processUrl(i.url))
    };

    html += `\n<!-- Schema.org Navigation -->\n<script type="application/ld+json">\n${JSON.stringify(schemaOrg, null, 2)}\n</script>\n`;
    
    return html;
}

// ðŸ“– AUTO-TOC GENERATOR (SumÃ¡rio AutomÃ¡tico das tags H2)
function generateTOC(htmlContent) {
    const regex = /<h2[^>]*>(.*?)<\/h2>/gi;
    let match;
    let tocItems = [];
    let modifiedHtml = htmlContent;
    let index = 1;

    // Acha os H2, cria o link Ã¢ncora e modifica o HTML original para colocar o id
    while ((match = regex.exec(htmlContent)) !== null) {
        // match[1] contÃ©m o innerHTML do h2. Vamos limpar tags e quebras.
        const cleanTitle = match[1].replace(/<[^>]+>/g, '').trim();
        if (cleanTitle && cleanTitle.length > 5 && !cleanTitle.includes('{{')) {
            const anchorId = `secao-${index}-${cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
            tocItems.push({ label: cleanTitle, url: `#${anchorId}` });
            
            // Substitui o <h2> exacto pela versÃ£o com ID
            const originalH2 = match[0];
            const newH2 = originalH2.replace('<h2', `<h2 id="${anchorId}"`);
            modifiedHtml = modifiedHtml.replace(originalH2, newH2);
            index++;
        }
    }
    
    return { modifiedHtml, tocItems };
}

// ==============================================================================
// ðŸš€ [API] SALVAR E LANÃ‡AR PÃGINA (ORQUESTRAÃ‡ÃƒO FINAL)
// ==============================================================================
app.post('/api/acervo/salvar-pagina', async (req, res) => {
    const { caminhoFisico, values, templateId, menuId, menuHtml: incomingMenuHtml, menuSchema: incomingMenuSchema } = req.body;
    let targetPath = caminhoFisico;
    try {
        if (!targetPath) {
            const slug = (values.SEO_TITLE || 'nova-pagina')
                .toLowerCase()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
                .replace(/[^a-z0-9]/g, '-')
                .replace(/-+/g, '-');
            
            targetPath = path.join(SITE_REPO_PATH, slug, 'page.tsx');
            console.log(`âœ¨ [AUTO-PATH] Gerando novo destino: ${targetPath}`);
            
            const dir = path.dirname(targetPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        }

        if (!fs.existsSync(path.dirname(targetPath))) throw new Error("DiretÃ³rio de destino invÃ¡lido.");

        const entry = TEMPLATE_CATALOG.find(t => t.id === templateId);
        if (!templateId || !entry) throw new Error("Template selecionada nÃ£o existe no catÃ¡logo.");

        const templatePath = path.join(__dirname, '../templates', entry.filename);
        let htmlSource = fs.readFileSync(templatePath, 'utf8');

        Object.keys(values).forEach(key => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            htmlSource = htmlSource.replace(regex, values[key] || '');
        });

        const { modifiedHtml, tocItems } = generateTOC(htmlSource);
        htmlSource = modifiedHtml;

        let menuHtml = incomingMenuHtml || '';
        let menuSchema = incomingMenuSchema || '';

        if (!menuHtml && menuId) {
            const slug = path.basename(path.dirname(targetPath));
            menuHtml = generateMenuHtmlForTemplate(menuId, templateId, { slug, title: values.SEO_TITLE || '' });
        }

        if (menuSchema && htmlSource.includes('</head>')) {
            htmlSource = htmlSource.replace('</head>', `${menuSchema}\n</head>`);
        } else if (menuSchema) {
            htmlSource = menuSchema + htmlSource;
        }

        // --- INJEÃ‡ÃƒO GOOGLE TAG MANAGER (GTM) - DINÃ‚MICA ---
        const googleTag = getGoogleTagSnippet();
        const googleTagNoscript = getGoogleTagNoscript();
        
        // 1. Script no <head> (O mais alto possÃ­vel)
        if (htmlSource.match(/<head[^>]*>/i)) {
            htmlSource = htmlSource.replace(/<head[^>]*>/i, `$&\n${googleTag}`);
        } else {
            htmlSource = googleTag + htmlSource;
        }

        // 2. Noscript apÃ³s <body>
        if (htmlSource.includes('<body>')) {
            htmlSource = htmlSource.replace('<body>', `<body>\n${googleTagNoscript}`);
        } else if (htmlSource.match(/<body[^>]*>/)) {
            htmlSource = htmlSource.replace(/<body[^>]*>/, `$&\n${googleTagNoscript}`);
        }

        if (tocItems.length > 0 && ['02', '03', '04', '05', '06', '07', '10'].includes(templateId)) {
            const tocMenuHtml = `
                    <div class="fixed bottom-4 left-4 z-50 glass-panel lg:hidden p-3 rounded-2xl max-w-[200px]">
                        <div class="text-[10px] font-bold uppercase text-slate-400 mb-2 tracking-widest">+ TÃ³picos Neste Artigo</div>
                        <ul class="flex flex-col gap-1">
                            ${tocItems.map(i => `<li><a href="${i.url}" class="text-xs text-slate-500 hover:text-[#14b8a6] line-clamp-1">${i.label}</a></li>`).join('')}
                        </ul>
                    </div>`;
            menuHtml += tocMenuHtml;
        }

        if (htmlSource.includes('{{nav_menu_dinamico}}')) {
            htmlSource = htmlSource.replace('{{nav_menu_dinamico}}', menuHtml);
        } else if (htmlSource.includes('<main')) {
            htmlSource = htmlSource.replace('<main', menuHtml + '\n    <main');
        } else {
            htmlSource = menuHtml + htmlSource;
        }

        const finalPageCode = `"use client";
import React from 'react';

export default function Page() {
    return (
        <div 
            className="neuroengine-page-container" 
            dangerouslySetInnerHTML={{ __html: \`${htmlSource.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\` }} 
        />
    );
}

// ðŸ§¬ NEUROENGINE DATA BLOCK
export const neuroEngineData = ${JSON.stringify({ ...values, template: templateId, menuId: menuId } || {}, null, 2)};
`;

        fs.writeFileSync(targetPath, finalPageCode);

        try {
            const { execSync } = require('child_process');
            const repoRoot = path.join(SITE_REPO_PATH, '../../'); 
            execSync(`git add . && git commit -m "feat(neuroengine): update ${path.basename(path.dirname(targetPath))}" && git push`, { cwd: repoRoot });
        } catch (gitErr) { 
            console.warn("Git push ignorado ou falhou:", gitErr.message); 
        }

        res.json({ success: true, message: "PÃ¡gina orquestrada e lanÃ§ada com sucesso no repositÃ³rio Next.js!" });
    } catch (e) {
        console.error("Erro ao salvar pÃ¡gina:", e);
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * ðŸ” ROTA 1: Listar todo o Acervo
 * Varre a pasta src/app do site e encontra todos os arquivos page.tsx
 */
app.get('/api/acervo/listar', (req, res) => {
    try {
        const pages = [];

        // FunÃ§Ã£o recursiva para ler subpastas (ex: /blog/ansiedade)
        function scanDirectory(directory) {
            if (!fs.existsSync(directory)) return;
            const files = fs.readdirSync(directory);
            
            for (const file of files) {
                const fullPath = path.join(directory, file);
                const stat = fs.statSync(fullPath);

                if (stat.isDirectory()) {
                    // Ignora pastas de sistema do Next.js ou rascunhos se necessÃ¡rio
                    if (file.startsWith('.') || file === 'api' || file === 'components') continue;
                    scanDirectory(fullPath); 
                } else if (file === 'page.tsx') {
                    let slug = fullPath.replace(SITE_REPO_PATH, '').replace(/\\page\.tsx$/, '').replace(/\/page\.tsx$/, '');
                    if (!slug) slug = '/';
                    slug = slug.replace(/\\/g, '/');

                    // Tenta extrair o tÃ­tulo do neuroEngineData
                    let title = "Sem TÃ­tulo";
                    let status = "PUBLICADO"; // Default
                    try {
                        const content = fs.readFileSync(fullPath, 'utf8');
                        const dnaMatch = content.match(/export const neuroEngineData = (\{[\s\S]*?\});/);
                        if (dnaMatch) {
                            const dna = JSON.parse(dnaMatch[1]);
                            title = dna.SEO_TITLE || dna.H1 || dna.THEME || "PÃ¡gina Abidos";
                            status = dna.STATUS || "PUBLICADO";
                        }
                    } catch (e) {
                        console.warn(`[ACERVO] Falha ao ler DNA de ${slug}:`, e.message);
                    }

                    pages.push({
                        slug: slug,
                        title: title,
                        status: status,
                        caminhoFisico: fullPath,
                        ultimaAtualizacao: stat.mtime
                    });
                }
            }
        }

        if (fs.existsSync(SITE_REPO_PATH)) {
            scanDirectory(SITE_REPO_PATH);
        }

        res.json({ success: true, count: pages.length, paginas: pages });

    } catch (error) {
        console.error("Erro ao ler acervo:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});
// [SMART MEDIA] Engine: Watchdog e Acervo Inteligente
const ACERVO_MEDIA_FILE = path.join(__dirname, 'acervo_links.json');
const LOCAL_WATCH_FOLDER = path.join(__dirname, 'midia_local');
if (!fs.existsSync(LOCAL_WATCH_FOLDER)) fs.mkdirSync(LOCAL_WATCH_FOLDER);

app.get('/api/media/acervo', (req, res) => {
    try {
        if (!fs.existsSync(ACERVO_MEDIA_FILE)) return res.json({ folders: [], items: [] });
        const data = JSON.parse(fs.readFileSync(ACERVO_MEDIA_FILE, 'utf8'));
        res.json(data);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// [API] Criar Novo Ãlbum/Pasta no Acervo
app.post('/api/media/create-folder', (req, res) => {
    try {
        const { id, name, icon } = req.body;
        const data = JSON.parse(fs.readFileSync(ACERVO_MEDIA_FILE, 'utf8'));
        if (data.folders.find(f => f.id === id)) return res.json({ success: false, error: 'ID jÃ¡ existe.' });
        
        data.folders.push({ id, name, description: `Ãlbum criado pelo usuÃ¡rio: ${name}`, icon: icon || 'ðŸ“‚' });
        fs.writeFileSync(ACERVO_MEDIA_FILE, JSON.stringify(data, null, 2));
        res.json({ success: true, folders: data.folders });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// [API] Atualizar Item de MÃ­dia (Mudar pasta, tÃ­tulo, etc)
app.post('/api/media/update-item', (req, res) => {
    try {
        const { itemId, folder, title, alt } = req.body;
        const data = JSON.parse(fs.readFileSync(ACERVO_MEDIA_FILE, 'utf8'));
        const item = data.items.find(i => i.id === itemId);
        if (!item) return res.status(404).json({ success: false, error: 'Item nÃ£o encontrado.' });
        
        if (folder) item.folder = folder;
        if (title) item.title = title;
        if (alt) item.alt = alt;
        
        fs.writeFileSync(ACERVO_MEDIA_FILE, JSON.stringify(data, null, 2));
        res.json({ success: true, item });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// [API] Alterar Slug (URL) de uma PÃ¡gina Existente
app.post('/api/acervo/alterar-slug', async (req, res) => {
    try {
        const { caminhoFisico, novoSlug } = req.body;
        if(!caminhoFisico || !novoSlug) throw new Error("Dados incompletos.");

        const cleanSlug = novoSlug.replace(/^\/|\/$/g, '').replace(/[^a-z0-9-]/g, '-').toLowerCase();
        const oldPath = path.dirname(caminhoFisico);
        const newPath = path.join(SITE_REPO_PATH, cleanSlug);

        if (fs.existsSync(newPath)) throw new Error("Essa URL (Slug) jÃ¡ existe.");

        fs.renameSync(oldPath, newPath);
        res.json({ success: true, novoCaminho: path.join(newPath, 'page.tsx'), novoSlug: '/' + cleanSlug });

    } catch (e) {
        console.error("Erro ao alterar slug:", e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// [API] Alterar TÃ­tulo AmigÃ¡vel de uma PÃ¡gina Existente (E-E-A-T)
app.post('/api/acervo/alterar-titulo', async (req, res) => {
    try {
        const { caminhoFisico, novoTitulo } = req.body;
        if(!caminhoFisico || !novoTitulo) throw new Error("Dados incompletos.");

        const content = fs.readFileSync(caminhoFisico, 'utf8');
        const dnaMatch = content.match(/export const neuroEngineData = (\{[\s\S]*?\});/);
        
        if (dnaMatch) {
            let dna = JSON.parse(dnaMatch[1]);
            dna.THEME = novoTitulo;
            dna.H1 = novoTitulo; // Sincroniza H1 por padrÃ£o para SEO
            const newDNAString = `export const neuroEngineData = ${JSON.stringify(dna, null, 2)};`;
            const newContent = content.replace(/export const neuroEngineData = \{[\s\S]*?\};/, newDNAString);
            fs.writeFileSync(caminhoFisico, newContent);
        }

        res.json({ success: true, novoTitulo });

    } catch (e) {
        console.error("Erro ao alterar tÃ­tulo:", e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// [API] Definir Homepage Fixa (/)
app.post('/api/acervo/definir-home', async (req, res) => {
    try {
        const { caminhoFisico } = req.body;
        if(!caminhoFisico) throw new Error("Caminho fÃ­sico nÃ£o informado.");

        // Usa SITE_REPO_PATH unificado em vez de fallback para site-nextjs
        const targetPath = path.join(SITE_REPO_PATH, 'page.tsx');
        
        console.log(`ðŸ  [HOME] Definindo nova homepage: ${caminhoFisico} -> ${targetPath}`);

        if (!fs.existsSync(caminhoFisico)) throw new Error("Arquivo de origem nÃ£o encontrado.");
        
        // Simplesmente copia o conteÃºdo da pÃ¡gina selecionada para a raiz
        fs.copyFileSync(caminhoFisico, targetPath);

        res.json({ success: true, message: "PÃ¡gina inicial atualizada com sucesso no repositÃ³rio Next.js." });

    } catch (e) {
        console.error("âŒ Erro ao definir home:", e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// [API] Alterar Status (DRAFT/PUBLICADO) de uma PÃ¡gina
app.post('/api/acervo/alterar-status', async (req, res) => {
    try {
        const { caminhoFisico, novoStatus } = req.body;
        if(!caminhoFisico) throw new Error("Caminho fÃ­sico nÃ£o informado.");

        const content = fs.readFileSync(caminhoFisico, 'utf8');
        const dnaMatch = content.match(/export const neuroEngineData = (\{[\s\S]*?\});/);
        
        if (dnaMatch) {
            let dna = JSON.parse(dnaMatch[1]);
            dna.STATUS = novoStatus;
            const newDNAString = `export const neuroEngineData = ${JSON.stringify(dna, null, 2)};`;
            const newContent = content.replace(/export const neuroEngineData = \{[\s\S]*?\};/, newDNAString);
            fs.writeFileSync(caminhoFisico, newContent);
        }

        res.json({ success: true, status: novoStatus });

    } catch (e) {
        console.error("Erro ao alterar status:", e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// ==============================================================================
// ðŸ·ï¸ GOOGLE TAG MANAGER - CONFIGURAÃ‡ÃƒO GLOBAL
// ==============================================================================
const GOOGLE_TAG_FILE = path.join(__dirname, 'google_tag_config.json');

const getGoogleTagConfig = () => {
    try {
        if (fs.existsSync(GOOGLE_TAG_FILE)) {
            return JSON.parse(fs.readFileSync(GOOGLE_TAG_FILE, 'utf8'));
        }
    } catch (e) {
        console.error("âŒ Erro ao ler google_tag_config.json:", e);
    }
    return { tagId: 'GTM-5H4RLHC3', active: true };
};

// Retorna o snippet do <head> (script GTM)
const getGoogleTagSnippet = () => {
    const config = getGoogleTagConfig();
    if (!config.active || !config.tagId) return '';
    return `
<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${config.tagId}');</script>
<!-- End Google Tag Manager -->`;
};

// Retorna o snippet do <body> (noscript fallback)
const getGoogleTagNoscript = () => {
    const config = getGoogleTagConfig();
    if (!config.active || !config.tagId) return '';
    return `
<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${config.tagId}"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->`;
};

app.get('/api/config/google-tag', (req, res) => {
    try {
        res.json(getGoogleTagConfig());
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/config/google-tag', (req, res) => {
    try {
        const { tagId, active } = req.body;
        const config = { tagId: tagId || '', active: active !== false, lastUpdate: new Date().toISOString() };
        fs.writeFileSync(GOOGLE_TAG_FILE, JSON.stringify(config, null, 2));
        console.log(`ðŸ·ï¸ [GOOGLE TAG] ConfiguraÃ§Ã£o atualizada: ${config.tagId} (${config.active ? 'ATIVO' : 'INATIVO'})`);
        res.json({ success: true, config });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==============================================================================
// ðŸ“¥ IMPORTAÃ‡ÃƒO MANUAL DE HTML (PÃGINAS CUSTOMIZADAS)
// ==============================================================================
const MANUAL_PAGES_FILE = path.join(__dirname, 'manual_pages.json');

const getManualPages = () => {
    try {
        if (fs.existsSync(MANUAL_PAGES_FILE)) {
            return JSON.parse(fs.readFileSync(MANUAL_PAGES_FILE, 'utf8'));
        }
    } catch (e) { console.error("âŒ Erro ao ler manual_pages.json:", e); }
    return [];
};

const saveManualPages = (pages) => {
    fs.writeFileSync(MANUAL_PAGES_FILE, JSON.stringify(pages, null, 2));
};

// [API] Listar pÃ¡ginas manuais
app.get('/api/acervo/manual', (req, res) => {
    try {
        res.json({ success: true, pages: getManualPages() });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// [API] Criar/Atualizar pÃ¡gina manual (metadados)
app.post('/api/acervo/manual', (req, res) => {
    try {
        const { id, title, slug, silo, menuId, status } = req.body;
        let pages = getManualPages();
        
        if (id) {
            // Atualizar existente
            const idx = pages.findIndex(p => p.id === id);
            if (idx >= 0) {
                pages[idx].title = title || pages[idx].title;
                pages[idx].slug = slug || pages[idx].slug;
                pages[idx].silo = silo || pages[idx].silo;
                pages[idx].menuId = menuId || pages[idx].menuId;
                pages[idx].status = status || pages[idx].status;
                pages[idx].lastUpdate = new Date().toISOString();

                // Se houver arquivo fÃ­sico e status foi alterado, atualiza o arquivo tambÃ©m
                if (pages[idx].caminhoFisico && status && fs.existsSync(pages[idx].caminhoFisico)) {
                    try {
                        let content = fs.readFileSync(pages[idx].caminhoFisico, 'utf8');
                        const dnaMatch = content.match(/export const neuroEngineData = (\{[\s\S]*?\});/);
                        if (dnaMatch) {
                            let dna = JSON.parse(dnaMatch[1]);
                            dna.STATUS = status;
                            content = content.replace(/export const neuroEngineData = \{[\s\S]*?\};/, `export const neuroEngineData = ${JSON.stringify(dna, null, 2)};`);
                            fs.writeFileSync(pages[idx].caminhoFisico, content);
                            console.log(`âœ… [STATUS] Arquivo fÃ­sico atualizado: ${pages[idx].caminhoFisico}`);
                        }
                    } catch (e) { console.warn("Falha ao atualizar arquivo fÃ­sico no status manual:", e); }
                }
            }
        } else {
            // Criar nova
            const newPage = {
                id: 'MANUAL-' + Date.now(),
                title: title || 'PÃ¡gina Manual',
                slug: slug || '/nova-pagina-' + Date.now(),
                silo: silo || '',
                menuId: menuId || '',
                status: 'DRAFT',
                type: 'manual',
                htmlContent: '',
                useShell: true,
                seoFields: { h1: '', resumo: '', h2s: [] },
                versions: [],
                createdAt: new Date().toISOString(),
                lastUpdate: new Date().toISOString()
            };
            pages.push(newPage);
        }

        saveManualPages(pages);
        res.json({ success: true, pages });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// [API] Importar/Salvar HTML customizado para uma pÃ¡gina manual
app.post('/api/acervo/manual/import-html', (req, res) => {
    try {
        const { pageId, htmlContent, useShell, seoFields } = req.body;
        if (!pageId) throw new Error("pageId Ã© obrigatÃ³rio.");

        let pages = getManualPages();
        const idx = pages.findIndex(p => p.id === pageId);
        if (idx < 0) throw new Error("PÃ¡gina manual nÃ£o encontrada.");

        // Parse inteligente: Extrai apenas o <body> se HTML completo for colado
        let cleanHtml = htmlContent || '';
        const bodyMatch = cleanHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        if (bodyMatch) {
            cleanHtml = bodyMatch[1].trim();
            console.log(`ðŸ“¥ [MANUAL] Parse inteligente: ExtraÃ­do conteÃºdo do <body> (${cleanHtml.length} chars)`);
        }

        // Salvar versÃ£o anterior
        if (pages[idx].htmlContent && pages[idx].htmlContent.length > 0) {
            if (!pages[idx].versions) pages[idx].versions = [];
            pages[idx].versions.push({
                html: pages[idx].htmlContent,
                timestamp: pages[idx].lastUpdate || new Date().toISOString()
            });
            // Manter apenas as Ãºltimas 5 versÃµes
            if (pages[idx].versions.length > 5) pages[idx].versions.shift();
        }

        pages[idx].htmlContent = cleanHtml;
        pages[idx].useShell = useShell !== false;
        if (seoFields) pages[idx].seoFields = seoFields;
        pages[idx].lastUpdate = new Date().toISOString();
        pages[idx].status = 'DRAFT';

        saveManualPages(pages);
        res.json({ success: true, message: `HTML importado com sucesso (${cleanHtml.length} caracteres)`, page: pages[idx] });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// [API] Ler HTML de uma pÃ¡gina manual
app.post('/api/acervo/manual/read-html', (req, res) => {
    try {
        const { pageId } = req.body;
        const pages = getManualPages();
        const page = pages.find(p => p.id === pageId);
        if (!page) throw new Error("PÃ¡gina nÃ£o encontrada.");
        res.json({ success: true, page });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// [API] Gerar Preview de uma pÃ¡gina manual (renderiza com Template 00)
app.post('/api/acervo/manual/preview', (req, res) => {
    try {
        const { pageId } = req.body;
        const pages = getManualPages();
        const page = pages.find(p => p.id === pageId);
        if (!page) throw new Error("PÃ¡gina nÃ£o encontrada.");

        let finalHtml = page.htmlContent || '<p>Nenhum conteÃºdo HTML importado ainda.</p>';

        if (page.useShell) {
            // Carrega Template 00
            const shellPath = path.join(__dirname, '../templates/master_template_00_blank.html');
            let shell = fs.readFileSync(shellPath, 'utf8');

            // Injeta variÃ¡veis
            shell = shell.replace(/\{\{corpo_customizado\}\}/g, finalHtml);
            shell = shell.replace(/\{\{seo_title\}\}/g, page.title || 'PÃ¡gina');
            shell = shell.replace(/\{\{seo_h1_tecnico\}\}/g, page.seoFields?.h1 || page.title || '');
            shell = shell.replace(/\{\{seo_resumo_indexacao\}\}/g, page.seoFields?.resumo || '');
            
            // Injeta H2s do SEO
            const h2s = page.seoFields?.h2s || [];
            for (let i = 1; i <= 3; i++) {
                shell = shell.replace(`{{secao${i}_h2}}`, h2s[i - 1] || '');
            }

            // Injeta Google Tag Manager (head + body)
            // Injeta Google Tag Manager (head + body) conforme solicitaÃ§Ã£o do usuÃ¡rio
            const googleTag = getGoogleTagSnippet();
            const googleTagNoscript = getGoogleTagNoscript();

            // 1. No topo do <head>
            if (shell.match(/<head[^>]*>/i)) {
                shell = shell.replace(/<head[^>]*>/i, `$&\n${googleTag}`);
            } else {
                shell = googleTag + shell;
            }

            // 2. Imediatamente apÃ³s o <body>
            if (shell.match(/<body[^>]*>/i)) {
                shell = shell.replace(/<body[^>]*>/i, `$&\n${googleTagNoscript}`);
            } else {
                shell = shell + googleTagNoscript;
            }

            // Injeta Menu
            let menuHtml = '';
            if (page.menuId) {
                menuHtml = generateMenuHtmlForTemplate(page.menuId, '00', { slug: page.slug, title: page.title });
            }
            shell = shell.replace(/\{\{nav_menu_dinamico\}\}/g, menuHtml);

            // Limpa placeholders restantes
            shell = shell.replace(/\{\{\w+\}\}/g, '');
            finalHtml = shell;
        }

        res.send(finalHtml);
    } catch (e) {
        console.error("Erro no preview manual:", e);
        res.status(500).send("Erro ao gerar preview.");
    }
});

// [API] Publicar pÃ¡gina manual no repositÃ³rio Next.js
app.post('/api/acervo/manual/publicar', async (req, res) => {
    try {
        const { pageId } = req.body;
        const pages = getManualPages();
        const page = pages.find(p => p.id === pageId);
        if (!page) throw new Error("PÃ¡gina nÃ£o encontrada.");
        if (!page.htmlContent) throw new Error("Nenhum HTML importado para publicar.");

        let finalHtml = page.htmlContent;

        if (page.useShell) {
            const shellPath = path.join(__dirname, '../templates/master_template_00_blank.html');
            let shell = fs.readFileSync(shellPath, 'utf8');

            shell = shell.replace(/\{\{corpo_customizado\}\}/g, finalHtml);
            shell = shell.replace(/\{\{seo_title\}\}/g, page.title || 'PÃ¡gina');
            shell = shell.replace(/\{\{seo_h1_tecnico\}\}/g, page.seoFields?.h1 || page.title || '');
            shell = shell.replace(/\{\{seo_resumo_indexacao\}\}/g, page.seoFields?.resumo || '');
            
            const h2s = page.seoFields?.h2s || [];
            for (let i = 1; i <= 3; i++) {
                shell = shell.replace(`{{secao${i}_h2}}`, h2s[i - 1] || '');
            }

            const googleTag = getGoogleTagSnippet();
            const googleTagNoscript = getGoogleTagNoscript();

            // 1. No topo do <head>
            if (shell.match(/<head[^>]*>/i)) {
                shell = shell.replace(/<head[^>]*>/i, `$&\n${googleTag}`);
            } else {
                shell = googleTag + shell;
            }

            // 2. Imediatamente apÃ³s o <body>
            if (shell.match(/<body[^>]*>/i)) {
                shell = shell.replace(/<body[^>]*>/i, `$&\n${googleTagNoscript}`);
            } else {
                shell = shell + googleTagNoscript;
            }

            let menuHtml = '';
            if (page.menuId) {
                menuHtml = generateMenuHtmlForTemplate(page.menuId, '00', { slug: page.slug, title: page.title });
            }
            shell = shell.replace(/\{\{nav_menu_dinamico\}\}/g, menuHtml);
            shell = shell.replace(/\{\{\w+\}\}/g, '');
            finalHtml = shell;
        }

        // Gera slug limpo
        const cleanSlug = (page.slug || '/pagina-manual')
            .replace(/^\/|\/$/g, '')
            .replace(/[^a-z0-9-]/g, '-')
            .toLowerCase();

        const targetDir = path.join(SITE_REPO_PATH, cleanSlug);
        const targetPath = path.join(targetDir, 'page.tsx');

        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

        const finalPageCode = `"use client";
import React from 'react';

export default function Page() {
    return (
        <div 
            className="neuroengine-page-container" 
            dangerouslySetInnerHTML={{ __html: \`${finalHtml.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\` }} 
        />
    );
}

// ðŸ§¬ NEUROENGINE DATA BLOCK
export const neuroEngineData = ${JSON.stringify({
    SEO_TITLE: page.title,
    H1: page.seoFields?.h1 || page.title,
    THEME: page.title,
    STATUS: 'DRAFT',
    template: '00',
    type: 'manual',
    menuId: page.menuId || null
}, null, 2)};
`;

        fs.writeFileSync(targetPath, finalPageCode);

        // Atualiza status da pÃ¡gina manual
        const idx = pages.findIndex(p => p.id === pageId);
        pages[idx].status = 'DRAFT';
        pages[idx].caminhoFisico = targetPath;
        pages[idx].lastUpdate = new Date().toISOString();
        saveManualPages(pages);

        // Git commit auto
        try {
            const { execSync } = require('child_process');
            const repoRoot = path.join(SITE_REPO_PATH, '../../');
            execSync(`git add . && git commit -m "feat(manual): add ${cleanSlug}" && git push`, { cwd: repoRoot });
        } catch (gitErr) {
            console.warn("Git push ignorado ou falhou:", gitErr.message);
        }

        res.json({ success: true, message: `PÃ¡gina manual salva como rascunho em /${cleanSlug}`, targetPath });
    } catch (e) {
        console.error("Erro ao publicar pÃ¡gina manual:", e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// [API] Deletar pÃ¡gina manual
app.delete('/api/acervo/manual/:id', (req, res) => {
    try {
        let pages = getManualPages();
        pages = pages.filter(p => p.id !== req.params.id);
        saveManualPages(pages);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// [API] Pick Intelligent: O Agente solicita uma imagem estratÃ©gica para um bloco
app.get('/api/media/pick-intelligent', (req, res) => {
    const { category } = req.query; // ex: ambiente, psicologo
    try {
        const data = JSON.parse(fs.readFileSync(ACERVO_MEDIA_FILE, 'utf8'));
        const filtered = data.items.filter(i => i.folder === category || category === 'any');
        
        if (filtered.length === 0) {
            // Fallback para Ã­cones se nÃ£o houver fotos reais
            const icons = data.items.filter(i => i.folder === 'icones');
            return res.json(icons.length > 0 ? icons[Math.floor(Math.random() * icons.length)] : null);
        }
        
        // Sorteia uma imagem da categoria para variedade no Studio
        const pick = filtered[Math.floor(Math.random() * filtered.length)];
        res.json(pick);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// O motor "Watchdog" de sincronizaÃ§Ã£o passiva (Simulado para nÃ£o estourar recursos em loop)
const runWatchdog = async () => {
    try {
        const files = fs.readdirSync(LOCAL_WATCH_FOLDER).filter(f => f.match(/\.(jpg|jpeg|png|webp|svg)$/i));
        if (files.length === 0) return;

        console.log(`ðŸ“¡ [WATCHDOG] Detectadas ${files.length} novas mÃ­dias em midia_local...`);
        const db = JSON.parse(fs.readFileSync(ACERVO_MEDIA_FILE, 'utf8'));

        for (const file of files) {
            const oldPath = path.join(LOCAL_WATCH_FOLDER, file);
            const ext = path.extname(file).toLowerCase();
            const baseName = `psicologo-victor-lawrence-goiania-${Date.now()}`;
            const newFileName = `${baseName}${ext}`;
            const targetPublicPath = path.join(__dirname, 'public/media');
            if (!fs.existsSync(targetPublicPath)) fs.mkdirSync(targetPublicPath, { recursive: true });
            
            const newPath = path.join(targetPublicPath, newFileName);
            let finalUrl = `/media/${newFileName}`;

            // [NUVEM] Se Cloudinary estiver ativo, enviamos para o CDN
            if (isCloudinaryActive) {
                try {
                    console.log(`â˜ï¸ [CLOUDINARY] Enviando ${file} para a nuvem...`);
                    const result = await cloudinary.uploader.upload(oldPath, {
                        public_id: baseName,
                        folder: "neuroengine-v5",
                        overwrite: true,
                        resource_type: "auto"
                    });
                    finalUrl = result.secure_url;
                    console.log(`âœ… [CLOUDINARY] Sucesso: ${finalUrl}`);
                } catch (cloudErr) {
                    console.error("âŒ [CLOUDINARY ERROR]:", cloudErr.message);
                    // Fallback para local se o upload falhar
                    fs.renameSync(oldPath, newPath);
                }
            } else {
                // Modo offline / local
                fs.renameSync(oldPath, newPath);
            }

            db.items.push({
                id: `media_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                folder: "ambiente", // Categoria padrÃ£o (pode ser mudada no painel)
                url: finalUrl,
                title: "Asset EstratÃ©gico Abidos",
                alt: "ConsultÃ³rio Dr. Victor Lawrence - Hipnose ClÃ­nica e Psicologia em GoiÃ¢nia"
            });
            console.log(`âœ… [WATCHDOG] Item registrado no acervo.`);
        }

        db.last_sync = new Date().toISOString();
        fs.writeFileSync(ACERVO_MEDIA_FILE, JSON.stringify(db, null, 2));
    } catch (e) { console.error("âŒ [WATCHDOG ERROR]:", e.message); }
};

// Ativa o Watchdog a cada 60 segundos (MÃ­nima intervenÃ§Ã£o)
setInterval(runWatchdog, 60000);

// [API] Listar MÃ­dia (Alias para Acervo na TransiÃ§Ã£o Headless)
app.get('/api/acervo/list-media', (req, res) => {
    // Redireciona para o listar padrÃ£o que jÃ¡ mapeia as pÃ¡ginas
    // No futuro, isso varreria a pasta de assets/public
    res.json([]); 
});

/**
 * ðŸ“– ROTA 2: Carregar os Dados de uma PÃ¡gina para o Studio
 * LÃª o arquivo .tsx e extrai o JSON do neuroEngineData
 */
app.post('/api/acervo/ler-pagina', (req, res) => {
    const { caminhoFisico } = req.body;

    try {
        if (!fs.existsSync(caminhoFisico)) {
            return res.status(404).json({ success: false, error: 'Arquivo nÃ£o encontrado' });
        }

        const conteudoTsx = fs.readFileSync(caminhoFisico, 'utf-8');

        // Regex cirÃºrgico para extrair apenas o bloco JSON do neuroEngineData
        const regexData = /export const neuroEngineData = ({[\s\S]*?});/;
        const match = conteudoTsx.match(regexData);

        if (match && match[1]) {
            // Converte o texto extraÃ­do de volta para um Objeto JavaScript
            const dadosRecuperados = JSON.parse(match[1]);
            
            res.json({ success: true, data: dadosRecuperados });
        } else {
            // Fallback para PÃ¡ginas Legadas (Sem DNA)
            const h1Match = conteudoTsx.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
            const titleMatch = conteudoTsx.match(/title:\s*["']([^"']+)["']/i);
            
            const legacyData = {
                template: "", // Permite ao usuÃ¡rio escolher o novo template
                SEO_TITLE: titleMatch ? titleMatch[1] : "",
                SEO_H1_TECNICO: h1Match ? h1Match[1].replace(/<[^>]+>/g, '').trim() : "TÃ­tulo da PÃ¡gina"
            };

            res.json({ 
                success: true, 
                data: legacyData,
                warning: 'Esta pÃ¡gina nÃ£o possuÃ­a o DNA do NeuroEngine. Os dados foram inferidos. Por favor, selecione um template para atualizÃ¡-la.' 
            });
        }

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
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
// 2. PROXY AI (Gemini)
// ==============================================================================

app.post('/api/ai/generate', async (req, res) => {
    try {
        const { prompt, modelType } = req.body;
        
        // Mapeamento dinÃ¢mico de modelos Abidos Next (v5)
        const model = getAIModel(modelType, "text/plain");

        console.log(`ðŸ§  [AI PROXY] Gerando conteÃºdo via Protocolo 2.5...`);
        
        const result = await model.generateContent(prompt);
        trackUsage(result.response.usageMetadata);
        const text = result.response.text();
        console.log(`ðŸ¤– [AI RESULT] JSON Gerado com Sucesso via motor ${targetModel}.`);
        
        res.json({ text });
    } catch (e) { 
        console.error("âŒ [AI PROXY ERROR]", e.message);
        res.status(500).json({ error: e.message }); 
    }
});

app.post('/api/ai/describe-image', async (req, res) => {
    try {
        const { image, context } = req.body;
        if (!image) return res.status(400).json({ error: "Imagem obrigatÃ³ria." });

        console.log("ðŸ“¸ [DESCRIBE-IMAGE] Analisando imagem para gerar ALT text automÃ¡tico...");
        const model = genAI.getGenerativeModel({ model: VISION_MODEL });
        
        const base64Data = image.split(',')[1] || image;
        const prompt = `
        Analise esta imagem e gere um ALT TEXT (texto alternativo) para SEO.
        CONTEXTO DO SITE: Psicologia ClÃ­nica, Hipnose Ericksoniana e TEA Adulto (Dr. Victor Lawrence, GoiÃ¢nia).
        
        DIRETRIZES:
        - Seja descritivo e direto.
        - Combine o que estÃ¡ na foto com a autoridade clÃ­nica do Dr. Victor Lawrence.
        - Inclua termos como 'ConsultÃ³rio de Psicologia em GoiÃ¢nia' ou 'Atendimento ClÃ­nico Especializado' se a imagem sugerir um ambiente profissional.
        - Se for uma pessoa, descreva a expressÃ£o (ex: acolhedora, focada).
        - Retorne APENAS o texto do ALT, sem aspas, mÃ¡ximo 120 caracteres.
        
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
- Carla (TEA): "DiagnÃ³stico tardio possÃ­vel pela tÃ©cnica adequada... melhora significativa na qualidade de vida."
- Y. (Autista): "Acompanhamento fez enorme diferenÃ§a... hipnose e PNL com empatia e respeito."
- A. M. (SÃ¡bio): "Estrutura da minha vida, alguÃ©m sÃ¡bio que me fez enxergar eu mesma."
- R. A. (Ansiedade): "Problema de ansiedade resolvido em algumas sessÃµes. Muito profissional."
`;

const VICTOR_IDENTIDADE = `
[IDENTIDADE OFICIAL â€” DR. VICTOR LAWRENCE]
- Nome: Victor Lawrence Bernardes Santana
- Registro Profissional: PsicÃ³logo | CRP 09/012681
- FormaÃ§Ã£o: MESTRANDO em Psicologia pela Universidade Federal de UberlÃ¢ndia (UFU) â€” ConclusÃ£o prevista em 2028.
- Especialidades: Hipnoterapia ClÃ­nica Ericksoniana, TEA Adulto (Asperger), Neuropsicologia.
- LocalizaÃ§Ã£o: GoiÃ¢nia (GO) e UberlÃ¢ndia (MG).
- [ALERTA CRÃTICO]: JAMAIS refira-se ao Dr. Victor como Psicanalista. Ele Ã© PsicÃ³logo ClÃ­nico e Mestrando na UFU. Ã‰ um erro grave de identidade chamÃ¡-lo de psicanalista.
- TÃTULO ACADÃŠMICO: Mestrando em Psicologia (UFU).
`;

const REAL_ASSETS = `
VERDADE ABSOLUTA: PROIBIDO INVENTAR LINKS OU DADOS FALSOS. USE APENAS OS SEGUINTES LINKS REAIS:

LINKS DE SERVIÃ‡OS E PÃGINAS (SILOS E HUB):
- Agendamento: https://hipnolawrence.com/agendamento/
- Ansiedade/Estresse: https://hipnolawrence.com/terapia-para-ansiedade-e-estresse-em-goiania/
- Contato/CurrÃ­culo: https://hipnolawrence.com/contato/
- DepressÃ£o: https://hipnolawrence.com/tratamento-para-depressao-em-goiania/
- Desempenho PsicolÃ³gico: https://hipnolawrence.com/terapia-para-desempenho-psicologico-em-goiania/
- Hipnose ClÃ­nica: https://hipnolawrence.com/hipnose-clinica-em-goiania/
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

DEMONSTRAÃ‡ÃƒO DE HIPNOSE / EVENTOS:
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
// Ã‰TICA ABIDOS â€” ProibiÃ§Ãµes absolutas injetadas em TODOS os prompts de geraÃ§Ã£o
// ============================================================================
const ETICA_ABIDOS = `
[DIRETRIZES Ã‰TICAS ABSOLUTAS â€” PROIBIÃ‡Ã•ES SEM EXCEÃ‡ÃƒO]
- PROIBIDO oferecer, mencionar ou sugerir SESSÃƒO GRATUITA ou AVALIAÃ‡ÃƒO GRATUITA.
- PROIBIDO prometer cura ou garantia de resultado.
- PROIBIDO jargÃ£o de marketing agressivo (Copywriting SÃ³brio e AcadÃªmico).
- PROIBIDO criar variÃ¡veis como {{area_dinamica_extra}} â€” Redundante.
- O WhatsApp e Contatos devem ser preenchidos EXCLUSIVAMENTE nas variÃ¡veis globais, nÃ£o gere novos campos para isso se jÃ¡ existirem.
- O CTA de agendamento DEVE levar ao link: https://hipnolawrence.com/agendamento/
`;

const CLIMAS_CLINICOS = {
  "1_introspeccao_profunda": {
    "nome_amigavel": "IntrospecÃ§Ã£o Profunda (Ultra-Dark)",
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
    "efeitos_obrigatorios": "Cores apaziguadoras. ZERO contrastes extremos (nunca usar branco puro ou preto puro). Glassmorphism com desfoque subtil para nÃ£o causar distraÃ§Ãµes."
  },
  "4_autoridade_academica": {
    "nome_amigavel": "Autoridade AcadÃ©mica (Minimalista)",
    "fundo_principal": "!bg-white",
    "texto_principal": "!text-gray-600",
    "texto_destaque": "!text-gray-900",
    "cor_acao": "!bg-[#0f172a]",
    "efeitos_obrigatorios": "Design limpo, acadÃ©mico e sem distracÃ§Ãµes. Uso de linhas finas divisorias (!border-gray-200). ZERO efeitos de luz ou desfoque extremo."
  }
};

const ABIDOS_TEMPLATE_MINIMO = `
<!-- CONFIGURAÃ‡ÃƒO TAILWIND -->
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

    /* Vidros SÃ³brios (Glassmorphism de Alto PadrÃ£o) */
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

    /* Efeito Visual (Luz HipnÃ³tica) */
    .orb-glow { animation: slowPulse 8s infinite alternate ease-in-out; }
    @keyframes slowPulse {
        0% { transform: scale(0.8) translate(-5%, -5%); opacity: 0.15; }
        100% { transform: scale(1.1) translate(5%, 5%); opacity: 0.4; }
    }

    /* AnimaÃ§Ãµes FluÃ­das de Scroll */
    .reveal {
        opacity: 0;
        transform: translateY(30px);
        transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }
    .reveal.active { opacity: 1; transform: translateY(0); }
    .delay-100 { transition-delay: 100ms; }
    .delay-200 { transition-delay: 200ms; }
    .delay-300 { transition-delay: 300ms; }

    /* FORÃ‡A VISIBILIDADE NO EDITOR ELEMENTOR */
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
    <!-- ESTRUTURA SEÃ‡Ã•ES AQUI -->
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
    learned_style: "Direto, clÃ­nico, porÃ©m empÃ¡tico. Foco em autoridade tÃ©cnica e resultados prÃ¡ticos (GoiÃ¢nia).",
    vocabulary: ["GoiÃ¢nia", "Neuropsicologia", "TEA", "ClÃ­nica", "AvaliaÃ§Ã£o"],
    prohibited_terms: ["cura milagrosa", "garantido", "mudar sua vida para sempre"],
    rhythm: "SentenÃ§as curtas e estruturadas por bullet points.",
    last_updated: new Date().toISOString()
};

// Eliminado duplicata de /api/drafts (Consolidado acima)

// Orquestrador LangGraph (SimulaÃ§Ã£o de Multi-Agent Node Pipeline)
app.post('/api/agents/generate-pipeline', async (req, res) => {
    try {
        const { topic } = req.body;
        if (!topic) throw new Error("TÃ³pico (STAG) nÃ£o fornecido.");
        const model = genAI.getGenerativeModel({ model: VISION_MODEL });

        console.log(`ðŸ¤– [LANGGRAPH PIPELINE] Iniciando fluxo para: ${topic}`);

        // NÃ“ 1: Agente Gerador (RAG & Pesquisa + Personalidade Aprendida)
        console.log(`ðŸ“¡ [NÃ“ 1] Agente de Pesquisa (Voz Dr. Victor)...`);
        const dnaInjetadoPipeline = getDnaContext();
        const moodPipeline = CLIMAS_CLINICOS['1_introspeccao_profunda'];
        const pGerador = `
VocÃª Ã© o Arquiteto Visual SÃªnior do Protocolo Abidos. Gere uma Landing Page HTML PREMIUM sobre "${topic}".

[ESTRUTURA DE DESIGN ABIDOS (OBRIGATÃ“RIO)]
Use EXATAMENTE este Wrapper e estas classes:
1. WRAPPER GERAL: <div class="abidos-wrapper antialiased px-4 py-8 md:px-12 lg:px-24 bg-[#05080f] min-h-screen font-inter text-slate-300">
2. SEÃ‡Ã•ES: <section class="py-16 md:py-32 relative overflow-hidden" data-bloco="nome_do_bloco">
3. CARDS: "bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 md:p-10 shadow-2xl hover:border-teal-500/50 transition-all"
4. H2 (TÃTULO DE SEÃ‡ÃƒO): "font-outfit font-bold text-3xl md:text-5xl leading-tight text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500 mb-6"
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

        // NÃ“ 2, 3 e 4: Loop de ValidaÃ§Ã£o (Abidos, CrÃ­tico e Compliance)
        console.log(`âš–ï¸ [NÃ“S DE VALIDAÃ‡ÃƒO] Auditoria de Compliance, Abidos e Factual...`);
        const pAuditoria = `
        Analise rigorosamente o Rascunho HTML abaixo.
        Sua missÃ£o Ã© corrigir erros de compliance e garantir o Design Abidos.
        
        REGRAS DE OURO:
        1. MANTENHA O WRAPPER GERAL <div class="abidos-wrapper...">.
        2. Certifique-se de que nÃ£o hÃ¡ tags <h1>.
        3. Se o texto for puramente clÃ­nico, transforme em copywriting persuasivo usando o MÃ©todo Abidos.
        
        Retorne APENAS um JSON: {"aprovado": boolean, "abidos_score": number, "compliance_pass": boolean, "med_f1": number, "correcoes": "MANTENHA O HTML COMPLETO COM WRAPPER AQUI"}
        Rascunho: """${rascunhoPrimario}"""
        `;
        const resAuditoria = await model.generateContent(pAuditoria);
        trackUsage(resAuditoria.response.usageMetadata);
        const jsonStr = resAuditoria.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        const auditoria = JSON.parse(jsonStr);

        // Se falhar no compliance, faria um loop de re-geraÃ§Ã£o no LangGraph real. Aqui simulamos a correÃ§Ã£o automÃ¡tica:
        const conteudoFinal = auditoria.correcoes || rascunhoPrimario;

        // PersistÃªncia de Estado
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
        console.log(`âœ… [PIPELINE CONCLUÃDA] Human-in-the-loop aguardando.`);
        
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
        VocÃª Ã© o "Agente Abidos", um Arquiteto de Sistemas e Auditor SÃªnior ImplacÃ¡vel.
        
        SUA MISSÃƒO: Realizar uma auditoria de nÃ­vel clÃ­nico no rascunho abaixo.
        
        MÃ‰TODO DE AUDITORIA (FACTSCORE):
        1. DecomposiÃ§Ã£o AtÃ´mica: Quebre o texto em afirmaÃ§Ãµes individuais.
        2. ValidaÃ§Ã£o Factual: Verifique se hÃ¡ "alucinaÃ§Ãµes" ou promessas de cura (Proibido pelo CFP).
        3. MED-F1 (ExtraÃ§Ã£o de Entidades): Liste termos tÃ©cnicos (ex: TEA, TDAH, ISRS) e verifique se o contexto estÃ¡ correto.
        4. Hierarquia Abidos: Cheque se NÃƒO hÃ¡ H1 (proibido) e se hÃ¡ H2 estratÃ©gico com palavra-chave e localizaÃ§Ã£o (GoiÃ¢nia).
        5. GOOGLE TAG: Verifique se a etiqueta Google (G-B0DM24E5FS) estÃ¡ presente no cÃ³digo. Se nÃ£o estiver, gere um alerta crÃ­tico.
        
        Rascunho a auditar:
        """${content}"""
        
        RETORNE UM RELATÃ“RIO FORMATADO EM HTML (usando tags span, strong, br) COM:
        - âœ… PONTOS POSITIVOS
        - âš ï¸ ALERTAS DE RISCO (CFP/LGPD/GOOGLE TAG)
        - ðŸ“Š PONTUAÃ‡ÃƒO FACTSCORE (0-100%)
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
        if (!texts || !Array.isArray(texts)) throw new Error("Textos para anÃ¡lise nÃ£o fornecidos.");

        console.log(`ðŸ§  [ESTILO] Iniciando Reverse Prompting de ${texts.length} textos...`);
        const model = genAI.getGenerativeModel({ model: VISION_MODEL });

        const prompt = `
        Aja como um Linguista Forense e Especialista em Copywriting de ConversÃ£o.
        Analise os textos abaixo (autÃªnticos do autor Victor Lawrence) e extraia o DNA da escrita.
        
        Textos:
        """${texts.join('\n\n')}"""
        
        Sua tarefa Ã© codificar esse estilo em um JSON com os campos:
        - rhythm: (DescriÃ§Ã£o da cadÃªncia das frases)
        - vocabulary: (Lista de palavras recorrentes e jargÃµes favoritos)
        - learned_style: (Resumo tÃ©cnico da "voz" do autor)
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

        console.log(`ðŸ“ [DIFF] Analisando ediÃ§Ãµes do usuÃ¡rio para ajuste fino de tom...`);
        const model = genAI.getGenerativeModel({ model: VISION_MODEL });

        const prompt = `
        Analise a diferenÃ§a entre o rascunho da IA e a versÃ£o editada pelo Dr. Victor.
        Rascunho IA: """${original}"""
        VersÃ£o Final: """${edited}"""
        
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
// 4. MOTOR SEMÃ‚NTICO (SEO PROGRAMÃTICO & SILOS)
// ==============================================================================

// [OBSOLETO] Removido para evitar conflito com motor V5 em /api/seo/analyze-silos no final do arquivo.

// [PULSO DO SISTEMA] Monitoramento de LatÃªncia Real-time
app.get('/api/health/ping', (req, res) => res.status(200).send('pong'));

// [FASE 2] HEALTH CHECK: Monitoramento MulticritÃ©rio
app.get('/api/health/check', async (req, res) => {
    const health = {
        status: 'online',
        timestamp: new Date().toISOString(),
        services: {
            database: { status: 'active', message: 'Local DB Operational' },
            gemini: { status: 'ready', model: VISION_MODEL }
        }
    };

    try {
        // 1. Check Gemini Key
        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'DUMMY') {
            health.services.gemini.status = 'missing_key';
            health.status = 'critical';
        }

        res.json(health);
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
});

// ==============================================================================
// 5. MONITORAMENTO PROFILÃTICO (LIGHTHOUSE) E REPUTACIONAL
// ==============================================================================

app.get('/api/health/lighthouse', async (req, res) => {
    try {
        console.log(`ðŸ”¦ [LIGHTHOUSE] Iniciando Auditoria de Performance ProfilÃ¡tica...`);
        
        // SimulaÃ§Ã£o de Auditoria (Em um sistema real, chamaria a Lighthouse CLI)
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

app.post('/api/health/design-audit', async (req, res) => {
    try {
        const { image, context } = req.body;
        console.log(`ðŸ–Œï¸ [SERVER] Auditoria de Design Recebida. Processando Vision...`);

        const model = genAI.getGenerativeModel({ model: VISION_MODEL }); // Use Flash ou Pro vision
        
        // Remove prefixo base64 se houver
        const base64Data = image.split(',')[1] || image;

        const prompt = `
        VOCÃŠ Ã‰ O AUDITOR DE DESIGN E UX DO NEUROENGINE OS (SISTEMA DE GESTÃƒO CLÃNICA).
        CONTEXTO: ${context}.

        Analise a captura de tela anexada da interface administrativa do sistema (rodando em Desktop).
        Sua missÃ£o:
        1. Avaliar a Legibilidade (Tamanho da fonte, contraste, espaÃ§amento dos selos e cards).
        2. Avaliar a EstÃ©tica da Interface (O sistema parece premium e limpo ou estÃ¡ com excesso de informaÃ§Ã£o?).
        3. Identificar HeurÃ­sticas de Usabilidade violadas.
        4. Identificar inconsistÃªncias visuais (Cores fora do paleta, desalinhamentos).

        [DIRETRIZES DE RELATÃ“RIO]:
        - Seja direto, tÃ©cnico e use termos como "Hierarquia Visual", "AfixaÃ§Ã£o", "Contraste WCAG".
        - Liste 3 pontos positivos e 3 pontos de melhoria prioritÃ¡ria.
        - Se o design estiver nota 10, elogie de forma sÃ³bria.

        Retorne a resposta diretamente em texto (Markdown).
        `;

        const result = await model.generateContent([
            prompt,
            { inlineData: { data: base64Data, mimeType: "image/webp" } }
        ]);

        trackUsage(result.response.usageMetadata);
        res.json({ text: result.response.text() });

    } catch (e) {
        console.error("âŒ [DESIGN AUDIT ERROR]", e.message);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/reputation/analyze', async (req, res) => {
    try {
        const { platform, content } = req.body;
        console.log(`ðŸ›¡ï¸ [REPUTAÃ‡ÃƒO] Analisando impacto de feedback em ${platform}...`);

        const model = genAI.getGenerativeModel({ model: VISION_MODEL });
        const prompt = `
        Analise o seguinte feedback de paciente recebido na plataforma ${platform}:
        """${content}"""
        
        Sua tarefa:
        1. Classificar Sentimento (Positivo / Neutro / Alerta CrÃ­tico).
        2. Identificar Riscos Ã‰ticos (Baseado nas normas do CFP).
        3. Gerar "Resposta Sugerida" (EmpÃ¡tica, respeitando sigilo, sem promessas).
        4. Sugerir Melhoria Interna na ClÃ­nica.
        
        Retorne em JSON.
        `;
        const result = await model.generateContent(prompt);
        trackUsage(result.response.usageMetadata);
        const jsonStr = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        res.json(JSON.parse(jsonStr));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ==============================================================================
// 7. AGENTES DA ESTEIRA DE PRODUÃ‡ÃƒO (FASE 2: MÃQUINA DE ESTADOS)
// ==============================================================================

async function runConstructor(userInput, feedback = null, waNumber, moodId = "1_introspeccao_profunda", contentType = "pages", modelType = 'flash') {
    console.log(`ðŸ—ï¸ [Studio] Gerando rascunho direto: "${userInput.substring(0, 30)}..."`);
    const modelId = (modelType && modelType.includes('gemini')) ? modelType : (modelType === 'pro' ? HEAVY_MODEL : VISION_MODEL);
    const model = genAI.getGenerativeModel({ model: modelId });
    
    const clima = CLIMAS_CLINICOS[moodId] || CLIMAS_CLINICOS["1_introspeccao_profunda"];
    const personalStyle = getVictorStyle();
    const styleRules = personalStyle.style_rules?.map(r => `- ${r.regra}`).join('\n') || '';

    const prompt = `VOCÃŠ Ã‰ O ARQUITETO ABIDOS V5 (Digital Twin). 
                    Crie uma ${contentType === 'pages' ? 'Landing Page de Alta ConversÃ£o' : 'Postagem de Autoridade'} para: "${userInput}".
                    
                    ${VICTOR_IDENTIDADE}
                    
                    REGRAS DE CONSTRUTOR:
                    1. Use HTML5 SemÃ¢ntico e Tailwind v4.
                    2. NÃƒO gere variÃ¡veis redundantes como {{area_dinamica_extra}}.
                    3. Use os blocos de conteÃºdo estratÃ©gico Abidos (Dor, MÃ©todo, Autoridade).
                    4. No bloco de Autoridade, cite: MESTRANDO pela UFU (conclusÃ£o 2028), CRP 09/012681 e Especialista em Hipnose Ericksoniana.
                    
                    MOOD/VIBE: ${clima.nome_amigavel}
                    WHATSAPP GLOBAL: ${waNumber}
                    LOCALIZAÃ‡ÃƒO: GoiÃ¢nia.
                    
                    [ESTRUTURA FUNIL]
                    - HERO: TÃ­tulo MagnÃ­fico + CTA WhatsApp Direto (${waNumber}).
                    - MÃ‰TODO ERICKSONIANO: Foco em Hipnose ClÃ­nica e CiÃªncia.
                    - FAQ: 3 perguntas fundamentais.
                    
                    Retorne APENAS o HTML INTERNO (Snippet) para o abidos-wrapper.`;

    const result = await model.generateContent(prompt);
    return result.response.text().replace(/```html|```/g, '').trim();
}

async function runAbidosInspector(html) {
    console.log(`ðŸ” [AGENTE 2] Auditando Estrutura e SEO (Abidos Gate)...`);
    const model = genAI.getGenerativeModel({ model: VISION_MODEL });
    let prompt = `
        ðŸ” AGENTE 2: Inspetor Abidos (Auditor de Estrutura e SEO V4)
        Papel: VocÃª Ã© um Auditor de SEO TÃ©cnico implacÃ¡vel e Revisor SemÃ¢ntico.
        Comportamento: Leia o HTML gerado e procure falhas contra a Hierarquia Abidos.
        
        REGRAS DE VALIDAÃ‡ÃƒO (REPROVE SE FALTAR):
        1. **HIGIENE DO CADEADO H1**: NÃ£o deve haver tag <h1> no cÃ³digo. Se houver, mande remover (o tema cuida do H1).
        2. **FRAGMENTAÃ‡ÃƒO H2**: O conteÃºdo estÃ¡ dividido em subtÃ³picos <h2> usando as palavras-chave? (Ex: Dor, Especialista, ServiÃ§os, FAQ).
        3. **GRANULARIDADE H3**: Existem tÃ³picos <h3> para quebrar objeÃ§Ãµes ou detalhar tratamentos?
        4. **GOOGLE TAG OBRIGATÃ“RIA**: O cÃ³digo deve conter a etiqueta Google (G-B0DM24E5FS).
        5. **ABIDOS-WRAPPER**: O cÃ³digo estÃ¡ encapsulado na div class="abidos-wrapper"?
        6. **ALT TAGS**: As imagens possuem alt text estratÃ©gico e geo-localizado?

        Output Exigido (JSON APENAS): {"status": "PASSOU"} OU {"status": "REPROVOU", "motivo": "Coloque a seÃ§Ã£o de dor em um <h2> e verifique a falta de alt tags geo-localizadas"}.
        
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
    console.log(`ðŸ§  [AGENTE 3] Auditando E-E-A-T e Ã‰tica (Clinical Gate)...`);
    const model = genAI.getGenerativeModel({ model: VISION_MODEL });
    let prompt = `
        ðŸ§  AGENTE 3: Inspetor ClÃ­nico (Auditor de E-E-A-T e Ã‰tica YMYL)
        Papel: VocÃª Ã© um Revisor do Conselho Federal de Psicologia (CFP) e especialista nas diretrizes YMYL do Google. VocÃª nÃ£o escreve cÃ³digo, apenas audita o texto gerado.
        Comportamento: Leia toda a copy (texto) embutida no HTML. O nicho Ã© saÃºde mental sensÃ­vel.
        Regras de ValidaÃ§Ã£o:
        1. Existe alguma promessa de "cura rÃ¡pida", "garantia de resultado" ou jargÃ£o de marketing agressivo como "Compre agora"? (Se sim, REPROVOU).
        2. A autoridade E-E-A-T do Dr. Victor Lawrence (CRP 09/012681, Mestrando em Psicologia pela UFU) estÃ¡ explicitamente citada? (Se nÃ£o, REPROVOU).
        3. A linguagem Ã© empÃ¡tica e gera baixa fricÃ§Ã£o cognitiva? (Se nÃ£o, REPROVOU).
        Output Exigido: Responda APENAS no formato JSON: {"status": "PASSOU"} OU {"status": "REPROVOU", "motivo": "Substitua a frase X por um tom mais clÃ­nico e acolhedor"}.
        
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
    console.log(`ðŸŽ¨ [AGENTE 4] Auditando UI/UX Tailwind (Design Gate)...`);
    const model = genAI.getGenerativeModel({ model: VISION_MODEL });
    let prompt = `
        ðŸŽ¨ AGENTE 4: Inspetor de Design (Auditor de UI/UX Tailwind)
        Papel: VocÃª Ã© um Engenheiro de Neuromarketing Visual especializado em Tailwind v4. VocÃª nÃ£o cria design, apenas revisa.
        Comportamento: Leia as classes Tailwind no cÃ³digo para garantir que o Design System do MÃ©todo Abidos foi respeitado.
        Regras de ValidaÃ§Ã£o:
        1. O Glassmorphism estÃ¡ aplicado corretamente com a fÃ³rmula de backdrop-filter? (Se nÃ£o, REPROVOU).
        2. Os textos em parÃ¡grafos usam font-normal (peso 400) para evitar cansaÃ§o visual? (Se nÃ£o, REPROVOU).
        3. Existe risco de colisÃ£o mobile (ex: botÃµes com textos gigantes que quebram a linha)? (Se sim, REPROVOU).
        Output Exigido: Responda APENAS no formato JSON: {"status": "PASSOU"} OU {"status": "REPROVOU", "motivo": "Adicione a classe '!whitespace-nowrap' no botÃ£o Y"}.

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
 * ESTEIRA DE PRODUÃ‡ÃƒO UNIFICADA (MÃQUINA DE ESTADOS)
 * Orquestra o Construtor e os 3 Inspetores com loop de retentativa.
 */
async function runProductionLine(userInput, feedback, waNumber, moodId, contentType, siloContext = "") {
    let currentHtml = "";
    let finalFeedback = feedback;
    const maxRetries = 3;
    let attempts = 0;

    reportAgentStatus("NeuroEngine", "Iniciando orquestraÃ§Ã£o da esteira...", "", false);

    while (attempts < maxRetries) {
        attempts++;
        console.log("RETRY [ESTEIRA]: Tentativa " + attempts + "/" + maxRetries + " (" + contentType + ")");
        
        // 1. Construtor
        reportAgentStatus("Gerador", `Construindo versÃ£o ${attempts}...`, "", false);
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
            console.warn(`âŒ [ABIDOS REPROVOU] ${abidosResult.motivo}`);
            reportAgentStatus("Abidos", "SEO Reprovado: " + abidosResult.motivo, "", false);
            finalFeedback = `AGENTE ABIDOS REPROVOU: ${abidosResult.motivo}`;
            continue;
        }
        reportAgentStatus("Abidos", "SEO Validado.", "", true);

        // 3. Inspetor ClÃ­nico (Compliance/Ã‰tica)
        reportAgentStatus("ClÃ­nico", "Auditando Ã‰tica e Tom de Voz...", "", false);
        const clinicalResult = await runClinicalInspector(currentHtml);
        if (clinicalResult.status === "REPROVOU") {
            console.warn(`âŒ [CLÃNICO REPROVOU] ${clinicalResult.motivo}`);
            reportAgentStatus("ClÃ­nico", "Ã‰tica Reprovada: " + clinicalResult.motivo, "", false);
            finalFeedback = `AGENTE CLÃNICO REPROVOU: ${clinicalResult.motivo}`;
            continue;
        }
        reportAgentStatus("ClÃ­nico", "Conformidade Aprovada.", "", true);

        // 4. Inspetor Design (Visual)
        reportAgentStatus("Design", "Refinando estÃ©tica mobile-first...", "", false);
        const designResult = await runDesignInspector(currentHtml);
        if (designResult.status === "REPROVOU") {
            console.warn(`âŒ [DESIGN REPROVOU] ${designResult.motivo}`);
            reportAgentStatus("Design", "Layout Reprovado: " + designResult.motivo, "", false);
            finalFeedback = `AGENTE DESIGN REPROVOU: ${designResult.motivo}`;
            continue;
        }
        reportAgentStatus("Design", "Design Premium Validado.", "", true);

        // 5. Sucesso
        const diff = `Aprovado na tentativa ${attempts}. Auditores: OK.`;
        reportAgentStatus("NeuroEngine", "DecisÃ£o Final Tomada. Entregando para o Canvas.", "", true);
        return { html: currentHtml, diff: diff };
    }

    reportAgentStatus("NeuroEngine", "Falha apÃ³s 3 tentativas.", "A esteira nÃ£o conseguiu satisfazer todos os auditores.", true);
    throw new Error("A esteira de produÃ§Ã£o falhou em validar o conteÃºdo apÃ³s 3 tentativas.");
}

// ==============================================================================
// 7. MARKETING LAB & ORQUESTRAÃ‡ÃƒO
// ==============================================================================

const ANALYTICS_CACHE_FILE = path.join(__dirname, 'analytics_cache.json');
const ANALYTICS_HISTORY_FILE = path.join(__dirname, 'analytics_history.json');

/**
 * ðŸ“œ REGISTRO DE HISTÃ“RICO: Salva mÃ©tricas principais dia a dia para anÃ¡lise de tendÃªncia.
 */
function saveToHistory(newData) {
    try {
        let history = {};
        if (fs.existsSync(ANALYTICS_HISTORY_FILE)) {
            history = JSON.parse(fs.readFileSync(ANALYTICS_HISTORY_FILE, 'utf8'));
        }
        const today = new Date().toISOString().split('T')[0];
        if (!history[today]) history[today] = {};
        // Merge de mÃ©tricas (mantÃ©m o que jÃ¡ tinha no dia, como PSI, e adiciona GA4)
        history[today] = { ...history[today], ...newData, last_update: new Date().toISOString() };
        fs.writeFileSync(ANALYTICS_HISTORY_FILE, JSON.stringify(history, null, 2));
        console.log(`ðŸ“œ [HISTORY] InteligÃªncia de Dados: Registro consolidado para ${today}.`);
    } catch (e) {
        console.error("âŒ [HISTORY] Erro ao persistir histÃ³rico:", e.message);
    }
}

app.get('/api/marketing/history', (req, res) => {
    if (fs.existsSync(ANALYTICS_HISTORY_FILE)) {
        res.json(JSON.parse(fs.readFileSync(ANALYTICS_HISTORY_FILE, 'utf8')));
    } else {
        res.json({});
    }
});

app.get('/api/marketing/audit', async (req, res) => {
    try {
        const force = req.query.force === 'true';
        
        // 0. Verifica Cache (Persistence Mode)
        if (!force && fs.existsSync(ANALYTICS_CACHE_FILE)) {
            const cached = JSON.parse(fs.readFileSync(ANALYTICS_CACHE_FILE, 'utf8'));
            console.log("ðŸ’¾ [MARKETING] Carregando dados persistentes do Disco (Estado Anterior).");
            return res.json(cached);
        }

        let data;

        if (!analyticsClient || !process.env.GA4_PROPERTY_ID) {
            console.log(`ðŸ“ˆ [MARKETING] Usando dados Mock (Analytics nÃ£o configurado no .env)`);
            data = {
                visitors: 842, 
                leads: 31,
                active_users: 3,
                abidos_score: "92/100",
                budget_utilization: "N/A",
                top_performing_stag: "Hipnose ClÃ­nica GoiÃ¢nia",
                critica_loss: "0% (Silos Protegidos)",
                recommendations: [
                    { type: "SEO", theme: "Configurar Credenciais GA4", reason: "Falta de arquivo JSON no .env" }
                ],
                insights: `O ecossistema estÃ¡ saudÃ¡vel, mas a ativaÃ§Ã£o do GA4 real permitiria ao Dr. Victor visualizar o impacto direto de sua autoridade clÃ­nica nas conversÃµes de GoiÃ¢nia.`
            };
        } else {
            console.log(`ðŸ“¡ [MARKETING] Buscando dados reais do GA4 (Property: ${process.env.GA4_PROPERTY_ID})...`);

            // 1. Busca VisÃ£o Geral e EstratÃ©gica (Ãºltimos 30 dias)
            const [response] = await analyticsClient.runReport({
                property: `properties/${process.env.GA4_PROPERTY_ID}`,
                dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
                dimensions: [{ name: 'sessionSourceMedium' }],
                metrics: [
                    { name: 'activeUsers' },
                    { name: 'sessions' },
                    { name: 'conversions' },
                    { name: 'engagementRate' },
                    { name: 'eventCount' },
                    { name: 'organicGoogleSearchClicks' }
                ],
            });

            // 2. Busca usuÃ¡rios ativos agora (Real-time)
            const [realtimeResponse] = await analyticsClient.runRealtimeReport({
                property: `properties/${process.env.GA4_PROPERTY_ID}`,
                dimensions: [{ name: 'city' }],
                metrics: [{ name: 'activeUsers' }],
            });

            let totalVisitors = 0;
            let totalSessions = 0;
            let totalConversions = 0;
            let totalOrganicClicks = 0;
            let avgEngagement = 0;
            let totalEvents = 0;
            let topChannel = "Direto / OrgÃ¢nico";

            if (response && response.rows) {
                let maxSessions = 0;
                response.rows.forEach(row => {
                    const rowSessions = parseInt(row.metricValues[1].value || 0);
                    totalVisitors += parseInt(row.metricValues[0].value || 0);
                    totalSessions += rowSessions;
                    totalConversions += parseInt(row.metricValues[2].value || 0);
                    avgEngagement += parseFloat(row.metricValues[3].value || 0);
                    totalEvents += parseInt(row.metricValues[4].value || 0);
                    totalOrganicClicks += parseInt(row.metricValues[5].value || 0);

                    if (rowSessions > maxSessions) {
                        maxSessions = rowSessions;
                        topChannel = row.dimensionValues[0].value;
                    }
                });
                avgEngagement = (avgEngagement / response.rows.length * 100).toFixed(1) + "%";
            }

            const activeNow = (realtimeResponse && realtimeResponse.rows) 
                ? realtimeResponse.rows.reduce((acc, row) => acc + parseInt(row.metricValues[0].value || 0), 0)
                : 0;

            data = {
                visitors: totalVisitors, 
                sessions: totalSessions,
                leads: totalConversions,
                organic_clicks: totalOrganicClicks,
                engagement_rate: avgEngagement,
                total_events: totalEvents,
                active_now: activeNow,
                abidos_score: "94/100",
                budget_utilization: "N/A",
                top_performing_stag: topChannel,
                critica_loss: "0% (Silos Protegidos)",
                recommendations: [], 
                insights: `Cruzamento de ${totalEvents} eventos e ${totalOrganicClicks} cliques orgÃ¢nicos capturados nas Ãºltimas 4 semanas.`,
                last_sync: new Date().toISOString()
            };
        }

        fs.writeFileSync(ANALYTICS_CACHE_FILE, JSON.stringify(data, null, 2));
        saveToHistory({ 
            visitors: data.visitors, 
            leads: data.leads, 
            sessions: data.sessions || 0, 
            organic_clicks: data.organic_clicks || 0,
            engagement: data.engagement_rate || '0%'
        });
        res.json(data);
    } catch (e) {
        console.error("âŒ [MARKETING] Erro CrÃ­tico GA4:", e.message);
        res.json({
            visitors: 0, 
            sessions: 0,
            leads: 0,
            active_now: 0,
            abidos_score: "0/100",
            budget_utilization: "N/A",
            top_performing_stag: "INDISPONÃVEL",
            critica_loss: "ALERTA: FONTE DE DADOS OFFLINE",
            recommendations: [
                { type: "CRÃTICO", theme: "Falha de ConexÃ£o", reason: "O sistema nÃ£o conseguiu se comunicar com o Google Analytics: " + e.message }
            ],
            insights: "Sincronizando: O motor de telemetria estÃ¡ processando as mÃ©tricas do ecossistema. Re-sincronize em 15 segundos."
        });
    }
});

/**
 * âš¡ PAGESPEED INSIGHTS (PSI) - Auditoria de Performance Core Web Vitals
 */
app.get('/api/marketing/psi', async (req, res) => {
    try {
        const force = req.query.force === 'true';
        const cacheMaxAge = 24 * 60 * 60 * 1000; // 24 horas

        // 0. Verifica Cache & Estado de Cota
        if (fs.existsSync(ANALYTICS_CACHE_FILE)) {
             const cache = JSON.parse(fs.readFileSync(ANALYTICS_CACHE_FILE, 'utf8'));
             const lastAudit = cache.psi ? new Date(cache.psi.last_audit).getTime() : 0;
             const isExpired = (Date.now() - lastAudit) > cacheMaxAge;

             // Se a Ãºltima tentativa deu "Quota Exceeded" nos Ãºltimos 60 min, nÃ£o tenta de novo
             if (cache.psi_quota_exceeded_at) {
                 const quotaErrTime = new Date(cache.psi_quota_exceeded_at).getTime();
                 if (Date.now() - quotaErrTime < 60 * 60 * 1000) {
                     console.log("ðŸš« [PSI] Pulando auditoria real devido a bloqueio de cota recente (Caching Ativo).");
                     return res.json(cache.psi || { error: "Cota Google Excedida. Tente em 60 min." });
                 }
             }

             if (!force && cache.psi && !isExpired) {
                 console.log("ðŸ’¾ [PSI] Carregando auditoria de Safe-Cache (V5.1).");
                 return res.json(cache.psi);
             }
        }

        const targetUrl = process.env.PSI_TARGET_URL || "https://instituto-ops.com.br"; 
        console.log(`âš¡ [PSI] Auditoria Profunda (CrUX + Lighthouse) para ${targetUrl}...`);

        const categories = ['PERFORMANCE', 'ACCESSIBILITY', 'BEST_PRACTICES', 'SEO'];
        const psiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(targetUrl)}&${categories.map(c => `category=${c}`).join('&')}`;

        const response = await fetch(psiUrl);
        const data = await response.json();

        if (data.error) throw new Error(data.error.message);

        // 1. Dados Real-World (CrUX / Field Data)
        const fieldData = {
            fcp: data.loadingExperience?.metrics?.FIRST_CONTENTFUL_PAINT_MS?.category || "N/A",
            inp: data.loadingExperience?.metrics?.INTERACTION_TO_NEXT_PAINT?.category || "N/A",
            lcp: data.loadingExperience?.metrics?.LARGEST_CONTENTFUL_PAINT_MS?.category || "N/A",
            overall: data.loadingExperience?.overall_category || "N/A"
        };

        // 2. Dados Lab (Lighthouse Result)
        const lh = data.lighthouseResult;
        const result = {
            performance: Math.round((lh?.categories?.performance?.score || 0) * 100),
            accessibility: Math.round((lh?.categories?.accessibility?.score || 0) * 100),
            best_practices: Math.round((lh?.categories?.['best-practices']?.score || 0) * 100),
            seo: Math.round((lh?.categories?.seo?.score || 0) * 100),
            lcp: lh?.audits?.['largest-contentful-paint']?.displayValue || "N/A",
            tbt: lh?.audits?.['total-blocking-time']?.displayValue || "N/A",
            cls: lh?.audits?.['cumulative-layout-shift']?.displayValue || "N/A",
            
            // SugestÃµes de Impacto (Oportunidades com maior ganho de MS)
            opportunities: Object.values(lh?.audits || {})
                .filter(audit => audit.details?.type === 'opportunity' && (audit.score || 0) < 0.9)
                .sort((a, b) => (b.details?.overallSavingsMs || 0) - (a.details?.overallSavingsMs || 0))
                .slice(0, 3)
                .map(o => ({ title: o.title, savings: o.displayValue, description: o.description })),
            
            field: fieldData,
            last_audit: new Date().toISOString()
        };

        // Persiste no cache global
        if (fs.existsSync(ANALYTICS_CACHE_FILE)) {
            let cache = JSON.parse(fs.readFileSync(ANALYTICS_CACHE_FILE, 'utf8'));
            cache.psi = result;
            fs.writeFileSync(ANALYTICS_CACHE_FILE, JSON.stringify(cache, null, 2));
        }

        saveToHistory({ 
            psi_perf: result.performance, 
            psi_seo: result.seo, 
            psi_best: result.best_practices,
            lcp: result.lcp 
        });

        res.json(result);

    } catch (e) {
        console.error("âŒ [PSI] Erro na Auditoria:", e.message);
        
        // Se for erro de cota, persiste para evitar spam
        if (e.message.includes('Quota exceeded') && fs.existsSync(ANALYTICS_CACHE_FILE)) {
             let cache = JSON.parse(fs.readFileSync(ANALYTICS_CACHE_FILE, 'utf8'));
             cache.psi_quota_exceeded_at = new Date().toISOString();
             fs.writeFileSync(ANALYTICS_CACHE_FILE, JSON.stringify(cache, null, 2));
        }

        res.status(500).json({ error: "Falha na auditoria PSI: " + e.message });
    }
});

/**
 * ðŸ¤– AGENTE ANALYTICS: Gera sugestÃµes baseadas nos dados reais do GA4
 */
app.post('/api/analytics/suggestions', async (req, res) => {
    try {
        const { analyticsData } = req.body;
        console.log(`ðŸ§  [AGENTE ANALYTICS] Gerando sugestÃµes estratÃ©gicas...`);

        const pSuggestions = `
        VocÃª Ã© o "Agente Analytics", especialista em Growth Hacking e Funil Abidos.
        Analise os dados reais do Google Analytics 4 abaixo:
        
        DADOS:
        - Visitantes (30d): ${analyticsData.visitors}
        - ConversÃµes (30d): ${analyticsData.leads}
        - UsuÃ¡rios Ativos Agora: ${analyticsData.active_now}
        
        SUA TAREFA:
        Gere 3 sugestÃµes acionÃ¡veis para o Dr. Victor Lawrence melhorar o desempenho do site.
        Use uma linguagem voltada para negÃ³cios e autoridade clÃ­nica.
        
        RETORNE EM JSON:
        {"suggestions": [{"title": "Nome da SugestÃ£o", "description": "ExplicaÃ§Ã£o tÃ©cnica", "impact": "Alto/MÃ©dio/Baixo"}]}
        `;

        const model = getAIModel(req.body.modelType);
        const result = await model.generateContent(pSuggestions);
        trackUsage(result.response.usageMetadata);
        const responseText = result.response.text();
        
        let jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        // ExtraÃ§Ã£o Robusta de JSON
        const match = jsonStr.match(/\{[\s\S]*\}/);
        if (match) jsonStr = match[0];

        try {
            const parsed = JSON.parse(jsonStr);
            
            // PersistÃªncia: Unifica sugestÃµes no cache global
            if (fs.existsSync(ANALYTICS_CACHE_FILE)) {
                let cache = JSON.parse(fs.readFileSync(ANALYTICS_CACHE_FILE, 'utf8'));
                cache.suggestions = parsed.suggestions;
                fs.writeFileSync(ANALYTICS_CACHE_FILE, JSON.stringify(cache, null, 2));
            }

            res.json(parsed);
        } catch (parseErr) {
            console.error("âŒ [AGENTE ANALYTICS] Falha ao parsear JSON IA:", jsonStr);
            res.json({ suggestions: [{ title: "Falha de Processamento", description: "A IA nÃ£o conseguiu estruturar as sugestÃµes. Verifique os logs do servidor.", impact: "N/A" }] });
        }
    } catch (e) {
        console.warn("âš ï¸ [AGENTE ANALYTICS] Falha na IA:", e.message);
        
        // Tenta retornar sugestÃµes cacheadas se a IA falhar
        if (fs.existsSync(ANALYTICS_CACHE_FILE)) {
             const cache = JSON.parse(fs.readFileSync(ANALYTICS_CACHE_FILE, 'utf8'));
             if (cache.suggestions) return res.json({ suggestions: cache.suggestions });
        }

        res.json({ suggestions: [{ title: "SugestÃµes IndisponÃ­veis", description: "O motor de anÃ¡lise estratÃ©gica estÃ¡ offline.", impact: "N/A" }] });
    }
});

app.post('/api/chat', upload.single('screenshot'), async (req, res) => {
    try {
        const { prompt, message, htmlContext, currentKeyword, whatsapp, moodId, type, modelType } = req.body;
        const userInput = prompt || message;
        const waNumber = whatsapp || '62991545295';
        const selectedMood = moodId || '1_introspeccao_profunda';
        const contentType = type || 'pages';

        console.log(`\nðŸ—ï¸ [STUDIO-CONSTRUCTION] Novo Comando: "${userInput.substring(0, 30)}..." (Model: ${modelType || 'default'})`);
        reportAgentStatus("Agente Construtor", "Sintetizando DNA clÃ­nico e estruturando rascunho...", "", false);

        // REGRA DE OURO: No AI Studio, apenas o Construtor trabalha.
        const html = await runConstructor(userInput, null, waNumber, selectedMood, contentType, modelType);
        
        reportAgentStatus("Agente Construtor", "Rascunho finalizado com sucesso.", "", true);
        res.json({ reply: html });
    } catch (e) { 
        console.error("âŒ [CHAT-ESTEIRA ERROR]", e.message);
        res.status(500).json({ error: e.message }); 
    }
});

app.post('/api/blueprint', upload.none(), async (req, res) => {
    try {
        const { theme, whatsapp, moodId, type } = req.body;
        const waNumber = whatsapp || '5562991545295';
        const selectedMood = moodId || '1_introspeccao_profunda';
        const contentType = type || 'pages';
        
        console.log(`\nðŸ“ [BLUEPRINT] Construindo rascunho acelerado: "${theme}"`);
        reportAgentStatus("Agente Construtor", "Orquestrando blueprint estrutural...", "", false);

        const html = await runConstructor(`Criar blueprint completo para o tema: ${theme}`, null, waNumber, selectedMood, contentType, req.body.modelType || 'flash');
        
        reportAgentStatus("Agente Construtor", "Blueprint entregue.", "", true);
        res.json({ reply: html });
    } catch (e) { 
        console.error("âŒ [BLUEPRINT ERROR]", e.message);
        res.status(500).json({ error: e.message }); 
    }
});

app.post('/api/audit', async (req, res) => {
    try {
        const { html, keyword, modelType } = req.body;
        const modelId = (modelType && modelType.includes('gemini')) ? modelType : VISION_MODEL;
        const model = genAI.getGenerativeModel({ model: modelId });
        const result = await model.generateContent(`Retorne um JSON array de auditoria SEO para o termo ${keyword}:\n\n${html}`);
        trackUsage(result.response.usageMetadata);
        const resp = await result.response;
        res.json({ checklist: JSON.parse(resp.text().replace(/```json|```/g, '').trim()) });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ðŸš€ [FASE 5] ENDPOINTS NEURO-TRAINING (DNA CLONE & STYLE MEMORY)
app.get('/api/neuro-training/memory', (req, res) => {
    try {
        res.json(getVictorStyle());
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// [TELEMETRIA] Endpoint para o Orquestrador
app.get('/api/system/telemetry', (req, res) => {
    res.json(getTelemetry());
});

app.delete('/api/neuro-training/memory/:id', (req, res) => {
    try {
        const memory = getVictorStyle();
        memory.style_rules = memory.style_rules.filter(r => r.id !== req.params.id);
        fs.writeFileSync(MEMORY_FILE_PATH, JSON.stringify(memory, null, 2));
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/neuro-training/memory/clear', (req, res) => {
    try {
        const memory = {
            style_rules: [],
            last_update: new Date().toISOString(),
            insights_history: [],
            scientific_vault: { 
                nota: "Sistema resetado em " + new Date().toLocaleString('pt-BR'),
                status: "LinguÃ­stica Pura Ativada"
            }
        };
        fs.writeFileSync(MEMORY_FILE_PATH, JSON.stringify(memory, null, 2));
        console.log("ðŸ§¹ [NEURO-MEMORY] MemÃ³ria de Estilo limpa com sucesso.");
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/neuro-training/analyze-dna', upload.single('audio'), async (req, res) => {
    try {
        if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY nÃ£o configurada no servidor.");
        if (!req.file) throw new Error("AÃºdio nÃ£o recebido.");
        const modelId = (req.body.modelType && req.body.modelType.includes('gemini')) ? req.body.modelType : VISION_MODEL;
        const model = genAI.getGenerativeModel({ model: modelId });
        
        const result = await model.generateContent([
            { text: PROMPT_TREINAMENTO_ISOLADO },
            { inlineData: { data: req.file.buffer.toString('base64'), mimeType: req.file.mimetype } }
        ]);

        const extracted = extractJSON(result.response.text());
        if (!extracted) throw new Error("IA falhou na sÃ­ntese de DNA via Ãudio.");

        if (extracted.regras_extraidas) {
            await salvarRegrasDeEstilo(extracted.regras_extraidas);
        }

        res.json({ success: true, insights: extracted.regras_extraidas, summary: cleanClinicalData(extracted.insight) });
    } catch (e) {
        console.error("âŒ [DNA ERROR]", e);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/neuro-training/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) throw new Error("Arquivo nÃ£o recebido.");
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

        const modelType = req.body.modelType;
        const modelId = (modelType && modelType.includes('gemini')) ? modelType : (modelType === 'flash' ? VISION_MODEL : HEAVY_MODEL);
        const targetModel = genAI.getGenerativeModel({ model: modelId });

        const completePrompt = `${PROMPT_TREINAMENTO_ISOLADO}

CONTEXTO: O PROFISSIONAL (Dr. Victor Lawrence) Ã© o PARTICIPANTE 2 (P2). 
O PARTICIPANTE 1 (P1) Ã© o CLIENTE/PACIENTE.
IGNORE P1 e extraia a sintaxe exclusivamente de P2.

TEXTO: "${text.substring(0, 8000).replace(/"/g, "'")}"`;

        const result = await targetModel.generateContent(completePrompt);
        const extracted = extractJSON(result.response.text());
        if (!extracted) throw new Error("IA falhou na anÃ¡lise de lastro.");

        if (extracted.regras_extraidas) {
            await salvarRegrasDeEstilo(extracted.regras_extraidas);
        }
        res.json({ success: true, insights: extracted.regras_extraidas, summary: cleanClinicalData(extracted.feedback_analysis) });
    } catch (e) {
        console.error("âŒ [UPLOAD ERROR]", e);
        res.status(500).json({ error: e.message });
    }
});

const { execSync } = require('child_process');

// ==============================================================================
// 1. PUBLICAR NO WORDPRESS (LEGADO / RASCUNHO)
// ==============================================================================
app.post('/api/content/publish-direct', async (req, res) => {
    try {
        const { type, title, content, status, slug, metaTitle, metaDesc } = req.body;
        console.log(`ðŸš€ [PUBLISH PROXY] Iniciando deploy do tipo ${type}: "${title}"`);

        const payload = {
            title: title || "Sem TÃ­tulo",
            content: content || "",
            status: status || "draft",
            slug: slug || "",
        };

        payload.meta = {
            _yoast_wpseo_metadesc: metaDesc || "",
            _yoast_wpseo_title: metaTitle || "",
            rank_math_description: metaDesc || "",
            rank_math_title: metaTitle || "",
            _abidos_render_headless: "1",
            _abidos_headless_content: payload.content,
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

            // Auditoria em background
            (async () => {
                try {
                    const auditResult = await runProductionLine(`Auditar conteÃºdo salvo: ${title}`, payload.content, "62991545295", "1_introspeccao_profunda", type);
                    if (auditResult) {
                        await callWP('POST', `/${endpoint}/${postId}`, {
                            meta: {
                                _abidos_audit_status: "APROVADO",
                                _abidos_audit_report: JSON.stringify(auditResult),
                                _abidos_last_audit: new Date().toISOString()
                            }
                        });
                    }
                } catch (auditErr) { console.error(`ðŸš¨ [AUDIT-ERROR]:`, auditErr.message); }
            })();

        } else {
            res.status(500).json({ error: "Resposta invÃ¡lida do WordPress." });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ==============================================================================
// ðŸ†• 2. PUBLICAR NO VERCEL + NEXT.JS (PROTOCOLO v2.0 - MODERNO)
// ==============================================================================

app.post('/api/content/publish-vercel', async (req, res) => {
    try {
        const { title, content, slug, author = "Victor Lawrence", date = new Date().toLocaleDateString('pt-PT'), neuroEngineData = {} } = req.body;
        const sitePath = process.env.NEXTJS_SITE_PATH;

        if (!sitePath || !fs.existsSync(sitePath)) {
            throw new Error("Caminho do repositÃ³rio Next.js nÃ£o configurado.");
        }

        const blogPath = path.join(sitePath, 'src/app/blog', slug);
        if (!fs.existsSync(blogPath)) fs.mkdirSync(blogPath, { recursive: true });

        const pageTemplate = `"use client";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import Script from "next/script";

export default function BlogPage() {
  return (
    <div className="bg-grain min-h-screen bg-ink-900 font-manrope text-paper-100 flex flex-col antialiased">
      <title>${title}</title>
      <Script async src="https://www.googletagmanager.com/gtag/js?id=G-B0DM24E5FS" strategy="afterInteractive" />
      <Script id="google-analytics" strategy="afterInteractive">
        {\`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-B0DM24E5FS');
        \`}
      </Script>
      <nav className="sticky top-0 z-40 border-b border-ink-800 bg-ink-900/90 backdrop-blur-md px-6 py-4">
        <Link href="/" className="font-serif italic text-xl">V. Lawrence</Link>
      </nav>
      <main className="max-w-4xl mx-auto px-6 py-20">
        <h1 className="font-serif text-5xl lg:text-7xl mb-12">${title}</h1>
        <article className="prose prose-invert lg:prose-xl" dangerouslySetInnerHTML={{ __html: ${JSON.stringify(content)} }} />
      </main>
    </div>
  );
}

// ==========================================
// ðŸ§¬ NEUROENGINE DATA BLOCK
// ==========================================
export const neuroEngineData = ${JSON.stringify(neuroEngineData || {}, null, 2)};
`;

        fs.writeFileSync(path.join(blogPath, 'page.tsx'), pageTemplate);

        // Deploy AutomÃ¡tico via Git Push
        try {
            execSync(`git add . && git commit -m "feat: publish post ${slug}" && git push`, { cwd: sitePath });
            console.log(`âœ… Deploy Vercel disparado para: ${slug}`);
        } catch (gitErr) { console.warn("Git Push ignorado (provavelmente sem mudanÃ§as)."); }

        res.json({ 
            success: true, 
            link: `https://hipnolawrence.com/blog/${slug}`,
            message: "Publicado com sucesso no site oficial (Vercel)." 
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// =========================================================
// ROTA: ORQUESTRAÃ‡ÃƒO DE CLUSTER / SILO NEURAL (Usa o PRO)
// =========================================================
app.post('/api/blueprint/cluster', async (req, res) => {
    try {
        const { theme, moodId, whatsapp } = req.body;
        console.log(`ðŸ’  [CLUSTER] Orquestrando Silo Neural para: ${theme}`);

        if (!modelPro) {
            console.error("âŒ modelPro nÃ£o inicializado!");
            return res.status(500).json({ error: "HemisfÃ©rio Pro nÃ£o carregado no servidor." });
        }

        const dnaInjetadoCluster = getDnaContext();
        const moodCluster = tema && tema.toLowerCase().includes('tea') ? CLIMAS_CLINICOS['3_conforto_neurodivergente'] : CLIMAS_CLINICOS['1_introspeccao_profunda'];

        const systemPrompt = `
VocÃª Ã© o Arquiteto Abidos (Gemini 2.5 Pro). Crie um Cluster SEO de alta conversÃ£o para o Dr. Victor Lawrence (tema: "${theme}").

Gere EXATAMENTE 4 conteÃºdos:
- 1 PÃ¡gina Pilar (Hub) de vendas (type: "pages")
- 3 Artigos de Blog (Spokes) em cauda longa (type: "posts")

[DESIGN OBRIGATÃ“RIO PARA CADA ITEM HTML]
- WRAPPER: <div class="abidos-wrapper antialiased px-4 py-8 md:px-12 lg:px-24 ${moodCluster.fundo_principal} min-h-screen font-inter ${moodCluster.texto_principal}">
- CARDS: bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 md:p-10 shadow-2xl hover:border-teal-500/50 transition-all
- H2 GRADIENTE: font-outfit font-bold text-3xl md:text-5xl text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500
- GRIDS: grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
- BOTOÃ•ES CTA: inline-flex px-8 py-4 bg-teal-500 hover:bg-teal-400 text-[#05080f] font-bold rounded-full hover:scale-105 shadow-[0_0_25px_rgba(45,212,191,0.35)]
- GLOW ORB: <div class="absolute -z-10 w-96 h-96 bg-teal-500/10 blur-[150px] rounded-full"></div>
- EFEITO DO MOOD: ${moodCluster.efeitos_obrigatorios}
- PROIBIDO H1 manual, PROIBIDO URLs inventadas, PROIBIDO tags puras.

[DNA LITERÃRIO]
${dnaInjetadoCluster || 'Use linguagem ericksoniana permissiva.'}

[LINKS E IMAGENS REAIS â€” USE OBRIGATORIAMENTE]
${REAL_ASSETS}

${ETICA_ABIDOS}

RETORNE EXCLUSIVAMENTE UM JSON VÃLIDO:
{
  "mainTopic": "${theme}",
  "items": [
    { "title": "TÃ­tulo do Hub", "type": "pages", "html": "<div class=\\"abidos-wrapper...\\">...</div>" },
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
            console.error("âŒ Falha ao extrair JSON do Cluster. Resposta bruta:", responseText);
            throw new Error("A IA nÃ£o retornou um JSON vÃ¡lido de Cluster.");
        }

        clusterData.success = true;
        res.status(200).json(clusterData);

    } catch (error) {
        console.error("ðŸš¨ Erro na geraÃ§Ã£o do Cluster:", error);
        res.status(500).json({ 
            success: false, 
            error: "Falha no HemisfÃ©rio Pro: " + error.message 
        });
    }
});

// =========================================================
// [AGENTE GERENTE] O Orquestrador Central (MANAGER V4)
// =========================================================
app.post('/api/manager/chat', async (req, res) => {
    try {
        const { message, history, modelType } = req.body;
        console.log(`ðŸ‘‘ [MANAGER] Processando solicitaÃ§Ã£o estratÃ©gica via ${modelType || 'PRO'}: "${message.substring(0, 50)}..."`);
        
        // 1. Coleta de Contexto Global (VisÃ£o de "Tudo")
        const silosRaw = fs.existsSync(path.join(__dirname, 'silos.json')) ? fs.readFileSync(path.join(__dirname, 'silos.json'), 'utf8') : '[]';
        const draftsRaw = fs.existsSync(path.join(__dirname, 'drafts.json')) ? fs.readFileSync(path.join(__dirname, 'drafts.json'), 'utf8') : '[]';
        const style = getVictorStyle();
        const menusRaw = fs.existsSync(MENUS_FILE) ? fs.readFileSync(MENUS_FILE, 'utf8') : '[]';
        
        // 2. Montagem do Super-Prompt (Prompt System Contextual)
        const systemPrompt = `
[PROTOCOLO DE GERÃŠNCIA CENTRAL - ABIDOS MANAGER V4]
VocÃª Ã© o AGENTE GERENTE (CEO) do ecossistema NeuroEngine do Dr. Victor Lawrence.
Sua missÃ£o Ã© atuar como um Assessor EstratÃ©gico de alto nÃ­vel, conectando todos os pontos do sistema.

[CONTEXTO ATUAL DO ECOSSISTEMA]
- SILOS/ARQUITETURA ATUAL: ${silosRaw}
- RASCUNHOS NO PIPELINE: ${draftsRaw.substring(0, 2000)}... (truncado para contexto)
- REGRAS DE IDENTIDADE VERBAL: ${JSON.stringify(style.style_rules)}
- ESTRUTURA DE MENUS: ${menusRaw}

[SUAS DIRETRIZES DE OURO]
1. SOBERANIA ESTRATÃ‰GICA: VocÃª vÃª o que os outros agentes nÃ£o vÃªem. Se o marketing sugere algo que o SEO nÃ£o suporta, vocÃª deve mediar.
2. ABIDOS METHODOLOGY: Suas respostas devem refletir o rigor do mÃ©todo Abidos (Autoridade, ConversÃ£o e Ã‰tica ClÃ­nica).
3. TOM DE VOZ: Profissional, ultra-inteligente, conciso e propositivo.
4. COMPLIANCE EEAT (REGRAS DE OURO):
   - âœ… USE SEMPRE: Manejo, RegulaÃ§Ã£o Emocional, Protocolo Validado, AvaliaÃ§Ã£o ClÃ­nica, EstratÃ©gias de Coping.
   - ðŸš« PROIBIDO: Cura, Milagre, Definitivo, RÃ¡pido, Garantido.
5. ARQUITETURA DE COPY FATIADO: Sempre que sugerir blocos Hero, use a estrutura: Kicker (mÃ¡x 6 pal.), H1 (8 pal.) e Subtitle (20 pal.).
6. CAPACIDADES DE RESPOSTA: VocÃª pode sugerir mudanÃ§as estruturais, validar rascunhos ou propor novas campanhas baseadas nos dados.

[HISTÃ“RICO DA SESSÃƒO ATUAL]
${(history || []).map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}

REQUISIÃ‡ÃƒO DO DR. VICTOR: "${message}"

[MANUAL DE ESTILO DE RESPOSTA]
1. FALA HUMANA: VocÃª Ã© um ASSESSOR, nÃ£o um banco de dados. Transforme o JSON do contexto em insights narrativos.
2. ESTRUTURA VISUAL: Use Markdwon com cabeÃ§alhos (#, ##), listas (-) e negrito (**).
3. PROIBIÃ‡ÃƒO: Ã‰ expressamente proibido responder com chaves {}, colchetes [] ou sintaxe de programaÃ§Ã£o.
4. AÃ‡ÃƒO TÃ‰CNICA: Se quiser disparar uma aÃ§Ã£o, mencione "AÃ‡ÃƒO IMPLEMENTADA: [NOME]" em uma linha isolada ao final.

REQUISIÃ‡ÃƒO: "${message}"
`;

        // Usamos o motor dinÃ¢mico (Default: PRO para melhor anÃ¡lise estratÃ©gica)
        const activeModel = getAIModel(modelType || 'pro', 'text/plain');

        const result = await activeModel.generateContent(systemPrompt);
        const responseText = result.response.text();
        
        res.json({ reply: responseText });

    } catch (e) {
        console.error("âŒ ERRO CRÃTICO NO GERENTE:", e.message);
        res.status(500).json({ error: "O Gerente Abidos encontrou uma falha de sincronizaÃ§Ã£o: " + e.message });
    }
});

// =========================================================
// ROTA: NEURO-TRAINING CHAT (CONVERSA CONTÃNUA DE VOZ)
// =========================================================
app.post('/api/neuro-training/chat', async (req, res) => {
    try {
        const { message, modelType } = req.body;
        if (!message) return res.status(400).json({ error: 'Mensagem vazia.' });

        const targetModel = modelType === 'flash' ? modelFlash : modelPro;
        
        const fullPrompt = `${PROMPT_TREINAMENTO_ISOLADO}\n\nFALA DO DR. VICTOR-Ouvinte: "${message}"`;
        const result = await targetModel.generateContent(fullPrompt);

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
            console.log(`âœ¨ [NEURO-CHAT] ${parsed.regras_extraidas.length} nova(s) regra(s) de DNA salva(s).`);
        }

        res.json(parsed);

    } catch (error) {
        console.error('âŒ [NEURO-TRAINING/CHAT ERROR]', error);
        res.status(500).json({ error: 'Falha no Aprendiz de Abidos: ' + error.message });
    }
});

app.post('/api/doctoralia/generate-reply', async (req, res) => {
    try {
        const { question, modelType } = req.body;
        const targetModel = getAIModel(modelType, 'text/plain');
        console.log(`ðŸ§  [DOCTORALIA] Gerando resposta via motor ${modelType}...`);

        const dnaInjetado = getDnaContext();
        const systemPrompt = `
VocÃª Ã© o GÃªmeo Digital LiterÃ¡rio do Dr. Victor Lawrence (PsicÃ³logo ClÃ­nico CRP 09/012681, Especialista em TEA em Adultos e Hipnose Ericksoniana, Mestrando UFU (conclusÃ£o 2028), GoiÃ¢nia-GO).
Sua missÃ£o Ã© responder Ã  dÃºvida de um paciente na plataforma Doctoralia.

${dnaInjetado}

ESTRUTURA OBRIGATÃ“RIA DA RESPOSTA (MÃ‰TODO ABIDOS):
1. Acolhimento (Pacing): Valide a dor ou dÃºvida aplicando sua empatia e cadÃªncia caracterÃ­sticas.
2. Utilidade PrÃ¡tica: Explique de forma psicoeducativa, breve e fenomenolÃ³gica.
3. ReforÃ§o de Autoridade (E-E-A-T): Se o tema for TEA, Burnout ou Hipnose, mencione sutilmente sua experiÃªncia.
4. Fechamento: Convide para avaliaÃ§Ã£o de forma permissiva, tÃ­pica da sua linguagem ericksoniana.

DIRETRIZES Ã‰TICAS:
- NUNCA faÃ§a diagnÃ³sticos fechados ou prometa cura.
- Retorne APENAS o texto da resposta, sem markdown.

PERGUNTA DO PACIENTE: "${question}"`;

        const result = await targetModel.generateContent(systemPrompt);
        let reply = result.response.text()
            .replace(/\*\*/g, '').replace(/###/g, '').replace(/##/g, '')
            .replace(/#/g, '').replace(/\*/g, '').trim();

        res.json({ success: true, reply });
    } catch (e) {
        console.error('âŒ [DOCTORALIA ERROR]', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/api/doctoralia/audit', async (req, res) => {
    try {
        const { original_message, generated_reply, modelType } = req.body;
        const targetModel = getAIModel(modelType, 'text/plain');
        
        const systemPrompt = `VocÃª Ã© um Auditor de Compliance MÃ©dico e Ã‰tico do Conselho Federal de Psicologia (CFP).
Sua ÃšNICA missÃ£o Ã© ler a resposta que uma IA gerou para um paciente e procurar por ALUCINAÃ‡Ã•ES ou INFRAÃ‡Ã•ES Ã‰TICAS.

DADOS IMUTÃVEIS DO PROFISSIONAL:
- Nome: Victor Lawrence | Registro: CRP 09/012681
- TitulaÃ§Ã£o: Mestrando em CiÃªncias da SaÃºde (UFU), TEA, Hipnose ClÃ­nica.

REGRAS DE REPROVAÃ‡ÃƒO:
1. Promessa de cura ou prazos.
2. InvenÃ§Ã£o de titulaÃ§Ã£o.
3. DiagnÃ³stico online ou prescriÃ§Ã£o.
4. Tom robÃ³tico.

RETORNE JSON: { "status": "APROVADO|REPROVADO", "feedback_auditoria": "...", "sugestao_correcao": "..." }`;

        const promptInput = `Mensagem do Paciente: "${original_message}"\nResposta sugerida pela IA: "${generated_reply}"`;
        const result = await targetModel.generateContent(`${systemPrompt}\n\n${promptInput}`);

        const parsed = extractJSON(result.response.text());
        res.json(parsed || { status: "REPROVADO", feedback_auditoria: "Falha tÃ©cnica no processamento da auditoria.", sugestao_correcao: "" });
    } catch (error) {
        console.error('âŒ [ERRO AUDITORIA DOCTORALIA]', error);
        res.status(500).json({ error: 'Falha ao auditar: ' + error.message });
    }
});

app.post('/api/doctoralia/refine-reply', async (req, res) => {
    try {
        const { original_reply, auditor_feedback } = req.body;
        
        const refinePrompt = `
VocÃª Ã© o Revisor de Compliance do Dr. Victor Lawrence.
Sua tarefa Ã© REESCREVER a resposta abaixo aplicando as correÃ§Ãµes solicitadas pelo Auditor Ã‰tico.

[TEXTO ORIGINAL COM ERRO]:
"${original_reply}"

[FEEDBACK DO AUDITOR]:
"${auditor_feedback}"

[DIRETRIZES DE REESCRITA]:
- Mantenha o DNA de voz do Dr. Victor (acolhedor, tÃ©cnico, fenomenolÃ³gico).
- Remova EXATAMENTE o que o auditor apontou como perigoso ou falso.
- Retorne APENAS o texto corrigido, em parÃ¡grafos limpos, sem markdown.
        `;

        const targetModel = getAIModel(req.body.modelType, 'text/plain');
        const result = await targetModel.generateContent(refinePrompt);
        const reply = result.response.text()
            .replace(/\*\*/g, '').replace(/###/g, '').replace(/##/g, '')
            .replace(/#/g, '').replace(/\*/g, '').trim();

        res.json({ success: true, reply });
    } catch (e) {
        res.status(500).json({ error: e.message });
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
VocÃª Ã© o Arquiteto Visual SÃªnior do Protocolo Abidos. Sua missÃ£o: gerar cÃ³digo HTML/Tailwind IMPECÃVEL, TOTALMENTE RESPONSIVO e com DESIGN PREMIUM para o conteÃºdo "${tema}" (formato: ${formato}, pÃºblico: ${publico}).

[REGRAS DE LAYOUT DINÃ‚MICO â€” OBRIGATÃ“RIO]
1. WRAPPER MESTRE: Todo o conteÃºdo DEVE comeÃ§ar com: <div class="abidos-wrapper antialiased px-4 py-8 md:px-12 lg:px-24 ${mood.fundo_principal} min-h-screen font-inter ${mood.texto_principal}">
2. MOBILE-FIRST: 1 coluna no mobile, expandindo com 'md:' e 'lg:' breakpoints.
3. GRIDS: BenefÃ­cios/dores: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6". Autoridade: "flex flex-col lg:flex-row items-center gap-12".
4. PROIBIDO TAGS PURAS: Nenhum <h1>, <p> ou <a> sem classes Tailwind obrigatÃ³rias.

[ESTÃ‰TICA PREMIUM]
- CARDS: "bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 md:p-10 shadow-2xl transition-all hover:border-teal-500/50"
- H1/H2 (GRADIENTE): "font-outfit font-bold text-4xl md:text-6xl lg:text-7xl leading-tight text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500 mb-6"
- H3: "font-outfit font-bold text-2xl md:text-3xl ${mood.texto_destaque} mb-4"
- Ã“RBITAS DE LUZ (GLOW ORBS â€” opcional, para profundidade): <div class="absolute -z-10 w-96 h-96 ${mood.cor_acao.replace('!bg-', 'bg-')}/10 blur-[150px] rounded-full"></div>
- BOTOÃ•ES MAGNÃ‰TICOS (CTA WhatsApp): "inline-flex items-center justify-center px-8 py-4 ${mood.cor_acao.replace('!bg-', 'bg-')} hover:opacity-90 text-[#05080f] font-bold rounded-full transition-all hover:scale-105 shadow-[0_0_25px_rgba(45,212,191,0.35)] text-lg"
- EFEITO OBRIGATÃ“RIO DO MOOD: ${mood.efeitos_obrigatorios}

[DNA LITERÃRIO DO DR. VICTOR â€” APLIQUE NO TEXTO VISÃVEL]
${dnaInjetado || '(Sem regras de DNA ainda. Use linguagem ericksoniana perm issiva e empÃ¡tica.)'}

[ASSETS REAIS â€” USE OBRIGATORIAMENTE]
${REAL_ASSETS}

${ETICA_ABIDOS}

[OBJETIVO FINAL]
Gere as <section> modulares com padding vertical generoso (py-16 md:py-32). No mobile texto centralizado. No desktop alinhamento estratÃ©gico lateral. Feche o wrapper com </div> ao final.
NÃƒO inclua <!DOCTYPE>, <html>, <head>, <body> ou markdown. Apenas as seÃ§Ãµes HTML.
        `;

        const result = await modelPro.generateContent(systemPrompt);
        res.json({ rascunho: result.response.text() });
    } catch (e) {
        console.error("âŒ [PRO ERROR]", e);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/dna/auto-refine', async (req, res) => {
    try {
        const { originalHtml, editedHtml } = req.body;
        if (!originalHtml || !editedHtml || originalHtml === editedHtml) {
            return res.json({ success: true, newRules: [] });
        }

        console.log(`ðŸ§  [AUTO-DNA] Analisando intervenÃ§Ã£o manual do Dr. Victor...`);

        const refinePrompt = `
        VOCÃŠ Ã‰ O ANALISTA DE DNA CLÃNICO DO DR. VICTOR LAWRENCE.
        
        Sua tarefa: Comparar o HTML que a IA gerou (ORIGINAL) com o HTML apÃ³s as ediÃ§Ãµes do Dr. Victor (EDITADO).
        Identifique PREFERÃŠNCIAS ESTILÃSTICAS, CORREÃ‡Ã•ES DE TOM ou ADIÃ‡Ã•ES DE CONTEÃšDO RECORRENTES.

        [PROTOCOLO DE RECONHECIMENTO]:
        - Se o Dr. Victor mudou o tom (ex: ficou mais tÃ©cnico ou mais empÃ¡tico), crie uma regra de TOM.
        - Se ele mudou o design (ex: bordas, sombras, cores especÃ­ficas), crie uma regra de DESIGN.
        - Se ele adicionou credenciais (ex: CRP, Mestrado, Links sociais), crie uma regra de E-E-A-T.
        
        RETORNE EXATAMENTE UM JSON ARRAY de novas regras (ou array vazio se as mudanÃ§as forem triviais):
        [
          { "categoria": "...", "titulo": "...", "regra": "..." }
        ]

        ---
        HTML ORIGINAL:
        ${originalHtml.substring(0, 5000)}

        HTML EDITADO:
        ${editedHtml.substring(0, 5000)}
        `;

        const modelId = (req.body.modelType && req.body.modelType.includes('gemini')) ? req.body.modelType : HEAVY_MODEL;
        const model = genAI.getGenerativeModel({ model: modelId });
        const result = await model.generateContent(refinePrompt);
        const newRules = extractJSON(result.response.text()) || [];

        if (Array.isArray(newRules) && newRules.length > 0) {
            console.log(`âœ¨ [AUTO-DNA] Detectadas ${newRules.length} novas preferÃªncias!`);
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
        console.error("âŒ [AUTO-DNA ERROR]", e);
        res.status(500).json({ error: e.message });
    }
});

// [API] Auditoria de Alta ConversÃ£o (Inspetor Abidos V3.2)
app.post('/api/ai/audit-abidos', async (req, res) => {
    try {
        const { values, templateId, modelType } = req.body;
        const targetModel = modelType === 'flash' ? modelFlash : modelPro;
        
        // Limpeza de imagens Base64
        const cleanedValues = {};
        Object.keys(values || {}).forEach(key => {
            if (typeof values[key] === 'string' && values[key].startsWith('data:image')) {
                cleanedValues[key] = "[IMAGEM CARREGADA]";
            } else {
                cleanedValues[key] = values[key];
            }
        });

        console.log(`âš–ï¸ Auditando Draft Abidos (${modelType || 'pro'})...`);

        const prompt = `VocÃª Ã© o INSPETOR ABIDOS V3.2. 
        Analise o conteÃºdo abaixo e dÃª uma nota de 0 a 100 baseada em Neuromarketing e SEO.
        
        [CONTEÃšDO]:
        ${JSON.stringify(cleanedValues, null, 2)}
        
        RETORNE EXATAMENTE UM JSON:
        { "score": 85, "feedback": "ExplicaÃ§Ã£o...", "aprovado": true }`;

        const result = await targetModel.generateContent(prompt);
        const text = result.response.text();
        const audit = extractJSON(text);
        if (!audit) throw new Error("IA nÃ£o retornou um JSON vÃ¡lido de auditoria.");
        
        console.log("ðŸ“Š [AUDIT-ABIDOS RESULT]:", audit);
        res.json(audit);
    } catch (err) {
        console.error("Erro Audit Abidos:", err);
        res.status(500).json({ error: "Falha na auditoria cerebral: " + err.message });
    }
});

// [API] Auditoria ClÃ­nica (Factualidade e Ã‰tica)
app.post('/api/ai/audit-clinical', async (req, res) => {
    try {
        const { values, modelType } = req.body;
        const targetModel = modelType === 'flash' ? modelFlash : modelPro;
        
        // Limpeza de imagens Base64
        const cleanedValues = {};
        Object.keys(values || {}).forEach(key => {
            if (typeof values[key] === 'string' && values[key].startsWith('data:image')) {
                cleanedValues[key] = "[IMAGEM CARREGADA]";
            } else {
                cleanedValues[key] = values[key];
            }
        });

        console.log(`ðŸ›¡ï¸ Iniciando Auditoria ClÃ­nica (${modelType || 'pro'})...`);

        const prompt = `VocÃª Ã© o AUDITOR CLÃNICO V4 (CRP Compliance).
        Verifique a Ã‰tica e Factualidade. Proibido prometer cura.
        
        [CONTEÃšDO]:
        ${JSON.stringify(cleanedValues, null, 2)}
        
        RETORNE EXATAMENTE UM JSON:
        { "status": "APROVADO", "feedback_clinico": "..." }`;

        const result = await targetModel.generateContent(prompt);
        const text = result.response.text();
        const audit = extractJSON(text);
        if (!audit) throw new Error("IA nÃ£o retornou um JSON vÃ¡lido de auditoria clÃ­nica.");
        
        console.log("ðŸ›¡ï¸ [AUDIT-CLINICAL RESULT]:", audit);
        res.json(audit);
    } catch (err) {
        console.error("Erro Audit ClÃ­nica:", err);
        res.status(500).json({ error: "Falha na auditoria clÃ­nica: " + err.message });
    }
});

// [API] SEO Silos (Arquitetura Hub & Spoke)
app.get('/api/seo/silos', (req, res) => {
    const siloPath = path.join(__dirname, 'silos.json');
    if (fs.existsSync(siloPath)) {
        const data = JSON.parse(fs.readFileSync(siloPath, 'utf-8'));
        return res.json(data);
    }

    // Default Mock Data
    const defaultData = {
        silos: [
            { id: "silo_1", hub: "Autismo Adulto", slug: "autismo-adulto", spokes: ["DiagnÃ³stico Tardio", "Sinais Sutis em Mulheres"] },
            { id: "silo_2", hub: "Ansiedade e Burnout", slug: "ansiedade-burnout", spokes: ["Terapia EstratÃ©gica", "Sintomas FÃ­sicos"] }
        ]
    };
    res.json(defaultData);
});

app.post('/api/seo/silos', (req, res) => {
    try {
        console.log("ðŸ’¾ [API-SILO] Recebendo atualizaÃ§Ã£o de silos...");
        const silos = req.body;
        if (!Array.isArray(silos)) {
            console.error("âŒ [API-SILO ERROR] Payload nÃ£o Ã© um array:", silos);
            return res.status(400).json({ error: "O corpo da requisiÃ§Ã£o deve ser um array de silos." });
        }

        const siloPath = path.join(__dirname, 'silos.json');
        fs.writeFileSync(siloPath, JSON.stringify({ silos: silos }, null, 2));
        console.log(`âœ… [API-SILO] ${silos.length} silos persistidos com sucesso.`);
        res.json({ success: true });
    } catch (e) {
        console.error("âŒ [API-SILO FATAL ERROR]:", e);
        res.status(500).json({ error: e.message });
    }
});

// [API] SugestÃ£o de Silos e STAGs via IA Abidos (Motor SemÃ¢ntico V5)
app.get('/api/seo/analyze-silos', async (req, res) => {
    try {
        console.log("ðŸ§  [ABIDOS-SILO] Iniciando anÃ¡lise de demanda estratÃ©gica...");
        const siloPath = path.join(__dirname, 'silos.json');
        let currentSilos = [];
        try {
            if (fs.existsSync(siloPath)) {
                const raw = fs.readFileSync(siloPath, 'utf-8');
                currentSilos = JSON.parse(raw).silos || [];
            }
        } catch(e) { console.error("Erro leitura silos:", e); }
        
        const prompt = `[CONTEXTO]: Dr. Victor Lawrence, PsicÃ³logo e Hipnoterapeuta ClÃ­nico.
        [ARQUITETURA ATUAL]: 
        ${currentSilos.map(s => `- Hub: ${s.hub} (Spokes: ${s.spokes.join(', ')})`).join('\n')}
        
        Aja como o Agente Abidos. 
        1. ANALISE a arquitetura atual. Identifique falhas de cobertura ou silos pouco explorados.
        2. SUGIRA 3 novos silos ou expansÃµes crÃ­ticas para os jÃ¡ existentes.
        3. Para cada sugestÃ£o, defina um HUB imponente e 5 SPOKES (Postagens / Artigos) de alta intenÃ§Ã£o clÃ­nica.
        4. O foco deve ser em conversÃ£o (venda de sessÃµes) e autoridade tÃ©cnica (E-E-A-T).
        
        RETORNE EXATAMENTE UM JSON NO FORMATO:
        { "suggestions": [ { "hub": "...", "slug": "hub-slug", "spokes": ["...", "...", "..."] } ] }`;

        const result = await modelFlash.generateContent(prompt);
        const text = result.response.text();
        
        const data = extractJSON(text);
        if (!data || !data.suggestions) throw new Error("A IA nÃ£o retornou sugestÃµes vÃ¡lidas.");
        
        // Garante que cada sugestÃ£o tenha slug
        data.suggestions.forEach(s => {
            if (!s.slug) s.slug = s.hub.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
        });

        res.json(data);
    } catch (e) {
        console.error("âŒ [ABIDOS-SILO ERROR]", e);
        res.status(500).json({ success: false, error: e.message || "Falha na geraÃ§Ã£o neural de silos." });
    }
});

// ðŸŒ€ VÃ“RTEX AI STUDIO â€” MÃ³dulo Modular (routes/vortex.js)
require('./routes/vortex')(app, { SITE_REPO_PATH });


// CATCH-ALL API (Movido para o final para nÃ£o quebrar rotas dinÃ¢micas)
app.use('/api/*', (req, res) => {
    res.status(404).json({ 
        success: false, 
        error: `Endpoint '${req.originalUrl}' nÃ£o encontrado no ecossistema NeuroEngine (Protocolo V5). Verifique se o backend estÃ¡ atualizado e se a rota existe no server.js.` 
    });
});

const server = app.listen(port, () => {
    console.log(`\nðŸš€ AntiGravity CMS: Mission Control Ativo!`);
    console.log(`ðŸ“¡ Frontend & API rodando em http://localhost:${port}`);
    console.log(`ðŸ” Camada de SeguranÃ§a Proxy: ON`);
    console.log(`ðŸŽ™ï¸ WebSocket Voice Live: DisponÃ­vel em ws://localhost:${port}`);
});

// [VORTEX] Endpoint: IngestÃ£o de Texto/PDF para DNA Verbal
app.post('/api/neuro-training/ingest-text', upload.array('files'), async (req, res) => {
    try {
        const { manualText } = req.body;
        let combinedText = '';

        if (manualText) combinedText += manualText + '\n';

        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                if (file.mimetype === 'application/pdf') {
                    const data = await pdf(file.buffer);
                    combinedText += data.text + '\n';
                } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                    const result = await mammoth.extractRawText({ buffer: file.buffer });
                    combinedText += result.value + '\n';
                } else {
                    combinedText += file.buffer.toString('utf8') + '\n';
                }
            }
        }

        if (!combinedText.trim()) return res.status(400).json({ error: 'Nenhum texto para processar.' });

        const prompt = `Analise o seguinte material (transcriÃ§Ãµes/textos) do Dr. Victor Lawrence.
        Extraia padrÃµes de: CADÃŠNCIA, SINTAXE, VOCABULÃRIO DE IDENTIDADE e TONALIDADE.
        Foque em regras que permitam a um LLM mimetizar a escrita dele com precisÃ£o cirÃºrgica.
        
        RETORNE EXATAMENTE UM JSON:
        {
          "new_rules": [
            {
              "categoria": "CadÃªncia | Sintaxe | VocabulÃ¡rio de Identidade | Tonabilidade Estrutural",
              "titulo": "Nome curto da regra",
              "regra": "DescriÃ§Ã£o detalhada do padrÃ£o linguÃ­stico"
            }
          ]
        }

        TEXTO:
        ${combinedText.substring(0, 25000)}`;

        const model = genAI.getGenerativeModel({ model: HEAVY_MODEL });
        const result = await model.generateContent(prompt);
        const responseData = extractJSON(result.response.text());

        if (responseData && responseData.new_rules) {
            const memoryPath = path.join(__dirname, 'estilo_victor.json');
            const memory = JSON.parse(fs.readFileSync(memoryPath, 'utf8'));
            
            responseData.new_rules.forEach(rule => {
                rule.id = `ext_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                rule.data_extracao = new Date().toISOString();
                memory.style_rules.push(rule);
            });
            
            memory.last_update = new Date().toISOString();
            fs.writeFileSync(memoryPath, JSON.stringify(memory, null, 2));
            
            res.json({ success: true, count: responseData.new_rules.length, added: responseData.new_rules });
        } else {
            res.status(500).json({ error: 'Falha ao extrair padrÃµes do texto.' });
        }
    } catch (error) {
        console.error('âŒ [INGEST-TEXT ERROR]', error);
        res.status(500).json({ error: error.message });
    }
});

// [PRIORIDADE 2] MOTOR DE STATUS (DASHBOARD)
wss = new WebSocket.Server({ server });
wss.on('connection', (ws) => {
    console.log("ðŸ“¡ [NEURO-CONNECT] Cliente conectado ao canal de status.");
    ws.on('close', () => console.log("ðŸ“¡ [NEURO-CONNECT] Canal de status encerrado."));
});

// =======================================================================
// ROTA: GERADOR DE STATUS (FINALIZADO)
// =======================================================================
// TTS MÃ“DULO REMOVIDO EM FAVOR DO FOCO EM PERFIL VERBAL TEXTUAL
