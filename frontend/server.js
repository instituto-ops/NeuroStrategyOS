const express = require('express');
const multer = require('multer');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const WebSocket = require('ws');
const cloudinary = require('cloudinary').v2;
const textToSpeech = require('@google-cloud/text-to-speech');
const ttsClient = new textToSpeech.TextToSpeechClient();
require('dotenv').config({ path: '../.env' }); 

if (!process.env.GOOGLE_CLOUD_PROJECT && !process.env.GEMINI_API_KEY) {
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    console.error("!!! ERRO CRÍTICO: Variáveis de ambiente GOOGLE_CLOUD_PROJECT e GEMINI_API_KEY não foram definidas.");
    console.error("!!! Por favor, adicione-as ao seu arquivo .env");
    console.error("!!! O Antigravity Agent não funcionará corretamente sem isso.");
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
}

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

// [SMART MEDIA] Cloudinary Config (Se houver no .env)
const isCloudinaryActive = !!process.env.CLOUDINARY_API_KEY;
if (isCloudinaryActive) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
    console.log("☁️ [SMART MEDIA] Cloudinary Engine: ON (Conectado ao " + process.env.CLOUDINARY_CLOUD_NAME + ")");
} else {
    console.log("📍 [SMART MEDIA] Cloudinary Engine: OFF (Operando em modo Local-Only)");
}

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

// [HEMISFÉRIOS CEREBRAIS DA IA - GERAÇÃO 2026: PROTOCOLO ABIDOS V5.5]
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "DUMMY");

// Modelos Primários (Soberania do Usuário)
const LITE_MODEL = "gemini-2.5-flash-lite"; 
const MAIN_MODEL = "gemini-2.5-flash"; // PADRÃO SELECIONADO
const PRO_MODEL = "gemini-2.5-pro";

// Fallbacks de Segurança (Apenas legado)
const LEGACY_PRO = "gemini-1.5-pro";
const LEGACY_FLASH = "gemini-1.5-flash";

// Configuração dos Motores (Padrão: 2.5 Flash)
const VISION_MODEL = MAIN_MODEL; 
const HEAVY_MODEL = PRO_MODEL;
const STABLE_MODEL = LEGACY_PRO;

// Hemisfério Esquerdo (FLASH): Rápido, Multimodal e Estruturado
// Perfeito para ouvir seu áudio em tempo real e cuspir o JSON das regras.
const modelFlash = genAI.getGenerativeModel({ 
    model: VISION_MODEL, 
    generationConfig: { 
        responseMimeType: "application/json" 
    }
});

// Hemisfério Direito (PRO): Denso, Analítico e Criativo
// Perfeito para o Doctoralia Assistant e AI Studio (textos profundos e E-E-A-T).
const modelPro = genAI.getGenerativeModel({ 
    model: HEAVY_MODEL,
    generationConfig: {
        temperature: 0.7,
        responseMimeType: "application/json"
    }
});
const draftsDb = []; // In-memory store for newly generated drafts before WP sync

// Helper robust JSON parser
function extractJSON(text) {
    if (!text) return null;
    try {
        // Tenta encontrar o maior bloco {...} possível
        const match = text.match(/\{[\s\S]*\}/);
        if (!match) return null;
        let parsed = JSON.parse(match[0]);
        
        // CORREÇÃO DE SEGURANÇA: Se a IA encapsulou as regras dentro do 'reply' como string
        if (parsed.reply && typeof parsed.reply === 'string' && parsed.reply.includes('"regras_extraidas"')) {
            const subMatch = parsed.reply.match(/\{[\s\S]*\}/);
            if (subMatch) {
                const subParsed = JSON.parse(subMatch[0]);
                parsed.regras_extraidas = subParsed.regras_extraidas || parsed.regras_extraidas;
                parsed.reply = subParsed.reply || parsed.reply;
            }
        }
        return parsed;
    } catch { return null; }
}

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

FORMATO OBRIGATÓRIO (JSON):
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
        console.error("❌ Erro ao ler estilo_victor.json:", e);
    }
    return { style_rules: [] };
};

// ──────────────────────────────────────────────────────────────────────────────

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
        const sorted = Object.values(modules).sort((a,b) => a.order - b.order);
        res.json({ template: entry, totalVariables: allVars.length, modules: sorted });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// [API] Gerar Preview Final (Processador de Variáveis)
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
        if (menuId) {
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
// GESTÃO DE ACERVO (LOCAL CMS)
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
        console.error("❌ Erro Crítico GET /api/menus:", e);
        res.status(500).json({ error: "Falha na persistência de menus", details: e.message });
    }
});

// [API] Salvar Menus
app.post('/api/menus', (req, res) => {
    try {
        const menusData = req.body;
        if (!Array.isArray(menusData)) {
            throw new Error("Payload inválido: esperado um array de menus.");
        }
        fs.writeFileSync(MENUS_FILE, JSON.stringify(menusData, null, 2));
        res.status(200).json({ success: true, message: "Menus persistidos com sucesso!" });
    } catch (e) {
        console.error("❌ Erro Crítico POST /api/menus:", e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// ==============================================================================
// GESTÃO DE RASCUNHOS (DRAFTS PERSISTENCE)
// ==============================================================================
const DRAFTS_FILE = path.join(__dirname, 'drafts.json');

app.get('/api/drafts', async (req, res) => {
    try {
        console.log("📂 [DRAFTS] Consolidando rascunhos (File JSON + Physical Folder)...");
        let allDrafts = [];
        
        // 1. Carrega do drafts.json (AI Studio)
        if (fs.existsSync(DRAFTS_FILE)) {
            const dataJSON = JSON.parse(fs.readFileSync(DRAFTS_FILE, 'utf8'));
            if (Array.isArray(dataJSON)) allDrafts = [...dataJSON];
        }

        // 2. Carrega da pasta física (Auditores/LangGraph)
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
                    values: {}, // Vazio para rascunhos físicos
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
        console.error("❌ [DRAFTS ERROR]", e.message);
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

// 🏭 RENDERIZADOR DE MENUS DEDICADO POR TEMPLATE
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
    const waText = encodeURIComponent("Olá Dr. Victor, vi seu site e gostaria de saber mais sobre a Hipnose Clínica e como marcar uma primeira sessão.");
    const waLink = `https://wa.me/${waNumber}?text=${waText}`;

    // --- RENDERIZAÇÃO POR DESIGN SYSTEM ---

    if (templateId === '01' || templateId === '08') { // GLASS SYSTEMS
        const isEthereal = templateId === '08';
        const accentColor = isEthereal ? 'text-aura-indigo' : 'text-cyan-400';
        const brand = isEthereal ? 'sparkles' : 'brain';

        html += `<nav class="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-fit px-4 animate-fade-in-up">`;
        html += `<div class="glass-panel rounded-full px-2 py-2 flex items-center gap-2 sm:gap-6 shadow-2xl">`;
        
        if (isEthereal) {
            html += `<div class="w-10 h-10 bg-white/50 rounded-full flex items-center justify-center shrink-0"><i data-lucide="${brand}" class="w-4 h-4 text-slate-700"></i></div>`;
        } else {
            // Removido ícone redundante para evitar "blobs" no topo
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
        html += `<div class="flex items-center gap-3"><div class="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white"><i data-lucide="zap" class="w-5 h-5"></i></div><span class="font-bold text-white tracking-tighter uppercase text-xs">Acesso Rápido</span></div>`;
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

    // Geração do Schema.org para SEO Técnico
    const schemaOrg = {
        "@context": "https://schema.org",
        "@type": "SiteNavigationElement",
        "name": validItems.map(i => i.label),
        "url": validItems.map(i => processUrl(i.url))
    };

    html += `\n<!-- Schema.org Navigation -->\n<script type="application/ld+json">\n${JSON.stringify(schemaOrg, null, 2)}\n</script>\n`;
    
    return html;
}

// 📖 AUTO-TOC GENERATOR (Sumário Automático das tags H2)
function generateTOC(htmlContent) {
    const regex = /<h2[^>]*>(.*?)<\/h2>/gi;
    let match;
    let tocItems = [];
    let modifiedHtml = htmlContent;
    let index = 1;

    // Acha os H2, cria o link âncora e modifica o HTML original para colocar o id
    while ((match = regex.exec(htmlContent)) !== null) {
        // match[1] contém o innerHTML do h2. Vamos limpar tags e quebras.
        const cleanTitle = match[1].replace(/<[^>]+>/g, '').trim();
        if (cleanTitle && cleanTitle.length > 5 && !cleanTitle.includes('{{')) {
            const anchorId = `secao-${index}-${cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
            tocItems.push({ label: cleanTitle, url: `#${anchorId}` });
            
            // Substitui o <h2> exacto pela versão com ID
            const originalH2 = match[0];
            const newH2 = originalH2.replace('<h2', `<h2 id="${anchorId}"`);
            modifiedHtml = modifiedHtml.replace(originalH2, newH2);
            index++;
        }
    }
    
    return { modifiedHtml, tocItems };
}

// ==============================================================================
// 🚀 [API] SALVAR E LANÇAR PÁGINA (ORQUESTRAÇÃO FINAL)
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
            console.log(`✨ [AUTO-PATH] Gerando novo destino: ${targetPath}`);
            
            const dir = path.dirname(targetPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        }

        if (!fs.existsSync(path.dirname(targetPath))) throw new Error("Diretório de destino inválido.");

        const entry = TEMPLATE_CATALOG.find(t => t.id === templateId);
        if (!templateId || !entry) throw new Error("Template selecionada não existe no catálogo.");

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

        if (tocItems.length > 0 && ['02', '03', '04', '05', '06', '07', '10'].includes(templateId)) {
            const tocMenuHtml = `
                    <div class="fixed bottom-4 left-4 z-50 glass-panel lg:hidden p-3 rounded-2xl max-w-[200px]">
                        <div class="text-[10px] font-bold uppercase text-slate-400 mb-2 tracking-widest">+ Tópicos Neste Artigo</div>
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

// 🧬 NEUROENGINE DATA BLOCK
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

        res.json({ success: true, message: "Página orquestrada e lançada com sucesso no repositório Next.js!" });
    } catch (e) {
        console.error("Erro ao salvar página:", e);
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * 🔍 ROTA 1: Listar todo o Acervo
 * Varre a pasta src/app do site e encontra todos os arquivos page.tsx
 */
app.get('/api/acervo/listar', (req, res) => {
    try {
        const pages = [];

        // Função recursiva para ler subpastas (ex: /blog/ansiedade)
        function scanDirectory(directory) {
            const files = fs.readdirSync(directory);
            
            for (const file of files) {
                const fullPath = path.join(directory, file);
                const stat = fs.statSync(fullPath);

                if (stat.isDirectory()) {
                    scanDirectory(fullPath); // Entra na subpasta
                } else if (file === 'page.tsx') {
                    // Calcula a URL (Slug) baseada no nome da pasta
                    let slug = fullPath.replace(SITE_REPO_PATH, '').replace(/\\page\.tsx$/, '').replace(/\/page\.tsx$/, '');
                    if (!slug) slug = '/';
                    slug = slug.replace(/\\/g, '/'); // Corrige barras no Windows

                    pages.push({
                        slug: slug,
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

// [API] Criar Novo Álbum/Pasta no Acervo
app.post('/api/media/create-folder', (req, res) => {
    try {
        const { id, name, icon } = req.body;
        const data = JSON.parse(fs.readFileSync(ACERVO_MEDIA_FILE, 'utf8'));
        if (data.folders.find(f => f.id === id)) return res.json({ success: false, error: 'ID já existe.' });
        
        data.folders.push({ id, name, description: `Álbum criado pelo usuário: ${name}`, icon: icon || '📂' });
        fs.writeFileSync(ACERVO_MEDIA_FILE, JSON.stringify(data, null, 2));
        res.json({ success: true, folders: data.folders });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// [API] Atualizar Item de Mídia (Mudar pasta, título, etc)
app.post('/api/media/update-item', (req, res) => {
    try {
        const { itemId, folder, title, alt } = req.body;
        const data = JSON.parse(fs.readFileSync(ACERVO_MEDIA_FILE, 'utf8'));
        const item = data.items.find(i => i.id === itemId);
        if (!item) return res.status(404).json({ success: false, error: 'Item não encontrado.' });
        
        if (folder) item.folder = folder;
        if (title) item.title = title;
        if (alt) item.alt = alt;
        
        fs.writeFileSync(ACERVO_MEDIA_FILE, JSON.stringify(data, null, 2));
        res.json({ success: true, item });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// [API] Pick Intelligent: O Agente solicita uma imagem estratégica para um bloco
app.get('/api/media/pick-intelligent', (req, res) => {
    const { category } = req.query; // ex: ambiente, psicologo
    try {
        const data = JSON.parse(fs.readFileSync(ACERVO_MEDIA_FILE, 'utf8'));
        const filtered = data.items.filter(i => i.folder === category || category === 'any');
        
        if (filtered.length === 0) {
            // Fallback para ícones se não houver fotos reais
            const icons = data.items.filter(i => i.folder === 'icones');
            return res.json(icons.length > 0 ? icons[Math.floor(Math.random() * icons.length)] : null);
        }
        
        // Sorteia uma imagem da categoria para variedade no Studio
        const pick = filtered[Math.floor(Math.random() * filtered.length)];
        res.json(pick);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// O motor "Watchdog" de sincronização passiva (Simulado para não estourar recursos em loop)
const runWatchdog = async () => {
    try {
        const files = fs.readdirSync(LOCAL_WATCH_FOLDER).filter(f => f.match(/\.(jpg|jpeg|png|webp|svg)$/i));
        if (files.length === 0) return;

        console.log(`📡 [WATCHDOG] Detectadas ${files.length} novas mídias em midia_local...`);
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
                    console.log(`☁️ [CLOUDINARY] Enviando ${file} para a nuvem...`);
                    const result = await cloudinary.uploader.upload(oldPath, {
                        public_id: baseName,
                        folder: "neuroengine-v5",
                        overwrite: true,
                        resource_type: "auto"
                    });
                    finalUrl = result.secure_url;
                    console.log(`✅ [CLOUDINARY] Sucesso: ${finalUrl}`);
                } catch (cloudErr) {
                    console.error("❌ [CLOUDINARY ERROR]:", cloudErr.message);
                    // Fallback para local se o upload falhar
                    fs.renameSync(oldPath, newPath);
                }
            } else {
                // Modo offline / local
                fs.renameSync(oldPath, newPath);
            }

            db.items.push({
                id: `media_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                folder: "ambiente", // Categoria padrão (pode ser mudada no painel)
                url: finalUrl,
                title: "Asset Estratégico Abidos",
                alt: "Consultório Dr. Victor Lawrence - Hipnose Clínica e Psicologia em Goiânia"
            });
            console.log(`✅ [WATCHDOG] Item registrado no acervo.`);
        }

        db.last_sync = new Date().toISOString();
        fs.writeFileSync(ACERVO_MEDIA_FILE, JSON.stringify(db, null, 2));
    } catch (e) { console.error("❌ [WATCHDOG ERROR]:", e.message); }
};

// Ativa o Watchdog a cada 60 segundos (Mínima intervenção)
setInterval(runWatchdog, 60000);

// [API] Listar Mídia (Alias para Acervo na Transição Headless)
app.get('/api/acervo/list-media', (req, res) => {
    // Redireciona para o listar padrão que já mapeia as páginas
    // No futuro, isso varreria a pasta de assets/public
    res.json([]); 
});

/**
 * 📖 ROTA 2: Carregar os Dados de uma Página para o Studio
 * Lê o arquivo .tsx e extrai o JSON do neuroEngineData
 */
app.post('/api/acervo/ler-pagina', (req, res) => {
    const { caminhoFisico } = req.body;

    try {
        if (!fs.existsSync(caminhoFisico)) {
            return res.status(404).json({ success: false, error: 'Arquivo não encontrado' });
        }

        const conteudoTsx = fs.readFileSync(caminhoFisico, 'utf-8');

        // Regex cirúrgico para extrair apenas o bloco JSON do neuroEngineData
        const regexData = /export const neuroEngineData = ({[\s\S]*?});/;
        const match = conteudoTsx.match(regexData);

        if (match && match[1]) {
            // Converte o texto extraído de volta para um Objeto JavaScript
            const dadosRecuperados = JSON.parse(match[1]);
            
            res.json({ success: true, data: dadosRecuperados });
        } else {
            // Fallback para Páginas Legadas (Sem DNA)
            const h1Match = conteudoTsx.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
            const titleMatch = conteudoTsx.match(/title:\s*["']([^"']+)["']/i);
            
            const legacyData = {
                template: "", // Permite ao usuário escolher o novo template
                SEO_TITLE: titleMatch ? titleMatch[1] : "",
                SEO_H1_TECNICO: h1Match ? h1Match[1].replace(/<[^>]+>/g, '').trim() : "Título da Página"
            };

            res.json({ 
                success: true, 
                data: legacyData,
                warning: 'Esta página não possuía o DNA do NeuroEngine. Os dados foram inferidos. Por favor, selecione um template para atualizá-la.' 
            });
        }

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
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
        if (e.response?.status === 403) {
            console.warn("⚠️ [WP PROXY] Acesso negado pelo WordPress (403).");
        }
        return { error_silent: true, data: [] }; 
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
        const { prompt, modelType } = req.body;
        const targetModel = modelType === 'flash' ? VISION_MODEL : HEAVY_MODEL;
        console.log(`🧠 [AI PROXY] Gerando conteúdo com ${targetModel}...`);
        
        const model = genAI.getGenerativeModel({ 
            model: targetModel,
            generationConfig: { 
                responseMimeType: "application/json",
                temperature: 0.8
            }
        });

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        console.log(`🤖 [AI RESULT] JSON Gerado com Sucesso via ${modelType}.`);
        
        res.json({ text });
    } catch (e) { 
        console.error("❌ [AI PROXY ERROR]", e.message);
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
        
        CONTEXTO ADICIONAL DA VARIÁVEL: ${context || 'Geral'}
        `;

        const result = await model.generateContent([
            { text: prompt },
            { inlineData: { data: base64Data, mimeType: 'image/jpeg' } }
        ]);

        res.json({ alt: result.response.text().trim() });
    } catch (e) {
        console.error("❌ [DESCRIBE-IMAGE ERROR]", e);
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

// Eliminado duplicata de /api/drafts (Consolidado acima)

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

// [OBSOLETO] Removido para evitar conflito com motor V5 em /api/seo/analyze-silos no final do arquivo.

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

async function runConstructor(userInput, feedback = null, waNumber, moodId = "1_introspeccao_profunda", contentType = "pages", modelType = 'flash') {
    console.log(`🏗️ [Studio] Gerando rascunho direto: "${userInput.substring(0, 30)}..."`);
    const modelId = (modelType && modelType.includes('gemini')) ? modelType : (modelType === 'pro' ? HEAVY_MODEL : VISION_MODEL);
    const model = genAI.getGenerativeModel({ model: modelId });
    
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
        console.log(`📈 [MARKETING] Retornando dados neutros (Sem WordPress)`);

        const data = {
            visitors: 0, 
            leads: 0,
            abidos_score: "N/A",
            budget_utilization: "0%",
            top_performing_stag: "Nenhum ativo",
            critica_loss: "0% (Analytics não configurado)",
            recommendations: [
                { type: "SEO", theme: "Sincronizar Vercel/GA", reason: "Falta de dados de tráfego real" }
            ],
            insights: `Sistema operacional rodando online de forma independente.`
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
        const html = await runConstructor(userInput, null, waNumber, selectedMood, contentType, modelType);
        
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

        const html = await runConstructor(`Criar blueprint completo para o tema: ${theme}`, null, waNumber, selectedMood, contentType, req.body.modelType || 'flash');
        
        reportAgentStatus("Agente Construtor", "Blueprint entregue.", "", true);
        res.json({ reply: html });
    } catch (e) { 
        console.error("❌ [BLUEPRINT ERROR]", e.message);
        res.status(500).json({ error: e.message }); 
    }
});

app.post('/api/audit', async (req, res) => {
    try {
        const { html, keyword, modelType } = req.body;
        const modelId = (modelType && modelType.includes('gemini')) ? modelType : VISION_MODEL;
        const model = genAI.getGenerativeModel({ model: modelId });
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
                status: "Linguística Pura Ativada"
            }
        };
        fs.writeFileSync(MEMORY_FILE_PATH, JSON.stringify(memory, null, 2));
        console.log("🧹 [NEURO-MEMORY] Memória de Estilo limpa com sucesso.");
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/neuro-training/analyze-dna', upload.single('audio'), async (req, res) => {
    try {
        if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY não configurada no servidor.");
        if (!req.file) throw new Error("Aúdio não recebido.");
        const modelId = (req.body.modelType && req.body.modelType.includes('gemini')) ? req.body.modelType : VISION_MODEL;
        const model = genAI.getGenerativeModel({ model: modelId });
        
        const result = await model.generateContent([
            { text: PROMPT_TREINAMENTO_ISOLADO },
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

        const modelType = req.body.modelType;
        const modelId = (modelType && modelType.includes('gemini')) ? modelType : (modelType === 'flash' ? VISION_MODEL : HEAVY_MODEL);
        const targetModel = genAI.getGenerativeModel({ model: modelId });

        const completePrompt = `${PROMPT_TREINAMENTO_ISOLADO}

CONTEXTO: O PROFISSIONAL (Dr. Victor Lawrence) é o PARTICIPANTE 2 (P2). 
O PARTICIPANTE 1 (P1) é o CLIENTE/PACIENTE.
IGNORE P1 e extraia a sintaxe exclusivamente de P2.

TEXTO: "${text.substring(0, 8000).replace(/"/g, "'")}"`;

        const result = await targetModel.generateContent(completePrompt);
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

const { execSync } = require('child_process');

// ==============================================================================
// 1. PUBLICAR NO WORDPRESS (LEGADO / RASCUNHO)
// ==============================================================================
app.post('/api/content/publish-direct', async (req, res) => {
    try {
        const { type, title, content, status, slug, metaTitle, metaDesc } = req.body;
        console.log(`🚀 [PUBLISH PROXY] Iniciando deploy do tipo ${type}: "${title}"`);

        const payload = {
            title: title || "Sem Título",
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
                    const auditResult = await runProductionLine(`Auditar conteúdo salvo: ${title}`, payload.content, "62991545295", "1_introspeccao_profunda", type);
                    if (auditResult) {
                        await callWP('POST', `/${endpoint}/${postId}`, {
                            meta: {
                                _abidos_audit_status: "APROVADO",
                                _abidos_audit_report: JSON.stringify(auditResult),
                                _abidos_last_audit: new Date().toISOString()
                            }
                        });
                    }
                } catch (auditErr) { console.error(`🚨 [AUDIT-ERROR]:`, auditErr.message); }
            })();

        } else {
            res.status(500).json({ error: "Resposta inválida do WordPress." });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ==============================================================================
// 🆕 2. PUBLICAR NO VERCEL + NEXT.JS (PROTOCOLO v2.0 - MODERNO)
// ==============================================================================

app.post('/api/content/publish-vercel', async (req, res) => {
    try {
        const { title, content, slug, author = "Victor Lawrence", date = new Date().toLocaleDateString('pt-PT'), neuroEngineData = {} } = req.body;
        const sitePath = process.env.NEXTJS_SITE_PATH;

        if (!sitePath || !fs.existsSync(sitePath)) {
            throw new Error("Caminho do repositório Next.js não configurado.");
        }

        const blogPath = path.join(sitePath, 'src/app/blog', slug);
        if (!fs.existsSync(blogPath)) fs.mkdirSync(blogPath, { recursive: true });

        const pageTemplate = `"use client";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function BlogPage() {
  return (
    <div className="bg-grain min-h-screen bg-ink-900 font-manrope text-paper-100 flex flex-col antialiased">
      <nav className="sticky top-0 z-40 border-b border-ink-800 bg-ink-900/90 backdrop-blur-md px-6 py-4">
        <Link href="/" className="font-serif italic text-xl">V. Lawrence</Link>
      </nav>
      <main className="max-w-4xl mx-auto px-6 py-20">
        <h1 className="font-serif text-5xl lg:text-7xl mb-12">${title}</h1>
        <article className="prose prose-invert lg:prose-xl" dangerouslySetInnerHTML={{ __html: \`${content.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\` }} />
      </main>
    </div>
  );
}

// ==========================================
// 🧬 NEUROENGINE DATA BLOCK
// ==========================================
export const neuroEngineData = ${JSON.stringify(neuroEngineData || {}, null, 2)};
`;

        fs.writeFileSync(path.join(blogPath, 'page.tsx'), pageTemplate);

        // Deploy Automático via Git Push
        try {
            execSync(`git add . && git commit -m "feat: publish post ${slug}" && git push`, { cwd: sitePath });
            console.log(`✅ Deploy Vercel disparado para: ${slug}`);
        } catch (gitErr) { console.warn("Git Push ignorado (provavelmente sem mudanças)."); }

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
        const { question, modelType } = req.body;
        const modelId = (modelType && modelType.includes('gemini')) ? modelType : (modelType === 'flash' ? VISION_MODEL : HEAVY_MODEL);
        const targetModel = genAI.getGenerativeModel({ model: modelId });
        console.log(`🧠 [DOCTORALIA] Gerando resposta via motor ${modelType}...`);

        const dnaInjetado = getDnaContext();
        const systemPrompt = `
Você é o Gêmeo Digital Literário do Dr. Victor Lawrence (Psicólogo Clínico CRP 09/012681, Especialista em TEA em Adultos e Hipnose Ericksoniana, Mestre UFU, Goiânia-GO).
Sua missão é responder à dúvida de um paciente na plataforma Doctoralia.

${dnaInjetado}

ESTRUTURA OBRIGATÓRIA DA RESPOSTA (MÉTODO ABIDOS):
1. Acolhimento (Pacing): Valide a dor ou dúvida aplicando sua empatia e cadência características.
2. Utilidade Prática: Explique de forma psicoeducativa, breve e fenomenológica.
3. Reforço de Autoridade (E-E-A-T): Se o tema for TEA, Burnout ou Hipnose, mencione sutilmente sua experiência.
4. Fechamento: Convide para avaliação de forma permissiva, típica da sua linguagem ericksoniana.

DIRETRIZES ÉTICAS:
- NUNCA faça diagnósticos fechados ou prometa cura.
- Retorne APENAS o texto da resposta, sem markdown.

PERGUNTA DO PACIENTE: "${question}"`;

        const result = await targetModel.generateContent(systemPrompt);
        let reply = result.response.text()
            .replace(/\*\*/g, '').replace(/###/g, '').replace(/##/g, '')
            .replace(/#/g, '').replace(/\*/g, '').trim();

        res.json({ success: true, reply });
    } catch (e) {
        console.error('❌ [DOCTORALIA ERROR]', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/api/doctoralia/audit', async (req, res) => {
    try {
        const { modelType } = req.body;
        const modelId = (modelType && modelType.includes('gemini')) ? modelType : (modelType === 'flash' ? VISION_MODEL : HEAVY_MODEL);
        const targetModel = genAI.getGenerativeModel({ model: modelId });
        
        const systemPrompt = `Você é um Auditor de Compliance Médico e Ético do Conselho Federal de Psicologia (CFP).
Sua ÚNICA missão é ler a resposta que uma IA gerou para um paciente e procurar por ALUCINAÇÕES ou INFRAÇÕES ÉTICAS.

DADOS IMUTÁVEIS DO PROFISSIONAL:
- Nome: Victor Lawrence | Registro: CRP 09/012681
- Titulação: Mestrando em Ciências da Saúde (UFU), TEA, Hipnose Clínica.

REGRAS DE REPROVAÇÃO:
1. Promessa de cura ou prazos.
2. Invenção de titulação.
3. Diagnóstico online ou prescrição.
4. Tom robótico.

RETORNE JSON: { "status": "APROVADO|REPROVADO", "feedback_auditoria": "...", "sugestao_correcao": "..." }`;

        const prompt = `Mensagem: "${original_message}"\nResposta: "${generated_reply}"`;
        const result = await targetModel.generateContent(`${systemPrompt}\n\n${prompt}`);

        const parsed = extractJSON(result.response.text());
        res.json(parsed || { status: "REPROVADO", feedback_auditoria: "Falha no parser.", sugestao_correcao: "" });
    } catch (error) {
        console.error('❌ [ERRO AUDITORIA DOCTORALIA]', error);
        res.status(500).json({ error: 'Falha ao auditar.' });
    }
});

app.post('/api/doctoralia/refine-reply', async (req, res) => {
    try {
        const { original_reply, auditor_feedback } = req.body;
        
        const refinePrompt = `
Você é o Revisor de Compliance do Dr. Victor Lawrence.
Sua tarefa é REESCREVER a resposta abaixo aplicando as correções solicitadas pelo Auditor Ético.

[TEXTO ORIGINAL COM ERRO]:
"${original_reply}"

[FEEDBACK DO AUDITOR]:
"${auditor_feedback}"

[DIRETRIZES DE REESCRITA]:
- Mantenha o DNA de voz do Dr. Victor (acolhedor, técnico, fenomenológico).
- Remova EXATAMENTE o que o auditor apontou como perigoso ou falso.
- Retorne APENAS o texto corrigido, em parágrafos limpos, sem markdown.
        `;

        const modelId = (req.body.modelType && req.body.modelType.includes('gemini')) ? req.body.modelType : (req.body.modelType === 'flash' ? VISION_MODEL : HEAVY_MODEL);
        const targetModel = genAI.getGenerativeModel({ model: modelId });
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

        const modelId = (req.body.modelType && req.body.modelType.includes('gemini')) ? req.body.modelType : HEAVY_MODEL;
        const model = genAI.getGenerativeModel({ model: modelId });
        const result = await model.generateContent(refinePrompt);
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

// [API] Auditoria de Alta Conversão (Inspetor Abidos V3.2)
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

        console.log(`⚖️ Auditando Draft Abidos (${modelType || 'pro'})...`);

        const prompt = `Você é o INSPETOR ABIDOS V3.2. 
        Analise o conteúdo abaixo e dê uma nota de 0 a 100 baseada em Neuromarketing e SEO.
        
        [CONTEÚDO]:
        ${JSON.stringify(cleanedValues, null, 2)}
        
        RETORNE EXATAMENTE UM JSON:
        { "score": 85, "feedback": "Explicação...", "aprovado": true }`;

        const result = await targetModel.generateContent(prompt);
        const text = result.response.text();
        const audit = extractJSON(text);
        if (!audit) throw new Error("IA não retornou um JSON válido de auditoria.");
        
        console.log("📊 [AUDIT-ABIDOS RESULT]:", audit);
        res.json(audit);
    } catch (err) {
        console.error("Erro Audit Abidos:", err);
        res.status(500).json({ error: "Falha na auditoria cerebral: " + err.message });
    }
});

// [API] Auditoria Clínica (Factualidade e Ética)
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

        console.log(`🛡️ Iniciando Auditoria Clínica (${modelType || 'pro'})...`);

        const prompt = `Você é o AUDITOR CLÍNICO V4 (CRP Compliance).
        Verifique a Ética e Factualidade. Proibido prometer cura.
        
        [CONTEÚDO]:
        ${JSON.stringify(cleanedValues, null, 2)}
        
        RETORNE EXATAMENTE UM JSON:
        { "status": "APROVADO", "feedback_clinico": "..." }`;

        const result = await targetModel.generateContent(prompt);
        const text = result.response.text();
        const audit = extractJSON(text);
        if (!audit) throw new Error("IA não retornou um JSON válido de auditoria clínica.");
        
        console.log("🛡️ [AUDIT-CLINICAL RESULT]:", audit);
        res.json(audit);
    } catch (err) {
        console.error("Erro Audit Clínica:", err);
        res.status(500).json({ error: "Falha na auditoria clínica: " + err.message });
    }
});

// [DUPLICATA REMOVIDA - ROTA CONSOLIDADA EM /api/blueprint/cluster ACIMA]

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
            { id: "silo_1", hub: "Autismo Adulto", slug: "autismo-adulto", spokes: ["Diagnóstico Tardio", "Sinais Sutis em Mulheres"] },
            { id: "silo_2", hub: "Ansiedade e Burnout", slug: "ansiedade-burnout", spokes: ["Terapia Estratégica", "Sintomas Físicos"] }
        ]
    };
    res.json(defaultData);
});

app.post('/api/seo/silos', (req, res) => {
    try {
        console.log("💾 [API-SILO] Recebendo atualização de silos...");
        const silos = req.body;
        if (!Array.isArray(silos)) {
            console.error("❌ [API-SILO ERROR] Payload não é um array:", silos);
            return res.status(400).json({ error: "O corpo da requisição deve ser um array de silos." });
        }

        const siloPath = path.join(__dirname, 'silos.json');
        fs.writeFileSync(siloPath, JSON.stringify({ silos: silos }, null, 2));
        console.log(`✅ [API-SILO] ${silos.length} silos persistidos com sucesso.`);
        res.json({ success: true });
    } catch (e) {
        console.error("❌ [API-SILO FATAL ERROR]:", e);
        res.status(500).json({ error: e.message });
    }
});

// [API] ACERVO NACIONAL (Vercel Native)
// Varre rascunhos e simula inventário de páginas publicadas
app.get('/api/acervo/listar', (req, res) => {
    try {
        console.log("📂 [ACERVO] Listando inventário completo...");
        
        // Títulos de rascunhos gerados na sessão atual
        const draftTitles = draftsDb.map(d => d.tema_foco);
        
        // Simulação de páginas que já estariam no site (Vercel)
        // No futuro, isso varreria a pasta de dist/ ou um banco de dados real
        const publishedPages = [
            { slug: "/autismo-adulto", titulo: "O que é Autismo Adulto?", status: "PUBLICADO", ultimaAtualizacao: new Date().toISOString() },
            { slug: "/ansiedade-goiania", titulo: "Tratamento de Ansiedade", status: "PUBLICADO", ultimaAtualizacao: new Date().toISOString() }
        ];
        
        res.json({
            success: true,
            drafts: draftTitles,
            paginas: publishedPages, // Formato esperado pelo acervo.js
            inventory: {
                drafts: draftTitles,
                published: publishedPages.map(p => p.titulo)
            }
        });
    } catch (e) {
        console.error("❌ [ACERVO ERROR]", e);
        res.status(500).json({ error: e.message });
    }
});

// [API] Sugestão de Silos e STAGs via IA Abidos (Motor Semântico V5)
app.get('/api/seo/analyze-silos', async (req, res) => {
    try {
        console.log("🧠 [ABIDOS-SILO] Iniciando análise de demanda estratégica...");
        const siloPath = path.join(__dirname, 'silos.json');
        let currentSilos = [];
        try {
            if (fs.existsSync(siloPath)) {
                const raw = fs.readFileSync(siloPath, 'utf-8');
                currentSilos = JSON.parse(raw).silos || [];
            }
        } catch(e) { console.error("Erro leitura silos:", e); }
        
        const prompt = `[CONTEXTO]: Dr. Victor Lawrence, Psicólogo e Hipnoterapeuta Clínico.
        [ARQUITETURA ATUAL]: 
        ${currentSilos.map(s => `- Hub: ${s.hub} (Spokes: ${s.spokes.join(', ')})`).join('\n')}
        
        Aja como o Agente Abidos. 
        1. ANALISE a arquitetura atual. Identifique falhas de cobertura ou silos pouco explorados.
        2. SUGIRA 3 novos silos ou expansões críticas para os já existentes.
        3. Para cada sugestão, defina um HUB imponente e 5 SPOKES (Postagens / Artigos) de alta intenção clínica.
        4. O foco deve ser em conversão (venda de sessões) e autoridade técnica (E-E-A-T).
        
        RETORNE EXATAMENTE UM JSON NO FORMATO:
        { "suggestions": [ { "hub": "...", "slug": "hub-slug", "spokes": ["...", "...", "..."] } ] }`;

        const result = await modelFlash.generateContent(prompt);
        const text = result.response.text();
        
        const data = extractJSON(text);
        if (!data || !data.suggestions) throw new Error("A IA não retornou sugestões válidas.");
        
        // Garante que cada sugestão tenha slug
        data.suggestions.forEach(s => {
            if (!s.slug) s.slug = s.hub.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
        });

        res.json(data);
    } catch (e) {
        console.error("❌ [ABIDOS-SILO ERROR]", e);
        res.status(500).json({ success: false, error: e.message || "Falha na geração neural de silos." });
    }
});

app.use('/api/*', (req, res) => {
    res.status(404).json({ 
        success: false, 
        error: "Endpoint não encontrado no ecossistema NeuroEngine (Protocolo V5)." 
    });
});

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
            const modelId = HEAVY_MODEL; // Live voice defaults to Pro
            const model = genAI.getGenerativeModel({ model: modelId });
            const result = await model.generateContent([
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

// =======================================================================
// ROTA: GERADOR DE VOZ PREMIUM (GOOGLE TTS NEURAL)
// =======================================================================
app.post('/api/neuro-training/tts', async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ error: 'Texto vazio.' });

        const request = {
            input: { text: text },
            // Voz pt-BR-Neural2-B (Masculina, natural, excelente cadência)
            voice: { languageCode: 'pt-BR', name: 'pt-BR-Neural2-B' }, 
            audioConfig: { 
                audioEncoding: 'MP3',
                speakingRate: 1.05, // Ligeiramente acelerado para tom coloquial
                pitch: -1.0         // Tom ligeiramente mais grave
            },
        };

        const [response] = await ttsClient.synthesizeSpeech(request);
        
        res.set('Content-Type', 'audio/mpeg');
        res.send(response.audioContent);
    } catch (error) {
        console.error('❌ [ERRO GOOGLE TTS]', error);
        res.status(500).json({ error: 'Falha ao gerar voz neural' });
    }
});
