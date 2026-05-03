/**
 * 🌀 Vórtex AI Studio — Route Module
 * 
 * Endpoints de geração de código, streaming SSE, cache de contexto,
 * commit GitHub, VFS e preview.
 */

const { genAI, getAIModel, wrapModel, extractJSON, trackUsage,
        LITE_MODEL, MAIN_MODEL, PRO_MODEL, GoogleAICacheManager,
        fs, path } = require('../shared');
const { query, pool } = require('../shared/db');
const { z } = require('zod');
const crypto = require('crypto');


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
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
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
            
            const dataDrivenDirectives = req.body.vortexDataDriven
                ? `\n[MODO DATA-DRIVEN ATIVO — GERAÇÃO SEMÂNTICA]
               1. NÃO GERE CÓDIGO TSX/JSX DIRETAMENTE.
               2. GERE UM JSON ESTRUTURADO seguindo o esquema de seções do Vórtex.
               3. FORMATO DO JSON: { "sections": [ { "kind": "hero|content|cta|clinical_profile", "props": { ... } }, ... ] }
               4. ENCAPSULE O JSON DENTRO DAS TAGS <file path="page.json">...</file>.
               5. FOCO TOTAL NOS DADOS E NA SEMÂNTICA DO CONTEÚDO.`
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
5. TAGS: Encapsule o código obrigatoriamente dentro de <file path="${req.body.vortexDataDriven ? 'page.json' : 'app/page.tsx'}">...</file>.
6. FOCO: SEO Local (Uberlândia/MG) e Ética Clínica (CFP). No final, use obrigatoriamente a tag de fechamento </file>.
${dataDrivenDirectives}`;

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
            
            const dataDrivenDirectives = req.body.vortexDataDriven
                ? `\n[MODO DATA-DRIVEN ATIVO — GERAÇÃO SEMÂNTICA]
               1. NÃO GERE CÓDIGO TSX/JSX DIRETAMENTE.
               2. GERE UM JSON ESTRUTURADO seguindo o esquema de seções do Vórtex.
               3. FORMATO DO JSON: { "sections": [ { "kind": "hero|content|cta|clinical_profile", "props": { ... } }, ... ] }
               4. ENCAPSULE O JSON NO CAMPO "code" DO JSON DE RESPOSTA (como uma string de JSON).`
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
  "code": "${req.body.vortexDataDriven ? 'String contendo o JSON das seções' : 'Código Naked completo e funcional'}",
  "language": "${req.body.vortexDataDriven ? 'json' : 'typescriptreact'}",
  "filename": "${req.body.vortexDataDriven ? 'page.json' : 'page.tsx'}",
  "explanation": "Resumo conciso (máx 2 frases)"
}

${dataDrivenDirectives}

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

    // Commit & Push via Servidor (Transactional Flow Phase 8.14)
    app.post('/api/vortex/commit', async (req, res) => {
        const client = await pool.connect();
        try {
            const { filename, content, message, author } = req.body;
            if (!filename || !content) return res.status(400).json({ error: 'Filename e content são obrigatórios.' });

            // 1. Iniciar Transação DB
            await client.query('BEGIN');

            // 2. Upsert na tabela vortex_pages (Estado Atual)
            const pageRes = await client.query(`
                INSERT INTO vortex_pages (filename, content, updated_at)
                VALUES ($1, $2, NOW())
                ON CONFLICT (filename) DO UPDATE SET
                    content = EXCLUDED.content,
                    updated_at = NOW()
                RETURNING id
            `, [filename, content]);
            const pageId = pageRes.rows[0].id;

            // 3. Registrar Revisão no Histórico
            const revRes = await client.query(`
                INSERT INTO vortex_revisions (page_id, content, author, change_summary)
                VALUES ($1, $2, $3, $4)
                RETURNING id
            `, [pageId, content, author || 'Vórtex Studio', message]);
            const revisionId = revRes.rows[0].id;

            // 4. Logar Auditoria (Compliance Abidos)
            await client.query(`
                INSERT INTO vortex_audit_log (action, target_type, target_id, author, details)
                VALUES ($1, $2, $3, $4, $5)
            `, ['publish', 'page', filename, author || 'Vórtex Studio', JSON.stringify({ revision_id: revisionId })]);

            // 5. Persistência no GitHub (Sincronização com o VFS Remoto)
            const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
            const repoOwner = process.env.GITHUB_REPO_OWNER || 'instituto-ops';
            const repoName = process.env.GITHUB_REPO_NAME || 'HipnoLawrence-Site';
            const branch = process.env.GITHUB_BRANCH || 'main';

            let commitSha = null;
            if (token) {
                const filePath = `src/app/(pages)/${filename}`;
                let sha = null;
                try {
                    const getRes = await axios.get(
                        `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}?ref=${branch}`,
                        { headers: { Authorization: `token ${token}` } }
                    );
                    sha = getRes.data.sha;
                } catch (e) {}

                const ghPayload = {
                    message: message || `[Vórtex] Update ${filename}`,
                    content: Buffer.from(content).toString('base64'),
                    branch
                };
                if (sha) ghPayload.sha = sha;

                const commitRes = await axios.put(
                    `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`,
                    ghPayload,
                    { headers: { Authorization: `token ${token}` } }
                );
                commitSha = commitRes.data.commit.sha;

                // Vincular o SHA do GitHub à revisão local
                await client.query('UPDATE vortex_revisions SET commit_sha = $1 WHERE id = $2', [commitSha, revisionId]);
                await client.query('UPDATE vortex_pages SET current_revision_id = $1 WHERE id = $2', [revisionId, pageId]);
            }

            // 6. Finalizar Transação
            await client.query('COMMIT');

            res.json({
                success: true,
                pageId,
                revisionId,
                commitSha,
                message: message || `[Vórtex] Update ${filename}`,
                url: commitSha ? `https://github.com/${repoOwner}/${repoName}/commit/${commitSha}` : null
            });

        } catch (e) {
            await client.query('ROLLBACK');
            console.error('❌ [VORTEX COMMIT ERROR]', e.message);
            res.status(500).json({ error: e.message, success: false });
        } finally {
            client.release();
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

    // [NOVO] Listar assets do Acervo Visual (V7.5.2)
    app.get('/api/vortex/media', async (req, res) => {
        try {
            const { category } = req.query;
            let sql = 'SELECT * FROM vortex_assets ORDER BY created_at DESC';
            const params = [];
            
            if (category) {
                sql = 'SELECT * FROM vortex_assets WHERE category = $1 ORDER BY created_at DESC';
                params.push(category);
            }

            const { rows } = await query(sql, params);
            res.json({ items: rows });
        } catch (error) {
            console.error('Erro ao buscar mídia:', error);
            res.status(500).json({ error: 'Erro ao buscar mídia no banco.', items: [] });
        }
    });

    // [NOVO] Sincronizar Cloudinary (V7.5.2)
    app.post('/api/vortex/media/sync', async (req, res) => {
        try {
            const syncCloudinary = require('../scripts/sync-cloudinary');
            await syncCloudinary();
            res.json({ success: true, message: 'Sincronização concluída.' });
        } catch (error) {
            console.error('Erro na sincronização:', error);
            res.status(500).json({ error: 'Erro ao sincronizar com Cloudinary.' });
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

    // ==========================================================================
    // CICLO TRANSACIONAL V7 (POSTGRES) — Schema Real Neon
    // vortex_drafts: id, slug, title, briefing_json, sections_json, seo_json,
    //                generation_context_snapshot_json, created_at, updated_at
    // vortex_revisions: id, page_id, path, title, snapshot_json,
    //                   abidos_review_status, abidos_compliance_json, schema_version, created_at
    // vortex_published_pages: id, path, title, sections_json, seo_json,
    //                         current_revision_id, published_at, updated_at
    // vortex_publish_logs: id, action, path, revision_id, details, user_id, timestamp
    // ==========================================================================

    // 1. Salvar Rascunho (Upsert) — Traceability Snapshot (1.5.3)
    app.post('/api/vortex/save-draft', async (req, res) => {
        try {
            const SaveDraftSchema = z.object({
                id: z.string().uuid().optional(),
                slug: z.string().optional(),
                title: z.string().optional(),
                briefing_json: z.any().optional(),
                sections_json: z.any().optional(),
                seo_json: z.any().optional(),
                generation_context_snapshot_json: z.any().optional()
            });
            const parsed = SaveDraftSchema.safeParse(req.body);
            if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0]?.message });

            const { id, slug, title, briefing_json, sections_json, seo_json, generation_context_snapshot_json } = parsed.data;

            const snapshot = generation_context_snapshot_json || {
                saved_at: new Date().toISOString(),
                schema_version: '1.0'
            };

            const result = await query(`
                INSERT INTO vortex_drafts (id, slug, title, briefing_json, sections_json, seo_json, generation_context_snapshot_json, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                ON CONFLICT (id) DO UPDATE SET
                    slug = COALESCE(EXCLUDED.slug, vortex_drafts.slug),
                    title = COALESCE(EXCLUDED.title, vortex_drafts.title),
                    briefing_json = COALESCE(EXCLUDED.briefing_json, vortex_drafts.briefing_json),
                    sections_json = COALESCE(EXCLUDED.sections_json, vortex_drafts.sections_json),
                    seo_json = COALESCE(EXCLUDED.seo_json, vortex_drafts.seo_json),
                    generation_context_snapshot_json = EXCLUDED.generation_context_snapshot_json,
                    updated_at = NOW()
                RETURNING *
            `, [
                id || crypto.randomUUID(),
                slug || null,
                title || null,
                briefing_json ? JSON.stringify(briefing_json) : null,
                sections_json ? JSON.stringify(sections_json) : null,
                seo_json ? JSON.stringify(seo_json) : null,
                JSON.stringify(snapshot)
            ]);

            res.json({ success: true, draft: result.rows[0] });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // 2. Publicar — Snapshot imutável + Update produção (schema V7 real)
    app.post('/api/vortex/publish', async (req, res) => {
        try {
            const { draft_id, author_id } = req.body;

            const draftRes = await query('SELECT * FROM vortex_drafts WHERE id = $1', [draft_id]);
            if (draftRes.rows.length === 0) return res.status(404).json({ error: 'Rascunho não encontrado.' });
            const draft = draftRes.rows[0];

            const pagePath = draft.slug || draft.id;
            const abidosCompliance = req.body.abidos_compliance_json
                ? JSON.stringify(req.body.abidos_compliance_json) : null;
            const abidosStatus = req.body.abidos_review_status || 'approved';

            await query('BEGIN');
            try {
                // 2.1 Upsert página publicada (current_revision_id = NULL primeiro)
                const pubRes = await query(`
                    INSERT INTO vortex_published_pages (path, title, sections_json, seo_json, current_revision_id)
                    VALUES ($1, $2, $3, $4, NULL)
                    ON CONFLICT (path) DO UPDATE SET
                        title = EXCLUDED.title,
                        sections_json = EXCLUDED.sections_json,
                        seo_json = EXCLUDED.seo_json,
                        updated_at = NOW()
                    RETURNING id
                `, [pagePath, draft.title, draft.sections_json, draft.seo_json]);

                const page_id = pubRes.rows[0].id;

                // 2.2 Criar revisão imutável com snapshot completo
                const snapshotJson = JSON.stringify({
                    title: draft.title,
                    sections_json: draft.sections_json,
                    seo_json: draft.seo_json,
                    briefing_json: draft.briefing_json,
                    generation_context: draft.generation_context_snapshot_json,
                    author_id: author_id || 'vortex-studio',
                    published_at: new Date().toISOString(),
                    schema_version: '1.0'
                });

                const revRes = await query(`
                    INSERT INTO vortex_revisions
                        (page_id, path, title, snapshot_json, abidos_review_status, abidos_compliance_json, schema_version)
                    VALUES ($1, $2, $3, $4, $5, $6, '1.0')
                    RETURNING id
                `, [page_id, pagePath, draft.title, snapshotJson, abidosStatus, abidosCompliance]);

                const revision_id = revRes.rows[0].id;

                // 2.3 Atualizar ponteiro de revisão corrente
                await query(
                    'UPDATE vortex_published_pages SET current_revision_id = $1, updated_at = NOW() WHERE id = $2',
                    [revision_id, page_id]
                );

                // 2.4 Audit log
                await query(
                    'INSERT INTO vortex_publish_logs (action, path, revision_id, details, user_id) VALUES ($1, $2, $3, $4, $5)',
                    ['PUBLISH', pagePath, revision_id, `Draft ${draft_id}`, author_id || 'vortex-studio']
                );

                await query('COMMIT');

                // ISR revalidation (best-effort)
                try {
                    const siteUrl = process.env.APP_URL || 'http://localhost:3000';
                    await axios.post(`${siteUrl}/api/revalidate`, {
                        path: pagePath,
                        secret: process.env.VORTEX_API_KEY
                    });
                } catch (revalErr) {
                    console.warn('⚠️ [VORTEX] Revalidação ISR falhou:', revalErr.message);
                }

                res.json({ success: true, revision_id, path: pagePath });
            } catch (innerErr) {
                await query('ROLLBACK');
                throw innerErr;
            }
        } catch (e) {
            console.error('❌ [VORTEX PUBLISH]', e);
            res.status(500).json({ error: e.message });
        }
    });

    // 3. Listar Rascunhos
    app.get('/api/vortex/drafts', async (req, res) => {
        try {
            const result = await query(
                'SELECT id, slug, title, updated_at FROM vortex_drafts ORDER BY updated_at DESC'
            );
            res.json(result.rows);
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // 4. Buscar Revisões de uma Página (via path denormalizado)
    app.get('/api/vortex/revisions/:path', async (req, res) => {
        try {
            const pagePath = decodeURIComponent(req.params.path);
            const result = await query(
                'SELECT id, path, title, abidos_review_status, schema_version, created_at FROM vortex_revisions WHERE path = $1 ORDER BY created_at DESC',
                [pagePath]
            );
            res.json(result.rows);
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // 5. Listar Páginas Publicadas
    app.get('/api/vortex/published-pages', async (req, res) => {
        try {
            const result = await query(
                'SELECT id, path, title, current_revision_id, updated_at FROM vortex_published_pages ORDER BY updated_at DESC'
            );
            res.json(result.rows);
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // 6. Abidos Review Gate — Valida sections_json e HTML contra regras editoriais
    app.post('/api/vortex/abidos-review', async (req, res) => {
        try {
            const { sections_json, html_code, seo_json } = req.body;

            const issues = [];
            let hasBlocked = false;

            const cfpProibidos = [
                /cura\s+garantida/i, /garantimos\s+resultado/i, /100%\s+eficaz/i,
                /eliminar\s+para\s+sempre/i, /tratamento\s+milagroso/i, /cura\s+definitiva/i,
                /livre\s+da\s+ansiedade\s+para\s+sempre/i, /acaba\s+com\s+a\s+depress[aã]o/i,
                /resultados\s+garantidos/i, /n[aã]o\s+ter[aá]\s+mais/i
            ];

            const html = String(html_code || '');
            const sectionsArr = Array.isArray(sections_json) ? sections_json :
                (sections_json?.sections || []);

            // Blocked: CFP — promessas de cura
            for (const rx of cfpProibidos) {
                if (rx.test(html)) {
                    issues.push({ severity: 'blocked', code: 'CFP_PROMESSA_CURA', message: `Termos proibidos pelo CFP: "${rx.source}"` });
                    hasBlocked = true;
                    break;
                }
            }

            // Blocked: falta CRP em conteúdo clínico
            const isClinical = /hipno|psicolog|depress|ansied|terapia|psiquiatr|clín/i.test(html);
            const hasCRP = /CRP[-\s]?\d{2}\/\d{4,6}/i.test(html);
            if (isClinical && !hasCRP) {
                issues.push({ severity: 'blocked', code: 'CFP_SEM_CRP', message: 'Conteúdo clínico detectado sem número de CRP do profissional.' });
                hasBlocked = true;
            }

            // Blocked: sem H1
            const hasH1 = /<h1[\s>]/i.test(html) ||
                sectionsArr.some(s => s.type === 'hero' && s.headline);
            if (html && !hasH1) {
                issues.push({ severity: 'blocked', code: 'FALTA_H1', message: 'A página não possui H1. Obrigatório para SEO e acessibilidade.' });
                hasBlocked = true;
            }

            // Warning: sem CTA
            const hasCTA = /<a\s/i.test(html) || /<button/i.test(html) ||
                sectionsArr.some(s => s.type === 'cta');
            if (html && !hasCTA) {
                issues.push({ severity: 'warning', code: 'SEM_CTA', message: 'Nenhum call-to-action encontrado. Recomendado para conversão.' });
            }

            // Warning: sem SEO description
            if (!seo_json?.description && !seo_json?.meta_description) {
                issues.push({ severity: 'warning', code: 'SEM_SEO_DESCRIPTION', message: 'Meta description ausente. Impacta CTR orgânico.' });
            }

            // Warning: links externos sem nofollow
            const extLinkRx = /<a\s[^>]*href=["']https?:\/\/(?!hipnolawrence)[^"']+["'][^>]*>/gi;
            const matches = html.match(extLinkRx) || [];
            const badLinks = matches.filter(m => !/rel=["'][^"']*nofollow/i.test(m));
            if (badLinks.length > 0) {
                issues.push({ severity: 'warning', code: 'LINK_EXTERNO_SEM_NOFOLLOW', message: `${badLinks.length} link(s) externo(s) sem rel="nofollow".` });
            }

            // Warning: poucas seções estruturais
            if (sectionsArr.length > 0 && sectionsArr.length < 2) {
                issues.push({ severity: 'warning', code: 'POUCAS_SECOES', message: 'Menos de 2 seções Abidos. Estrutura mínima não atingida.' });
            }

            const score = Math.max(0, 100
                - issues.filter(i => i.severity === 'blocked').length * 35
                - issues.filter(i => i.severity === 'warning').length * 10);

            const status = hasBlocked ? 'blocked' : issues.length > 0 ? 'warning' : 'approved';

            res.json({ status, score, issues });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // 7. Criar Rascunho de Revisão a partir de Página Publicada (schema V7 real)
    app.post('/api/vortex/revision-draft', async (req, res) => {
        try {
            const { path: pagePath } = req.body;
            if (!pagePath) return res.status(400).json({ error: 'path obrigatório.' });

            const pubRes = await query(
                'SELECT id, path, title, sections_json, seo_json FROM vortex_published_pages WHERE path = $1',
                [pagePath]
            );
            if (pubRes.rows.length === 0) return res.status(404).json({ error: 'Página publicada não encontrada.' });
            const pub = pubRes.rows[0];

            const result = await query(`
                INSERT INTO vortex_drafts (id, slug, title, sections_json, seo_json, updated_at)
                VALUES ($1, $2, $3, $4, $5, NOW())
                RETURNING id, slug, title, updated_at
            `, [
                crypto.randomUUID(),
                pub.path,
                `[Revisão] ${pub.title || pagePath}`,
                pub.sections_json,
                pub.seo_json
            ]);

            res.json({ success: true, draft: result.rows[0] });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // 8. Rollback — Reverter Página Publicada para Revisão Anterior (schema V7 real)
    app.post('/api/vortex/rollback', async (req, res) => {
        try {
            const { path: pagePath, revision_id, author_id } = req.body;
            if (!pagePath || !revision_id) return res.status(400).json({ error: 'path e revision_id obrigatórios.' });

            const revRes = await query('SELECT * FROM vortex_revisions WHERE id = $1', [revision_id]);
            if (revRes.rows.length === 0) return res.status(404).json({ error: 'Revisão não encontrada.' });
            const rev = revRes.rows[0];

            // Extrair dados do snapshot_json imutável
            const snap = typeof rev.snapshot_json === 'string'
                ? JSON.parse(rev.snapshot_json)
                : (rev.snapshot_json || {});

            await query('BEGIN');
            try {
                await query(`
                    UPDATE vortex_published_pages
                    SET current_revision_id = $1,
                        sections_json = $2,
                        seo_json = $3,
                        title = $4,
                        updated_at = NOW()
                    WHERE path = $5
                `, [
                    revision_id,
                    snap.sections_json ? JSON.stringify(snap.sections_json) : null,
                    snap.seo_json ? JSON.stringify(snap.seo_json) : null,
                    snap.title || rev.title || pagePath,
                    pagePath
                ]);

                await query(
                    'INSERT INTO vortex_publish_logs (action, path, revision_id, details, user_id) VALUES ($1, $2, $3, $4, $5)',
                    ['ROLLBACK', pagePath, revision_id, `Rollback para revisão ${revision_id}`, author_id || 'system']
                );

                await query('COMMIT');
                res.json({ success: true, message: `Rollback para revisão ${revision_id} concluído.` });
            } catch (innerErr) {
                await query('ROLLBACK');
                throw innerErr;
            }
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // 9. Social Proof — Listar e Criar
    app.get('/api/vortex/social-proof', async (req, res) => {
        try {
            const result = await query(
                'SELECT * FROM abidos_social_proof WHERE is_approved = TRUE ORDER BY created_at DESC LIMIT 50'
            );
            res.json(result.rows);
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    app.post('/api/vortex/social-proof', async (req, res) => {
        try {
            const { patient_name, demand_type, content, professional_response, source_date, rating } = req.body;
            if (!content) return res.status(400).json({ error: 'content obrigatório.' });

            const result = await query(`
                INSERT INTO abidos_social_proof (patient_name, demand_type, content, professional_response, source_date, rating, is_approved)
                VALUES ($1, $2, $3, $4, $5, $6, FALSE)
                RETURNING *
            `, [patient_name, demand_type, content, professional_response, source_date, rating]);

            res.json({ success: true, item: result.rows[0] });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // 9b. Social Proof — Aprovar item (PATCH)
    app.patch('/api/vortex/social-proof/:id/approve', async (req, res) => {
        try {
            const { id } = req.params;
            const { approve } = req.body;
            const result = await query(
                'UPDATE abidos_social_proof SET is_approved = $1 WHERE id = $2 RETURNING *',
                [approve !== false, parseInt(id, 10)]
            );
            if (result.rows.length === 0) return res.status(404).json({ error: 'Item não encontrado.' });
            res.json({ success: true, item: result.rows[0] });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // 9c. Social Proof — Listar pendentes (para revisão editorial)
    app.get('/api/vortex/social-proof/pending', async (req, res) => {
        try {
            const result = await query(
                'SELECT * FROM abidos_social_proof WHERE is_approved = FALSE ORDER BY created_at DESC'
            );
            res.json(result.rows);
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // ==========================================================================
    // 10. ABIDOS-NATIVE ENGINE — Geração de sections_json estruturado (1.5.1)
    // ==========================================================================
    app.post('/api/vortex/generate-sections', async (req, res) => {
        try {
            const GenerateSectionsSchema = z.object({
                briefing_json: z.record(z.any()),
                page_type: z.enum(['landing', 'hub', 'spoke', 'article']).default('spoke'),
                model: z.string().optional()
            });
            const parsed = GenerateSectionsSchema.safeParse(req.body);
            if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0]?.message });

            const { briefing_json, page_type, model } = parsed.data;
            const modelId = model || 'gemini-2.5-flash';

            const schemaPath = path.join(__dirname, '..', '..', 'docs', '04_Arquivos_de_Referência', 'schemas', 'abidos_page_schema.json');
            let abidosSchema = '{}';
            try { abidosSchema = fs.readFileSync(schemaPath, 'utf8'); } catch (e) {}

            const systemPrompt = `Você é o Abidos-Native Engine, gerador estrutural de conteúdo clínico-psicológico.

MISSÃO: Gerar um objeto JSON que represente a estrutura de uma página ${page_type} para um psicólogo/hipnoterapeuta clínico.

SCHEMA ABIDOS (siga rigorosamente):
${abidosSchema}

REGRAS OBRIGATÓRIAS:
1. Retorne APENAS JSON puro (sem markdown, sem texto adicional).
2. O campo "version" deve ser "1.0" e "type" deve ser "${page_type}".
3. Inclua obrigatoriamente uma seção "author" com campo "crp" preenchido com o CRP do briefing ou "XX/XXXXX".
4. Proibido: promessas de cura, garantias de resultado, linguagem que viole o CFP.
5. Use Pacing & Leading clínico: valide a dor do paciente antes de apresentar a solução.
6. O array "sections" deve ter pelo menos 4 seções: hero, pacing_leading, methodology, cta.`;

            const briefSummary = compactForPrompt(briefing_json, 4000);
            const userPrompt = `[BRIEFING DA PÁGINA]\n${briefSummary}\n\nGere o sections_json completo para esta página ${page_type}.`;

            const aiModel = getAIModel(modelId, 'application/json', systemPrompt);
            const result = await aiModel.generateContent(userPrompt);
            const responseText = result.response.text();

            let sectionsJson;
            try {
                const clean = responseText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
                sectionsJson = JSON.parse(clean);
            } catch (parseErr) {
                return res.status(422).json({ error: 'IA retornou JSON inválido.', raw: responseText.slice(0, 500) });
            }

            trackUsage(result.response.usageMetadata, {
                route: 'vortex/generate-sections',
                model: modelId,
                promptChars: systemPrompt.length + userPrompt.length,
                responseChars: responseText.length
            });

            res.json({ success: true, sections_json: sectionsJson, schema_version: '1.0' });
        } catch (e) {
            console.error('❌ [ABIDOS ENGINE]', e.message);
            res.status(500).json({ error: e.message });
        }
    });

    // ==========================================================================
    // 11. SELETOR DE ASSETS — Lista assets do Cloudinary Index (2.2)
    // ==========================================================================
    app.get('/api/vortex/assets', async (req, res) => {
        try {
            const { category, limit = 50 } = req.query;
            const params = [];
            let where = '';
            if (category) {
                where = 'WHERE category = $1';
                params.push(category);
            }
            const result = await query(
                `SELECT va.id, va.url, va.filename, va.thumbnail_url, va.mime_type, va.category,
                        nam.alt_text, nam.seo_role, nam.is_approved_clinically
                 FROM vortex_assets va
                 LEFT JOIN neuro_asset_metadata nam ON nam.asset_id = va.id
                 ${where}
                 ORDER BY va.updated_at DESC
                 LIMIT $${params.length + 1}`,
                [...params, parseInt(limit, 10) || 50]
            );
            res.json(result.rows);
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // ==========================================================================
    // 12. MANUTENÇÃO — Cleanup e Slugs Reservados (4.4)
    // ==========================================================================
    app.post('/api/vortex/maintenance/cleanup-orphans', async (req, res) => {
        try {
            const { days_old = 30 } = req.body;
            const result = await query(`
                DELETE FROM vortex_drafts
                WHERE (path IS NULL OR path = '')
                  AND updated_at < NOW() - INTERVAL '${parseInt(days_old, 10)} days'
                RETURNING id, title
            `);
            res.json({ success: true, deleted: result.rows.length, items: result.rows });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    // Slugs reservados — armazenados em JSON local (baixo overhead)
    const RESERVED_SLUGS_PATH = path.join(__dirname, '..', 'data', 'reserved_slugs.json');
    function readReservedSlugs() {
        try { return JSON.parse(fs.readFileSync(RESERVED_SLUGS_PATH, 'utf8')); } catch { return []; }
    }

    app.get('/api/vortex/maintenance/reserved-slugs', (req, res) => {
        res.json(readReservedSlugs());
    });

    app.post('/api/vortex/maintenance/reserve-slug', (req, res) => {
        try {
            const SlugSchema = z.object({ slug: z.string().min(1).max(255), reason: z.string().optional() });
            const parsed = SlugSchema.safeParse(req.body);
            if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0]?.message });
            const { slug, reason } = parsed.data;
            const list = readReservedSlugs();
            if (list.find(s => s.slug === slug)) return res.status(409).json({ error: 'Slug já reservado.' });
            list.push({ slug, reason: reason || '', reserved_at: new Date().toISOString() });
            const dir = path.dirname(RESERVED_SLUGS_PATH);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(RESERVED_SLUGS_PATH, JSON.stringify(list, null, 2), 'utf8');
            res.json({ success: true, slug });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    app.delete('/api/vortex/maintenance/reserved-slugs/:slug', (req, res) => {
        try {
            const { slug } = req.params;
            const list = readReservedSlugs().filter(s => s.slug !== decodeURIComponent(slug));
            fs.writeFileSync(RESERVED_SLUGS_PATH, JSON.stringify(list, null, 2), 'utf8');
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });

    console.log('🌀 [VORTEX] API Routes registered (modular).');
};
