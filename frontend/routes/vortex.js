/**
 * 🌀 Vórtex AI Studio — Route Module
 * 
 * Endpoints de geração de código, streaming SSE, cache de contexto,
 * commit GitHub, VFS e preview.
 */

const { genAI, getAIModel, wrapModel, extractJSON, trackUsage,
        LITE_MODEL, MAIN_MODEL, PRO_MODEL, GoogleAICacheManager,
        fs, path } = require('../shared');

// Estado global do cache Vórtex
let vortexActiveCache = null;
const cacheManager = process.env.GEMINI_API_KEY ? new GoogleAICacheManager(process.env.GEMINI_API_KEY) : null;
const axios = require('axios');
const STYLE_PREFERENCES_PATH = path.join(__dirname, '..', 'data', 'style_preferences.json');

function ensureStylePreferences() {
    const dir = path.dirname(STYLE_PREFERENCES_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(STYLE_PREFERENCES_PATH)) {
        fs.writeFileSync(STYLE_PREFERENCES_PATH, JSON.stringify({ positive: [], negative: [], history: [] }, null, 2));
    }
}

function readStylePreferences() {
    try {
        ensureStylePreferences();
        return JSON.parse(fs.readFileSync(STYLE_PREFERENCES_PATH, 'utf8'));
    } catch (e) {
        return { positive: [], negative: [], history: [] };
    }
}

function writeStylePreferences(preferences) {
    ensureStylePreferences();
    fs.writeFileSync(STYLE_PREFERENCES_PATH, JSON.stringify(preferences, null, 2), 'utf8');
}

function extractStyleSignals(code) {
    const source = String(code || '');
    const signals = new Set();

    const classRegex = /class(?:Name)?=["'`]([^"'`]+)["'`]/g;
    let match;
    while ((match = classRegex.exec(source)) !== null) {
        match[1].split(/\s+/).filter(Boolean).slice(0, 18).forEach(cls => signals.add(cls));
    }

    const colorRegex = /#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|\b(?:teal|indigo|slate|emerald|amber|rose|cyan|violet|zinc|neutral|stone)-\d{2,3}\b/g;
    while ((match = colorRegex.exec(source)) !== null) signals.add(match[0]);

    return Array.from(signals).slice(0, 40);
}

function buildStylePreferenceContext() {
    const preferences = readStylePreferences();
    const positive = (preferences.positive || []).slice(-30);
    const negative = (preferences.negative || []).slice(-30);
    if (!positive.length && !negative.length) return '';

    return [
        '[MEMORIA ESTETICA DO VORTEX]',
        positive.length ? `Preferencias aprovadas: ${positive.join(', ')}` : '',
        negative.length ? `Evitar padroes rejeitados: ${negative.join(', ')}` : '',
        'Use estas preferencias como diretriz leve; mantenha legibilidade, performance e compliance Abidos.'
    ].filter(Boolean).join('\n').slice(0, 2500);
}

function compactForPrompt(value, max = 12000) {
    const text = typeof value === 'string' ? value : JSON.stringify(value || {}, null, 2);
    return text.length > max ? text.slice(0, max) + '\n...[truncado]' : text;
}

// Helper: Carregar Contexto CSA (Cognitive State Architecture)
async function getCSAContext() {
    const basePath = path.join(__dirname, '..', '..', 'CSA', '1_Diretrizes_e_Memoria');
    let context = '';
    try {
        const rules = fs.readFileSync(path.join(basePath, 'regras_base.md'), 'utf8');
        const manual = fs.readFileSync(path.join(basePath, 'manual_do_arquiteto.md'), 'utf8');
        const dictionary = fs.readFileSync(path.join(basePath, 'dicionario_de_termos.md'), 'utf8');
        context = `[CSA SYSTEM CONTEXT]\n${rules}\n\n[MANUAL DO ARQUITETO]\n${manual}\n\n[DICIONARIO DE TERMOS]\n${dictionary}`;
    } catch (e) {
        console.warn('⚠️ [VORTEX] Falha ao carregar diretrizes CSA:', e.message);
    }
    return context;
}

// Helper: Atualizar Estado Atual (RAM de Contexto) com Backup SAGA
async function updateVortexState(action) {
    const statePath = path.join(__dirname, '..', '..', 'estado_atual.md');
    const backupDir = path.join(__dirname, '..', '..', 'CSA', '4_Execucao_e_Historico', 'Backup');
    const timestamp = new Date().toLocaleString('pt-BR');
    const fileTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    try {
        // [SAGA-LLM] Backup preventivo antes de anexar log
        if (fs.existsSync(statePath)) {
            const backupPath = path.join(backupDir, `estado_${fileTimestamp}.md`);
            fs.copyFileSync(statePath, backupPath);
        }
        
        const logEntry = `\n- **[${timestamp}]**: ${action}`;
        fs.appendFileSync(statePath, logEntry);
    } catch (e) {
        console.error('❌ [SAGA ERROR] Falha ao rotacionar estado:', e.message);
    }
}

// Middleware de Autenticação do Vórtex (Fase 1)
function checkVortexAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || authHeader !== `Bearer ${process.env.VORTEX_API_KEY}`) {
        return res.status(401).json({ error: 'Acesso negado: VORTEX_API_KEY inválida ou ausente no cabeçalho Authorization.' });
    }
    next();
}

module.exports = function setupVortexRoutes(app, { SITE_REPO_PATH }) {

    // Proteger rotas da API do Vortex (Fase 1: Segurança)
    app.use('/api/vortex', checkVortexAuth);

    // Servir Preview (VFS Simulator)
    app.get('/vortex-preview', (req, res) => {
        res.send(`
            <!DOCTYPE html>
            <html lang="pt-br">
            <head>
                <meta charset="UTF-8">
                <style>
                    body { background: #050810; color: #1e293b; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; color: #94a3b8; }
                    .msg { text-align: center; border: 1px dashed #334155; padding: 2rem; border-radius: 8px; }
                </style>
            </head>
            <body>
                <div class="msg">
                    <h3>🌀 Vórtex Preview</h3>
                    <p>Aguardando renderização via Mission Control...</p>
                </div>
            </body>
            </html>
        `);
    });

    // Context Caching Hub (Phase 2.1)
    app.post('/api/vortex/cache', async (req, res) => {
        try {
            if (!cacheManager) return res.status(400).json({ error: 'Cache Manager indisponível.'});
            
            const { systemPrompt, components, model } = req.body;
            const targetModel = model || 'gemini-2.5-flash';
            const modelPath = targetModel.startsWith('models/') ? targetModel : `models/${targetModel}`;

            if (vortexActiveCache) {
                try { await cacheManager.delete(vortexActiveCache.name); } catch(e) {}
                vortexActiveCache = null;
            }

            const csaContext = await getCSAContext();
            const baseSystem = systemPrompt || 'Você é o orquestrador sênior do Vórtex AI Studio.';
            const fullSystemInstruction = `${baseSystem}\n\n${csaContext}`;

            const cacheObj = await cacheManager.create({
                model: modelPath,
                displayName: 'vortex-context-hub',
                systemInstruction: fullSystemInstruction,
                contents: [{ role: 'user', parts: [{ text: components || 'Contexto inicial vazio.' }] }],
                ttlSeconds: 3600
            });

            vortexActiveCache = { name: cacheObj.name, model: targetModel, obj: cacheObj };
            res.json({ success: true, cacheName: cacheObj.name, cachedTokens: cacheObj.usageMetadata?.totalTokenCount || 0 });
        } catch (e) {
            console.error('❌ [VORTEX CACHE]', e);
            res.status(500).json({ error: e.message });
        }
    });

    // Streaming SSE — Vibecoding Real
    app.post('/api/vortex/generate-stream', async (req, res) => {
        console.log('🌀 [VORTEX REQ] Recebida requisição generate-stream');
        try {
            const { prompt, model, currentCode, abidosRules, context, useCache } = req.body;
            if (!prompt) return res.status(400).json({ error: 'Prompt vazio.' });

            const startedAt = Date.now();
            const modelId = model || 'gemini-2.5-flash';
            const isPro = modelId.includes('pro');
            
            const roleSpecialization = isPro 
                ? `[ROLE: BRAIN/ARCHITECT]\n               Foco: Arquitetura, Domain-Driven Design, Lógica Complexa e Pacing & Leading Clínico.`
                : `[ROLE: FLASH/VIBE]\n               Foco: Estética OLED Black, Performance Lighthouse 100, Tailwind CSS e Animações.`;

            const visionPrompt = req.body.imageBase64 
                ? `\n[MODO VISION ATIVO — ANALISE A IMAGEM ANEXADA]\n               1. DECODIFIQUE a hierarquia visual.\n               2. TRADUZA para o Design System OLED Black.\n               3. MAPIE textos para Micro-copy de conversão.\n               4. SEJA FIEL ao layout original.`
                : "";

            const csaDirectives = await getCSAContext();
            const stylePreferenceContext = buildStylePreferenceContext();

            const systemPrompt = `[VÓRTEX AI STUDIO 3.1 — NAKED GENERATION PROTOCOL]
${roleSpecialization}${visionPrompt}

[DIRETRIZES CSA - SSOT]
${csaDirectives}

[REGRAS ABIDOS — INVIOLÁVEIS]
${context || 'Sem regras especiais em execução.'}

${stylePreferenceContext}

[REGRAS DE FORMATAÇÃO — NAKED PROTOCOL]
1. ZERO IMPORTS: Nunca use statements de 'import'. Tudo (React, Lucide, motion) é global.
2. ZERO EXPORTS: Não use 'export default' ou 'export'. Escreva apenas a função do componente.
3. SEM BOILERPLATE: Não inclua interfaces TypeScript redundantes se puder usar tipos inline ou omiti-los.
4. NAMESPACES: Use 'Lucide.IconName' para ícones e 'motion.div' para animações.
5. TAGS: Encapsule o código obrigatoriamente dentro de <file path="app/page.tsx">...</file>.
6. FOCO: SEO Local (Uberlândia/MG) e Ética Clínica (CFP). No final, use obrigatoriamente a tag de fechamento </file>.`;

            let aiModel;
            if (useCache && vortexActiveCache && vortexActiveCache.model === modelId) {
                // Instancia via cache e passa na Queue Singleton
                aiModel = wrapModel(genAI.getGenerativeModelFromCachedContent(vortexActiveCache.obj));
                console.log(`🌀 [VORTEX STREAM] Hub Ativado. Cache: ${vortexActiveCache.name}`);
            } else {
                // Instancia via Factory Central com 16k unificado (Etapa 1.3)
                aiModel = getAIModel(modelId, 'text/plain', systemPrompt);
            }

            const fullPrompt = currentCode 
                ? `[CÓDIGO ATUAL]\n\`\`\`tsx\n${currentCode}\n\`\`\`\n\n[INSTRUÇÃO DO USUÁRIO]\n${prompt}`
                : `[INSTRUÇÃO DO USUÁRIO]\n${prompt}`;

            const requestParts = [ fullPrompt ];

            if (req.body.imageBase64) {
                try {
                    const base64Content = req.body.imageBase64.split(',')[1];
                    const mimeType = req.body.imageBase64.split(';')[0].split(':')[1];
                    requestParts.push({ inlineData: { data: base64Content, mimeType } });
                } catch(e) { console.error('Erro no parser da imagem Multimodal', e); }
            }

            // Configurar SSE
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no'
            });

            const sendEvent = (type, data) => {
                res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
            };

            sendEvent('start', { model: modelId });

            const result = await aiModel.generateContentStream(requestParts);
            let fullText = '';

            for await (const chunk of result.stream) {
                const chunkText = chunk.text();
                if (chunkText) {
                    fullText += chunkText;
                    sendEvent('delta', { text: chunkText });
                }
            }

            const response = await result.response;
            const isTruncated = !fullText.trim().endsWith("</file>");
            trackUsage(response.usageMetadata, {
                route: 'vortex/generate-stream',
                model: modelId,
                durationMs: Date.now() - startedAt,
                promptChars: systemPrompt.length + fullPrompt.length,
                responseChars: fullText.length,
                finishReason: response.candidates?.[0]?.finishReason || null,
                isTruncated
            });

            // Verificação de Truncamento do Buffer do Servidor (Etapa 1.3.b)
            if (isTruncated) {
                console.warn("⚠️ [VORTEX STREAM] Truncamento detectado! Faltam tags de encerramento.");
            }

            const fileMatch = fullText.match(/<file\s+path="([^"]+)"\s*(?:language="([^"]+)")?\s*>([\s\S]*?)<\/file>/);
            const markdownMatch = !fileMatch ? fullText.match(/```(?:tsx|jsx|javascript|typescript|js)?\n([\s\S]*?)```/) : null;
            const explanationMatch = fullText.match(/<explanation>([\s\S]*?)<\/explanation>/);

            let extractedCode = fullText;
            if (fileMatch) extractedCode = fileMatch[3].trim();
            else if (markdownMatch) extractedCode = markdownMatch[1].trim();

            const parsed = {
                code: extractedCode,
                language: fileMatch ? (fileMatch[2] || 'typescriptreact') : 'typescriptreact',
                filename: fileMatch ? fileMatch[1].trim() : 'page.tsx',
                explanation: explanationMatch ? explanationMatch[1].trim() : 'Código gerado via streaming.',
                isTruncated
            };

            sendEvent('complete', parsed);
            await updateVortexState(`[Stream] Geração para [${parsed.filename}] via ${modelId}`);
            sendEvent('done', { isTruncated });
            res.end();

        } catch (e) {
            console.error('❌ [VORTEX STREAM ERROR TRACE]', e);
            try {
                res.write(`data: ${JSON.stringify({ type: 'error', error: e.message })}\n\n`);
                res.end();
            } catch(writeErr) {}
        }
    });

    // Generate (Fallback síncrono)
    app.post('/api/vortex/generate', async (req, res) => {
        try {
            const { prompt, model, currentCode, abidosRules, context, useCache } = req.body;
            if (!prompt) return res.status(400).json({ error: 'Prompt vazio.' });

            const startedAt = Date.now();
            const modelId = model || 'gemini-2.5-flash';
            const isPro = modelId.includes('pro');
            
            const roleSpecialization = isPro 
                ? `[ROLE: BRAIN/ARCHITECT]\n               Foco: Arquitetura de Silos, Domain-Driven Design (NeuroEngine), Lógica Complexa e Pacing & Leading Clínico.\n               Siga rigorosamente a Ontologia do Arquiteto.`
                : `[ROLE: FLASH/VIBE]\n               Foco: Estética OLED Black, Performance Lighthouse 100, Tailwind CSS e Animações Glassmorphism.\n               Materialize a intenção visual com máxima velocidade.`;

            const visionPrompt = req.body.imageBase64 
                ? `\n[MODO VISION ATIVO — ANALISE A IMAGEM ANEXADA]\n               1. DECODIFIQUE a hierarquia visual (Grids, Flexbox, Spacing).\n               2. TRADUZA os elementos visuais para o Design System OLED Black.\n               3. MAPIE os textos e botões para o padrão Abidos (Micro-copy de conversão).\n               4. SEJA FIEL ao layout original, mas atualize-o para estética Cinematográfica.`
                : "";

            const csaDirectives = await getCSAContext();
            const stylePreferenceContext = buildStylePreferenceContext();

                        const systemPrompt = `[VÓRTEX AI STUDIO 3.1 — NAKED GENERATION PROTOCOL]
${roleSpecialization}${visionPrompt}

[DIRETRIZES CSA - SSOT]
${csaDirectives}

[REGRAS ABIDOS — INVIOLÁVEIS]
${context || 'Sem regras especiais em execução.'}

${stylePreferenceContext}

[VÓRTEX PREVIEW ENVIRONMENT — "REGRAS DE OURO"]
1. ZERO IMPORTS: Não inclua statements de 'import'.
2. ZERO EXPORTS: Não use 'export default'. Escreva apenas 'function ComponentName(...) { ... }'.
3. NAKED SYNTAX: Use 'Lucide.IconName' para ícones e 'motion.div' para animações.
4. GLOBALS DISPONÍVEIS: React (useState, useEffect, etc.), motion, Lucide, Link (Next.js), Image (Next.js).
5. AMBIENTE: Renderização via React Sandbox. Código limpo, puramente funcional.

[DESIGN SYSTEM OLED BLACK — PREMIUM]
- Background: #050810 (Pure Black)
- Accents: Teal (#14b8a6), Indigo (#6366f1)
- Typography: Outfit (Headings) / Inter (Body)

[FORMATO DE RESPOSTA - JSON ESTRITO]
Retorne APENAS um bloco JSON (sem markdown fora dele):
{
  "code": "Código Naked completo e funcional (SEM IMPORTS OU EXPORTS)",
  "language": "typescriptreact",
  "filename": "page.tsx",
  "explanation": "Resumo conciso (máx 2 frases)"
}

IMPORTANTE: Foco em SEO Local (Uberlândia/MG) e Ética Clínica (CFP). Use apenas a sintaxe funcional purista.`;

            let aiModel;
            if (useCache && vortexActiveCache && vortexActiveCache.model === modelId) {
                aiModel = wrapModel(genAI.getGenerativeModelFromCachedContent(vortexActiveCache.obj));
                console.log(`🌀 [VORTEX] Hub Ativado. Utilizando cache: ${vortexActiveCache.name}`);
            } else {
                aiModel = getAIModel(modelId, 'application/json', systemPrompt);
            }

            const fullPrompt = currentCode 
                ? `[CÓDIGO ATUAL]\n\`\`\`tsx\n${currentCode}\n\`\`\`\n\n[INSTRUÇÃO DO USUÁRIO]\n${prompt}`
                : `[INSTRUÇÃO DO USUÁRIO]\n${prompt}`;

            const requestParts = [ fullPrompt ];
            
            if (req.body.imageBase64) {
                try {
                    const base64Content = req.body.imageBase64.split(',')[1];
                    const mimeType = req.body.imageBase64.split(';')[0].split(':')[1];
                    requestParts.push({ inlineData: { data: base64Content, mimeType: mimeType } });
                } catch(e) { console.error('Erro no parser da imagem Multimodal', e); }
            }

            const result = await aiModel.generateContent(requestParts);
            const responseText = result.response.text();
            trackUsage(result.response.usageMetadata, {
                route: 'vortex/generate',
                model: modelId,
                durationMs: Date.now() - startedAt,
                promptChars: systemPrompt.length + fullPrompt.length,
                responseChars: responseText.length,
                finishReason: result.response.candidates?.[0]?.finishReason || null,
                isTruncated: false
            });

            let parsed = extractJSON(responseText);
            if (!parsed) {
                parsed = {
                    code: responseText,
                    language: 'typescriptreact',
                    filename: 'page.tsx',
                    explanation: 'Aviso: Falha no parser JSON da IA.'
                };
            }

            await updateVortexState(`Geração de código para [${parsed.filename || 'Página'}] via ${modelId}. Decisão: ${parsed.explanation?.substring(0, 100)}...`);
            res.json(parsed);
        } catch (e) {
            console.error('❌ [VORTEX GENERATE]', e.message);
            res.status(500).json({ error: e.message });
        }
    });

    // Commit & Push via Servidor
    app.post('/api/vortex/commit', async (req, res) => {
        try {
            const { filename, content, message } = req.body;
            if (!filename || !content) return res.status(400).json({ error: 'Filename e content são obrigatórios.' });

            const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
            const repoOwner = process.env.GITHUB_REPO_OWNER || 'instituto-ops';
            const repoName = process.env.GITHUB_REPO_NAME || 'HipnoLawrence-Site';
            const branch = process.env.GITHUB_BRANCH || 'main';

            if (!token) return res.status(400).json({ error: 'GITHUB_TOKEN não configurado no servidor.' });

            const filePath = `src/app/(pages)/${filename}`;
            
            let sha = null;
            try {
                const getRes = await axios.get(
                    `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}?ref=${branch}`,
                    { headers: { Authorization: `token ${token}` } }
                );
                sha = getRes.data.sha;
            } catch (e) {}

            const payload = {
                message: message || `[Vórtex] Update ${filename}`,
                content: Buffer.from(content).toString('base64'),
                branch
            };
            if (sha) payload.sha = sha;

            const commitRes = await axios.put(
                `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`,
                payload,
                { headers: { Authorization: `token ${token}` } }
            );

            res.json({
                success: true,
                sha: commitRes.data.content?.sha,
                message: payload.message,
                url: commitRes.data.content?.html_url
            });
        } catch (e) {
            console.error('❌ [VORTEX COMMIT]', e.message);
            res.status(500).json({ error: e.message, success: false });
        }
    });

    // Listar Arquivos do VFS Local
    app.get('/api/vortex/files', (req, res) => {
        try {
            const repoPath = SITE_REPO_PATH;
            if (fs.existsSync(repoPath)) {
                const readDir = (dir, prefix = '') => {
                    const items = [];
                    const entries = fs.readdirSync(dir, { withFileTypes: true });
                    for (const entry of entries) {
                        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
                        const fullPath = path.join(dir, entry.name);
                        const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
                        if (entry.isDirectory()) {
                            items.push({ path: relPath, type: 'dir', children: readDir(fullPath, relPath) });
                        } else {
                            items.push({ path: relPath, type: 'file', size: fs.statSync(fullPath).size });
                        }
                    }
                    return items;
                };
                res.json({ files: readDir(repoPath), basePath: repoPath });
            } else {
                res.json({ files: [], basePath: repoPath, warning: 'Repository path not found locally.' });
            }
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // Pipeline de Ingestão (Local -> VFS)
    app.get('/api/vortex/ingest', (req, res) => {
        try {
            const repoPath = SITE_REPO_PATH;
            const result = [];

            if (fs.existsSync(repoPath)) {
                const readDirContent = (dir, prefix = '') => {
                    const entries = fs.readdirSync(dir, { withFileTypes: true });
                    for (const entry of entries) {
                        if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name.endsWith('.png') || entry.name.endsWith('.jpg') || entry.name.endsWith('.ico')) continue;
                        const fullPath = path.join(dir, entry.name);
                        const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
                        if (entry.isDirectory()) {
                            readDirContent(fullPath, relPath);
                        } else {
                            const content = fs.readFileSync(fullPath, 'utf8');
                            result.push({ path: `/src/app/${relPath}`, name: entry.name, content });
                        }
                    }
                };
                readDirContent(repoPath);
                res.json({ success: true, base: '/src/app', files: result });
            } else {
                res.json({ success: false, error: 'Repository path not found locally.' });
            }
        } catch (e) {
            console.error('❌ [VORTEX INGEST]', e.message);
            res.status(500).json({ success: false, error: e.message });
        }
    });

    // Salvar no Disco Local (Phase 5.1)
    app.post('/api/vortex/save-local', (req, res) => {
        try {
            const { filename, content } = req.body;
            if (!filename || !content) return res.status(400).json({ error: 'Filename e content são obrigatórios.' });

            const repoPath = SITE_REPO_PATH;
            const cleanName = filename.replace(/^\/?src\/app\//, '');
            const filePath = path.join(repoPath, cleanName);
            
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

            fs.writeFileSync(filePath, content, 'utf8');
            res.json({ success: true, path: filePath });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    app.post('/api/vortex/generate-template', async (req, res) => {
        try {
            const { prompt, model, template, modules, values, context } = req.body;
            if (!prompt) return res.status(400).json({ error: 'Prompt vazio.' });

            const variableKeys = (modules || []).flatMap(mod => mod.variables || []);
            if (!template?.id || variableKeys.length === 0) {
                return res.status(400).json({ error: 'Template guiado sem variaveis.' });
            }

            const modelId = model || 'gemini-2.5-flash';
            const systemPrompt = `[VORTEX TEMPLATE GUIDED MODE]
Voce atualiza apenas variaveis JSON de uma Master Template.
Retorne JSON estrito no formato { "values": { ... }, "explanation": "..." }.
Nao retorne codigo TSX, HTML, markdown ou comentarios.
Preserve chaves existentes e altere somente campos necessarios.

[TEMPLATE]
${compactForPrompt(template, 3000)}

[VARIAVEIS DISPONIVEIS]
${variableKeys.join(', ')}

[CONTEXTO]
${compactForPrompt(context, 5000)}

${buildStylePreferenceContext()}`;

            const aiModel = getAIModel(modelId, 'application/json', systemPrompt);
            const fullPrompt = `[VALORES ATUAIS]\n${compactForPrompt(values, 10000)}\n\n[INSTRUCAO]\n${prompt}`;
            const result = await aiModel.generateContent(fullPrompt);
            const responseText = result.response.text();
            const parsed = extractJSON(responseText);

            if (!parsed) throw new Error('IA nao retornou JSON valido para Template Guiado.');
            const nextValues = parsed.values && typeof parsed.values === 'object' ? parsed.values : parsed;
            res.json({
                success: true,
                values: { ...(values || {}), ...nextValues },
                explanation: parsed.explanation || 'Variaveis da template atualizadas.'
            });
        } catch (e) {
            console.error('❌ [VORTEX TEMPLATE]', e.message);
            res.status(500).json({ error: e.message, success: false });
        }
    });

    app.post('/api/vortex/micro-edit', async (req, res) => {
        try {
            const { prompt, model, selectedHtml, selectedSource, context } = req.body;
            if (!prompt || (!selectedHtml && !selectedSource)) {
                return res.status(400).json({ error: 'Prompt e componente selecionado sao obrigatorios.' });
            }

            const modelId = model || 'gemini-2.5-flash';
            const systemPrompt = `[VORTEX MICRO-PROMPT]
Edite apenas o componente selecionado. Retorne JSON estrito:
{ "replacement": "codigo/html atualizado apenas do componente", "explanation": "..." }
Nao reescreva a pagina inteira. Nao adicione imports/exports. Mantenha compliance CFP.

[CONTEXTO LIMITADO]
${compactForPrompt(context, 4000)}

${buildStylePreferenceContext()}`;

            const aiModel = getAIModel(modelId, 'application/json', systemPrompt);
            const fullPrompt = `[COMPONENTE SELECIONADO]\n${compactForPrompt(selectedSource || selectedHtml, 6000)}\n\n[INSTRUCAO]\n${prompt}`;
            const result = await aiModel.generateContent(fullPrompt);
            const parsed = extractJSON(result.response.text());
            if (!parsed?.replacement) throw new Error('IA nao retornou replacement valido.');
            res.json({ success: true, replacement: parsed.replacement, explanation: parsed.explanation || 'Componente atualizado.' });
        } catch (e) {
            console.error('❌ [VORTEX MICRO]', e.message);
            res.status(500).json({ error: e.message, success: false });
        }
    });

    app.post('/api/vortex/visual-intent', async (req, res) => {
        try {
            const { prompt, model, target, page, fields, context } = req.body;
            if (!prompt) return res.status(400).json({ error: 'Prompt vazio.' });
            const safeFields = Array.isArray(fields) ? fields : [];
            if (!safeFields.length) return res.status(400).json({ error: 'Nenhum campo visual anotado recebido.' });

            const modelId = model || 'gemini-2.5-flash';
            const systemPrompt = `[VORTEX VISUAL INTENT]
Voce edita intencao estruturada, nao codigo.
Retorne JSON estrito:
{ "section": "hero", "field": "headline", "value": "novo texto", "explanation": "..." }
Use apenas section/field presentes em CAMPOS DISPONIVEIS.
Nao retorne HTML, markdown, comentario, CSS ou TSX.
Mantenha tom clinico, acolhedor, etico e sem promessas de resultado.

[PAGINA]
${compactForPrompt(page, 500)}

[ALVO PREFERENCIAL]
${compactForPrompt(target, 1000)}

[CAMPOS DISPONIVEIS]
${compactForPrompt(safeFields, 5000)}

[CONTEXTO]
${compactForPrompt(context, 3000)}

${buildStylePreferenceContext()}`;

            const aiModel = getAIModel(modelId, 'application/json', systemPrompt);
            const result = await aiModel.generateContent(`[INTENCAO]\n${prompt}`);
            const parsed = extractJSON(result.response.text());
            if (!parsed?.section || !parsed?.field || typeof parsed.value !== 'string') {
                throw new Error('IA nao retornou JSON visual valido.');
            }
            const exists = safeFields.some(item => item.section === parsed.section && item.field === parsed.field);
            if (!exists) throw new Error(`Campo visual nao permitido: ${parsed.section}.${parsed.field}`);
            res.json({
                success: true,
                section: parsed.section,
                field: parsed.field,
                value: parsed.value,
                explanation: parsed.explanation || 'Intencao aplicada ao campo visual.'
            });
        } catch (e) {
            console.error('❌ [VORTEX VISUAL INTENT]', e.message);
            res.status(500).json({ error: e.message, success: false });
        }
    });

    app.get('/api/vortex/style-preferences', (req, res) => {
        res.json(readStylePreferences());
    });

    app.post('/api/vortex/style-preferences/feedback', (req, res) => {
        try {
            const { sentiment, code, componentLabel } = req.body;
            if (!['positive', 'negative'].includes(sentiment)) {
                return res.status(400).json({ error: 'sentiment deve ser positive ou negative.' });
            }

            const preferences = readStylePreferences();
            const signals = extractStyleSignals(code);
            const target = new Set(preferences[sentiment] || []);
            signals.forEach(signal => target.add(signal));
            preferences[sentiment] = Array.from(target).slice(-120);
            preferences.history = [
                ...(preferences.history || []),
                { sentiment, componentLabel: componentLabel || 'ultimo-componente', signals, timestamp: new Date().toISOString() }
            ].slice(-80);

            writeStylePreferences(preferences);
            res.json({ success: true, signals, preferences });
        } catch (e) {
            res.status(500).json({ error: e.message, success: false });
        }
    });

    app.get('/api/vortex/media', (req, res) => {
        try {
            const mediaPath = path.join(__dirname, '..', 'acervo_links.json');
            const usagePath = path.join(__dirname, '..', 'data', 'media_usage.json');
            const items = fs.existsSync(mediaPath) ? JSON.parse(fs.readFileSync(mediaPath, 'utf8')) : [];
            const usage = fs.existsSync(usagePath) ? JSON.parse(fs.readFileSync(usagePath, 'utf8')) : {};
            const normalized = (Array.isArray(items) ? items : (items.items || [])).map(item => ({
                ...item,
                usageCount: usage[item.id || item.url] || 0,
                overused: (usage[item.id || item.url] || 0) > 3
            }));
            res.json({ items: normalized });
        } catch (e) {
            res.status(500).json({ error: e.message, items: [] });
        }
    });

    app.post('/api/vortex/media/track', (req, res) => {
        try {
            const { itemId, url } = req.body;
            const key = itemId || url;
            if (!key) return res.status(400).json({ error: 'itemId ou url obrigatorio.' });
            const usagePath = path.join(__dirname, '..', 'data', 'media_usage.json');
            const usage = fs.existsSync(usagePath) ? JSON.parse(fs.readFileSync(usagePath, 'utf8')) : {};
            usage[key] = (usage[key] || 0) + 1;
            fs.writeFileSync(usagePath, JSON.stringify(usage, null, 2), 'utf8');
            res.json({ success: true, count: usage[key] });
        } catch (e) {
            res.status(500).json({ error: e.message, success: false });
        }
    });

    app.post('/api/vortex/audit-draft', async (req, res) => {
        try {
            const { draft, code, templateValues } = req.body;
            const source = code || JSON.stringify(templateValues || draft || {}, null, 2);
            const forbidden = ['cura', 'garantido', 'melhor', 'unico', '�nico'];
            const ethics = forbidden.filter(term => new RegExp(`\\b${term}\\b`, 'i').test(source));
            const seoWarnings = [];
            if ((source.match(/<h1/gi) || []).length > 1) seoWarnings.push('Multiplos H1 detectados.');
            if (/<img\b(?![^>]*\balt=)/i.test(source)) seoWarnings.push('Imagem sem alt detectada.');
            const designWarnings = source.length < 200 ? ['Conteudo curto para avaliacao visual robusta.'] : [];
            const approved = ethics.length === 0 && seoWarnings.length === 0;
            res.json({
                success: true,
                approved,
                badge: approved ? 'approved' : 'warning',
                checks: {
                    seo: seoWarnings,
                    ethics,
                    design: designWarnings
                }
            });
        } catch (e) {
            res.status(500).json({ error: e.message, success: false });
        }
    });

    app.post('/api/vortex/deploy-draft', async (req, res) => {
        try {
            const { draftId, name, files } = req.body;
            const token = process.env.VERCEL_TOKEN;
            if (!token) {
                return res.status(400).json({ success: false, error: 'VERCEL_TOKEN nao configurado.' });
            }

            const deploymentFiles = Array.isArray(files) && files.length
                ? files
                : [{ file: 'index.html', data: `<main><h1>${name || draftId || 'Vortex Draft'}</h1><p>Preview Vortex</p></main>` }];

            const response = await axios.post('https://api.vercel.com/v13/deployments', {
                name: (name || `vortex-draft-${Date.now()}`).toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 48),
                files: deploymentFiles,
                projectSettings: { framework: null }
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            res.json({ success: true, url: response.data.url ? `https://${response.data.url}` : response.data.alias?.[0], deployment: response.data });
        } catch (e) {
            console.error('❌ [VORTEX DEPLOY DRAFT]', e.message);
            res.status(500).json({ error: e.message, success: false });
        }
    });

    console.log('🌀 [VORTEX] API Routes registered (modular).');
};
