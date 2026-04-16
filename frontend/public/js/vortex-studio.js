/**
 * 🌀 VÓRTEX AI STUDIO — Módulo Core
 * NeuroEngine OS | Fase 1: Fundação
 * 
 * Responsabilidades:
 * - VFS (Virtual File System) via Dexie.js
 * - Monaco Editor bootstrap
 * - Chat com Gemini 2.5 (geração de código)
 * - Preview iframe
 * - Abidos Compliance Toggles
 */

window.vortexStudio = (() => {
    // =========================================================================
    // STATE
    // =========================================================================
    const state = {
        db: null,               // Dexie instance
        editor: null,           // Monaco instance
        diffEditor: null,       // Monaco DiffEditor instance (Phase 2.1)
        currentFile: null,      // Active file path
        files: new Map(),       // In-memory file cache
        messages: [],           // Chat history
        isGenerating: false,
        previewDevice: 'desktop',
        abidosRules: {
            singleH1: true,
            altTags: true,
            cfpTerms: true,
            whatsappCTA: true
        },
        monacoReady: false,
        fs: null,               // LightningFS instance
        pfs: null,              // LightningFS Promises API
        contextHubEnabled: false,
        lastAuditResult: null,  // Phase 2.4: Last audit result for commit gate
        snapshotId: 0,          // Phase 2.2: Auto-increment snapshot counter
        generationCache: new Map(), // Phase 4.8: Local cache by prompt hash
        zenMode: false          // Phase 3.10
    };

    // =========================================================================
    // UTILS: SANITIZAÇÃO E LIMPEZA (ANTI-HALLUCINATION)
    // =========================================================================
    function sanitizeAIContent(content) {
        if (!content) return '';
        let clean = content;
        
        // 1. Remover Markdown Code Blocks (ex: ```tsx ... ```)
        clean = clean.replace(/```[a-z]*\n?/gi, '');
        clean = clean.replace(/```/g, '');

        // 2. Remover tags estruturais do Vórtex (se vazarem para o editor)
        clean = clean.replace(/<file[^>]*>/gi, '');
        clean = clean.replace(/<\/file>/gi, '');
        clean = clean.replace(/<preview[^>]*>/gi, '');
        clean = clean.replace(/<\/preview>/gi, '');
        clean = clean.replace(/<explanation[^>]*>/gi, '');
        clean = clean.replace(/<\/explanation>/gi, '');
        
        return clean.trim();
    }


    // =========================================================================
    // VFS (Virtual File System via Dexie.js)
    // =========================================================================
    async function initVFS() {
        try {
            // Dynamically load Dexie if not present
            if (!window.Dexie) {
                await loadScript('https://cdn.jsdelivr.net/npm/dexie@4/dist/dexie.min.js');
            }

            // Init LightningFS for isomorphic-git
            if (window.LightningFS) {
                state.fs = new LightningFS('VortexGitFS');
                state.pfs = state.fs.promises;
                console.log('🌀 [VORTEX GIT] LightningFS initialized.');
            }

            state.db = new Dexie('VortexVFS');
            state.db.version(2).stores({
                files: 'path, name, content, type, modified',
                projects: 'id, name, repo, branch, created',
                sessions: 'id, projectId, messages, created',
                snapshots: '++id, filePath, content, prompt, timestamp'
            });

            await state.db.open();
            console.log('🌀 [VORTEX VFS] IndexedDB initialized successfully.');
            
            // Request persistent storage
            if (navigator.storage && navigator.storage.persist) {
                const persisted = await navigator.storage.persist();
                console.log(`🌀 [VORTEX VFS] Persistent storage: ${persisted ? 'GRANTED' : 'DENIED'}`);
            }

            // [1.4] Ingestion Pipeline
            await checkAndIngestFiles();

            return true;
        } catch (err) {
            console.error('❌ [VORTEX VFS] Init failed:', err);
            return false;
        }
    }

    async function checkAndIngestFiles() {
        const fileCount = await state.db.files.count();
        if (fileCount === 0) {
            console.log('🌀 [VORTEX VFS] Database empty. Ingesting physical repository starting now...');
            try {
                const res = await fetch('/api/vortex/ingest');
                const data = await res.json();
                if (data.success && data.files) {
                    const tx = state.db.transaction('rw', state.db.files, async () => {
                        for (const f of data.files) {
                            await state.db.files.put({
                                path: f.path,
                                name: f.name,
                                content: f.content,
                                type: f.name.split('.').pop(),
                                modified: new Date().toISOString()
                            });
                            
                            // Initialize lightning-fs copy for git
                            if (state.pfs) {
                                try {
                                    // ensure path exists
                                    const dir = f.path.substring(0, f.path.lastIndexOf('/'));
                                    const dirs = dir.split('/').filter(Boolean);
                                    let cur = '';
                                    for (let d of dirs) {
                                        cur += '/' + d;
                                        try { await state.pfs.mkdir(cur); } catch(e){}
                                    }
                                    await state.pfs.writeFile(f.path, f.content, 'utf8');
                                } catch(e) {}
                            }
                        }
                    });
                    console.log(`🌀 [VORTEX VFS] Ingested ${data.files.length} physical files.`);
                }
            } catch(e) {
                console.error('❌ [VORTEX INGEST]', e);
            }
        }
    }

    async function vfsWrite(filePath, content) {
        const name = filePath.split('/').pop();
        const type = name.split('.').pop();
        await state.db.files.put({
            path: filePath,
            name,
            content,
            type,
            modified: new Date().toISOString()
        });
        state.files.set(filePath, content);
    }

    async function vfsRead(filePath) {
        if (state.files.has(filePath)) return state.files.get(filePath);
        const file = await state.db.files.get(filePath);
        if (file) {
            state.files.set(filePath, file.content);
            return file.content;
        }
        return null;
    }

    async function vfsList() {
        return await state.db.files.toArray();
    }

    // =========================================================================
    // MONACO EDITOR
    // =========================================================================
    async function initMonaco() {
        const container = document.getElementById('vortex-monaco-container');
        if (!container) return;

        // Load Monaco via CDN
        if (!window.monaco) {
            await loadScript('https://cdn.jsdelivr.net/npm/monaco-editor@0.47.0/min/vs/loader.js');
            
            await new Promise((resolve) => {
                require.config({ 
                    paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.47.0/min/vs' }
                });
                require(['vs/editor/editor.main'], () => {
                    resolve();
                });
            });
        }

        // [3.1] Custom OLED Theme
        monaco.editor.defineTheme('vortex-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: '', background: '050810', foreground: 'd1d5db' },
                { token: 'comment', foreground: '6a737d', fontStyle: 'italic' },
                { token: 'keyword', foreground: '2dd4bf' },
                { token: 'string', foreground: '38bdf8' },
                { token: 'function', foreground: '6366f1' },
                { token: 'type', foreground: 'f472b6' },
                { token: 'identifier', foreground: 'e2e8f0' }
            ],
            colors: {
                'editor.background': '#050810',
                'editor.foreground': '#d1d5db',
                'editorCursor.foreground': '#2dd4bf',
                'editor.lineHighlightBackground': '#ffffff08',
                'editorLineNumber.foreground': '#4b5563',
                'editor.selectionBackground': '#2dd4bf20',
                'editorIndentGuide.background': '#ffffff05',
                'editorIndentGuide.activeBackground': '#2dd4bf30'
            }
        });

        state.editor = monaco.editor.create(container, {
            value: '// 🌀 Vórtex AI Studio\n// Envie um prompt no chat para gerar código Next.js\n',
            language: 'typescriptreact',
            theme: 'vortex-dark',
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
            fontLigatures: true,
            minimap: { enabled: true, size: 'proportional' },
            scrollbar: { 
                verticalScrollbarSize: 8,
                horizontalScrollbarSize: 8
            },
            padding: { top: 16, bottom: 16 },
            lineNumbers: 'on',
            renderLineHighlight: 'all',
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            smoothScrolling: true,
            contextmenu: true,
            wordWrap: 'on',
            bracketPairColorization: { enabled: true },
            guides: { bracketPairs: true },
            suggest: { showMethods: true, showFunctions: true },
            tabSize: 2
        });

        // [3.2] Shadow Sync (Local Debounced Update)
        let previewTimeout;
        state.editor.onDidChangeModelContent(() => {
            clearTimeout(previewTimeout);
            previewTimeout = setTimeout(() => {
                const content = state.editor.getValue();
                // Simple regex to extract what looks like HTML/JSX for the preview
                // In Phase 3.2 we'll improve this with a real JSX renderer if needed
                // For now, if the AI output contains the preview field, we used that.
                // If editing manually, we show a 'Sync Required' bubble
                const tab = document.querySelector(`.vortex-file-tab.active`);
                if (tab) tab.classList.add('modified');
            }, 800);
        });


        // Handle resize
        const resizeObserver = new ResizeObserver(() => {
            if (state.editor) state.editor.layout();
        });
        resizeObserver.observe(container);

        state.monacoReady = true;
        console.log('🌀 [VORTEX MONACO] Editor initialized.');

        // [1.1] Resumo da Sessão / Auto-load last file or page.tsx
        await loadInitialFile();
    }

    async function loadInitialFile() {
        try {
            // Try to load existing page.tsx or latest file
            const files = await state.db.files.orderBy('modified').reverse().toArray();
            let initialFile = files.find(f => f.name === 'page.tsx') || files[0];
            
            if (initialFile) {
                openFile(initialFile.name);
            }
        } catch(e) {
            console.warn('🌀 [VORTEX VFS] Could not load initial file.');
        }
    }

    function setEditorContent(content, language = 'typescriptreact') {
        if (!state.editor) return;
        const model = state.editor.getModel();
        if (model) {
            monaco.editor.setModelLanguage(model, language);
        }
        state.editor.setValue(content);
    }

    function getEditorContent() {
        return state.editor ? state.editor.getValue() : '';
    }

    // =========================================================================
    // CHAT & GEMINI INTEGRATION
    // =========================================================================
    function addMessage(role, content) {
        const msg = { role, content, timestamp: Date.now() };
        state.messages.push(msg);
        renderMessages();
        return msg;
    }

    function renderMessages() {
        const container = document.getElementById('vortex-chat-messages');
        if (!container) return;

        container.innerHTML = state.messages.map(msg => {
            const cssClass = msg.role === 'user' ? 'vortex-msg-user' : 
                             msg.role === 'system' ? 'vortex-msg-system' : 'vortex-msg-ai';
            return `<div class="vortex-msg ${cssClass}">${formatMessage(msg.content)}</div>`;
        }).join('');

        container.scrollTop = container.scrollHeight;
    }

    function formatMessage(text) {
        // Basic markdown-like formatting
        return text
            .replace(/`([^`]+)`/g, '<code style="background:rgba(99,102,241,0.15);padding:2px 6px;border-radius:4px;font-size:12px;">$1</code>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
    }

    // =========================================================================
    // CONTEXT CACHING HUB (PHASE 2.1)
    // =========================================================================
    async function syncContextHub() {
        try {
            const btn = document.getElementById('vortex-hub-btn');
            if (btn) btn.innerHTML = '<i data-lucide="loader" class="spin"></i> VFS...';
            
            const files = await vfsList();
            let componentsStr = "--- ARQUITETURA DO PROJETO VFS ---\n\n";
            for (const f of files) {
                // Filtramos imagens e node_modules
                if (f.name.endsWith('.tsx') || f.name.endsWith('.ts') || f.name.endsWith('.css') || f.name.endsWith('.json')) {
                    componentsStr += `\n[ARQUIVO: ${f.path}]\n\`\`\`\n${f.content}\n\`\`\`\n`;
                }
            }

            const model = document.getElementById('vortex-model-select')?.value || 'gemini-2.5-flash';
            
            if (btn) btn.innerHTML = '<i data-lucide="loader" class="spin"></i> CACHING...';
            
            const req = await fetch('/api/vortex/cache', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    components: componentsStr,
                    model: model,
                    systemPrompt: buildAbidosContext()
                })
            });
            const data = await req.json();
            
            if (data.success) {
                state.contextHubEnabled = true;
                addMessage('system', `🧠 **Context Hub Activates!**\nO projeto atual (\`${files.length} arquivos\`) foi embutido no Gemini Caching.\n**${data.cachedTokens || 0} tokens armazenados.**\nO Context Caching reduz as requisições em até 90% via cache de prompt e permite respostas baseadas no Design System holístico.`);
                if (btn) btn.innerHTML = '<i data-lucide="database" style="color:var(--color-success)"></i> HUB ON';
                if (window.lucide) window.lucide.createIcons();
            } else {
                throw new Error(data.error || 'Erro desconhecido ao gerar o cache.');
            }

        } catch (e) {
            console.error('❌ [VORTEX HUB]', e);
            addMessage('system', `⚠️ Falha ao sincronizar o Context Hub: ${e.message}`);
            state.contextHubEnabled = false;
            const btn = document.getElementById('vortex-hub-btn');
            if (btn) {
                btn.innerHTML = '<i data-lucide="database"></i> SYNC HUB';
                if (window.lucide) window.lucide.createIcons();
            }
        }
    }

    // =========================================================================
    // MULTIMODAL DESIGN-TO-CODE (PHASE 2.3)
    // =========================================================================
    let uploadedImageBase64 = null;

    function handleImageUpload(event) {
        const file = event.target.files[0];
        if (file) processImageFile(file);
    }

    function handleDrop(event) {
        const file = event.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            processImageFile(file);
        }
    }

    function processImageFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            uploadedImageBase64 = e.target.result;
            const previewContainer = document.getElementById('vortex-image-preview-container');
            if(previewContainer) {
                previewContainer.innerHTML = `
                    <div class="vortex-vision-link">
                        <div class="vortex-vision-status">
                            <span class="vortex-vision-eye">👁️</span>
                            <span class="vortex-vision-text">VISION LINK ESTABLISHED</span>
                        </div>
                        <img id="vortex-image-preview" src="${uploadedImageBase64}" class="vortex-vision-thumb">
                        <button onclick="vortexStudio.removeImage()" class="vortex-vision-close">×</button>
                    </div>
                `;
                previewContainer.style.display = 'block';
            }
        };
        reader.readAsDataURL(file);
    }

    function removeImage() {
        uploadedImageBase64 = null;
        const previewContainer = document.getElementById('vortex-image-preview-container');
        if(previewContainer) previewContainer.style.display = 'none';
        const fileInput = document.getElementById('vortex-file-upload');
        if(fileInput) fileInput.value = '';
    }

    async function sendPrompt() {
        const input = document.getElementById('vortex-chat-input');
        if (state.isGenerating) return;
        if ((!input || !input.value.trim()) && !uploadedImageBase64) return;

        const prompt = input ? input.value.trim() : '';
        if (input) {
            input.value = '';
            input.style.height = 'auto';
        }

        addMessage('user', prompt || '(Imagem anexada)');
        setGenerating(true);

        try {
            const model = document.getElementById('vortex-model-select')?.value || 'gemini-2.5-flash';
            const abidosContext = buildAbidosContext();
            const currentCode = getEditorContent();
            const defaultCode = '// 🌀 Vórtex AI Studio\n// Envie um prompt no chat para gerar código Next.js\n';

            // [PHASE 2.2] Snapshot antes de cada geração
            await createSnapshot(prompt);

            // [PHASE 2.3] Contexto seletivo (arquivo ativo + imports)
            const selectiveCtx = await buildSelectiveContext();

            const payload = {
                prompt: typeof arguments[0] === 'string' ? arguments[0] : prompt,
                model,
                currentCode: currentCode !== defaultCode ? currentCode : '',
                abidosRules: state.abidosRules,
                context: abidosContext + (selectiveCtx ? '\n\n--- CONTEXTO DO PROJETO ---\n' + selectiveCtx : ''),
                useCache: state.contextHubEnabled,
                imageBase64: uploadedImageBase64
            };

            removeImage();

            // [PHASE 5.3] Tentar Streaming SSE primeiro
            try {
                await sendPromptStream(payload);
            } catch (streamErr) {
                console.warn('⚠️ [VORTEX] Stream falhou, usando fallback síncrono:', streamErr.message);
                await sendPromptSync(payload);
            }

        } catch (err) {
            console.error('❌ [VORTEX] Generation error:', err);
            addMessage('system', `⚠️ Erro na geração: ${err.message}`);
        } finally {
            setGenerating(false);
        }
    }

    // [PHASE 5.3] Streaming SSE Consumer — Vibecoding Real
    async function sendPromptStream(payload) {
        const response = await fetch('/api/vortex/generate-stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`Stream Error: ${response.status}`);
        if (!response.body) throw new Error('ReadableStream não suportado');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullStreamText = '';
        let codeStarted = false;

        // Limpar o editor para receber o stream
        setEditorContent('// 🌀 Streaming...\n', 'typescriptreact');

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Manter a última linha incompleta

            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                
                try {
                    const event = JSON.parse(line.slice(6));

                    switch (event.type) {
                        case 'start':
                            addMessage('system', `🌀 Streaming via **${event.model}**...`);
                            break;

                        case 'delta':
                            fullStreamText += event.text;
                            // Atualizar Monaco com o texto acumulado em tempo real
                            if (!codeStarted && fullStreamText.includes('<file')) {
                                codeStarted = true;
                            }
                            if (codeStarted) {
                                // Extrair o conteúdo parcial do bloco <file>
                                const partialMatch = fullStreamText.match(/<file[^>]*>([\s\S]*?)(?:<\/file>|$)/);
                                if (partialMatch) {
                                    setEditorContent(sanitizeAIContent(partialMatch[1].trimStart()), 'typescriptreact');
                                }
                            } else {
                                // Ainda não chegou no bloco <file>, mostrar texto bruto (limpo)
                                setEditorContent(sanitizeAIContent(fullStreamText), 'typescriptreact');
                            }
                            break;

                        case 'complete':
                            // Metadados finais com código limpo
                            if (event.code) {
                                const audit = auditCode(event.code);
                                const oldCode = getEditorContent();

                                // [PHASE 4.1] Show Diff Review se havia código anterior
                                const isDefaultCode = oldCode.startsWith('// 🌀');
                                const cleanNewCode = sanitizeAIContent(event.code);

                                if (!isDefaultCode && oldCode.length > 50) {
                                    showDiffReview(oldCode, cleanNewCode, event.filename || 'page.tsx');
                                } else {
                                    setEditorContent(cleanNewCode, event.language || 'typescriptreact');
                                }
                                updateFileTab(event.filename || 'page.tsx', true);

                                const filePath = `/src/app/${event.filename || 'page.tsx'}`;
                                await vfsWrite(filePath, event.code);
                                state.currentFile = filePath;
                                updateBreadcrumbs(filePath);

                                // [CIRURGIA 3] Preview SEMPRE via React Sandbox — zero dependência da IA
                                updatePreview(cleanNewCode);

                                // [PHASE 4.8] Cache result
                                setCachedGeneration(payload.prompt, event.code);

                                if (!audit.passes) {
                                    addMessage('system', '⚠️ Código gerado mas possui falhas de conformidade.');
                                }
                            }
                            if (event.explanation) {
                                addMessage('ai', event.explanation);
                            }
                            break;

                        case 'error':
                            throw new Error(event.error || 'Erro no stream');

                        case 'done':
                            break;
                    }
                } catch (parseErr) {
                    // Ignorar linhas malformadas durante o stream
                    if (parseErr.message.includes('Erro no stream')) throw parseErr;
                }
            }
        }

        // Se não recebemos um evento 'complete', tentar parsear do texto bruto
        if (!fullStreamText.includes('</file>')) {
            setEditorContent(fullStreamText, 'typescriptreact');
            addMessage('ai', '✅ Código gerado via streaming.');
        }
    }

    // Fallback síncrono (método original)
    async function sendPromptSync(payload) {
        const response = await fetch('/api/vortex/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`API Error: ${response.status}`);

        const data = await response.json();

        if (data.code) {
            const audit = auditCode(data.code);
            setEditorContent(data.code, data.language || 'typescriptreact');
            updateFileTab(data.filename || 'page.tsx', true);

            const filePath = `/src/app/${data.filename || 'page.tsx'}`;
            await vfsWrite(filePath, data.code);
            state.currentFile = filePath;

            if (data.code) {
                updatePreview(data.code);
            }

            if (!audit.passes) {
                addMessage('system', '⚠️ Código gerado mas possui falhas de conformidade.');
            }
        }

        if (data.explanation) {
            addMessage('ai', data.explanation);
        } else {
            addMessage('ai', '✅ Código gerado com sucesso.');
        }
    }

    function buildAbidosContext() {
        const rules = [];
        if (state.abidosRules.singleH1) rules.push('Apenas UM <h1> por página. Use hierarquia semântica (h2, h3).');
        if (state.abidosRules.altTags) rules.push('Todas as <img> DEVEM ter alt descritivo orientado a SEO local (Goiânia/Brasil).');
        if (state.abidosRules.cfpTerms) rules.push('PROIBIDO usar: "cura", "garantido", "melhor", "único". Siga as diretrizes do CFP.');
        if (state.abidosRules.whatsappCTA) rules.push('Incluir botão flutuante de WhatsApp com link direto.');
        return rules.join('\n');
    }

    // =========================================================================
    // [PHASE 4.1] ABIDOS AUDIT ENGINE
    // =========================================================================
    function auditCode(code) {
        const results = {
            passes: true,
            errors: [],
            warnings: []
        };

        // 1. Check for multiple H1s
        const h1Count = (code.match(/<h1/gi) || []).length;
        if (h1Count > 1 && state.abidosRules.singleH1) {
            results.passes = false;
            results.errors.push(`🚫 SEO CRITICAL: Múltiplas tags <h1> detectadas (${h1Count}). O limite Abidos é 1.`);
        }

        // 2. Check for Alt Tags
        if (state.abidosRules.altTags) {
            const hasImgWithoutAlt = /<img(?![^>]*\balt\b)[^>]*>/gi.test(code);
            if (hasImgWithoutAlt) {
                results.warnings.push('⚠️ SEO WARNING: Imagem detectada sem tag "alt". Isso penaliza o tráfego orgânico.');
            }
        }

        // [PHASE 2.6] Check for CFP Forbidden Terms (Word Boundaries)
        if (state.abidosRules.cfpTerms) {
            const forbidden = [
                { term: 'cura', regex: /\bcura\b/gi, except: ['curadoria', 'procuradoria', 'curaçao'] },
                { term: 'curar', regex: /\bcurar\b/gi },
                { term: 'garantido', regex: /\bgarantido\b/gi },
                { term: 'garantia de resultado', regex: /\bgarantia de resultado/gi },
                { term: 'melhor profissional', regex: /\bmelhor profissional\b/gi },
                { term: 'o único', regex: /\bo único\b/gi },
                { term: 'solução definitiva', regex: /\bsolução definitiva\b/gi },
                { term: 'milagroso', regex: /\bmilagros[oa]\b/gi },
                { term: 'comprovado cientificamente', regex: /\bcomprovado cientificamente\b/gi },
                { term: 'tratamento infalível', regex: /\btratamento infalível\b/gi }
            ];
            forbidden.forEach(({ term, regex, except }) => {
                const matches = code.match(regex);
                if (matches) {
                    // Filter false positives from exception list
                    const codeLower = code.toLowerCase();
                    const hasFalsePositive = except && except.some(e => codeLower.includes(e.toLowerCase()));
                    if (!hasFalsePositive) {
                        results.passes = false;
                        results.errors.push(`⚖️ ETHICS ALERT: Termo "${term}" detectado (${matches.length}x). Risco CFP.`);
                    }
                }
            });
        }

        // Store last audit for commit gate (Phase 2.4)
        state.lastAuditResult = results;

        // Update UI + Bottom Drawer Audit Log
        updateAuditUI(results);
        if (results.passes) {
            addAuditLog('success', `✅ Auditoria aprovada. ${results.warnings.length} avisos.`);
        } else {
            addAuditLog('error', `🔴 Auditoria REPROVADA: ${results.errors.length} erros.`);
            results.errors.forEach(e => addAuditLog('error', `  → ${e}`));
        }
        return results;
    }

    // =========================================================================
    // [PHASE 2.2] SNAPSHOT ENGINE (Time Travel)
    // =========================================================================
    async function createSnapshot(prompt) {
        if (!state.db || !state.currentFile) return;
        try {
            const content = getEditorContent();
            if (!content || content.length < 10) return;
            await state.db.snapshots.add({
                filePath: state.currentFile,
                content: content,
                prompt: prompt || 'manual',
                timestamp: new Date().toISOString()
            });
            state.snapshotId++;
            addAuditLog('info', `📸 Snapshot #${state.snapshotId} salvo (${state.currentFile.split('/').pop()})`);
        } catch(e) {
            console.warn('[SNAPSHOT]', e);
        }
    }

    // =========================================================================
    // [PHASE 2.3] SELECTIVE CONTEXT BUILDER
    // =========================================================================
    async function buildSelectiveContext() {
        const parts = [];
        
        // Always include the active file
        if (state.currentFile) {
            const content = getEditorContent();
            if (content) {
                parts.push(`[ARQUIVO ATIVO: ${state.currentFile}]\n\`\`\`\n${content}\n\`\`\``);
            }
        }

        // Include related imports from active file
        const activeContent = getEditorContent() || '';
        const importRegex = /(?:import|from)\s+['"](\.?\.?\/[^'"]+)['"]/g;
        const imports = [];
        let importMatch;
        while ((importMatch = importRegex.exec(activeContent)) !== null) {
            imports.push(importMatch[1]);
        }

        if (imports.length > 0) {
            const allFiles = await vfsList();
            for (const imp of imports) {
                const cleanPath = imp.replace(/^\.\/?/, '').replace(/\.[^.]+$/, '');
                const match = allFiles.find(f => f.path.includes(cleanPath));
                if (match && match.content) {
                    parts.push(`[IMPORT RELACIONADO: ${match.path}]\n\`\`\`\n${match.content.substring(0, 2000)}\n\`\`\``);
                }
            }
        }

        return parts.join('\n\n');
    }

    // =========================================================================
    // [PHASE 2.5] SEMANTIC AUDIT — REMOVED (Vórtex 3.1 Purge)
    // A auditoria semântica foi removida para eliminar overhead de tokens.
    // A compliance Abidos (auditCode) permanece ativa como gate de commit.
    // =========================================================================

    function updateAuditUI(results) {
        const chatMessages = document.getElementById('vortex-chat-messages');
        if (!results.passes && chatMessages) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'vortex-msg vortex-msg-system';
            errorDiv.style.background = 'rgba(239, 68, 68, 0.1)';
            errorDiv.style.borderColor = 'rgba(239, 68, 68, 0.3)';
            errorDiv.innerHTML = `
                <div style="color: #ef4444; font-weight: 800; margin-bottom: 8px;">🛡️ GUARDIÃO BLOQUEOU A GERAÇÃO</div>
                <div style="font-size: 11px; line-height: 1.5;">${results.errors.join('<br>')}</div>
                <button class="vortex-btn-repair" onclick="vortexStudio.repairCode()">AI AUTO-REPAIR</button>
            `;
            chatMessages.appendChild(errorDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        } else if (results.warnings.length > 0 && chatMessages) {
            addMessage('system', results.warnings.join('\n'));
        }
    }

    async function repairCode() {
        const lastMsg = state.messages[state.messages.length - 1];
        const errorSummary = "Corrija os erros de compliance Abidos: Retorne apenas 1 H1 e remova termos proibidos pelo CFP.";
        addMessage('user', `🔨 Auto-Reparar: ${errorSummary}`);
        sendPrompt(errorSummary);
    }

    function setGenerating(isGen) {
        state.isGenerating = isGen;
        const indicator = document.getElementById('vortex-generating');
        const sendBtn = document.getElementById('vortex-send-btn');
        const inputWrapper = document.querySelector('.vortex-chat-input-wrapper');
        if (indicator) indicator.style.display = isGen ? 'flex' : 'none';
        if (sendBtn) sendBtn.disabled = isGen;
        if (inputWrapper) inputWrapper.classList.toggle('streaming', isGen);
    }

    // =========================================================================
    // VÓRTEX REACT COMPILER (Zero-Token Preview Strategy)
    // =========================================================================
    function isReactCode(code) {
        return code.includes('import ') || code.includes('export default function') || code.includes('className=') || code.includes('React.');
    }

    // =========================================================================
    // [VÓRTEX 3.1] NAKED COMPONENT STRIPPER
    // Remove imports do código para injeção no Preview Shell isolado.
    // O Shell já possui React, Framer Motion, Lucide e Mocks no escopo global.
    // =========================================================================
    function stripForPreview(code) {
        let stripped = code;
        // Remove todos os imports (o Shell já tem tudo no escopo global)
        stripped = stripped.replace(/import\s+.*?from\s+['"][^'"]+['"];?\s*\n?/g, '');
        // Remove 'use client' directive
        stripped = stripped.replace(/['"]use client['"];?\s*\n?/g, '');
        // Remove export default — o Shell procura por Component ou App
        stripped = stripped.replace(/export\s+default\s+function\s+/, 'function ');
        stripped = stripped.replace(/export\s+default\s+/, '');
        return stripped.trim();
    }

    function getComponentName(code) {
        const match = code.match(/(?:export\s+default\s+)?function\s+([A-Za-z0-9_]+)/);
        return match ? match[1] : 'App';
    }

    // =========================================================================
    // [VÓRTEX 3.1] PREVIEW — Shell Isolado via postMessage
    // React: Usa preview-shell.html com injeção via postMessage
    // HTML:  Fallback para srcdoc (conteúdo estático)
    // =========================================================================
    let shellReady = false;
    let pendingCode = null;

    function updatePreview(htmlContent) {
        const frame = document.getElementById('vortex-preview-frame');
        if (!frame) return;

        // Sanitização Anti-Hallucination
        let processedHtml = htmlContent;
        processedHtml = processedHtml.replace(/src=["'](?:%22|\\"")+(https:\/\/unpkg\.com\/lucide[^"']?.*?)(?:%22|\\")+["']/g, 'src="$1"');
        processedHtml = processedHtml.replace(/src=["'](?:%22|\\"")+(https:\/\/cdn\.tailwindcss\.com[^"']?.*?)(?:%22|\\")+["']/g, 'src="$1"');

        if (isReactCode(processedHtml)) {
            // ============================================================
            // [VÓRTEX 3.1] React → Preview Shell + postMessage
            // ============================================================
            const strippedCode = stripForPreview(processedHtml);
            const componentName = getComponentName(processedHtml);

            // Adiciona a variável Component para o Shell encontrar
            const injectableCode = strippedCode + `\nconst Component = ${componentName};`;

            // Carrega o shell se ainda não estiver ativo
            const currentSrc = frame.getAttribute('src');
            if (!currentSrc || !currentSrc.includes('preview-shell.html')) {
                shellReady = false;
                pendingCode = injectableCode;
                frame.src = '/preview-shell.html';
            } else if (shellReady) {
                // Shell já carregado — injetar diretamente
                frame.contentWindow.postMessage({
                    type: 'vortex-inject-component',
                    code: injectableCode
                }, '*');
            } else {
                // Shell carregando — guardar código pendente
                pendingCode = injectableCode;
            }
        } else {
            // ============================================================
            // HTML Estático — Fallback via srcdoc (sem React)
            // ============================================================
            const telemetryScript = `
                <script type="module">
                    import { onLCP, onCLS, onINP } from 'https://unpkg.com/web-vitals@3?module';
                    const send = (name, val) => window.parent.postMessage({ type: 'vortex-vital', name, value: val }, '*');
                    onLCP(m => send('LCP', m.value));
                    onCLS(m => send('CLS', m.value));
                    onINP(m => send('INP', m.value));
                </script>
                <script>
                    window.addEventListener('load', () => {
                        if (window.lucide) window.lucide.createIcons();
                    });
                </script>
            `;

            let fullHtml = processedHtml;
            if (!processedHtml.includes('<!DOCTYPE') && !processedHtml.includes('<html')) {
                fullHtml = `<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.tailwindcss.com/3.4.1"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Outfit:wght@600;800&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; background: #050810; color: #e2e8f0; margin: 0; min-height: 100vh; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: #2dd4bf20; border-radius: 10px; }
        .font-outfit { font-family: 'Outfit', sans-serif; }
    </style>
    ${telemetryScript}
</head>
<body>${processedHtml}</body>
</html>`;
                fullHtml = injectDesignSystemToPreview(fullHtml);
            } else {
                if (!fullHtml.includes('unpkg.com/lucide')) {
                    fullHtml = fullHtml.replace('</head>', '<script src="https://unpkg.com/lucide@latest"></script></head>');
                }
                fullHtml = fullHtml.replace('</body>', `${telemetryScript}</body>`);
                fullHtml = injectDesignSystemToPreview(fullHtml);
            }

            // Reset para srcdoc mode
            frame.removeAttribute('src');
            frame.srcdoc = fullHtml;
        }
    }

    // [VÓRTEX 3.1] Listener para comunicação host ↔ iframe
    window.addEventListener('message', (event) => {
        if (!event.data || !event.data.type) return;

        switch (event.data.type) {
            // Shell pronto — injetar código pendente
            case 'vortex-shell-ready':
                shellReady = true;
                console.log('🌀 [VÓRTEX 3.1] Preview Shell carregado com sucesso.');
                if (pendingCode) {
                    const frame = document.getElementById('vortex-preview-frame');
                    if (frame && frame.contentWindow) {
                        frame.contentWindow.postMessage({
                            type: 'vortex-inject-component',
                            code: pendingCode
                        }, '*');
                    }
                    pendingCode = null;
                }
                break;

            // Renderização bem-sucedida
            case 'vortex-render-success':
                addAuditLog('success', '✅ Preview renderizado com sucesso.');
                break;

            // Erro de renderização no shell
            case 'vortex-render-error':
                console.error('[VÓRTEX 3.1] Render Error:', event.data.message);
                addAuditLog('error', `❌ Preview Error: ${event.data.message}`);
                break;

            // Telemetria Web Vitals
            case 'vortex-vital': {
                const { name, value } = event.data;
                const el = document.getElementById(`vortex-${name.toLowerCase()}`);
                if (el) {
                    let formatted = value;
                    if (name === 'LCP' || name === 'INP') formatted = (value / 1000).toFixed(2) + 's';
                    if (name === 'CLS') formatted = value.toFixed(3);
                    el.innerText = formatted;
                    if (name === 'LCP') el.className = value < 2500 ? 'vortex-vital-value good' : value < 4000 ? 'vortex-vital-value neutral' : 'vortex-vital-value bad';
                    if (name === 'CLS') el.className = value < 0.1 ? 'vortex-vital-value good' : value < 0.25 ? 'vortex-vital-value neutral' : 'vortex-vital-value bad';
                }
                break;
            }
        }
    });


    function setPreviewDevice(device) {
        state.previewDevice = device;
        const frame = document.getElementById('vortex-preview-frame');
        if (!frame) return;

        // Update device buttons
        document.querySelectorAll('.vortex-device-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.device === device);
        });

        // Apply device width
        const widths = { mobile: '375px', tablet: '768px', desktop: '100%' };
        frame.style.maxWidth = widths[device] || '100%';
        frame.style.margin = device !== 'desktop' ? '0 auto' : '0';
        frame.style.transition = 'max-width 0.3s ease';
    }

    // =========================================================================
    // FILE TREE EXPLORER (Etapa 1.1)
    // =========================================================================
    function getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const icons = {
            tsx: '⚛️', jsx: '⚛️', ts: '🔷', js: '🟡',
            css: '🎨', scss: '🎨', html: '🌐', json: '📋',
            md: '📝', svg: '🖼️', png: '🖼️', jpg: '🖼️',
            env: '🔒', gitignore: '🚫', txt: '📄'
        };
        return icons[ext] || '📄';
    }

    function getLanguageFromExt(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const langs = {
            tsx: 'typescriptreact', jsx: 'javascript', ts: 'typescript',
            js: 'javascript', css: 'css', scss: 'scss', html: 'html',
            json: 'json', md: 'markdown', svg: 'xml', txt: 'plaintext'
        };
        return langs[ext] || 'plaintext';
    }

    async function renderFileTree() {
        const container = document.getElementById('vortex-file-tree');
        if (!container) return;

        const files = await vfsList();
        if (files.length === 0) {
            container.innerHTML = `
                <div class="vortex-tree-empty">
                    <span>📂</span>
                    <small>Nenhum arquivo no VFS.<br>Envie um prompt para gerar.</small>
                </div>`;
            return;
        }

        // Build tree structure from flat paths
        const tree = {};
        files.forEach(f => {
            const parts = f.path.split('/').filter(Boolean);
            let current = tree;
            parts.forEach((part, i) => {
                if (i === parts.length - 1) {
                    current[part] = { _file: f };
                } else {
                    if (!current[part]) current[part] = {};
                    current = current[part];
                }
            });
        });

        function renderNode(node, depth = 0) {
            let html = '';
            const entries = Object.entries(node).sort(([a, av], [b, bv]) => {
                const aIsDir = !av._file;
                const bIsDir = !bv._file;
                if (aIsDir && !bIsDir) return -1;
                if (!aIsDir && bIsDir) return 1;
                return a.localeCompare(b);
            });

            for (const [name, value] of entries) {
                const pad = depth * 12;
                if (value._file) {
                    const isActive = state.currentFile === value._file.path;
                    html += `<div class="vortex-tree-file ${isActive ? 'active' : ''}" 
                                 data-path="${value._file.path}" 
                                 onclick="vortexStudio.openFilePath('${value._file.path}')"
                                 style="padding-left:${pad + 8}px">
                                <span class="vortex-tree-icon">${getFileIcon(name)}</span>
                                <span class="vortex-tree-name">${name}</span>
                            </div>`;
                } else {
                    html += `<div class="vortex-tree-dir" style="padding-left:${pad + 4}px" 
                                  onclick="this.classList.toggle('collapsed'); this.nextElementSibling.classList.toggle('hidden')">
                                <span class="vortex-tree-arrow">▼</span>
                                <span class="vortex-tree-icon">📁</span>
                                <span class="vortex-tree-name">${name}</span>
                            </div>`;
                    html += `<div class="vortex-tree-children">${renderNode(value, depth + 1)}</div>`;
                }
            }
            return html;
        }

        container.innerHTML = renderNode(tree);
    }

    async function openFilePath(filePath) {
        const content = await vfsRead(filePath);
        if (content !== null) {
            const filename = filePath.split('/').pop();
            const language = getLanguageFromExt(filename);
            setEditorContent(content, language);
            state.currentFile = filePath;
            updateFileTab(filename, false);
            updateBreadcrumbs(filePath);
            renderFileTree(); // Refresh active state
        }
    }

    // =========================================================================
    // FILE TABS (Etapa 1.3)
    // =========================================================================
    function updateFileTab(filename, modified = false) {
        const tabs = document.getElementById('vortex-file-tabs');
        if (!tabs) return;

        let tab = tabs.querySelector(`[data-file="${filename}"]`);
        if (!tab) {
            tab = document.createElement('button');
            tab.className = 'vortex-file-tab active';
            tab.dataset.file = filename;
            tab.innerHTML = `<span class="dot"></span><span class="tab-icon">${getFileIcon(filename)}</span>${filename}<span class="tab-close" onclick="event.stopPropagation(); vortexStudio.closeTab('${filename}')">&times;</span>`;
            tab.onclick = () => openFile(filename);
            
            tabs.querySelectorAll('.vortex-file-tab').forEach(t => t.classList.remove('active'));
            tabs.appendChild(tab);
        } else {
            tabs.querySelectorAll('.vortex-file-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
        }

        if (modified) tab.classList.add('modified');
    }

    function closeTab(filename) {
        const tabs = document.getElementById('vortex-file-tabs');
        if (!tabs) return;
        const tab = tabs.querySelector(`[data-file="${filename}"]`);
        if (tab) {
            const wasActive = tab.classList.contains('active');
            tab.remove();
            if (wasActive) {
                const remaining = tabs.querySelector('.vortex-file-tab');
                if (remaining) {
                    remaining.classList.add('active');
                    openFile(remaining.dataset.file);
                }
            }
        }
    }

    async function openFile(filename) {
        const allFiles = await vfsList();
        const fileMatch = allFiles.find(f => f.name === filename || f.path.endsWith(filename));
        
        const filePath = fileMatch ? fileMatch.path : `/src/app/${filename}`;
        const content = await vfsRead(filePath);
        if (content !== null) {
            const language = getLanguageFromExt(filename);
            setEditorContent(content, language);
            state.currentFile = filePath;
            updateFileTab(filename, false);
            renderFileTree();
        }
    }

    // =========================================================================
    // MULTI-FILE PARSER (Etapa 1.5)
    // =========================================================================
    function parseMultiFileResponse(text) {
        const files = [];
        const fileRegex = /<file\s+path="([^"]+)"\s*(?:language="([^"]+)")?\s*>([\s\S]*?)<\/file>/g;
        let match;

        while ((match = fileRegex.exec(text)) !== null) {
            files.push({
                path: match[1].trim(),
                language: match[2] || getLanguageFromExt(match[1].trim().split('/').pop()),
                content: match[3].trim()
            });
        }

        // [Vórtex 3.1] Preview parser removido — preview agora é via Shell isolado.
        const explanationMatch = text.match(/<explanation>([\s\S]*?)<\/explanation>/);

        return {
            files,
            preview: '', // [Vórtex 3.1] Preview via Shell — não extrair do response da IA
            explanation: explanationMatch ? explanationMatch[1].trim() : 'Código gerado.'
        };
    }

    async function processMultiFileResponse(parsed) {
        if (parsed.files.length === 0) return;

        for (const file of parsed.files) {
            const fullPath = file.path.startsWith('/') ? file.path : `/src/app/${file.path}`;
            await vfsWrite(fullPath, file.content);
        }

        // Open the first file in the editor
        const first = parsed.files[0];
        const firstPath = first.path.startsWith('/') ? first.path : `/src/app/${first.path}`;
        const firstName = firstPath.split('/').pop();
        setEditorContent(first.content, first.language);
        state.currentFile = firstPath;
        updateFileTab(firstName, true);

        // Create tabs for all generated files
        for (let i = 1; i < parsed.files.length; i++) {
            const fp = parsed.files[i].path;
            const fn = fp.split('/').pop();
            updateFileTab(fn, true);
            // Re-activate the first tab
            const tabs = document.getElementById('vortex-file-tabs');
            if (tabs) {
                tabs.querySelectorAll('.vortex-file-tab').forEach(t => t.classList.remove('active'));
                const firstTab = tabs.querySelector(`[data-file="${firstName}"]`);
                if (firstTab) firstTab.classList.add('active');
            }
        }

        if (parsed.preview) {
            updatePreview(parsed.preview);
        } else if (parsed.files && parsed.files.length > 0) {
            const mainFile = parsed.files.find(f => f.path.endsWith('.tsx') || f.path.endsWith('.jsx') || f.path.endsWith('.js'));
            if (mainFile) {
                updatePreview(mainFile.content);
            }
        }
        await renderFileTree();

        addMessage('ai', `${parsed.explanation}\n\n📦 **${parsed.files.length} arquivo(s) gerado(s):** ${parsed.files.map(f => '`' + f.path.split('/').pop() + '`').join(', ')}`);
    }

    // =========================================================================
    // SPLITTER / RESIZE (Etapa 1.8)
    // =========================================================================
    function initSplitters() {
        document.querySelectorAll('.vortex-splitter').forEach(splitter => {
            let isResizing = false;
            let startX, startWidthLeft, startWidthRight;
            const leftPanel = splitter.previousElementSibling;
            const rightPanel = splitter.nextElementSibling;

            splitter.addEventListener('mousedown', (e) => {
                isResizing = true;
                startX = e.clientX;
                startWidthLeft = leftPanel.getBoundingClientRect().width;
                startWidthRight = rightPanel.getBoundingClientRect().width;
                document.body.style.cursor = 'col-resize';
                document.body.style.userSelect = 'none';
                e.preventDefault();
            });

            document.addEventListener('mousemove', (e) => {
                if (!isResizing) return;
                const dx = e.clientX - startX;
                const newLeftWidth = Math.max(200, startWidthLeft + dx);
                const newRightWidth = Math.max(200, startWidthRight - dx);
                leftPanel.style.width = newLeftWidth + 'px';
                leftPanel.style.flex = 'none';
                rightPanel.style.width = newRightWidth + 'px';
                rightPanel.style.flex = 'none';
                if (state.editor) state.editor.layout();
            });

            document.addEventListener('mouseup', () => {
                if (isResizing) {
                    isResizing = false;
                    document.body.style.cursor = '';
                    document.body.style.userSelect = '';
                }
            });
        });
    }

    // =========================================================================
    // ABIDOS TOGGLES
    // =========================================================================
    function toggleAbidosRule(rule) {
        state.abidosRules[rule] = !state.abidosRules[rule];
        const el = document.querySelector(`[data-abidos-toggle="${rule}"]`);
        if (el) el.classList.toggle('active', state.abidosRules[rule]);
        console.log(`🛡️ [ABIDOS] Rule "${rule}":`, state.abidosRules[rule] ? 'ON' : 'OFF');
    }

    // =========================================================================
    // UI RENDERING
    // =========================================================================
    function renderUI() {
        const section = document.getElementById('vortex-studio');
        if (!section) return;

        section.innerHTML = `
            <style>
                .vortex-vision-link {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    background: rgba(45, 212, 191, 0.05);
                    border: 1px solid rgba(45, 212, 191, 0.2);
                    padding: 8px 12px;
                    border-radius: 8px;
                    margin-bottom: 12px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                }
                .vortex-vision-status {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    animation: vortex-pulse-teal 2s infinite;
                }
                .vortex-vision-text {
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 10px;
                    color: #2dd4bf;
                    letter-spacing: -0.02em;
                    font-weight: 700;
                }
                .vortex-vision-thumb {
                    width: 32px;
                    height: 32px;
                    object-fit: cover;
                    border-radius: 4px;
                    border: 1px solid rgba(255,255,255,0.1);
                    margin-left: auto;
                }
                .vortex-vision-close {
                    color: #94a3b8;
                    font-size: 18px;
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    padding: 0 4px;
                }
                .vortex-vision-close:hover { color: #f43f5e; }

                /* [PHASE 3.3] ABIDOS TOGGLES UI */
                .vortex-abidos-toggles {
                    padding: 12px 16px;
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                    background: rgba(0,0,0,0.2);
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 8px;
                }
                .vortex-toggle-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 6px 10px;
                    background: rgba(255,255,255,0.02);
                    border-radius: 6px;
                    border: 1px solid rgba(255,255,255,0.05);
                }
                .vortex-toggle-label {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 10px;
                    font-weight: 600;
                    color: #94a3b8;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .vortex-toggle-label i { width: 14px; height: 14px; }
                .vortex-switch {
                    width: 28px;
                    height: 14px;
                    background: #334155;
                    border-radius: 20px;
                    position: relative;
                    cursor: pointer;
                    transition: all 0.3s;
                }
                .vortex-switch:after {
                    content: '';
                    position: absolute;
                    top: 2px;
                    left: 2px;
                    width: 10px;
                    height: 10px;
                    background: #fff;
                    border-radius: 50%;
                    transition: all 0.3s;
                }
                .vortex-switch.active { background: #2dd4bf; }
                .vortex-switch.active:after { left: 16px; }

                @keyframes vortex-pulse-teal {
                    0% { opacity: 0.6; }
                    50% { opacity: 1; }
                    100% { opacity: 0.6; }
                }
            </style>
            <!-- TOOLBAR -->
            <div class="vortex-toolbar">
                <div class="vortex-toolbar-left">
                    <div class="vortex-brand">
                        <div class="brand-icon"><i data-lucide="tornado"></i></div>
                        Vórtex <span>AI Studio</span>
                    </div>
                    <div class="vortex-status-badge online">
                        <div class="vortex-status-dot"></div>
                        VFS Online
                    </div>
                </div>
                <div class="vortex-toolbar-center">
                    <select id="vortex-model-select" class="vortex-model-select">
                        <option value="gemini-2.5-flash">⚡ GEMINI 2.5 FLASH</option>
                        <option value="gemini-2.5-pro">🧠 GEMINI 2.5 PRO</option>
                        <option value="gemini-2.5-flash-lite">💡 FLASH LITE</option>
                    </select>
                </div>
                <div class="vortex-toolbar-right">
                    <button class="vortex-btn vortex-btn-secondary" onclick="vortexStudio.syncContextHub()" id="vortex-hub-btn" title="Armazena a teia de componentes no Google Cache API para reduzir custos e aumentar alinhamento do Design System">
                        <i data-lucide="database"></i> SYNC HUB
                    </button>
                    <button class="vortex-btn vortex-btn-secondary" onclick="vortexStudio.saveToVFS()">
                        <i data-lucide="save"></i> SALVAR
                    </button>
                    <button class="vortex-btn vortex-btn-secondary" onclick="vortexStudio.downloadCode()" title="Baixar Código Next.js (Hidratado)">
                        <i data-lucide="code-2"></i>
                    </button>
                    <button class="vortex-btn vortex-btn-secondary" onclick="vortexStudio.exportHTML()" title="Exportar HTML Estático (Preview)">
                        <i data-lucide="download"></i>
                    </button>
                    <button class="vortex-btn vortex-btn-secondary" onclick="vortexStudio.generateSEOCluster()" title="Silos SEO">
                        <i data-lucide="network"></i>
                    </button>
                    <button class="vortex-btn vortex-btn-secondary" onclick="vortexStudio.showTemplateLibrary()" title="Templates">
                        <i data-lucide="layout-template"></i>
                    </button>
                    <button class="vortex-btn vortex-btn-success" onclick="vortexStudio.commitAndPush()">
                        <i data-lucide="git-branch"></i> COMMIT & PUSH
                    </button>
                    <button class="vortex-btn vortex-btn-secondary" onclick="vortexStudio.toggleZenMode()" title="Modo Zen — Foco no Editor">
                        <i data-lucide="maximize-2"></i>
                    </button>
                    <button class="vortex-btn vortex-btn-secondary" onclick="app.showSection('dashboard')">
                        <i data-lucide="x"></i>
                    </button>
                </div>
            </div>

            <!-- 3-COLUMN WORKSPACE -->
            <div class="vortex-workspace">
                <!-- LEFT: CHAT + EXPLORER PANEL -->
                <div class="vortex-panel vortex-chat-panel">
                    <!-- File Explorer Collapsible -->
                    <div class="vortex-explorer-section">
                        <div class="vortex-panel-header vortex-explorer-header" onclick="document.getElementById('vortex-file-tree').classList.toggle('collapsed')">
                            <div class="vortex-panel-title">
                                <i data-lucide="folder-tree"></i>
                                EXPLORER
                            </div>
                            <span class="vortex-explorer-toggle">▼</span>
                        </div>
                        <div id="vortex-file-tree" class="vortex-file-tree"></div>
                    </div>
                    <!-- Chat -->
                    <div class="vortex-panel-header">
                        <div class="vortex-panel-title">
                            <i data-lucide="message-square"></i>
                            Chat Gemini 2.5
                        </div>
                    </div>
                    <div id="vortex-chat-messages" class="vortex-chat-messages vortex-panel-body">
                        <div class="vortex-msg vortex-msg-system">
                            🌀 Vórtex AI Studio inicializado. Descreva a página que deseja criar.
                        </div>
                    </div>
                    <div id="vortex-generating" class="vortex-generating" style="display: none;">
                        <div class="vortex-shimmer-bar"></div>
                        <div class="vortex-generating-text">
                            <span class="vortex-pulse-dot"></span>
                            Gemini processando...
                        </div>
                    </div>
                    <div class="vortex-abidos-toggles">
                        <div class="vortex-toggle-row">
                            <div class="vortex-toggle-label"><i data-lucide="heading-1"></i> H1 Único</div>
                            <div class="vortex-switch active" data-abidos-toggle="singleH1" onclick="vortexStudio.toggleRule('singleH1')"></div>
                        </div>
                        <div class="vortex-toggle-row">
                            <div class="vortex-toggle-label"><i data-lucide="image"></i> Alt Tags SEO</div>
                            <div class="vortex-switch active" data-abidos-toggle="altTags" onclick="vortexStudio.toggleRule('altTags')"></div>
                        </div>
                        <div class="vortex-toggle-row">
                            <div class="vortex-toggle-label"><i data-lucide="shield-check"></i> CFP Compliance</div>
                            <div class="vortex-switch active" data-abidos-toggle="cfpTerms" onclick="vortexStudio.toggleRule('cfpTerms')"></div>
                        </div>
                        <div class="vortex-toggle-row">
                            <div class="vortex-toggle-label"><i data-lucide="message-circle"></i> WhatsApp CTA</div>
                            <div class="vortex-switch active" data-abidos-toggle="whatsappCTA" onclick="vortexStudio.toggleRule('whatsappCTA')"></div>
                        </div>
                    </div>
                    <div class="vortex-chat-input-area" style="transition: background 0.3s;"
                         ondragover="event.preventDefault(); this.style.background='rgba(99,102,241,0.1)';" 
                         ondragleave="this.style.background='transparent';" 
                         ondrop="event.preventDefault(); this.style.background='transparent'; vortexStudio.handleDrop(event);">
                        <div id="vortex-image-preview-container" style="display: none; position: relative; margin-bottom: 12px;">
                           <img id="vortex-image-preview" src="" style="max-height: 80px; border-radius: 6px; border: 1px solid #3c3c3c;">
                           <button onclick="vortexStudio.removeImage()" style="position: absolute; top: -8px; right: -8px; background: #ef4444; color: white; border: none; border-radius: 50%; width: 22px; height: 22px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px;">×</button>
                        </div>
                        <div class="vortex-chat-input-wrapper">
                            <button title="Anexar Design (Print/Mockup)" onclick="document.getElementById('vortex-file-upload').click()" style="background:none; border:none; color:#a1a1aa; cursor:pointer; padding:8px;">
                                <i data-lucide="image-plus"></i>
                            </button>
                            <input type="file" id="vortex-file-upload" accept="image/*" style="display:none" onchange="vortexStudio.handleImageUpload(event)">
                            
                            <textarea id="vortex-chat-input" class="vortex-chat-input" placeholder="Descreva a página ou anexe um print..." rows="1"
                                onkeydown="if(event.key==='Enter' && !event.shiftKey){event.preventDefault();vortexStudio.send();}"></textarea>
                            <button id="vortex-send-btn" class="vortex-chat-send" onclick="vortexStudio.send()">
                                <i data-lucide="send"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- SPLITTER LEFT -->
                <div class="vortex-splitter" title="Arrastar para redimensionar"></div>

                <!-- CENTER: EDITOR PANEL -->
                <div class="vortex-panel vortex-editor-panel">
                    <div class="vortex-panel-header" style="background: #252526; border-color: #3c3c3c;">
                        <div id="vortex-file-tabs" class="vortex-file-tabs">
                            <button class="vortex-file-tab active" data-file="page.tsx">
                                <span class="dot"></span><span class="tab-icon">⚛️</span>page.tsx
                                <span class="tab-close" onclick="event.stopPropagation(); vortexStudio.closeTab('page.tsx')">×</span>
                            </button>
                        </div>
                        <div class="vortex-panel-title" style="color: #6a737d;">
                            <i data-lucide="code-2" style="color: #6366f1;"></i>
                            EDITOR
                        </div>
                    </div>
                    <!-- [PHASE 3.4] Breadcrumbs -->
                    <div id="vortex-breadcrumbs" class="vortex-breadcrumbs">
                        <span class="breadcrumb-segment">src</span>
                        <span class="breadcrumb-sep">/</span>
                        <span class="breadcrumb-segment">app</span>
                        <span class="breadcrumb-sep">/</span>
                        <span class="breadcrumb-segment active">page.tsx</span>
                    </div>
                    <div id="vortex-monaco-container" class="vortex-panel-body" style="background: #1e1e1e;"></div>
                </div>

                <!-- SPLITTER RIGHT -->
                <div class="vortex-splitter" title="Arrastar para redimensionar"></div>

                <!-- RIGHT: PREVIEW PANEL -->
                <div class="vortex-panel vortex-preview-panel">
                    <div class="vortex-panel-header">
                        <div class="vortex-panel-title">
                            <i data-lucide="eye"></i>
                            PREVIEW
                        </div>
                        <div class="vortex-device-selector">
                            <button class="vortex-device-btn" data-device="mobile" onclick="vortexStudio.setDevice('mobile')">
                                <i data-lucide="smartphone"></i> Mobile
                            </button>
                            <button class="vortex-device-btn" data-device="tablet" onclick="vortexStudio.setDevice('tablet')">
                                <i data-lucide="tablet"></i> Tablet
                            </button>
                            <button class="vortex-device-btn active" data-device="desktop" onclick="vortexStudio.setDevice('desktop')">
                                <i data-lucide="monitor"></i> Desktop
                            </button>
                            <button class="vortex-device-btn" onclick="vortexStudio.popOutPreview()" title="Abrir em nova aba">
                                <i data-lucide="external-link"></i>
                            </button>
                        </div>
                    </div>
                    <iframe id="vortex-preview-frame" class="vortex-preview-frame vortex-panel-body" sandbox="allow-scripts allow-same-origin"></iframe>
                    <div class="vortex-vitals-bar">
                        <div class="vortex-vital-metric">
                            <span class="vortex-vital-label">LCP</span>
                            <span class="vortex-vital-value good" id="vortex-lcp">—</span>
                        </div>
                        <div class="vortex-vital-metric">
                            <span class="vortex-vital-label">CLS</span>
                            <span class="vortex-vital-value good" id="vortex-cls">—</span>
                        </div>
                        <div class="vortex-vital-metric">
                            <span class="vortex-vital-label">INP</span>
                            <span class="vortex-vital-value good" id="vortex-inp">—</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- BOTTOM DRAWER -->
            <div id="vortex-drawer" class="vortex-drawer collapsed">
                <div class="vortex-drawer-handle" onclick="vortexStudio.toggleDrawer()">
                    <div class="vortex-drawer-tabs">
                        <button class="vortex-drawer-tab active" data-drawer="audit" onclick="event.stopPropagation(); vortexStudio.switchDrawerTab('audit')">
                            <i data-lucide="shield-check"></i> AUDITORIA
                        </button>
                        <button class="vortex-drawer-tab" data-drawer="terminal" onclick="event.stopPropagation(); vortexStudio.switchDrawerTab('terminal')">
                            <i data-lucide="terminal"></i> TERMINAL
                        </button>
                    </div>
                    <span class="vortex-drawer-chevron">▲</span>
                </div>
                <div class="vortex-drawer-content">
                    <div id="vortex-drawer-audit" class="vortex-drawer-pane active">
                        <div class="vortex-audit-log" id="vortex-audit-log">
                            <div class="vortex-audit-entry info">🌀 Vórtex Auditoria inicializada. Logs do Abidos aparecerão aqui.</div>
                        </div>
                    </div>
                    <div id="vortex-drawer-terminal" class="vortex-drawer-pane">
                        <pre class="vortex-terminal-output" id="vortex-terminal-output">$ vortex ready\n⚡ Waiting for commands...</pre>
                    </div>
                </div>
            </div>
        `;

        // Initialize Lucide icons
        if (window.lucide) window.lucide.createIcons();
    }

    function toggleDrawer() {
        const drawer = document.getElementById('vortex-drawer');
        if (drawer) drawer.classList.toggle('collapsed');
    }

    function switchDrawerTab(tabName) {
        const drawer = document.getElementById('vortex-drawer');
        if (drawer && drawer.classList.contains('collapsed')) {
            drawer.classList.remove('collapsed');
        }
        document.querySelectorAll('.vortex-drawer-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.vortex-drawer-pane').forEach(p => p.classList.remove('active'));
        const targetTab = document.querySelector(`.vortex-drawer-tab[data-drawer="${tabName}"]`);
        const targetPane = document.getElementById(`vortex-drawer-${tabName}`);
        if (targetTab) targetTab.classList.add('active');
        if (targetPane) targetPane.classList.add('active');
    }

    function addAuditLog(type, message) {
        const log = document.getElementById('vortex-audit-log');
        if (!log) return;
        const entry = document.createElement('div');
        entry.className = `vortex-audit-entry ${type}`;
        entry.innerHTML = `<span class="audit-time">${new Date().toLocaleTimeString()}</span> ${message}`;
        log.appendChild(entry);
        log.scrollTop = log.scrollHeight;
    }

    // =========================================================================
    // SAVE & COMMIT
    // =========================================================================
    async function saveToVFS() {
        if (!state.currentFile) {
            state.currentFile = '/src/app/page.tsx';
        }
        let content = getEditorContent();

        // [VÓRTEX 3.1] Materialização via Hidratação (Next.js Ready)
        if (typeof window.hydrate === 'function' && (state.currentFile.endsWith('.tsx') || state.currentFile.endsWith('.js'))) {
            try {
                const hydrated = window.hydrate(content);
                if (hydrated && hydrated !== content) {
                    content = hydrated;
                    setEditorContent(content); // Sincroniza o editor com a versão hidratada
                    addAuditLog('info', '🌀 Código hidratado para produção (Next.js Materialized).');
                }
            } catch (e) {
                console.error('❌ [HYDRATION ERROR]', e);
            }
        }
        
        // 1. Browser Sync (IndexedDB)
        await vfsWrite(state.currentFile, content);
        
        // 2. Physical Sync (Disk Mirroring - Phase 5.1)
        try {
            const filename = state.currentFile.replace(/^\/src\/app\//, '');
            await fetch('/api/vortex/save-local', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename, content })
            });
        } catch(e) { console.error('Mirror error:', e); }

        // Updata Tab & Explorer
        const filename = state.currentFile.split('/').pop();
        const tab = document.querySelector(`[data-file="${filename}"]`);
        if (tab) tab.classList.remove('modified');
        
        // [PHASE 5.1] Atualizar Explorer no Save
        updateBreadcrumbs(state.currentFile);
        renderFileTree();
        
        addMessage('system', `💾 Arquivo salvo e espelhado: ${state.currentFile}`);
    }

    async function commitAndPush() {
        const code = getEditorContent();
        if (!code || code.length < 10) return addMessage('system', '⚠️ Código insuficiente para commit.');
        
        // [PHASE 2.4] Gate: Bloquear commit se auditoria falhou
        const auditResult = auditCode(code);
        if (!auditResult.passes) {
            addMessage('system', `🛡️ **COMMIT BLOQUEADO** — A auditoria Abidos detectou ${auditResult.errors.length} violação(ões).\nCorrija os erros ou use AI Auto-Repair antes de fazer deploy.`);
            addAuditLog('error', `🚫 Commit bloqueado: ${auditResult.errors.length} violações.`);
            return;
        }

        // [Vórtex 3.1] Auditoria Semântica removida — overhead de tokens eliminado.
        // A compliance Abidos (auditCode acima) permanece como gate.

        addMessage('system', '🚀 Preparando Deploy para Vercel...');
        addAuditLog('info', '🚀 Commit iniciado...');
        
        // [PHASE 4.2] Mostrar barra de progresso
        showDeployProgress();  
        try {
            const filename = state.currentFile ? state.currentFile.split('/').pop() : 'page.tsx';

            const response = await fetch('/api/vortex/commit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename,
                    content: code,
                    message: `[Vórtex] Auto-Deploy: Update ${filename} with Abidos V5 rules`
                })
            });

            const data = await response.json();
            if (data.success) {
                const shortSha = data.sha ? data.sha.substring(0, 7) : 'N/A';
                addMessage('ai', `✅ **DEPLOY CONCLUÍDO!**\n\nA página foi enviada para o GitHub e a Vercel iniciou o build.\n\n🔗 [Ver no GitHub](${data.url || '#'})\n📦 Commit: \`${shortSha}\``);
                addAuditLog('success', `✅ Deploy: ${filename} → ${shortSha}`);
            } else {
                throw new Error(data.error || 'Erro desconhecido no commit.');
            }
        } catch (e) {
            console.error('Commit error:', e);
            addMessage('system', `⚠️ Falha no Deploy: ${e.message}`);
            addAuditLog('error', `❌ Deploy falhou: ${e.message}`);
        }
    }

    // =========================================================================
    // AUTO-RESIZE TEXTAREA
    // =========================================================================
    function initTextareaResize() {
        const textarea = document.getElementById('vortex-chat-input');
        if (!textarea) return;
        textarea.addEventListener('input', () => {
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
        });
    }

    // =========================================================================
    // [PHASE 3.4] BREADCRUMBS
    // =========================================================================
    function updateBreadcrumbs(filePath) {
        const bc = document.getElementById('vortex-breadcrumbs');
        if (!bc) return;
        const parts = (filePath || '/src/app/page.tsx').replace(/^\//, '').split('/');
        bc.innerHTML = parts.map((p, i) => {
            const isLast = i === parts.length - 1;
            const cls = isLast ? 'breadcrumb-segment active' : 'breadcrumb-segment';
            const sep = i < parts.length - 1 ? '<span class="breadcrumb-sep">/</span>' : '';
            return `<span class="${cls}">${p}</span>${sep}`;
        }).join('');
    }

    // =========================================================================
    // [PHASE 3.5] QUICK OPEN (Cmd+P / Ctrl+P)
    // =========================================================================
    function initQuickOpen() {
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
                e.preventDefault();
                showQuickOpen();
            }
            if (e.key === 'Escape') {
                closeQuickOpen();
            }
        });
    }

    function showQuickOpen() {
        let overlay = document.getElementById('vortex-quick-open');
        if (overlay) { overlay.style.display = 'flex'; return; }

        overlay = document.createElement('div');
        overlay.id = 'vortex-quick-open';
        overlay.className = 'vortex-quick-open-overlay';
        overlay.innerHTML = `
            <div class="vortex-quick-open-modal">
                <input type="text" id="vortex-quick-open-input" class="vortex-quick-open-input" placeholder="Buscar arquivo..." autofocus>
                <div id="vortex-quick-open-results" class="vortex-quick-open-results"></div>
            </div>
        `;
        overlay.addEventListener('click', (e) => { if (e.target === overlay) closeQuickOpen(); });
        document.body.appendChild(overlay);

        const input = document.getElementById('vortex-quick-open-input');
        input.addEventListener('input', async () => {
            const query = input.value.toLowerCase();
            const allFiles = await vfsList();
            const filtered = allFiles.filter(f => f.path.toLowerCase().includes(query));
            const results = document.getElementById('vortex-quick-open-results');
            results.innerHTML = filtered.slice(0, 10).map(f => {
                const name = f.path.split('/').pop();
                return `<div class="vortex-quick-open-item" onclick="vortexStudio.openFilePath('${f.path}'); vortexStudio.closeQuickOpen();">
                    <span class="vortex-tree-icon">${getFileIcon(name)}</span>
                    <span>${f.path}</span>
                </div>`;
            }).join('') || '<div class="vortex-quick-open-item" style="opacity: 0.5;">Nenhum arquivo encontrado</div>';
        });

        input.dispatchEvent(new Event('input'));
        input.focus();
    }

    function closeQuickOpen() {
        const overlay = document.getElementById('vortex-quick-open');
        if (overlay) overlay.style.display = 'none';
    }

    // =========================================================================
    // [PHASE 3.6] @MENTIONS NO CHAT
    // =========================================================================
    function initMentions() {
        const textarea = document.getElementById('vortex-chat-input');
        if (!textarea) return;

        textarea.addEventListener('input', async () => {
            const val = textarea.value;
            const atPos = val.lastIndexOf('@');
            if (atPos === -1 || val.substring(atPos).includes(' ')) {
                closeMentionsMenu();
                return;
            }
            const query = val.substring(atPos + 1).toLowerCase();
            const allFiles = await vfsList();
            const matches = allFiles.filter(f => f.path.toLowerCase().includes(query)).slice(0, 5);
            showMentionsMenu(matches, atPos);
        });
    }

    function showMentionsMenu(files, atPos) {
        closeMentionsMenu();
        if (files.length === 0) return;
        const menu = document.createElement('div');
        menu.id = 'vortex-mentions-menu';
        menu.className = 'vortex-mentions-menu';
        menu.innerHTML = files.map(f => {
            const name = f.path.split('/').pop();
            return `<div class="vortex-mention-item" data-path="${f.path}">
                <span class="vortex-tree-icon">${getFileIcon(name)}</span> ${name}
            </div>`;
        }).join('');

        menu.querySelectorAll('.vortex-mention-item').forEach(item => {
            item.addEventListener('click', () => {
                const textarea = document.getElementById('vortex-chat-input');
                const val = textarea.value;
                textarea.value = val.substring(0, atPos) + '@' + item.dataset.path + ' ';
                closeMentionsMenu();
                textarea.focus();
            });
        });

        const inputArea = document.querySelector('.vortex-chat-input-area');
        if (inputArea) inputArea.appendChild(menu);
    }

    function closeMentionsMenu() {
        const menu = document.getElementById('vortex-mentions-menu');
        if (menu) menu.remove();
    }

    // =========================================================================
    // [PHASE 3.8] POP-OUT PREVIEW
    // =========================================================================
    function popOutPreview() {
        const frame = document.getElementById('vortex-preview-frame');
        if (!frame || !frame.srcdoc) return;
        const win = window.open('', '_blank');
        if (win) {
            win.document.write(frame.srcdoc);
            win.document.close();
            addAuditLog('info', '🪟 Preview aberto em nova aba.');
        }
    }

    // =========================================================================
    // [PHASE 3.10] MODO ZEN
    // =========================================================================
    function toggleZenMode() {
        const studio = document.getElementById('vortex-studio');
        if (!studio) return;
        studio.classList.toggle('zen-mode');
        const isZen = studio.classList.contains('zen-mode');
        addAuditLog('info', isZen ? '🧘 Modo Zen ativado.' : '🧘 Modo Zen desativado.');
        if (state.editor) setTimeout(() => state.editor.layout(), 300);
    }

    // =========================================================================
    // [PHASE 3.12] BIBLIOTECA DE TEMPLATES
    // =========================================================================
    const TEMPLATES_LIBRARY = [
        { id: 'landing-clinic', name: 'Landing Clínica', icon: '🏥', description: 'Landing page para profissional de saúde com hero, serviços e CTA WhatsApp.' },
        { id: 'article-page', name: 'Página de Artigo', icon: '📰', description: 'Estrutura para artigos longos com índice lateral e breadcrumbs SEO.' },
        { id: 'service-page', name: 'Página de Serviço', icon: '💼', description: 'Página focada em apresentar um serviço específico com FAQ e schema.' },
        { id: 'bio-page', name: 'Biografia/Sobre', icon: '👤', description: 'Página sobre o profissional com timeline, formação e credenciais.' },
        { id: 'contact-form', name: 'Contato + Formulário', icon: '📋', description: 'Página de contato com formulário, mapa e informações de atendimento.' }
    ];

    function showTemplateLibrary() {
        const html = TEMPLATES_LIBRARY.map(t => `
            <div class="vortex-template-card" onclick="vortexStudio.useTemplate('${t.id}')">
                <span class="template-icon">${t.icon}</span>
                <div class="template-info">
                    <strong>${t.name}</strong>
                    <small>${t.description}</small>
                </div>
            </div>
        `).join('');
        addMessage('ai', `📦 **Biblioteca de Templates**\\n\\nEscolha um template para começar:\\n\\n${html}`);
    }

    function useTemplate(templateId) {
        const tpl = TEMPLATES_LIBRARY.find(t => t.id === templateId);
        if (!tpl) return;
        const input = document.getElementById('vortex-chat-input');
        if (input) {
            input.value = `Gere uma ${tpl.name} completa seguindo o Design System OLED Black do Dr. Victor Lawrence. ${tpl.description}`;
            sendPrompt();
        }
    }


    // =========================================================================
    // [PHASE 4.1] DIFF REVIEW MODAL (Monaco DiffEditor)
    // =========================================================================
    function showDiffReview(originalCode, newCode, filename) {
        let overlay = document.getElementById('vortex-diff-overlay');
        if (overlay) overlay.remove();

        overlay = document.createElement('div');
        overlay.id = 'vortex-diff-overlay';
        overlay.className = 'vortex-diff-overlay';
        overlay.innerHTML = `
            <div class="vortex-diff-modal">
                <div class="vortex-diff-header">
                    <span>📝 Diff Review: <strong>${filename || 'page.tsx'}</strong></span>
                    <div class="vortex-diff-actions">
                        <button class="vortex-btn vortex-btn-success" id="vortex-diff-accept">✅ Aceitar Alterações</button>
                        <button class="vortex-btn vortex-btn-secondary" id="vortex-diff-reject">❌ Rejeitar</button>
                    </div>
                </div>
                <div id="vortex-diff-container" style="width: 100%; height: calc(100% - 50px);"></div>
            </div>
        `;
        document.body.appendChild(overlay);

        // Init Monaco DiffEditor
        if (window.monaco) {
            const container = document.getElementById('vortex-diff-container');
            state.diffEditor = monaco.editor.createDiffEditor(container, {
                theme: 'vs-dark',
                readOnly: true,
                renderSideBySide: true,
                minimap: { enabled: false },
                fontSize: 12
            });
            const originalModel = monaco.editor.createModel(originalCode || '', 'typescript');
            const modifiedModel = monaco.editor.createModel(newCode || '', 'typescript');
            state.diffEditor.setModel({ original: originalModel, modified: modifiedModel });
        }

        document.getElementById('vortex-diff-accept').onclick = () => {
            const cleanCode = sanitizeAIContent(newCode);
            setEditorContent(cleanCode, 'typescriptreact');
            closeDiffReview();
            addAuditLog('success', '✅ Alterações aceitas via Diff Review.');
        };
        document.getElementById('vortex-diff-reject').onclick = () => {
            closeDiffReview();
            addAuditLog('warn', '❌ Alterações rejeitadas no Diff Review.');
        };
    }

    function closeDiffReview() {
        const overlay = document.getElementById('vortex-diff-overlay');
        if (overlay) overlay.remove();
        if (state.diffEditor) {
            state.diffEditor.dispose();
            state.diffEditor = null;
        }
    }

    // =========================================================================
    // [PHASE 4.2] DEPLOY PROGRESS BAR
    // =========================================================================
    function showDeployProgress() {
        let bar = document.getElementById('vortex-deploy-progress');
        if (!bar) {
            bar = document.createElement('div');
            bar.id = 'vortex-deploy-progress';
            bar.className = 'vortex-deploy-progress';
            bar.innerHTML = `
                <div class="deploy-progress-fill" id="vortex-deploy-fill"></div>
                <span class="deploy-progress-text" id="vortex-deploy-text">🚀 Enviando...</span>
            `;
            const toolbar = document.querySelector('.vortex-toolbar');
            if (toolbar) toolbar.after(bar);
        }
        bar.style.display = 'flex';
        animateDeployProgress();
    }

    function animateDeployProgress() {
        const fill = document.getElementById('vortex-deploy-fill');
        const text = document.getElementById('vortex-deploy-text');
        if (!fill || !text) return;

        const stages = [
            { pct: 20, msg: '📦 Preparando arquivos...' },
            { pct: 45, msg: '🚀 Enviando para GitHub...' },
            { pct: 70, msg: '🔄 Vercel build iniciado...' },
            { pct: 90, msg: '✅ Quase lá...' },
            { pct: 100, msg: '🎉 Deploy concluído!' }
        ];
        let i = 0;
        const interval = setInterval(() => {
            if (i >= stages.length) {
                clearInterval(interval);
                setTimeout(hideDeployProgress, 2000);
                return;
            }
            fill.style.width = stages[i].pct + '%';
            text.textContent = stages[i].msg;
            i++;
        }, 1500);
    }

    function hideDeployProgress() {
        const bar = document.getElementById('vortex-deploy-progress');
        if (bar) bar.style.display = 'none';
    }

    // =========================================================================
    // [PHASE 4.3] CLUSTERIZAÇÃO SEO (silos.json)
    // =========================================================================
    async function generateSEOCluster() {
        try {
            addMessage('system', '🌐 Carregando estrutura de Silos...');
            const response = await fetch('/api/seo/silos');
            if (!response.ok) {
                addMessage('system', '⚠️ Arquivo silos.json não encontrado. Crie em /data/silos.json');
                return;
            }
            const silos = await response.json();

            if (!silos.clusters || silos.clusters.length === 0) {
                addMessage('system', '⚠️ Nenhum cluster definido no silos.json.');
                return;
            }

            const clusterList = silos.clusters.map(c => 
                `• **${c.hub}** (Hub) → ${c.spokes?.map(s => '`' + s + '`').join(', ') || 'sem spokes'}`
            ).join('\n');

            addMessage('ai', `🌐 **Estrutura de Silos Detectada:**\n\n${clusterList}\n\nDigite o nome do cluster para gerar todas as páginas.`);
            addAuditLog('info', `🌐 ${silos.clusters.length} cluster(s) carregado(s).`);
        } catch(e) {
            addMessage('system', `⚠️ Erro ao carregar silos: ${e.message}`);
        }
    }

    // =========================================================================
    // [PHASE 4.4] AUTO-LINKAGEM INTERNA
    // =========================================================================
    function injectInternalLinks(htmlCode, silos) {
        if (!silos || !silos.clusters) return htmlCode;
        let processed = htmlCode;

        silos.clusters.forEach(cluster => {
            if (cluster.spokes) {
                cluster.spokes.forEach(spoke => {
                    const linkTag = `<a href="/${spoke.toLowerCase().replace(/\s+/g, '-')}" class="internal-link" title="${spoke}">${spoke}</a>`;
                    const regex = new RegExp(`(?<!<[^>]*)\\b${spoke}\\b(?![^<]*>)`, 'gi');
                    processed = processed.replace(regex, (match, offset) => {
                        // Only replace first occurrence
                        processed = processed.substring(0, offset) + linkTag + processed.substring(offset + match.length);
                        return linkTag;
                    });
                });
            }
        });
        return processed;
    }

    // =========================================================================
    // [PHASE 4.5] DESIGN SYSTEM TOKENS → TAILWIND CONFIG
    // =========================================================================
    function getDesignSystemConfig() {
        return {
            colors: {
                primary: '#050810',
                secondary: '#0f172a',
                accent: { teal: '#2dd4bf', indigo: '#6366f1' },
                text: { primary: '#e2e8f0', secondary: '#94a3b8', muted: '#64748b' },
                surface: { dark: '#0a0e1a', card: 'rgba(255,255,255,0.03)' },
                success: '#34d399',
                warning: '#fbbf24',
                error: '#f87171'
            },
            fonts: {
                heading: "'Outfit', sans-serif",
                body: "'Inter', sans-serif",
                mono: "'JetBrains Mono', monospace"
            },
            spacing: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '40px' },
            radius: { sm: '6px', md: '8px', lg: '12px', full: '9999px' }
        };
    }

    function injectDesignSystemToPreview(htmlCode) {
        const ds = getDesignSystemConfig();
        const tailwindConfig = `
        <script>
            tailwind.config = {
                theme: {
                    extend: {
                        colors: ${JSON.stringify(ds.colors)},
                        fontFamily: {
                            heading: ${JSON.stringify([ds.fonts.heading])},
                            body: ${JSON.stringify([ds.fonts.body])},
                            mono: ${JSON.stringify([ds.fonts.mono])}
                        }
                    }
                }
            }
        </script>`;
        return htmlCode.replace('</head>', tailwindConfig + '</head>');
    }

    // =========================================================================
    // [PHASE 4.7] EXPORT HTML ESTÁTICO
    // =========================================================================
    function exportHTML() {
        const frame = document.getElementById('vortex-preview-frame');
        if (!frame || !frame.srcdoc) {
            addMessage('system', '⚠️ Nenhum preview disponível para exportar.');
            return;
        }

        const blob = new Blob([frame.srcdoc], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = (state.currentFile ? state.currentFile.split('/').pop().replace(/\.[^.]+$/, '') : 'vortex-export') + '.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        addAuditLog('success', `📥 HTML exportado: ${a.download}`);
        addMessage('system', `📥 Arquivo **${a.download}** baixado com sucesso.`);
    }

    /**
     * downloadCode()
     * Exporta o código-fonte atual devidamente hidratado (Next.js Component).
     */
    function downloadCode() {
        let content = getEditorContent();
        
        // Garante a hidratação antes do download
        if (typeof window.hydrate === 'function') {
            content = window.hydrate(content);
        }

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const filename = state.currentFile ? state.currentFile.split('/').pop() : 'component.tsx';
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        addAuditLog('success', `📂 Fonte exportado: ${filename}`);
        addMessage('system', `📂 Código-fonte **${filename}** baixado com hidratação Next.js.`);
    }

    // =========================================================================
    // [PHASE 4.8] CACHE LOCAL DE GERAÇÕES
    // =========================================================================
    function hashPrompt(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0;
        }
        return 'cache_' + Math.abs(hash).toString(36);
    }

    function getCachedGeneration(prompt) {
        const key = hashPrompt(prompt);
        return state.generationCache.get(key) || null;
    }

    function setCachedGeneration(prompt, result) {
        const key = hashPrompt(prompt);
        state.generationCache.set(key, {
            result,
            timestamp: Date.now()
        });
        // Limit cache to 50 entries
        if (state.generationCache.size > 50) {
            const oldest = state.generationCache.keys().next().value;
            state.generationCache.delete(oldest);
        }
    }

    // =========================================================================
    // HELPERS
    // =========================================================================
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // =========================================================================
    // INIT
    // =========================================================================
    async function init() {
        console.log('🌀 [VORTEX] Initializing AI Studio...');
        
        // 1. Render the UI skeleton
        renderUI();

        // 2. Init VFS
        await initVFS();

        // 3. Init text area resize
        initTextareaResize();

        // 4. Init Splitters (drag resize)
        initSplitters();

        // 5. Init Monaco Editor (deferred for performance)
        setTimeout(async () => {
            await initMonaco();
        }, 300);

        // 6. Render File Tree
        await renderFileTree();

        // 7. Init Quick Open (Ctrl+P)
        initQuickOpen();

        // 8. Init @Mentions
        initMentions();

        // 9. Set initial preview
        updatePreview(`
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: 'Inter', sans-serif; background: #f8fafc; color: #64748b; text-align: center; padding: 40px;">
                <div style="font-size: 48px; margin-bottom: 20px;">🌀</div>
                <h2 style="font-size: 18px; font-weight: 800; color: #1e293b; margin: 0 0 10px;">Vórtex Preview</h2>
                <p style="font-size: 13px; max-width: 300px; line-height: 1.6;">Envie um prompt no chat para gerar sua página Next.js. O preview aparecerá aqui em tempo real.</p>
            </div>
        `);

        console.log('🌀 [VORTEX] Studio ready.');
    }

    // =========================================================================
    // PUBLIC API
    // =========================================================================
    return {
        init,
        send: sendPrompt,
        syncContextHub,
        handleImageUpload,
        handleDrop,
        removeImage,
        setDevice: setPreviewDevice,
        toggleRule: toggleAbidosRule,
        saveToVFS,
        commitAndPush,
        repairCode,
        openFilePath,
        closeTab,
        processMultiFileResponse,
        toggleDrawer,
        switchDrawerTab,
        addAuditLog,
        createSnapshot,
        // auditSemantic — REMOVED (Vórtex 3.1 Purge)
        // Phase 3
        toggleZenMode,
        popOutPreview,
        closeQuickOpen,
        showTemplateLibrary,
        useTemplate,
        updateBreadcrumbs,
        // Phase 4
        showDiffReview,
        closeDiffReview,
        exportHTML,
        downloadCode,
        generateSEOCluster,
        getDesignSystemConfig,
        getState: () => state
    };
})();
