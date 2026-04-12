/**
 * 🧬 Shared Dependencies & Helpers
 * 
 * Módulo central de dependências e funções compartilhadas.
 * Exporta tudo que os módulos de rota precisam sem duplicação.
 */

const path = require('path');
const fs = require('fs');
const axios = require('axios');

// ── Configuração Gemini AI ──────────────────────────────────────────────
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GoogleAICacheManager } = require('@google/generative-ai/server');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "DUMMY");

// Modelos Primários (Soberania do Usuário Abidos v5)
const LITE_MODEL = "gemini-2.5-flash-lite"; 
const MAIN_MODEL = "gemini-2.5-flash";
const PRO_MODEL  = "gemini-2.5-pro";

// ── Queue System (429 Rate-Limit) ───────────────────────────────────────
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
                        console.warn(`⚠️ [AI QUEUE] 429 Hit. Waiting ${d}ms... (${r} retries left)`);
                        await new Promise(res => setTimeout(res, d));
                        return await executeCall(r - 1, d * 2);
                    }
                    throw e;
                }
            };
            const result = await executeCall(retries, delay || 2000);
            aiQueue.shift();
            resolve(result);
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

// ── AI Model Factory ────────────────────────────────────────────────────
function getAIModel(modelType, mimeType = "application/json") {
    let target = MAIN_MODEL;
    if (modelType === 'lite' || modelType === 'gemini-2.5-flash-lite') target = LITE_MODEL;
    else if (modelType === 'pro' || modelType === 'gemini-2.5-pro') target = PRO_MODEL;
    else if (modelType === 'flash' || modelType === 'gemini-2.5-flash') target = MAIN_MODEL;
    else if (modelType && modelType.includes("gemini")) target = modelType;

    const config = { 
        temperature: 0.8,
        maxOutputTokens: 8192
    };
    if (mimeType === "application/json") config.responseMimeType = "application/json";

    const rawModel = genAI.getGenerativeModel({ model: target, generationConfig: config });
    return wrapModel(rawModel);
}

const modelFlash = getAIModel('flash');
const modelPro = getAIModel('pro', 'text/plain');

// ── JSON Parser Robusto ─────────────────────────────────────────────────
function extractJSON(text) {
    if (!text) return null;
    let jsonPart = text.trim();
    const firstBrace = jsonPart.indexOf('{');
    if (firstBrace !== -1) {
        jsonPart = jsonPart.substring(firstBrace);
    }
    try {
        const cleanText = jsonPart.replace(/```json/g, '').replace(/```/g, '').trim();
        const lastBrace = cleanText.lastIndexOf('}');
        if (lastBrace !== -1) {
            return JSON.parse(cleanText.substring(0, lastBrace + 1));
        }
        return JSON.parse(cleanText);
    } catch (e) {
        console.warn("⚠️ [VORTEX] JSON Truncado Detectado. Iniciando Reparo de Emergência...");
        try {
            return repairTruncatedJSON(jsonPart);
        } catch (repairErr) {
            console.error("❌ [VORTEX] Falha crítica no parser JSON:", repairErr.message);
            return null;
        }
    }
}

function repairTruncatedJSON(json) {
    let stack = [];
    let inString = false;
    let escaped = false;
    let repaired = "";
    let code = json.replace(/```json/g, '').replace(/```/g, '').trim();

    for (let i = 0; i < code.length; i++) {
        let char = code[i];
        if (escaped) { escaped = false; repaired += char; continue; }
        if (char === '\\') { escaped = true; repaired += char; continue; }
        if (char === '"') { inString = !inString; repaired += char; continue; }
        if (!inString) {
            if (char === '{' || char === '[') stack.push(char === '{' ? '}' : ']');
            else if (char === '}' || char === ']') stack.pop();
        }
        repaired += char;
    }

    if (inString) repaired += '"';
    while (stack.length) { repaired += stack.pop(); }

    try {
        return JSON.parse(repaired);
    } catch (e) {
        const codeMatch = repaired.match(/"code":\s*"([\s\S]*?)(?:"\s*,|"\s*\})/);
        return {
            code: codeMatch ? codeMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : "// Falha na recuperação de código",
            explanation: "⚠️ Payload reparado via Heurística de Emergência após truncamento."
        };
    }
}

// ── Telemetria ──────────────────────────────────────────────────────────
const TELEMETRY_FILE = path.join(__dirname, 'telemetry.json');

const getTelemetry = () => {
    try {
        if (fs.existsSync(TELEMETRY_FILE)) {
            return JSON.parse(fs.readFileSync(TELEMETRY_FILE, 'utf8'));
        }
    } catch (e) { console.error("❌ Erro ao ler telemetry.json:", e); }
    return { tokens: { prompt: 0, candidates: 0, total: 0 }, calls: 0, errors: 0, last_sync: new Date().toISOString() };
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
    } catch (e) { console.error("❌ Falha na telemetria:", e.message); }
};

// ── Neuro-Training / DNA ────────────────────────────────────────────────
const MEMORY_FILE_PATH = path.join(__dirname, 'estilo_victor.json');

const getVictorStyle = () => {
    try {
        if (fs.existsSync(MEMORY_FILE_PATH)) {
            return JSON.parse(fs.readFileSync(MEMORY_FILE_PATH, 'utf8'));
        }
    } catch (e) { console.error("❌ Erro ao ler estilo_victor.json:", e); }
    return { style_rules: [] };
};

const getDnaContext = () => {
    const style = getVictorStyle();
    if (!style.style_rules || style.style_rules.length === 0) return '';
    return style.style_rules.map(r => `[${r.categoria}] ${r.titulo}: ${r.regra}`).join('\n');
};

// ── WebSocket Reporter ──────────────────────────────────────────────────
let wssRef = null;

function setWss(wss) { wssRef = wss; }

function reportAgentStatus(agent, status, reason = "", isDone = false) {
    if (wssRef && wssRef.clients) {
        const payload = JSON.stringify({ type: 'agent_log', agent, status, reason, isDone });
        wssRef.clients.forEach(client => {
            if (client.readyState === 1) client.send(payload);
        });
    }
}

// ── Exports ─────────────────────────────────────────────────────────────
module.exports = {
    // Core AI
    genAI, getAIModel, modelFlash, modelPro, wrapModel,
    LITE_MODEL, MAIN_MODEL, PRO_MODEL,
    GoogleAICacheManager,
    
    // Parsers
    extractJSON, repairTruncatedJSON,
    
    // Telemetria
    getTelemetry, trackUsage, TELEMETRY_FILE,
    
    // DNA / Neuro-Training
    getVictorStyle, getDnaContext, MEMORY_FILE_PATH,
    
    // WebSocket
    setWss, reportAgentStatus,

    // Node modules (re-export para conveniência)
    fs, path, axios
};
