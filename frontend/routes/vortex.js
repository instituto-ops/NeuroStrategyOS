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

            const systemPrompt = `[VÓRTEX AI STUDIO 3.1 — NAKED GENERATION PROTOCOL]
${roleSpecialization}${visionPrompt}

[DIRETRIZES CSA - SSOT]
${csaDirectives}

[REGRAS ABIDOS — INVIOLÁVEIS]
${context || 'Sem regras especiais em execução.'}

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
            const isTruncated = !fullText.trim().endsWith("</file>");
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

                        const systemPrompt = `[VÓRTEX AI STUDIO 3.1 — NAKED GENERATION PROTOCOL]
${roleSpecialization}${visionPrompt}

[DIRETRIZES CSA - SSOT]
${csaDirectives}

[REGRAS ABIDOS — INVIOLÁVEIS]
${context || 'Sem regras especiais em execução.'}

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

    console.log('🌀 [VORTEX] API Routes registered (modular).');
};
