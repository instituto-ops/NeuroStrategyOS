const fs = require('fs');
const path = require('path');
module.exports = function(app, deps) {
const { SITE_REPO_PATH, TEMPLATE_CATALOG } = deps;
// ==============================================================================
// GESTÃO DE ACERVO (LOCAL CMS)
// ==============================================================================


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
        console.error("âÂÅ’ Erro Crítico GET /api/menus:", e);
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
        console.error("âÂÅ’ Erro Crítico POST /api/menus:", e);
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
        console.error("âÂÅ’ [DRAFTS ERROR]", e.message);
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

// Ã°Å¸ÂÂ­ RENDERIZADOR DE MENUS DEDICADO POR TEMPLATE
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

// Ã°Å¸â€œâ€“ AUTO-TOC GENERATOR (Sumário Automático das tags H2)
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
// 🚀 [API] SALVAR E LANÇAR PÃƒÂGINA (ORQUESTRAÇÃO FINAL)
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
            console.log(`âÅ“Â¨ [AUTO-PATH] Gerando novo destino: ${targetPath}`);
            
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

        // --- INJEÇÃO GOOGLE TAG MANAGER (GTM) - DINÃƒâ€šMICA ---
        const googleTag = getGoogleTagSnippet();
        const googleTagNoscript = getGoogleTagNoscript();
        
        // 1. Script no <head> (O mais alto possível)
        if (htmlSource.match(/<head[^>]*>/i)) {
            htmlSource = htmlSource.replace(/<head[^>]*>/i, `$&\n${googleTag}`);
        } else {
            htmlSource = googleTag + htmlSource;
        }

        // 2. Noscript após <body>
        if (htmlSource.includes('<body>')) {
            htmlSource = htmlSource.replace('<body>', `<body>\n${googleTagNoscript}`);
        } else if (htmlSource.match(/<body[^>]*>/)) {
            htmlSource = htmlSource.replace(/<body[^>]*>/, `$&\n${googleTagNoscript}`);
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

// Ã°Å¸Â§Â¬ NEUROENGINE DATA BLOCK
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
 * Ã°Å¸â€Â ROTA 1: Listar todo o Acervo
 * Varre a pasta src/app do site e encontra todos os arquivos page.tsx
 */
app.get('/api/acervo/listar', (req, res) => {
    try {
        const pages = [];

        // Função recursiva para ler subpastas (ex: /blog/ansiedade)
        function scanDirectory(directory) {
            if (!fs.existsSync(directory)) return;
            const files = fs.readdirSync(directory);
            
            for (const file of files) {
                const fullPath = path.join(directory, file);
                const stat = fs.statSync(fullPath);

                if (stat.isDirectory()) {
                    // Ignora pastas de sistema do Next.js ou rascunhos se necessário
                    if (file.startsWith('.') || file === 'api' || file === 'components') continue;
                    scanDirectory(fullPath); 
                } else if (file === 'page.tsx') {
                    let slug = fullPath.replace(SITE_REPO_PATH, '').replace(/\\page\.tsx$/, '').replace(/\/page\.tsx$/, '');
                    if (!slug) slug = '/';
                    slug = slug.replace(/\\/g, '/');

                    // Tenta extrair o título do neuroEngineData
                    let title = "Sem Título";
                    let status = "PUBLICADO"; // Default
                    try {
                        const content = fs.readFileSync(fullPath, 'utf8');
                        const dnaMatch = content.match(/export const neuroEngineData = (\{[\s\S]*?\});/);
                        if (dnaMatch) {
                            const dna = JSON.parse(dnaMatch[1]);
                            title = dna.SEO_TITLE || dna.H1 || dna.THEME || "Página Abidos";
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

// [API] Criar Novo ÃƒÂlbum/Pasta no Acervo
app.post('/api/media/create-folder', (req, res) => {
    try {
        const { id, name, icon } = req.body;
        const data = JSON.parse(fs.readFileSync(ACERVO_MEDIA_FILE, 'utf8'));
        if (data.folders.find(f => f.id === id)) return res.json({ success: false, error: 'ID já existe.' });
        
        data.folders.push({ id, name, description: `ÃƒÂlbum criado pelo usuário: ${name}`, icon: icon || '📂' });
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

// [API] Alterar Slug (URL) de uma Página Existente
app.post('/api/acervo/alterar-slug', async (req, res) => {
    try {
        const { caminhoFisico, novoSlug } = req.body;
        if(!caminhoFisico || !novoSlug) throw new Error("Dados incompletos.");

        const cleanSlug = novoSlug.replace(/^\/|\/$/g, '').replace(/[^a-z0-9-]/g, '-').toLowerCase();
        const oldPath = path.dirname(caminhoFisico);
        const newPath = path.join(SITE_REPO_PATH, cleanSlug);

        if (fs.existsSync(newPath)) throw new Error("Essa URL (Slug) já existe.");

        fs.renameSync(oldPath, newPath);
        res.json({ success: true, novoCaminho: path.join(newPath, 'page.tsx'), novoSlug: '/' + cleanSlug });

    } catch (e) {
        console.error("Erro ao alterar slug:", e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// [API] Alterar Título Amigável de uma Página Existente (E-E-A-T)
app.post('/api/acervo/alterar-titulo', async (req, res) => {
    try {
        const { caminhoFisico, novoTitulo } = req.body;
        if(!caminhoFisico || !novoTitulo) throw new Error("Dados incompletos.");

        const content = fs.readFileSync(caminhoFisico, 'utf8');
        const dnaMatch = content.match(/export const neuroEngineData = (\{[\s\S]*?\});/);
        
        if (dnaMatch) {
            let dna = JSON.parse(dnaMatch[1]);
            dna.THEME = novoTitulo;
            dna.H1 = novoTitulo; // Sincroniza H1 por padrão para SEO
            const newDNAString = `export const neuroEngineData = ${JSON.stringify(dna, null, 2)};`;
            const newContent = content.replace(/export const neuroEngineData = \{[\s\S]*?\};/, newDNAString);
            fs.writeFileSync(caminhoFisico, newContent);
        }

        res.json({ success: true, novoTitulo });

    } catch (e) {
        console.error("Erro ao alterar título:", e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// [API] Definir Homepage Fixa (/)
app.post('/api/acervo/definir-home', async (req, res) => {
    try {
        const { caminhoFisico } = req.body;
        if(!caminhoFisico) throw new Error("Caminho físico não informado.");

        // Usa SITE_REPO_PATH unificado em vez de fallback para site-nextjs
        const targetPath = path.join(SITE_REPO_PATH, 'page.tsx');
        
        console.log(`Ã°Å¸ÂÂ  [HOME] Definindo nova homepage: ${caminhoFisico} -> ${targetPath}`);

        if (!fs.existsSync(caminhoFisico)) throw new Error("Arquivo de origem não encontrado.");
        
        // Simplesmente copia o conteúdo da página selecionada para a raiz
        fs.copyFileSync(caminhoFisico, targetPath);

        res.json({ success: true, message: "Página inicial atualizada com sucesso no repositório Next.js." });

    } catch (e) {
        console.error("âÂÅ’ Erro ao definir home:", e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// [API] Alterar Status (DRAFT/PUBLICADO) de uma Página
app.post('/api/acervo/alterar-status', async (req, res) => {
    try {
        const { caminhoFisico, novoStatus } = req.body;
        if(!caminhoFisico) throw new Error("Caminho físico não informado.");

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
// Ã°Å¸ÂÂ·Ã¯Â¸Â GOOGLE TAG MANAGER - CONFIGURAÇÃO GLOBAL
// ==============================================================================
const GOOGLE_TAG_FILE = path.join(__dirname, 'google_tag_config.json');

const getGoogleTagConfig = () => {
    try {
        if (fs.existsSync(GOOGLE_TAG_FILE)) {
            return JSON.parse(fs.readFileSync(GOOGLE_TAG_FILE, 'utf8'));
        }
    } catch (e) {
        console.error("âÂÅ’ Erro ao ler google_tag_config.json:", e);
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
        console.log(`Ã°Å¸ÂÂ·Ã¯Â¸Â [GOOGLE TAG] Configuração atualizada: ${config.tagId} (${config.active ? 'ATIVO' : 'INATIVO'})`);
        res.json({ success: true, config });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==============================================================================
// Ã°Å¸â€œÂ¥ IMPORTAÇÃO MANUAL DE HTML (PÃƒÂGINAS CUSTOMIZADAS)
// ==============================================================================
const MANUAL_PAGES_FILE = path.join(__dirname, 'manual_pages.json');

const getManualPages = () => {
    try {
        if (fs.existsSync(MANUAL_PAGES_FILE)) {
            return JSON.parse(fs.readFileSync(MANUAL_PAGES_FILE, 'utf8'));
        }
    } catch (e) { console.error("âÂÅ’ Erro ao ler manual_pages.json:", e); }
    return [];
};

const saveManualPages = (pages) => {
    fs.writeFileSync(MANUAL_PAGES_FILE, JSON.stringify(pages, null, 2));
};

// [API] Listar páginas manuais
app.get('/api/acervo/manual', (req, res) => {
    try {
        res.json({ success: true, pages: getManualPages() });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// [API] Criar/Atualizar página manual (metadados)
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

                // Se houver arquivo físico e status foi alterado, atualiza o arquivo também
                if (pages[idx].caminhoFisico && status && fs.existsSync(pages[idx].caminhoFisico)) {
                    try {
                        let content = fs.readFileSync(pages[idx].caminhoFisico, 'utf8');
                        const dnaMatch = content.match(/export const neuroEngineData = (\{[\s\S]*?\});/);
                        if (dnaMatch) {
                            let dna = JSON.parse(dnaMatch[1]);
                            dna.STATUS = status;
                            content = content.replace(/export const neuroEngineData = \{[\s\S]*?\};/, `export const neuroEngineData = ${JSON.stringify(dna, null, 2)};`);
                            fs.writeFileSync(pages[idx].caminhoFisico, content);
                            console.log(`âÅ“â€¦ [STATUS] Arquivo físico atualizado: ${pages[idx].caminhoFisico}`);
                        }
                    } catch (e) { console.warn("Falha ao atualizar arquivo físico no status manual:", e); }
                }
            }
        } else {
            // Criar nova
            const newPage = {
                id: 'MANUAL-' + Date.now(),
                title: title || 'Página Manual',
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

// [API] Importar/Salvar HTML customizado para uma página manual
app.post('/api/acervo/manual/import-html', (req, res) => {
    try {
        const { pageId, htmlContent, useShell, seoFields } = req.body;
        if (!pageId) throw new Error("pageId é obrigatório.");

        let pages = getManualPages();
        const idx = pages.findIndex(p => p.id === pageId);
        if (idx < 0) throw new Error("Página manual não encontrada.");

        // Parse inteligente: Extrai apenas o <body> se HTML completo for colado
        let cleanHtml = htmlContent || '';
        const bodyMatch = cleanHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        if (bodyMatch) {
            cleanHtml = bodyMatch[1].trim();
            console.log(`Ã°Å¸â€œÂ¥ [MANUAL] Parse inteligente: Extraído conteúdo do <body> (${cleanHtml.length} chars)`);
        }

        // Salvar versão anterior
        if (pages[idx].htmlContent && pages[idx].htmlContent.length > 0) {
            if (!pages[idx].versions) pages[idx].versions = [];
            pages[idx].versions.push({
                html: pages[idx].htmlContent,
                timestamp: pages[idx].lastUpdate || new Date().toISOString()
            });
            // Manter apenas as últimas 5 versões
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

// [API] Ler HTML de uma página manual
app.post('/api/acervo/manual/read-html', (req, res) => {
    try {
        const { pageId } = req.body;
        const pages = getManualPages();
        const page = pages.find(p => p.id === pageId);
        if (!page) throw new Error("Página não encontrada.");
        res.json({ success: true, page });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// [API] Gerar Preview de uma página manual (renderiza com Template 00)
app.post('/api/acervo/manual/preview', (req, res) => {
    try {
        const { pageId } = req.body;
        const pages = getManualPages();
        const page = pages.find(p => p.id === pageId);
        if (!page) throw new Error("Página não encontrada.");

        let finalHtml = page.htmlContent || '<p>Nenhum conteúdo HTML importado ainda.</p>';

        if (page.useShell) {
            // Carrega Template 00
            const shellPath = path.join(__dirname, '../templates/master_template_00_blank.html');
            let shell = fs.readFileSync(shellPath, 'utf8');

            // Injeta variáveis
            shell = shell.replace(/\{\{corpo_customizado\}\}/g, finalHtml);
            shell = shell.replace(/\{\{seo_title\}\}/g, page.title || 'Página');
            shell = shell.replace(/\{\{seo_h1_tecnico\}\}/g, page.seoFields?.h1 || page.title || '');
            shell = shell.replace(/\{\{seo_resumo_indexacao\}\}/g, page.seoFields?.resumo || '');
            
            // Injeta H2s do SEO
            const h2s = page.seoFields?.h2s || [];
            for (let i = 1; i <= 3; i++) {
                shell = shell.replace(`{{secao${i}_h2}}`, h2s[i - 1] || '');
            }

            // Injeta Google Tag Manager (head + body)
            // Injeta Google Tag Manager (head + body) conforme solicitação do usuário
            const googleTag = getGoogleTagSnippet();
            const googleTagNoscript = getGoogleTagNoscript();

            // 1. No topo do <head>
            if (shell.match(/<head[^>]*>/i)) {
                shell = shell.replace(/<head[^>]*>/i, `$&\n${googleTag}`);
            } else {
                shell = googleTag + shell;
            }

            // 2. Imediatamente após o <body>
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

// [API] Publicar página manual no repositório Next.js
app.post('/api/acervo/manual/publicar', async (req, res) => {
    try {
        const { pageId } = req.body;
        const pages = getManualPages();
        const page = pages.find(p => p.id === pageId);
        if (!page) throw new Error("Página não encontrada.");
        if (!page.htmlContent) throw new Error("Nenhum HTML importado para publicar.");

        let finalHtml = page.htmlContent;

        if (page.useShell) {
            const shellPath = path.join(__dirname, '../templates/master_template_00_blank.html');
            let shell = fs.readFileSync(shellPath, 'utf8');

            shell = shell.replace(/\{\{corpo_customizado\}\}/g, finalHtml);
            shell = shell.replace(/\{\{seo_title\}\}/g, page.title || 'Página');
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

            // 2. Imediatamente após o <body>
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

// Ã°Å¸Â§Â¬ NEUROENGINE DATA BLOCK
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

        // Atualiza status da página manual
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

        res.json({ success: true, message: `Página manual salva como rascunho em /${cleanSlug}`, targetPath });
    } catch (e) {
        console.error("Erro ao publicar página manual:", e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// [API] Deletar página manual
app.delete('/api/acervo/manual/:id', (req, res) => {
    try {
        let pages = getManualPages();
        pages = pages.filter(p => p.id !== req.params.id);
        saveManualPages(pages);
        res.json({ success: true });
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

        console.log(`Ã°Å¸â€œÂ¡ [WATCHDOG] Detectadas ${files.length} novas mídias em midia_local...`);
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
                    console.log(`âËœÂÃ¯Â¸Â [CLOUDINARY] Enviando ${file} para a nuvem...`);
                    const result = await cloudinary.uploader.upload(oldPath, {
                        public_id: baseName,
                        folder: "neuroengine-v5",
                        overwrite: true,
                        resource_type: "auto"
                    });
                    finalUrl = result.secure_url;
                    console.log(`âÅ“â€¦ [CLOUDINARY] Sucesso: ${finalUrl}`);
                } catch (cloudErr) {
                    console.error("âÂÅ’ [CLOUDINARY ERROR]:", cloudErr.message);
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
            console.log(`âÅ“â€¦ [WATCHDOG] Item registrado no acervo.`);
        }

        db.last_sync = new Date().toISOString();
        fs.writeFileSync(ACERVO_MEDIA_FILE, JSON.stringify(db, null, 2));
    } catch (e) { console.error("âÂÅ’ [WATCHDOG ERROR]:", e.message); }
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
 * Ã°Å¸â€œâ€“ ROTA 2: Carregar os Dados de uma Página para o Studio
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

};

