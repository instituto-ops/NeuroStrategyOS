/**
 * ðŸŒ€ VÃ“RTEX AI STUDIO â€” MÃ³dulo Core
 * NeuroEngine OS | Fase 1: FundaÃ§Ã£o
 * 
 * Responsabilidades:
 * - VFS (Virtual File System) via Dexie.js
 * - Monaco Editor bootstrap
 * - Chat com Gemini 2.5 (geraÃ§Ã£o de cÃ³digo)
 * - Preview iframe
 * - Abidos Compliance Toggles
 */

window.vortexStudio = (() => {
    // =========================================================================
    // STATE
    // =========================================================================
    const VOICE_PROFILE_STORAGE_KEY = 'vortex.voiceProfile.enabled';
    const OPERATION_MODE_STORAGE_KEY = 'vortex.operationMode';
    const VISUAL_MODE_STORAGE_KEY = 'vortex-visual-mode';
    const VISUAL_LAYER_STORAGE_KEY = 'vortex.visual.layer';
    const VISUAL_SESSION_STORAGE_KEY = 'vortex.visual.session';
    const VISUAL_HISTORY_STORAGE_KEY = 'vortex.visual.history';
    const VISUAL_SCORE_STORAGE_KEY = 'vortex.visual.score';
    const VISUAL_DEFAULT_VERSION_KEY = 'vortex.visual.defaultVersion';
    const CREATION_BRIEF_STORAGE_KEY = 'vortex.creation.brief';

    const DEFAULT_CONTACTS = {
        whatsapp: '62991545295',
        email: 'instituto@hipnolawrence.com',
        instagram: 'https://www.instagram.com/hipnolawrence',
        bookingLink: 'www.hipnolawrence.com/agendamento'
    };

    const TIER_1_KEYWORDS = [
        {
            id: 'hipnose-tea-adultos',
            keyword: 'hipnose clÃ­nica para TEA em adultos',
            objective: 'landing_page',
            hub: 'Hipnose ClÃ­nica',
            spoke: 'Hipnose ClÃ­nica para TEA em Adultos',
            generationMode: 'hybrid',
            templateHint: 'landing',
            context: 'Landing page premium para adultos com suspeita ou diagnÃ³stico de TEA que buscam hipnose clÃ­nica Ã©tica, segura e especializada. Foco em acolhimento, autoridade clÃ­nica, triagem e CTA para conversa inicial.'
        },
        {
            id: 'autismo-feminino-adultas',
            keyword: 'psicÃ³logo online especializado em autismo feminino em adultas',
            objective: 'landing_page',
            hub: 'Autismo Adulto',
            spoke: 'Autismo Feminino em Adultas',
            generationMode: 'structured',
            templateHint: 'landing',
            context: 'PÃ¡gina de conversÃ£o para mulheres adultas com suspeita de autismo, diagnÃ³stico tardio, masking e exaustÃ£o social. Tom clÃ­nico, acolhedor, sem promessa de cura.'
        },
        {
            id: 'suspeita-tea-sem-diagnostico',
            keyword: 'psicÃ³logo para adultos com suspeita de TEA que nÃ£o fecham diagnÃ³stico',
            objective: 'content_page',
            hub: 'Autismo Adulto',
            spoke: 'Suspeita de TEA sem DiagnÃ³stico',
            generationMode: 'hybrid',
            templateHint: 'artigo',
            context: 'ConteÃºdo educativo e conversivo para adultos que jÃ¡ pesquisaram TEA, tÃªm dÃºvidas persistentes e precisam de orientaÃ§Ã£o clÃ­nica para prÃ³ximos passos sem linguagem alarmista.'
        },
        {
            id: 'autismo-tardio-adultos',
            keyword: 'terapia para adulto que descobriu autismo tarde',
            objective: 'content_page',
            hub: 'Autismo Adulto',
            spoke: 'Terapia apÃ³s DiagnÃ³stico Tardio',
            generationMode: 'hybrid',
            templateHint: 'artigo',
            context: 'PÃ¡gina de autoridade sobre reorganizaÃ§Ã£o de vida, identidade, relaÃ§Ãµes e energia apÃ³s diagnÃ³stico tardio de autismo em adultos.'
        },
        {
            id: 'alto-funcionamento-adultos',
            keyword: 'psicÃ³logo especialista em autismo de alto funcionamento em adultos',
            objective: 'landing_page',
            hub: 'Autismo Adulto',
            spoke: 'Autismo NÃ­vel 1 em Adultos',
            generationMode: 'structured',
            templateHint: 'landing',
            context: 'Landing page para adultos com autismo nÃ­vel 1 ou alto funcionamento que buscam atendimento especializado, clareza clÃ­nica e acolhimento sem infantilizaÃ§Ã£o.'
        }
    ];

    const VORTEX_WIDGETS = [
        { type: 'headline', label: 'Headline', hint: 'Titulo forte para a secao' },
        { type: 'text', label: 'Texto', hint: 'Paragrafo editavel' },
        { type: 'cta', label: 'Botao CTA', hint: 'Chamada para acao' },
        { type: 'hero', label: 'Hero', hint: 'Secao principal completa' },
        { type: 'faq', label: 'FAQ', hint: 'Perguntas frequentes' },
        { type: 'testimonial', label: 'Depoimento', hint: 'Prova social' }
    ];

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
        operationMode: 'canvas',
        lastPreviewCode: '',
        selectedPreviewNode: null,
        stylePreferences: { positive: [], negative: [], history: [] },
        mediaAssets: [],
        auditStatus: null,
        deploymentUrl: '',
        lastAuditResult: null,  // Phase 2.4: Last audit result for commit gate
        snapshotId: 0,          // Phase 2.2: Auto-increment snapshot counter
        generationCache: new Map(), // Phase 4.8: Local cache by prompt hash
        zenMode: false,          // Phase 3.10
        isTruncated: false,      // Step 3.2: Flag for token limit detection
        isContinuing: false,     // Step 3.2: Mode for emending code
        preContinuationCode: '', // Step 3.2: Buffer for previous code
        continuationCount: 0,    // Step 1.3.d: Continuation attempts
        MAX_CONTINUATIONS: 3,    // Step 1.3.d: Max automatic continuations
        template: {
            mode: 'canvas',
            selectedId: '',
            catalog: [],
            current: null,
            modules: [],
            values: {}
        },
        metadata: {
            silos: [],
            menus: [],
            siloId: '',
            hubId: '',
            hubName: '',
            spokeIndex: null,
            spokeTitle: '',
            spokeSlug: '',
            pageType: 'hub',
            syncStatus: '',
            vortexPageId: '',
            menuId: ''
        },
        creationBrief: {
            mode: 'edit',
            generationMode: 'hybrid',
            model: 'gemini-2.5-flash',
            objective: 'landing_page',
            themeKeyword: '',
            ideaContext: '',
            keywordId: '',
            siloId: '',
            hubName: '',
            spokeSlug: '',
            menuId: '',
            contacts: { ...DEFAULT_CONTACTS },
            templateId: '',
            sectionsJson: null,
            heroAssetId: '',
            heroAssetUrl: '',
            seoJson: null
        },
        draft: {
            id: null,
            name: ''
        },
        visual: {
            enabled: true,
            layer: 'edit',
            aiMode: 'mock',
            xrayOpen: false,
            selectedSection: 'hero',
            selectedField: 'headline',
            targetPage: 'Masking e Exaustao',
            snapshots: [],
            history: [],
            score: null,
            summaryReady: false,
            lastIntent: '',
            pendingProposal: null,
            compareMode: false,
            manualFieldHistory: {},
            manualMode: 'direct',
            widgetCounter: 0,
            expandedSilos: {}
        },
        voiceProfile: {
            enabled: true,
            rules: [],
            lastUpdate: '',
            source: ''
        }
    };

    function loadVoiceProfilePreference() {
        try {
            const stored = localStorage.getItem(VOICE_PROFILE_STORAGE_KEY);
            if (stored !== null) state.voiceProfile.enabled = stored === 'true';
        } catch (err) {
            console.warn('[VORTEX] Preferencia do Perfil Verbal indisponivel:', err.message);
        }
    }

    function persistVoiceProfilePreference() {
        try {
            localStorage.setItem(VOICE_PROFILE_STORAGE_KEY, String(state.voiceProfile.enabled));
        } catch (err) {
            console.warn('[VORTEX] Falha ao persistir Perfil Verbal:', err.message);
        }
    }

    function loadOperationModePreference() {
        try {
            const stored = localStorage.getItem(OPERATION_MODE_STORAGE_KEY);
            if (stored === 'template' || stored === 'canvas') state.operationMode = stored;
        } catch (err) {
            console.warn('[VORTEX] Preferencia de modo indisponivel:', err.message);
        }
    }

    function persistOperationModePreference() {
        try {
            localStorage.setItem(OPERATION_MODE_STORAGE_KEY, state.operationMode);
        } catch (err) {
            console.warn('[VORTEX] Falha ao persistir modo:', err.message);
        }
    }

    function loadVisualModePreference() {
        try {
            const params = new URLSearchParams(window.location.search || '');
            const queryFlag = params.get('vortex_visual_mode') || params.get('vortex_v6');
            if (queryFlag === '1' || queryFlag === 'true') {
                state.visual.enabled = true;
                localStorage.setItem(VISUAL_MODE_STORAGE_KEY, 'true');
            } else if (queryFlag === '0' || queryFlag === 'false') {
                state.visual.enabled = false;
                localStorage.setItem(VISUAL_MODE_STORAGE_KEY, 'false');
            } else {
                const defaultVersion = localStorage.getItem(VISUAL_DEFAULT_VERSION_KEY);
                const stored = localStorage.getItem(VISUAL_MODE_STORAGE_KEY);
                if (defaultVersion !== 'v6.6-default-on') {
                    state.visual.enabled = true;
                    localStorage.setItem(VISUAL_MODE_STORAGE_KEY, 'true');
                    localStorage.setItem(VISUAL_DEFAULT_VERSION_KEY, 'v6.6-default-on');
                } else {
                    state.visual.enabled = stored === null ? true : stored !== 'false';
                }
            }

            const storedLayer = localStorage.getItem(VISUAL_LAYER_STORAGE_KEY);
            if (['context', 'edit', 'performance', 'publish'].includes(storedLayer)) {
                state.visual.layer = storedLayer;
            }

            const storedSession = JSON.parse(sessionStorage.getItem(VISUAL_SESSION_STORAGE_KEY) || '{}');
            if (Array.isArray(storedSession.snapshots)) state.visual.snapshots = storedSession.snapshots.slice(-20);

            const storedHistory = JSON.parse(localStorage.getItem(VISUAL_HISTORY_STORAGE_KEY) || '[]');
            if (Array.isArray(storedHistory)) state.visual.history = storedHistory.slice(-20);

            const storedScore = JSON.parse(localStorage.getItem(VISUAL_SCORE_STORAGE_KEY) || 'null');
            if (storedScore && typeof storedScore.total === 'number') state.visual.score = storedScore;

            const storedBrief = JSON.parse(localStorage.getItem(CREATION_BRIEF_STORAGE_KEY) || 'null');
            if (storedBrief && typeof storedBrief === 'object') {
                state.creationBrief = {
                    ...state.creationBrief,
                    ...storedBrief,
                    contacts: { ...DEFAULT_CONTACTS, ...(storedBrief.contacts || {}) }
                };
            }
        } catch (err) {
            console.warn('[VORTEX V6] Preferencia visual indisponivel:', err.message);
        }
    }

    function persistVisualSession() {
        try {
            localStorage.setItem(VISUAL_MODE_STORAGE_KEY, String(state.visual.enabled));
            localStorage.setItem(VISUAL_LAYER_STORAGE_KEY, state.visual.layer);
            localStorage.setItem(VISUAL_HISTORY_STORAGE_KEY, JSON.stringify(state.visual.history.slice(-20)));
            if (state.visual.score) localStorage.setItem(VISUAL_SCORE_STORAGE_KEY, JSON.stringify(state.visual.score));
            localStorage.setItem(CREATION_BRIEF_STORAGE_KEY, JSON.stringify(state.creationBrief));
            sessionStorage.setItem(VISUAL_SESSION_STORAGE_KEY, JSON.stringify({
                snapshots: state.visual.snapshots.slice(-20),
                targetPage: state.visual.targetPage,
                updatedAt: new Date().toISOString()
            }));
        } catch (err) {
            console.warn('[VORTEX V6] Falha ao persistir sessao visual:', err.message);
        }
    }

    // =========================================================================
    // UTILS: SANITIZAÃ‡ÃƒO E LIMPEZA (ANTI-HALLUCINATION)
    // =========================================================================
    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function safeJsString(value) {
        return String(value ?? '')
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/\r?\n/g, ' ');
    }

    function sanitizeAIContent(content) {
        if (!content) return '';
        let clean = content;
        
        // 1. Remover Markdown Code Blocks (ex: ```tsx ... ```)
        clean = clean.replace(/```[a-z]*\n?/gi, '');
        clean = clean.replace(/```/g, '');

        // 2. Remover tags estruturais do VÃ³rtex (se vazarem para o editor)
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
                console.log('ðŸŒ€ [VORTEX GIT] LightningFS initialized.');
            }

            state.db = new Dexie('VortexVFS');
            state.db.version(2).stores({
                files: 'path, name, content, type, modified',
                projects: 'id, name, repo, branch, created',
                sessions: 'id, projectId, messages, created',
                snapshots: '++id, filePath, content, prompt, timestamp'
            });

            await state.db.open();
            console.log('ðŸŒ€ [VORTEX VFS] IndexedDB initialized successfully.');
            
            // Request persistent storage
            if (navigator.storage && navigator.storage.persist) {
                const persisted = await navigator.storage.persist();
                console.log(`ðŸŒ€ [VORTEX VFS] Persistent storage: ${persisted ? 'GRANTED' : 'DENIED'}`);
            }

            // [1.4] Ingestion Pipeline
            await checkAndIngestFiles();

            return true;
        } catch (err) {
            console.error('âŒ [VORTEX VFS] Init failed:', err);
            return false;
        }
    }

    async function checkAndIngestFiles() {
        const fileCount = await state.db.files.count();
        if (fileCount === 0) {
            console.log('ðŸŒ€ [VORTEX VFS] Database empty. Ingesting physical repository starting now...');
            try {
                const res = await fetch('/api/vortex/ingest', {
                    headers: { 'Authorization': `Bearer ${VORTEX_API_KEY}` }
                });
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
                    console.log(`ðŸŒ€ [VORTEX VFS] Ingested ${data.files.length} physical files.`);
                }
            } catch(e) {
                console.error('âŒ [VORTEX INGEST]', e);
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
        if (!state.db) return [];
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
            value: '// ðŸŒ€ VÃ³rtex AI Studio\n// Envie um prompt no chat para gerar cÃ³digo Next.js\n',
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
        console.log('ðŸŒ€ [VORTEX MONACO] Editor initialized.');

        // [1.1] Resumo da SessÃ£o / Auto-load last file or page.tsx
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
            console.warn('ðŸŒ€ [VORTEX VFS] Could not load initial file.');
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
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${VORTEX_API_KEY}`
                },
                body: JSON.stringify({
                    components: componentsStr,
                    model: model,
                    systemPrompt: buildAbidosContext()
                })
            });
            const data = await req.json();
            
            if (data.success) {
                state.contextHubEnabled = true;
                addMessage('system', `ðŸ§  **Context Hub Activates!**\nO projeto atual (\`${files.length} arquivos\`) foi embutido no Gemini Caching.\n**${data.cachedTokens || 0} tokens armazenados.**\nO Context Caching reduz as requisiÃ§Ãµes em atÃ© 90% via cache de prompt e permite respostas baseadas no Design System holÃ­stico.`);
                if (btn) btn.innerHTML = '<i data-lucide="database" style="color:var(--color-success)"></i> HUB ON';
                if (window.lucide) window.lucide.createIcons();
            } else {
                throw new Error(data.error || 'Erro desconhecido ao gerar o cache.');
            }

        } catch (e) {
            console.error('âŒ [VORTEX HUB]', e);
            addMessage('system', `âš ï¸ Falha ao sincronizar o Context Hub: ${e.message}`);
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
                            <span class="vortex-vision-eye">ðŸ‘ï¸</span>
                            <span class="vortex-vision-text">VISION LINK ESTABLISHED</span>
                        </div>
                        <img id="vortex-image-preview" src="${uploadedImageBase64}" class="vortex-vision-thumb">
                        <button onclick="vortexStudio.removeImage()" class="vortex-vision-close">Ã—</button>
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

    function setOperationMode(mode) {
        state.operationMode = mode === 'template' ? 'template' : 'canvas';
        persistOperationModePreference();
        renderOperationMode();
        addAuditLog('info', `Modo ${state.operationMode === 'template' ? 'Template Guiado' : 'Canvas Livre'} ativo.`);
    }

    function renderOperationMode() {
        document.querySelectorAll('[data-vortex-mode]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.vortexMode === state.operationMode);
        });
        const input = document.getElementById('vortex-chat-input');
        if (input) {
            input.placeholder = state.operationMode === 'template'
                ? 'PeÃ§a ajustes nas variÃ¡veis da Master Template...'
                : 'Descreva a pÃ¡gina ou anexe um print...';
        }
    }

    function syncTemplateEditor() {
        if (state.operationMode !== 'template' || !state.template.selectedId) return;
        const payload = {
            templateId: state.template.selectedId,
            templateName: state.template.current?.name || '',
            values: state.template.values
        };
        setEditorContent(JSON.stringify(payload, null, 2), 'json');
        updateFileTab('template-values.json', true);
        state.currentFile = '/vortex/template-values.json';
        updateBreadcrumbs(state.currentFile);
    }

    function readTemplateValuesFromEditor() {
        if (state.operationMode !== 'template') return state.template.values;
        try {
            const parsed = JSON.parse(getEditorContent() || '{}');
            if (parsed.values && typeof parsed.values === 'object') return parsed.values;
            return parsed;
        } catch (err) {
            addAuditLog('warn', 'JSON do Template Guiado invalido; usando valores em memoria.');
            return state.template.values;
        }
    }

    async function sendTemplatePrompt(prompt, model, abidosContext) {
        if (!state.template.selectedId || !state.template.current) {
            addMessage('system', 'Selecione uma Master Template antes de usar o Template Guiado.');
            return;
        }

        state.template.values = readTemplateValuesFromEditor();
        const response = await fetch('/api/vortex/generate-template', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${VORTEX_API_KEY}`
            },
            body: JSON.stringify({
                prompt,
                model,
                template: state.template.current,
                modules: state.template.modules,
                values: state.template.values,
                context: [abidosContext, buildMediaContext()].filter(Boolean).join('\n\n')
            })
        });
        const data = await response.json();
        if (!response.ok || data.error) throw new Error(data.error || `Template ${response.status}`);

        state.template.values = data.values || state.template.values;
        syncTemplateEditor();
        await renderSelectedTemplatePreview();
        await createSnapshot(`template:${prompt}`);
        addMessage('ai', data.explanation || 'Variaveis da template atualizadas.');
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
        state.continuationCount = 0; // Reset counter for new prompt
        setGenerating(true);

        try {
            const model = document.getElementById('vortex-model-select')?.value || 'gemini-2.5-flash';
            const abidosContext = buildAbidosContext();
            const currentCode = getEditorContent();
            const defaultCode = '// ðŸŒ€ VÃ³rtex AI Studio\n// Envie um prompt no chat para gerar cÃ³digo Next.js\n';

            if (state.operationMode === 'template' && state.template.selectedId) {
                await sendTemplatePrompt(prompt, model, abidosContext);
                return;
            }

            // [PHASE 2.2] Snapshot antes de cada geraÃ§Ã£o
            await createSnapshot(prompt);

            // [PHASE 2.3] Contexto seletivo (arquivo ativo + imports)
            const selectiveCtx = await buildSelectiveContext();
            const mediaCtx = buildMediaContext();

            const payload = {
                prompt: typeof arguments[0] === 'string' ? arguments[0] : prompt,
                model,
                currentCode: currentCode !== defaultCode ? currentCode : '',
                abidosRules: state.abidosRules,
                context: [
                    abidosContext,
                    mediaCtx,
                    selectiveCtx ? '--- CONTEXTO DO PROJETO ---\n' + selectiveCtx : ''
                ].filter(Boolean).join('\n\n'),
                useCache: state.contextHubEnabled,
                imageBase64: uploadedImageBase64
            };

            removeImage();

            // [PHASE 5.3] Tentar Streaming SSE primeiro
            try {
                await sendPromptStream(payload);
            } catch (streamErr) {
                console.warn('âš ï¸ [VORTEX] Stream falhou, usando fallback sÃ­ncrono:', streamErr.message);
                await sendPromptSync(payload);
            }

        } catch (err) {
            console.error('âŒ [VORTEX] Generation error:', err);
            addMessage('system', `âš ï¸ Erro na geraÃ§Ã£o: ${err.message}`);
        } finally {
            setGenerating(false);
        }
    }

    // [PHASE 5.3] Streaming SSE Consumer â€” Vibecoding Real
    async function sendPromptStream(payload) {
        const response = await fetch('/api/vortex/generate-stream', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${VORTEX_API_KEY}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`Stream Error: ${response.status}`);
        if (!response.body) throw new Error('ReadableStream nÃ£o suportado');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullStreamText = '';
        let codeStarted = false;

        // Limpar o editor para receber o stream
        setEditorContent('// ðŸŒ€ Streaming...\n', 'typescriptreact');

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Manter a Ãºltima linha incompleta

            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                
                try {
                    const event = JSON.parse(line.slice(6));

                    switch (event.type) {
                        case 'start':
                            addMessage('system', `ðŸŒ€ Streaming via **${event.model}**...`);
                            break;

                        case 'delta':
                            fullStreamText += event.text;
                            // Atualizar Monaco com o texto acumulado em tempo real
                            if (!codeStarted && fullStreamText.includes('<file')) {
                                codeStarted = true;
                            }
                            if (codeStarted) {
                                // Extrair o conteÃºdo parcial do bloco <file>
                                const partialMatch = fullStreamText.match(/<file[^>]*>([\s\S]*?)(?:<\/file>|$)/);
                                if (partialMatch) {
                                    let codeToStream = partialMatch[1].trimStart();
                                    // [3.2] Se estivermos em modo de continuaÃ§Ã£o, emendamos visualmente
                                    if (state.isContinuing) {
                                        const currentPosLocal = state.editor.getModel().getLineCount();
                                        // Apenas mostramos no editor o que estÃ¡ chegando novo + o que jÃ¡ tÃ­nhamos
                                        setEditorContent(state.preContinuationCode + sanitizeAIContent(codeToStream), 'typescriptreact');
                                    } else {
                                        setEditorContent(sanitizeAIContent(codeToStream), 'typescriptreact');
                                    }
                                }
                            } else {
                                // Ainda nÃ£o chegou no bloco <file>, mostrar texto bruto (limpo)
                                setEditorContent(sanitizeAIContent(fullStreamText), 'typescriptreact');
                            }
                            break;

                        case 'complete':
                            state.isTruncated = event.isTruncated || false;
                            
                            // Metadados finais com cÃ³digo limpo
                            if (event.code) {
                                const audit = auditCode(event.code);
                                const oldCode = getEditorContent();

                                // [PHASE 4.1] Show Diff Review se havia cÃ³digo anterior
                                const isDefaultCode = oldCode.startsWith('// ðŸŒ€');
                                const cleanNewCode = sanitizeAIContent(event.code);
                                
                                // [3.2] CÃ¡lculo do CÃ³digo Final (Emendado ou Novo)
                                const finalCleanCode = state.isContinuing ? state.preContinuationCode + cleanNewCode : cleanNewCode;
                                const finalRawCode = state.isContinuing ? state.preContinuationCode + event.code : event.code;

                                if (!isDefaultCode && oldCode.length > 50 && !state.isContinuing) {
                                    showDiffReview(oldCode, finalCleanCode, event.filename || 'page.tsx');
                                } else {
                                    setEditorContent(finalCleanCode, event.language || 'typescriptreact');
                                }
                                updateFileTab(event.filename || 'page.tsx', true);

                                const filePath = `/src/app/${event.filename || 'page.tsx'}`;
                                await vfsWrite(filePath, finalRawCode);
                                state.currentFile = filePath;
                                updateBreadcrumbs(filePath);

                                // [CIRURGIA 3] Preview SEMPRE via React Sandbox
                                updatePreview(finalCleanCode);

                                // [PHASE 4.8] Cache result
                                setCachedGeneration(payload.prompt, finalRawCode);

                                if (!audit.passes && !state.isTruncated) {
                                    addMessage('system', 'âš ï¸ CÃ³digo gerado mas possui falhas de conformidade.');
                                }
                            }
                            if (event.explanation) {
                                addMessage('ai', event.explanation);
                            }
                            break;

                        case 'error':
                            throw new Error(event.error || 'Erro no stream');

                        case 'done':
                            const finalCode = getEditorContent();
                            if (event.isTruncated || !isSyntacticallyComplete(finalCode)) {
                                state.isTruncated = true;
                                if (state.continuationCount < state.MAX_CONTINUATIONS) {
                                    state.continuationCount++;
                                    addMessage('system', `ðŸ”„ **RecuperaÃ§Ã£o AutomÃ¡tica (${state.continuationCount}/${state.MAX_CONTINUATIONS})**...\nO cÃ³digo anterior foi truncado. VÃ³rtex estÃ¡ sincronizando os fragmentos.`);
                                    continueGeneration();
                                } else {
                                    addMessage('system', `âš ï¸ **Limite de Continuidade Atingido.**\nO cÃ³digo permanece instÃ¡vel apÃ³s ${state.MAX_CONTINUATIONS} tentativas. Por favor, revise o prompt ou finalize manualmente.`);
                                    notifyTruncated();
                                }
                            } else {
                                state.continuationCount = 0; // Sucesso absoluto
                                // [FIX] Se 'complete' nÃ£o veio com event.code, forÃ§ar preview do conteÃºdo do editor
                                const editorCode = getEditorContent();
                                if (editorCode && editorCode.trim().length > 20 && !editorCode.startsWith('// ðŸŒ€')) {
                                    updatePreview(sanitizeAIContent(editorCode));
                                    addAuditLog('info', 'âœ… Preview atualizado automaticamente via evento done.');
                                }
                            }
                            state.isContinuing = false; // Reset ao finalizar
                            break;
                    }
                } catch (parseErr) {
                    // Ignorar linhas malformadas durante o stream
                    if (parseErr.message.includes('Erro no stream')) throw parseErr;
                }
            }
        }

        // Se nÃ£o recebemos um evento 'complete', tentar parsear do texto bruto
        if (!fullStreamText.includes('</file>')) {
            const fallbackCode = sanitizeAIContent(fullStreamText);
            setEditorContent(fallbackCode, 'typescriptreact');
            addMessage('ai', 'âœ… CÃ³digo gerado via streaming.');
            // [FIX] TambÃ©m atualizar o preview com o cÃ³digo bruto
            if (fallbackCode.trim().length > 20) {
                updatePreview(fallbackCode);
            }
        }
    }

    // Fallback sÃ­ncrono (mÃ©todo original)
    async function sendPromptSync(payload) {
        const response = await fetch('/api/vortex/generate', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${VORTEX_API_KEY}`
            },
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
                addMessage('system', 'âš ï¸ CÃ³digo gerado mas possui falhas de conformidade.');
            }
        }

        if (data.explanation) {
            addMessage('ai', data.explanation);
        } else {
            addMessage('ai', 'âœ… CÃ³digo gerado com sucesso.');
        }
    }

    function getTemplateById(id) {
        return state.template.catalog.find(t => t.id === id) || null;
    }

    function inferTemplatePlaceholder(key) {
        const lower = key.toLowerCase();
        if (lower.includes('nome')) return 'Dr. Victor Lawrence';
        if (lower.includes('crp')) return '09/012681';
        if (lower.includes('whatsapp')) return '62991545295';
        if (lower.includes('email')) return 'instituto@hipnolawrence.com';
        if (lower.includes('instagram')) return 'https://www.instagram.com/hipnolawrence';
        if (lower.includes('agendamento') || lower.includes('link')) return 'https://www.hipnolawrence.com/agendamento';
        if (lower.includes('seo_title') || lower.includes('titulo') || lower.includes('headline')) return 'Hipnose Clinica com Dr. Victor Lawrence';
        if (lower.includes('descricao') || lower.includes('description') || lower.includes('texto') || lower.includes('bio')) {
            return 'Estrutura inicial do Vortex para uma pagina clinica clara, etica e orientada a conversao.';
        }
        if ((lower.includes('img') || lower.includes('foto') || lower.includes('banner') || lower.includes('asset')) && !lower.includes('alt')) {
            return '/img/logo-clinica-h-glass.png';
        }
        if (lower.includes('alt')) return 'Identidade visual clinica do Dr. Victor Lawrence';
        if (lower.includes('cta')) return 'Agendar conversa inicial';
        return 'Conteudo guia Vortex';
    }

    function buildTemplateValues(modules) {
        const values = {};
        modules.flatMap(mod => mod.variables || []).forEach(key => {
            values[key] = inferTemplatePlaceholder(key);
        });
        return values;
    }

    function renderTemplateStatus(message) {
        const status = document.getElementById('vortex-template-status');
        if (!status) return;

        const current = state.template.current;
        const moduleCount = state.template.modules.length;
        status.innerHTML = current
            ? `<strong>${current.name}</strong><span>${moduleCount} modulos carregados</span>`
            : `<strong>Canvas Livre</strong><span>${message || 'Sem template selecionado'}</span>`;
    }

    async function loadMasterTemplates() {
        const select = document.getElementById('vortex-template-select');
        if (!select) return;

        try {
            const response = await fetch('/api/templates');
            const data = await response.json();
            state.template.catalog = data.templates || [];

            select.innerHTML = '<option value="">Sem Template (Canvas Livre)</option>' +
                state.template.catalog.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
            select.value = state.template.selectedId;
            renderTemplateStatus();
            renderV6TemplateShelf();
        } catch (err) {
            console.warn('[VORTEX] Falha ao carregar Master Templates:', err.message);
            renderTemplateStatus('Catalogo indisponivel');
        }
    }

    function getSiloById(id) {
        return state.metadata.silos.find(s => String(s.id || s.slug || s.hub) === String(id)) || null;
    }

    function getMenuById(id) {
        return state.metadata.menus.find(m => String(m.id) === String(id)) || null;
    }

    async function loadVortexMetadata() {
        await Promise.all([loadVortexSilos(), loadVortexMenus()]);
        renderMetadataStatus();
    }

    async function importFromSilo(config) {
        state.metadata.siloId = config.siloId || config.siloName || '';
        state.metadata.hubId = config.hubId || config.siloId || '';
        state.metadata.hubName = config.hubName || config.siloName || '';
        state.metadata.spokeIndex = Number.isInteger(config.spokeIndex) ? config.spokeIndex : null;
        state.metadata.spokeTitle = config.spokeTitle || '';
        state.metadata.spokeSlug = config.spokeSlug || '';
        state.metadata.pageType = config.pageType || (config.spokeTitle ? 'spoke' : 'hub');
        state.metadata.syncStatus = config.syncStatus || '';
        state.metadata.vortexPageId = config.vortexPageId || '';
        const siloSelect = document.getElementById('vortex-silo-select');
        if (siloSelect) siloSelect.value = state.metadata.pageType === 'spoke'
            ? `spoke:${state.metadata.siloId}:${state.metadata.spokeIndex}`
            : `hub:${state.metadata.siloId}`;
        renderMetadataStatus();
        renderV6Silos();

        const targetType = config.templateHint === 'artigo' ? 'artigo' : 'landing';
        const suggested = state.template.catalog.find(t => t.type === targetType) || state.template.catalog[0];
        if (suggested) {
            const templateSelect = document.getElementById('vortex-template-select');
            if (templateSelect) templateSelect.value = suggested.id;
            await selectTemplate(suggested.id);
            setOperationMode('template');
        }

        const prompt = [
            `Criar pagina para: ${config.title || config.siloName}`,
            config.slug ? `URL planejada: ${config.slug}` : '',
            config.keywords?.length ? `Keywords: ${config.keywords.join(', ')}` : '',
            'Usar tom clinico, etico e orientado a conversao.'
        ].filter(Boolean).join('\n');

        const input = document.getElementById('vortex-chat-input');
        if (input) input.value = prompt;
        addAuditLog('info', `Silo importado para Vortex: ${config.title || config.siloName}`);
    }

    async function loadVortexSilos() {
        const select = document.getElementById('vortex-silo-select');
        if (!select) return;

        try {
            const response = await fetch('/api/seo/silos');
            const data = await response.json();
            state.metadata.silos = data.silos || [];
            select.innerHTML = '<option value="">Sem Silo/Hub</option>' + state.metadata.silos.map(s => {
                const value = s.id || s.slug || s.hub;
                const label = s.hub || s.name || s.title || value;
                const spokes = Array.isArray(s.spokes) ? s.spokes : [];
                return `
                    <optgroup label="HUB: ${label}">
                        <option value="hub:${value}">Hub: ${label}</option>
                        ${spokes.map((spoke, idx) => `<option value="spoke:${value}:${idx}">Spoke: ${spoke.title || spoke}</option>`).join('')}
                    </optgroup>
                `;
            }).join('');
            select.value = state.metadata.pageType === 'spoke'
                ? `spoke:${state.metadata.siloId}:${state.metadata.spokeIndex}`
                : (state.metadata.siloId ? `hub:${state.metadata.siloId}` : '');
        } catch (err) {
            console.warn('[VORTEX] Falha ao carregar Silos:', err.message);
            select.innerHTML = '<option value="">Silos indisponiveis</option>';
        }
    }

    async function loadVortexMenus() {
        const select = document.getElementById('vortex-menu-select');
        if (!select) return;

        try {
            const response = await fetch('/api/menus');
            const data = await response.json();
            state.metadata.menus = data.menus || [];
            select.innerHTML = '<option value="">Sem Menu</option>' + state.metadata.menus.map(m => {
                const label = m.name || m.label || m.title || m.id;
                return `<option value="${m.id}">${label}</option>`;
            }).join('');
            select.value = state.metadata.menuId;
        } catch (err) {
            console.warn('[VORTEX] Falha ao carregar Menus:', err.message);
            select.innerHTML = '<option value="">Menus indisponiveis</option>';
        }
    }

    function updateMetadata(type, value) {
        if (type === 'silo') {
            const parts = String(value || '').split(':');
            if (parts[0] === 'spoke') {
                const silo = getSiloById(parts[1]);
                const spoke = silo?.spokes?.[Number(parts[2])];
                state.metadata.siloId = parts[1] || '';
                state.metadata.hubId = parts[1] || '';
                state.metadata.hubName = silo?.hub || '';
                state.metadata.spokeIndex = Number(parts[2]);
                state.metadata.spokeTitle = spoke?.title || '';
                state.metadata.spokeSlug = spoke?.slug || '';
                state.metadata.pageType = 'spoke';
                state.metadata.syncStatus = spoke?.vortexSyncStatus || '';
                state.metadata.vortexPageId = spoke?.vortexPageId || '';
            } else if (parts[0] === 'hub') {
                const silo = getSiloById(parts[1]);
                state.metadata.siloId = parts[1] || '';
                state.metadata.hubId = parts[1] || '';
                state.metadata.hubName = silo?.hub || '';
                state.metadata.spokeIndex = null;
                state.metadata.spokeTitle = '';
                state.metadata.spokeSlug = '';
                state.metadata.pageType = 'hub';
                state.metadata.syncStatus = silo?.vortexSyncStatus || '';
                state.metadata.vortexPageId = silo?.vortexPageId || '';
            } else {
                state.metadata.siloId = value || '';
            }
        }
        if (type === 'menu') {
            state.metadata.menuId = value || '';
            if (state.template.selectedId) renderSelectedTemplatePreview();
        }
        renderMetadataStatus();
    }

    function renderMetadataStatus() {
        const status = document.getElementById('vortex-metadata-status');
        if (!status) return;

        const silo = getSiloById(state.metadata.siloId);
        const menu = getMenuById(state.metadata.menuId);
        const hubLabel = state.metadata.hubName || silo?.hub || silo?.name || silo?.title || state.metadata.siloId;
        const siloLabel = state.metadata.pageType === 'spoke' && state.metadata.spokeTitle
            ? `${hubLabel} â€º ${state.metadata.spokeTitle}`
            : (hubLabel || 'Sem Silo');
        const menuLabel = menu ? (menu.name || menu.label || menu.title || state.metadata.menuId) : 'Sem Menu';
        const syncLabel = state.metadata.syncStatus ? ` Â· ${state.metadata.syncStatus.replace('nao_sincronizado', 'nÃ£o sincronizado')}` : '';
        status.innerHTML = `<strong>${siloLabel}</strong><span>${menuLabel}${syncLabel}</span>`;
    }

    async function loadVoiceProfile() {
        try {
            const response = await fetch('/api/neuro-training/memory');
            if (!response.ok) throw new Error(`Perfil verbal ${response.status}`);

            const profile = await response.json();
            state.voiceProfile.rules = Array.isArray(profile.style_rules) ? profile.style_rules : [];
            state.voiceProfile.lastUpdate = profile.last_update || '';
            state.voiceProfile.source = '/api/neuro-training/memory';
            renderVoiceProfileStatus();
        } catch (err) {
            console.warn('[VORTEX] Falha ao carregar Perfil Verbal:', err.message);
            state.voiceProfile.rules = [];
            state.voiceProfile.source = 'indisponivel';
            renderVoiceProfileStatus('Perfil indisponivel');
        }
    }

    function toggleVoiceProfile() {
        state.voiceProfile.enabled = !state.voiceProfile.enabled;
        persistVoiceProfilePreference();
        const el = document.querySelector('[data-vortex-toggle="voiceProfile"]');
        if (el) el.classList.toggle('active', state.voiceProfile.enabled);
        renderVoiceProfileStatus();
        addAuditLog('info', `Perfil Verbal ${state.voiceProfile.enabled ? 'ativado' : 'desativado'} no prompt.`);
    }

    function renderVoiceProfileStatus(message) {
        const status = document.getElementById('vortex-voice-profile-status');
        if (!status) return;

        status.innerHTML = '<strong></strong><span></span>';
        const title = status.querySelector('strong');
        const detail = status.querySelector('span');
        const count = state.voiceProfile.rules.length;

        if (!state.voiceProfile.enabled) {
            title.textContent = 'Perfil Verbal desligado';
            detail.textContent = 'As regras aprendidas nao entram no prompt';
            return;
        }

        title.textContent = count ? `${count} regras verbais ativas` : 'Perfil Verbal ativo';
        detail.textContent = message || (count ? 'DNA verbal injetado no system prompt' : 'Sem regras aprendidas ainda');
    }

    async function selectTemplate(templateId) {
        state.template.selectedId = templateId || '';
        state.template.mode = templateId ? 'template' : 'canvas';
        state.template.current = getTemplateById(templateId);
        state.template.modules = [];
        state.template.values = {};

        if (!templateId) {
            renderTemplateStatus();
            addAuditLog('info', 'Canvas Livre ativo.');
            return;
        }

        try {
            const response = await fetch(`/api/templates/${templateId}`);
            if (!response.ok) throw new Error(`Template ${templateId} indisponivel`);

            const data = await response.json();
            state.template.current = data.template || state.template.current;
            state.template.modules = data.modules || [];
            state.template.values = buildTemplateValues(state.template.modules);
            renderTemplateStatus();
            addAuditLog('info', `Master Template ${templateId} carregada no Vortex.`);
            if (state.operationMode === 'template') syncTemplateEditor();
            await renderSelectedTemplatePreview();
        } catch (err) {
            console.error('[VORTEX] Erro ao selecionar template:', err);
            renderTemplateStatus('Falha ao carregar template');
            addAuditLog('error', `Falha ao carregar template: ${err.message}`);
        }
    }

    async function renderSelectedTemplatePreview() {
        if (!state.template.selectedId) return;
        if (state.operationMode === 'template') {
            state.template.values = readTemplateValuesFromEditor();
        }

        try {
            const response = await fetch('/api/templates/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    templateId: state.template.selectedId,
                    values: state.template.values,
                    menuId: state.metadata.menuId
                })
            });
            if (!response.ok) throw new Error(`Preview ${response.status}`);
            const html = await response.text();
            updatePreview(html);
        } catch (err) {
            console.warn('[VORTEX] Preview de template indisponivel:', err.message);
        }
    }

    function slugifyDraftName(name) {
        return (name || 'vortex-draft')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'vortex-draft';
    }

    function buildDraftPayload(overwrite = true) {
        const now = new Date().toISOString();
        const name = state.draft.name || `Vortex Draft ${new Date().toLocaleString('pt-BR')}`;
        return {
            id: overwrite && state.draft.id ? state.draft.id : Date.now(),
            source: 'vortex',
            name,
            slug: slugifyDraftName(name),
            status: 'DRAFT',
            code: getEditorContent(),
            currentFile: state.currentFile || '/src/app/page.tsx',
            templateId: state.template.selectedId,
            templateName: state.template.current?.name || '',
            templateValues: state.template.values,
            auditStatus: state.auditStatus,
            metadata: {
                siloId: state.metadata.siloId,
                hubId: state.metadata.hubId,
                hubName: state.metadata.hubName,
                spokeIndex: state.metadata.spokeIndex,
                spokeTitle: state.metadata.spokeTitle,
                spokeSlug: state.metadata.spokeSlug,
                pageType: state.metadata.pageType,
                syncStatus: state.metadata.syncStatus,
                vortexPageId: state.metadata.vortexPageId,
                menuId: state.metadata.menuId
            },
            created_at: state.draft.id ? undefined : now,
            updated_at: now
        };
    }

    async function saveAsDraft(overwrite = true) {
        const currentName = state.draft.name || `Vortex Draft ${new Date().toLocaleString('pt-BR')}`;
        const name = overwrite && state.draft.name
            ? state.draft.name
            : prompt('Nome do rascunho Vortex:', currentName);
        if (!name) return;

        state.draft.name = name;
        await auditCurrentDraft();
        const payload = buildDraftPayload(overwrite);
        payload.name = name;
        payload.slug = slugifyDraftName(name);

        try {
            const response = await fetch('/api/drafts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (!response.ok || data.error) throw new Error(data.error || `Draft ${response.status}`);

            state.draft.id = data.draft?.id || payload.id;
            state.draft.name = data.draft?.name || name;
            addAuditLog('info', `Rascunho salvo: ${state.draft.name}`);
            addMessage('system', `ðŸ’¾ Rascunho salvo: ${state.draft.name}`);
        } catch (err) {
            console.error('[VORTEX] Falha ao salvar rascunho:', err);
            addAuditLog('error', `Falha ao salvar rascunho: ${err.message}`);
        }
    }

    async function applyDraft(draft) {
        if (!draft) return;

        state.draft.id = draft.id;
        state.draft.name = draft.name || '';
        state.currentFile = draft.currentFile || '/src/app/page.tsx';
        state.metadata.siloId = draft.metadata?.siloId || '';
        state.metadata.hubId = draft.metadata?.hubId || draft.metadata?.siloId || '';
        state.metadata.hubName = draft.metadata?.hubName || '';
        state.metadata.spokeIndex = Number.isInteger(draft.metadata?.spokeIndex) ? draft.metadata.spokeIndex : null;
        state.metadata.spokeTitle = draft.metadata?.spokeTitle || '';
        state.metadata.spokeSlug = draft.metadata?.spokeSlug || '';
        state.metadata.pageType = draft.metadata?.pageType || 'hub';
        state.metadata.syncStatus = draft.metadata?.syncStatus || '';
        state.metadata.vortexPageId = draft.metadata?.vortexPageId || '';
        state.metadata.menuId = draft.metadata?.menuId || '';

        const siloSelect = document.getElementById('vortex-silo-select');
        const menuSelect = document.getElementById('vortex-menu-select');
        if (siloSelect) siloSelect.value = state.metadata.pageType === 'spoke'
            ? `spoke:${state.metadata.siloId}:${state.metadata.spokeIndex}`
            : (state.metadata.siloId ? `hub:${state.metadata.siloId}` : '');
        if (menuSelect) menuSelect.value = state.metadata.menuId;
        renderMetadataStatus();

        if (draft.templateId) {
            const templateSelect = document.getElementById('vortex-template-select');
            if (templateSelect) templateSelect.value = draft.templateId;
            await selectTemplate(draft.templateId);
            state.template.values = draft.templateValues || state.template.values;
        }

        if (draft.code) {
            setEditorContent(draft.code, 'typescriptreact');
            await vfsWrite(state.currentFile, draft.code);
            updateFileTab(state.currentFile.split('/').pop(), true);
            updatePreview(draft.code);
        } else if (state.template.selectedId) {
            await renderSelectedTemplatePreview();
        }

        addAuditLog('info', `Rascunho carregado: ${state.draft.name || draft.id}`);
    }

    async function loadDraftById(draftId) {
        try {
            const response = await fetch('/api/drafts');
            const drafts = await response.json();
            const draft = (Array.isArray(drafts) ? drafts : []).find(d => String(d.id) === String(draftId));
            if (!draft) throw new Error('Rascunho nao encontrado');
            await applyDraft(draft);
        } catch (err) {
            console.error('[VORTEX] Falha ao carregar rascunho:', err);
            addAuditLog('error', `Falha ao carregar rascunho: ${err.message}`);
        }
    }

    async function loadDraft() {
        try {
            const response = await fetch('/api/drafts');
            const drafts = await response.json();
            const vortexDrafts = (Array.isArray(drafts) ? drafts : []).filter(d => d.source === 'vortex' || d.code);
            if (vortexDrafts.length === 0) {
                addAuditLog('info', 'Nenhum rascunho Vortex encontrado.');
                return;
            }

            const list = vortexDrafts.map((d, i) => `${i + 1}. ${d.name || d.slug || d.id}`).join('\n');
            const choice = prompt(`Escolha o rascunho:\n${list}`);
            if (!choice) return;

            const draft = vortexDrafts[parseInt(choice, 10) - 1];
            await applyDraft(draft);
        } catch (err) {
            console.error('[VORTEX] Falha ao carregar rascunho:', err);
            addAuditLog('error', `Falha ao carregar rascunho: ${err.message}`);
        }
    }

    function buildTemplateContext() {
        if (!state.template.selectedId || !state.template.current) return '';

        const moduleNames = state.template.modules.map(mod => mod.title).filter(Boolean).join(', ');
        const silo = getSiloById(state.metadata.siloId);
        const menu = getMenuById(state.metadata.menuId);
        return [
            '--- MASTER TEMPLATE SELECIONADO ---',
            `ID: ${state.template.selectedId}`,
            `Nome: ${state.template.current.name}`,
            `Tipo: ${state.template.current.type || 'indefinido'}`,
            `Direcao visual: ${state.template.current.designSummary || 'seguir design do template'}`,
            state.metadata.siloId ? `Silo/Hub atribuido: ${silo?.hub || silo?.name || state.metadata.siloId}` : '',
            state.metadata.menuId ? `Menu atribuido: ${menu?.name || menu?.label || state.metadata.menuId}` : '',
            `Modulos esperados: ${moduleNames || 'usar estrutura do template'}`,
            'Ao gerar codigo, preserve a intencao visual desta Master Template e mantenha compatibilidade com o preview do Vortex.'
        ].filter(Boolean).join('\n');
    }

    function buildVoiceProfileContext() {
        if (!state.voiceProfile.enabled || !state.voiceProfile.rules.length) return '';

        const rules = state.voiceProfile.rules.slice(0, 12).map((rule, index) => {
            if (typeof rule === 'string') return `- ${rule}`;
            const title = rule.titulo || rule.categoria || rule.sintese || `Regra ${index + 1}`;
            const body = rule.regra || rule.summary || rule.descricao || JSON.stringify(rule);
            return `- ${title}: ${body}`;
        }).join('\n');

        return [
            '--- PERFIL VERBAL DO DR. VICTOR ---',
            'Use estas regras como diretriz de tom, cadencia, vocabulario e postura clinica. Preserve etica CFP e clareza humana.',
            rules
        ].join('\n');
    }

    function buildAbidosContext() {
        const rules = [];
        if (state.abidosRules.singleH1) rules.push('Apenas UM <h1> por pÃ¡gina. Use hierarquia semÃ¢ntica (h2, h3).');
        if (state.abidosRules.altTags) rules.push('Todas as <img> DEVEM ter alt descritivo orientado a SEO local (UberlÃ¢ndia/Minas Gerais/Brasil).');
        if (state.abidosRules.cfpTerms) rules.push('PROIBIDO usar: "cura", "garantido", "melhor", "Ãºnico". Siga as diretrizes do CFP.');
        if (state.abidosRules.whatsappCTA) rules.push('Incluir botÃ£o flutuante de WhatsApp com link direto.');
        const templateContext = buildTemplateContext();
        const voiceProfileContext = buildVoiceProfileContext();
        return [rules.join('\n'), templateContext, voiceProfileContext].filter(Boolean).join('\n\n');
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
            results.errors.push(`ðŸš« SEO CRITICAL: MÃºltiplas tags <h1> detectadas (${h1Count}). O limite Abidos Ã© 1.`);
        }

        // 2. Check for Alt Tags
        if (state.abidosRules.altTags) {
            const hasImgWithoutAlt = /<img(?![^>]*\balt\b)[^>]*>/gi.test(code);
            if (hasImgWithoutAlt) {
                results.warnings.push('âš ï¸ SEO WARNING: Imagem detectada sem tag "alt". Isso penaliza o trÃ¡fego orgÃ¢nico.');
            }
        }

        // [PHASE 2.6] Check for CFP Forbidden Terms (Word Boundaries)
        if (state.abidosRules.cfpTerms) {
            const forbidden = [
                { term: 'cura', regex: /\bcura\b/gi, except: ['curadoria', 'procuradoria', 'curaÃ§ao'] },
                { term: 'curar', regex: /\bcurar\b/gi },
                { term: 'garantido', regex: /\bgarantido\b/gi },
                { term: 'garantia de resultado', regex: /\bgarantia de resultado/gi },
                { term: 'melhor profissional', regex: /\bmelhor profissional\b/gi },
                { term: 'o Ãºnico', regex: /\bo Ãºnico\b/gi },
                { term: 'soluÃ§Ã£o definitiva', regex: /\bsoluÃ§Ã£o definitiva\b/gi },
                { term: 'milagroso', regex: /\bmilagros[oa]\b/gi },
                { term: 'comprovado cientificamente', regex: /\bcomprovado cientificamente\b/gi },
                { term: 'tratamento infalÃ­vel', regex: /\btratamento infalÃ­vel\b/gi }
            ];
            forbidden.forEach(({ term, regex, except }) => {
                const matches = code.match(regex);
                if (matches) {
                    // Filter false positives from exception list
                    const codeLower = code.toLowerCase();
                    const hasFalsePositive = except && except.some(e => codeLower.includes(e.toLowerCase()));
                    if (!hasFalsePositive) {
                        results.passes = false;
                        results.errors.push(`âš–ï¸ ETHICS ALERT: Termo "${term}" detectado (${matches.length}x). Risco CFP.`);
                    }
                }
            });
        }

        // Store last audit for commit gate (Phase 2.4)
        state.lastAuditResult = results;

        // Update UI + Bottom Drawer Audit Log
        updateAuditUI(results);
        if (results.passes) {
            addAuditLog('success', `âœ… Auditoria aprovada. ${results.warnings.length} avisos.`);
        } else {
            addAuditLog('error', `ðŸ”´ Auditoria REPROVADA: ${results.errors.length} erros.`);
            results.errors.forEach(e => addAuditLog('error', `  â†’ ${e}`));
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
            addAuditLog('info', `ðŸ“¸ Snapshot #${state.snapshotId} salvo (${state.currentFile.split('/').pop()})`);
            const allSnapshots = await state.db.snapshots.orderBy('timestamp').toArray();
            if (allSnapshots.length > 20) {
                const overflow = allSnapshots.slice(0, allSnapshots.length - 20);
                await state.db.snapshots.bulkDelete(overflow.map(s => s.id));
            }
            renderSnapshotTimeline();
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
    // [PHASE 2.5] SEMANTIC AUDIT â€” REMOVED (VÃ³rtex 3.1 Purge)
    // A auditoria semÃ¢ntica foi removida para eliminar overhead de tokens.
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
                <div style="color: #ef4444; font-weight: 800; margin-bottom: 8px;">ðŸ›¡ï¸ GUARDIÃƒO BLOQUEOU A GERAÃ‡ÃƒO</div>
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
        addMessage('user', `ðŸ”¨ Auto-Reparar: ${errorSummary}`);
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
    // VÃ“RTEX REACT COMPILER (Zero-Token Preview Strategy)
    // =========================================================================
    function isReactCode(code) {
        // [VÃ“RTEX 3.1] Scanner SintÃ¡tico EmpÃ­rico (AST Trial-and-Error)
        // Cria a Ã¡rvore AST do DOM via engine. Se for cÃ³digo React "Nu", a engine 
        // vazarÃ¡ as declaraÃ§Ãµes sintÃ¡ticas de JS (imports, functions) para os nodos de texto cru.
        try {
            // Fail-fast para Documentos HTML perfeitos
            if (/^\s*(<!DOCTYPE|<html|<body|<head)/i.test(code)) {
                return false;
            }

            const parser = new DOMParser();
            const ast = parser.parseFromString(code, 'text/html');
            
            // Scanner do Vazamento de AST: 
            const leakedText = ast.body.textContent;
            const astTokens = leakedText.match(/\b(import|export default|function\s+[A-Z]|const\s+[A-Z]|const\s+\[|return\s+\(|useState|useEffect)\b/g);

            if (astTokens && astTokens.length > 0) {
                if (window.Babel?.packages?.parser) {
                    try {
                        window.Babel.packages.parser.parse(code, {
                            sourceType: 'module',
                            plugins: ['jsx', 'typescript']
                        });
                    } catch (parseErr) {
                        console.warn('[VORTEX] React-like code failed Babel parser check:', parseErr.message);
                    }
                }
                return true; // Engine capturou anomalias lÃ³gicas no fluxo estÃ¡tico = Ã‰ React JSX
            }

            // HeurÃ­stica secundÃ¡ria de propriedades JSX vs HTML
            if (code.includes('className=') || code.includes('onClick={') || /<[A-Z][A-Za-z0-9]*\b/.test(code)) {
                return true;
            }

            return false; // HTML estÃ¡tico validado nativamente
        } catch (e) {
            // Caso syntax falhe nativamente catastroficamente:
            // Atua em HTML EstÃ¡tico de forma determinÃ­stica (Graceful Degradation)
            return false;
        }
    }

    // =========================================================================
    // [VÃ“RTEX 3.1] NAKED COMPONENT STRIPPER
    // Remove imports do cÃ³digo para injeÃ§Ã£o no Preview Shell isolado.
    // O Shell jÃ¡ possui React, Framer Motion, Lucide e Mocks no escopo global.
    // =========================================================================
    function buildPreviewImportPrelude(code) {
        const bindings = [];
        const lucideRegex = /import\s+\{\s*([^}]+)\s*\}\s+from\s+['"]lucide-react['"];?/g;
        let match;

        while ((match = lucideRegex.exec(code)) !== null) {
            match[1].split(',').forEach(part => {
                const item = part.trim();
                if (!item) return;

                const aliasMatch = item.match(/^([A-Za-z0-9_$]+)\s+as\s+([A-Za-z0-9_$]+)$/);
                const sourceName = aliasMatch ? aliasMatch[1] : item;
                const localName = aliasMatch ? aliasMatch[2] : item;
                bindings.push(`const ${localName} = Lucide.${sourceName};`);
            });
        }

        return bindings.length ? `${bindings.join('\n')}\n` : '';
    }

    function stripForPreview(code) {
        let stripped = code;
        // [Etapa 3.3] MinificaÃ§Ã£o Expressa: Remover comentÃ¡rios da IA (OtimizaÃ§Ã£o de Payload)
        // 1. Remover comentÃ¡rios multilinhas /* ... */
        stripped = stripped.replace(/\/\*[\s\S]*?\*\//g, '');
        // 2. Remover comentÃ¡rios de linha Ãºnica // (Exceto em URLs)
        stripped = stripped.replace(/(^|[^\:])\/\/.*$/gm, '$1');

        // Remove todos os imports (o Shell jÃ¡ tem tudo no escopo global)
        const importPrelude = buildPreviewImportPrelude(stripped);
        stripped = stripped.replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?\s*\n?/g, '');
        stripped = stripped.replace(/import\s+['"][^'"]+['"];?\s*\n?/g, '');
        // Remove 'use client' directive
        stripped = stripped.replace(/['"]use client['"];?\s*\n?/g, '');
        // Remove export default â€” o Shell procura por Component ou App
        stripped = stripped.replace(/export\s+default\s+function\s+/, 'function ');
        stripped = stripped.replace(/export\s+default\s+/, '');
        
        return `${importPrelude}${stripped.trim()}`.trim();
    }

    function getComponentName(code) {
        const functionMatch = code.match(/(?:export\s+default\s+)?function\s+([A-Za-z0-9_]+)/);
        if (functionMatch) return functionMatch[1];

        const arrowMatch = code.match(/(?:export\s+)?(?:const|let|var)\s+([A-Z][A-Za-z0-9_]*)\s*=\s*(?:\([^)]*\)|[A-Za-z0-9_]+)\s*=>/);
        if (arrowMatch) return arrowMatch[1];

        const defaultNameMatch = code.match(/export\s+default\s+([A-Z][A-Za-z0-9_]*)/);
        if (defaultNameMatch) return defaultNameMatch[1];

        return 'App';
    }

    // =========================================================================
    // [VÃ“RTEX 3.1] PREVIEW â€” Shell Isolado via postMessage
    // React: Usa preview-shell.html com injeÃ§Ã£o via postMessage
    // HTML:  Fallback para srcdoc (conteÃºdo estÃ¡tico)
    // =========================================================================
    let shellReady = false;
    let pendingCode = null;

    function updatePreview(htmlContent) {
        try {
            const frame = document.getElementById('vortex-preview-frame');
            if (!frame) return;
            state.lastPreviewCode = htmlContent || '';

            // SanitizaÃ§Ã£o Anti-Hallucination
            let processedHtml = htmlContent;
            processedHtml = processedHtml.replace(/src=["'](?:%22|\\"")+(https:\/\/unpkg\.com\/lucide[^"']?.*?)(?:%22|\\")+["']/g, 'src="$1"');
            processedHtml = processedHtml.replace(/src=["'](?:%22|\\"")+(https:\/\/cdn\.tailwindcss\.com[^"']?.*?)(?:%22|\\")+["']/g, 'src="$1"');

            if (isReactCode(processedHtml)) {
                // ============================================================
                // [VÃ“RTEX 3.1] React â†’ Preview Shell + postMessage
                // ============================================================
                const strippedCode = stripForPreview(processedHtml);
                const componentName = getComponentName(processedHtml);
                const componentAlias = (componentName === 'App' || componentName === 'Component') ? '' : `\nconst App = ${componentName};`;

                // Adiciona a variÃ¡vel Component para o Shell encontrar
                const injectableCode = strippedCode + componentAlias;

                // Carrega o shell se ainda nÃ£o estiver ativo
                const currentSrc = frame.getAttribute('src');
                if (!currentSrc || !currentSrc.includes('preview-shell.html')) {
                    shellReady = false;
                    pendingCode = injectableCode;
                    frame.src = '/preview-shell.html';
                } else if (shellReady) {
                    // Shell jÃ¡ carregado â€” injetar diretamente
                    frame.contentWindow.postMessage({
                        type: 'vortex-inject-component',
                        code: injectableCode
                    }, '*');
                } else {
                    // Shell carregando â€” guardar cÃ³digo pendente
                    pendingCode = injectableCode;
                }
            } else {
                // ============================================================
                // HTML EstÃ¡tico â€” Fallback via srcdoc (sem React)
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
                frame.onload = () => setTimeout(() => {
                    installPreviewInteractionTools();
                    installV6PreviewFieldTools();
                    renderV6Proposal();
                }, 120);
            }
        } catch (err) {
            console.error('ðŸŒ€ [VORTEX] Fallback Triggered via Catch:', err);
            renderFallbackPanel(err.message);
        }
    }


function renderFallbackPanel(errorMsg) {
    const frame = document.getElementById('vortex-preview-frame');
    if (!frame) return;

    const fallbackHtml = `
        <!DOCTYPE html>
        <html lang="pt-br">
        <head>
            <meta charset="UTF-8">
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
                body { 
                    background: #050810; 
                    color: #e2e8f0; 
                    font-family: sans-serif; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    height: 100vh; 
                    margin: 0;
                    overflow: hidden;
                }
                .glass {
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    backdrop-filter: blur(10px);
                    border-radius: 16px;
                    padding: 2rem;
                    max-width: 400px;
                    text-align: center;
                }
                .icon {
                    font-size: 3rem;
                    margin-bottom: 1rem;
                    color: #ef4444;
                }
            </style>
        </head>
        <body>
            <div class="glass">
                <div class="icon">âš ï¸</div>
                <h2 class="text-xl font-bold mb-2">Erro de RenderizaÃ§Ã£o</h2>
                <p class="text-sm text-gray-400 mb-4">
                    O VÃ³rtex detectou uma falha sintÃ¡tica ou de execuÃ§Ã£o que impediu a visualizaÃ§Ã£o do componente.
                </p>
                <div class="bg-black/50 p-3 rounded text-xs font-mono text-red-400 mb-6 break-words">
                    ${errorMsg}
                </div>
                <button onclick="parent.vortexStudio.repairCode()" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all">
                    Tentar Auto-Reparo (AI)
                </button>
            </div>
        </body>
        </html>
    `;

    frame.removeAttribute('src');
    frame.srcdoc = fallbackHtml;
}

    // [VÃ“RTEX 3.1] Listener para comunicaÃ§Ã£o host â†” iframe
    window.addEventListener('message', (event) => {
        if (!event.data || !event.data.type) return;

        switch (event.data.type) {
            // Shell pronto â€” injetar cÃ³digo pendente
            case 'vortex-shell-ready':
                shellReady = true;
                console.log('ðŸŒ€ [VÃ“RTEX 3.1] Preview Shell carregado com sucesso.');
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

            // RenderizaÃ§Ã£o bem-sucedida
            case 'vortex-render-success':
                addAuditLog('success', 'âœ… Preview renderizado com sucesso.');
                setTimeout(() => {
                    installPreviewInteractionTools();
                    installV6PreviewFieldTools();
                    renderV6Proposal();
                }, 80);
                break;

            // Erro de renderizaÃ§Ã£o no shell
            case 'vortex-render-error':
                console.error('[VÃ“RTEX 3.1] Render Error:', event.data.message);
                addAuditLog('error', `âŒ Preview Error: ${event.data.message}`);
                renderFallbackPanel(event.data.message);
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


    // =========================================================================
    // REFRESH PREVIEW (Manual Re-Render from Editor Content)
    // =========================================================================
    function refreshPreview() {
        const code = getEditorContent();
        if (!code || code.trim().length < 10 || code.startsWith('// ðŸŒ€')) {
            addMessage('system', 'âš ï¸ Editor vazio ou sem cÃ³digo renderizÃ¡vel. Gere ou cole cÃ³digo antes de atualizar.');
            return;
        }

        // Visual feedback on the button
        const btn = document.getElementById('vortex-refresh-preview-btn');
        if (btn) {
            btn.classList.add('spinning');
            setTimeout(() => btn.classList.remove('spinning'), 800);
        }

        // [FIX] ForÃ§ar reset do shell para garantir que o preview-shell.html seja carregado
        const frame = document.getElementById('vortex-preview-frame');
        if (frame) {
            shellReady = false;
            frame.removeAttribute('srcdoc');
        }

        // Sanitize and render
        const cleanCode = sanitizeAIContent(code);
        updatePreview(cleanCode);
        addAuditLog('info', 'ðŸ”„ Preview atualizado manualmente a partir do editor.');
    }

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
            tsx: 'âš›ï¸', jsx: 'âš›ï¸', ts: 'ðŸ”·', js: 'ðŸŸ¡',
            css: 'ðŸŽ¨', scss: 'ðŸŽ¨', html: 'ðŸŒ', json: 'ðŸ“‹',
            md: 'ðŸ“', svg: 'ðŸ–¼ï¸', png: 'ðŸ–¼ï¸', jpg: 'ðŸ–¼ï¸',
            env: 'ðŸ”’', gitignore: 'ðŸš«', txt: 'ðŸ“„'
        };
        return icons[ext] || 'ðŸ“„';
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
                    <span>ðŸ“‚</span>
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
                                <span class="vortex-tree-arrow">â–¼</span>
                                <span class="vortex-tree-icon">ðŸ“</span>
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

        // [VÃ³rtex 3.1] Preview parser removido â€” preview agora Ã© via Shell isolado.
        const explanationMatch = text.match(/<explanation>([\s\S]*?)<\/explanation>/);

        return {
            files,
            preview: '', // [VÃ³rtex 3.1] Preview via Shell â€” nÃ£o extrair do response da IA
            explanation: explanationMatch ? explanationMatch[1].trim() : 'CÃ³digo gerado.'
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

        addMessage('ai', `${parsed.explanation}\n\nðŸ“¦ **${parsed.files.length} arquivo(s) gerado(s):** ${parsed.files.map(f => '`' + f.path.split('/').pop() + '`').join(', ')}`);
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
        console.log(`ðŸ›¡ï¸ [ABIDOS] Rule "${rule}":`, state.abidosRules[rule] ? 'ON' : 'OFF');
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
                        VÃ³rtex <span>AI Studio</span>
                    </div>
                    <div class="vortex-status-badge online">
                        <div class="vortex-status-dot"></div>
                        VFS Online
                    </div>
                </div>
                <div class="vortex-toolbar-center">
                    <select id="vortex-model-select" class="vortex-model-select">
                        <option value="gemini-2.5-flash">âš¡ GEMINI 2.5 FLASH</option>
                        <option value="gemini-2.5-pro">ðŸ§  GEMINI 2.5 PRO</option>
                        <option value="gemini-2.5-flash-lite">ðŸ’¡ FLASH LITE</option>
                    </select>
                    <div class="vortex-mode-switch" role="tablist" aria-label="Modo de operacao">
                        <button data-vortex-mode="canvas" onclick="vortexStudio.setOperationMode('canvas')" title="Canvas Livre"><i data-lucide="palette"></i> Canvas</button>
                        <button data-vortex-mode="template" onclick="vortexStudio.setOperationMode('template')" title="Template Guiado"><i data-lucide="layout-template"></i> Template</button>
                    </div>
                </div>
                <div class="vortex-toolbar-right">
                    <button id="vortex-v6-toggle" class="vortex-btn vortex-btn-secondary" onclick="vortexStudio.toggleVisualMode()" title="Alternar Vortex Visual v6">
                        <i data-lucide="sparkles"></i> <span>Visual V6</span>
                    </button>
                    <button class="vortex-btn vortex-btn-secondary vortex-xray-btn" onclick="vortexStudio.toggleXrayMode()" title="Modo Raio-X">
                        <i data-lucide="code-2"></i>
                    </button>
                    <button class="vortex-btn vortex-btn-secondary" onclick="vortexStudio.syncContextHub()" id="vortex-hub-btn" title="Armazena a teia de componentes no Google Cache API para reduzir custos e aumentar alinhamento do Design System">
                        <i data-lucide="database"></i> SYNC HUB
                    </button>
                    <button class="vortex-btn vortex-btn-secondary" onclick="vortexStudio.saveToVFS()">
                        <i data-lucide="save"></i> SALVAR
                    </button>
                    <button class="vortex-btn vortex-btn-secondary" onclick="vortexStudio.downloadCode()" title="Baixar CÃ³digo Next.js (Hidratado)">
                        <i data-lucide="code-2"></i>
                    </button>
                    <button class="vortex-btn vortex-btn-secondary" onclick="vortexStudio.saveAsDraft(true)" title="Salvar rascunho Vortex">
                        <i data-lucide="archive"></i> DRAFT
                    </button>
                    <button class="vortex-btn vortex-btn-secondary" onclick="vortexStudio.openEditorialModal()" title="Gestão Editorial — Rascunhos, Revisões, Publicados">
                        <i data-lucide="layers"></i> Gerenciar
                    </button>
                    <button class="vortex-btn vortex-btn-secondary" onclick="vortexStudio.exportHTML()" title="Exportar HTML EstÃ¡tico (Preview)">
                        <i data-lucide="download"></i>
                    </button>
                    <button class="vortex-btn vortex-btn-secondary" onclick="vortexStudio.generateSEOCluster()" title="Silos SEO">
                        <i data-lucide="network"></i>
                    </button>
                    <button class="vortex-btn vortex-btn-secondary" onclick="vortexStudio.showTemplateLibrary()" title="Templates">
                        <i data-lucide="layout-template"></i>
                    </button>
                    <button class="vortex-btn vortex-btn-secondary" onclick="vortexStudio.auditCurrentDraft()" title="Auditoria formal Abidos">
                        <i data-lucide="shield-check"></i> <span id="vortex-formal-audit-badge" class="vortex-audit-badge idle">Audit -</span>
                    </button>
                    <button class="vortex-btn vortex-btn-secondary" onclick="vortexStudio.deployDraftPreview()" title="Criar preview Vercel do rascunho">
                        <i data-lucide="cloud-upload"></i>
                    </button>
                    <a id="vortex-deploy-link" class="vortex-btn vortex-btn-secondary" href="#" target="_blank" style="display:none;" title="Ver preview Vercel">
                        <i data-lucide="external-link"></i> Vercel
                    </a>
                    <button class="vortex-btn vortex-btn-success" onclick="vortexStudio.commitAndPush()">
                        <i data-lucide="git-branch"></i> COMMIT & PUSH
                    </button>
                    <button class="vortex-btn vortex-btn-secondary" onclick="vortexStudio.toggleZenMode()" title="Modo Zen â€” Foco no Editor">
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
                            <span class="vortex-explorer-toggle">â–¼</span>
                        </div>
                        <div id="vortex-file-tree" class="vortex-file-tree"></div>
                    </div>
                    <div class="vortex-template-config">
                        <div class="vortex-template-config-header">
                            <div class="vortex-panel-title">
                                <i data-lucide="layout-template"></i>
                                MASTER TEMPLATE
                            </div>
                        </div>
                        <select id="vortex-template-select" class="vortex-template-select" onchange="vortexStudio.selectTemplate(this.value)">
                            <option value="">Sem Template (Canvas Livre)</option>
                        </select>
                        <div id="vortex-template-status" class="vortex-template-status">
                            <strong>Canvas Livre</strong><span>Sem template selecionado</span>
                        </div>
                    </div>
                    <div class="vortex-metadata-config">
                        <div class="vortex-template-config-header">
                            <div class="vortex-panel-title">
                                <i data-lucide="network"></i>
                                CONTEXTO
                            </div>
                        </div>
                        <select id="vortex-silo-select" class="vortex-template-select" onchange="vortexStudio.updateMetadata('silo', this.value)">
                            <option value="">Sem Silo/Hub</option>
                        </select>
                        <select id="vortex-menu-select" class="vortex-template-select" onchange="vortexStudio.updateMetadata('menu', this.value)">
                            <option value="">Sem Menu</option>
                        </select>
                        <div id="vortex-metadata-status" class="vortex-template-status">
                            <strong>Sem Silo</strong><span>Sem Menu</span>
                        </div>
                    </div>
                    <div class="vortex-media-config">
                        <div class="vortex-template-config-header">
                            <div class="vortex-panel-title">
                                <i data-lucide="image"></i>
                                ACERVO VISUAL
                            </div>
                        </div>
                        <div id="vortex-media-strip" class="vortex-media-strip">
                            <span class="vortex-empty-chip">Carregando midia...</span>
                        </div>
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
                            ðŸŒ€ VÃ³rtex AI Studio inicializado. Descreva a pÃ¡gina que deseja criar.
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
                            <div class="vortex-toggle-label"><i data-lucide="heading-1"></i> H1 Ãšnico</div>
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
                        <div class="vortex-toggle-row">
                            <div class="vortex-toggle-label"><i data-lucide="mic-2"></i> Perfil Verbal</div>
                            <div class="vortex-switch${state.voiceProfile.enabled ? ' active' : ''}" data-vortex-toggle="voiceProfile" onclick="vortexStudio.toggleVoiceProfile()"></div>
                        </div>
                        <div id="vortex-voice-profile-status" class="vortex-template-status vortex-voice-profile-status">
                            <strong>Perfil Verbal ativo</strong><span>Carregando memoria verbal...</span>
                        </div>
                    </div>
                    <div class="vortex-chat-input-area" style="transition: background 0.3s;"
                         ondragover="event.preventDefault(); this.style.background='rgba(99,102,241,0.1)';" 
                         ondragleave="this.style.background='transparent';" 
                         ondrop="event.preventDefault(); this.style.background='transparent'; vortexStudio.handleDrop(event);">
                        <div id="vortex-image-preview-container" style="display: none; position: relative; margin-bottom: 12px;">
                           <img id="vortex-image-preview" src="" style="max-height: 80px; border-radius: 6px; border: 1px solid #3c3c3c;">
                           <button onclick="vortexStudio.removeImage()" style="position: absolute; top: -8px; right: -8px; background: #ef4444; color: white; border: none; border-radius: 50%; width: 22px; height: 22px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px;">Ã—</button>
                        </div>
                        <div class="vortex-chat-input-wrapper">
                            <button title="Anexar Design (Print/Mockup)" onclick="document.getElementById('vortex-file-upload').click()" style="background:none; border:none; color:#a1a1aa; cursor:pointer; padding:8px;">
                                <i data-lucide="image-plus"></i>
                            </button>
                            <input type="file" id="vortex-file-upload" accept="image/*" style="display:none" onchange="vortexStudio.handleImageUpload(event)">
                            
                            <textarea id="vortex-chat-input" class="vortex-chat-input" placeholder="Descreva a pÃ¡gina ou anexe um print..." rows="1"
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
                                <span class="dot"></span><span class="tab-icon">âš›ï¸</span>page.tsx
                                <span class="tab-close" onclick="event.stopPropagation(); vortexStudio.closeTab('page.tsx')">Ã—</span>
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
                            <button class="vortex-device-btn" onclick="vortexStudio.refreshPreview()" title="Atualizar Preview" id="vortex-refresh-preview-btn">
                                <i data-lucide="refresh-cw"></i>
                            </button>
                            <button class="vortex-device-btn" onclick="vortexStudio.popOutPreview()" title="Abrir em nova aba">
                                <i data-lucide="external-link"></i>
                            </button>
                        </div>
                    </div>
                    <iframe id="vortex-preview-frame" class="vortex-preview-frame vortex-panel-body" sandbox="allow-scripts allow-same-origin"></iframe>
                    <div class="vortex-preview-feedback">
                        <button onclick="vortexStudio.sendStyleFeedback('positive')" title="Gostei deste estilo"><i data-lucide="thumbs-up"></i></button>
                        <button onclick="vortexStudio.sendStyleFeedback('negative')" title="Evitar este estilo"><i data-lucide="thumbs-down"></i></button>
                        <span id="vortex-style-memory-status">0 aprovados / 0 evitados</span>
                    </div>
                    <div class="vortex-vitals-bar">
                        <div id="vortex-snapshot-timeline" class="vortex-snapshot-timeline"></div>
                        <div class="vortex-vital-metric">
                            <span class="vortex-vital-label">LCP</span>
                            <span class="vortex-vital-value good" id="vortex-lcp">â€”</span>
                        </div>
                        <div class="vortex-vital-metric">
                            <span class="vortex-vital-label">CLS</span>
                            <span class="vortex-vital-value good" id="vortex-cls">â€”</span>
                        </div>
                        <div class="vortex-vital-metric">
                            <span class="vortex-vital-label">INP</span>
                            <span class="vortex-vital-value good" id="vortex-inp">â€”</span>
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
                    <span class="vortex-drawer-chevron">â–²</span>
                </div>
                <div class="vortex-drawer-content">
                    <div id="vortex-drawer-audit" class="vortex-drawer-pane active">
                        <div class="vortex-audit-log" id="vortex-audit-log">
                            <div class="vortex-audit-entry info">ðŸŒ€ VÃ³rtex Auditoria inicializada. Logs do Abidos aparecerÃ£o aqui.</div>
                        </div>
                    </div>
                    <div id="vortex-drawer-terminal" class="vortex-drawer-pane">
                        <pre class="vortex-terminal-output" id="vortex-terminal-output">$ vortex ready\nâš¡ Waiting for commands...</pre>
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

    function toggleVisualMode(force) {
        const willDisable = typeof force === 'boolean' ? !force : state.visual.enabled;
        if (willDisable && !window.confirm('Sair do modo Visual V6 e entrar no modo tÃ©cnico (V5)?')) return;
        state.visual.enabled = typeof force === 'boolean' ? force : !state.visual.enabled;
        persistVisualSession();
        applyVisualModeState();
        if (state.visual.enabled) {
            ensureVisualStarterPage();
            setVisualLayer(state.visual.layer || 'edit');
            addAuditLog('info', 'V6 Visual Mode ativado.');
        } else {
            addAuditLog('info', 'V6 Visual Mode desativado. V5 preservado.');
        }
    }

    function renderV6Surface() {
        const studio = document.getElementById('vortex-studio');
        if (!studio || document.getElementById('vortex-v6-surface')) return;

        const surface = document.createElement('div');
        surface.id = 'vortex-v6-surface';
        surface.className = 'vortex-v6-surface';
        surface.innerHTML = `
            <div class="vortex-v6-lenses" role="tablist" aria-label="Lentes Vortex">
                <button data-vortex-layer="context" onclick="vortexStudio.setVisualLayer('context')"><span>1</span> Contexto</button>
                <button data-vortex-layer="edit" onclick="vortexStudio.setVisualLayer('edit')"><span>2</span> Edicao</button>
                <button data-vortex-layer="performance" onclick="vortexStudio.setVisualLayer('performance')"><span>3</span> Performance</button>
                <button data-vortex-layer="publish" onclick="vortexStudio.setVisualLayer('publish')"><span>4</span> Publicar</button>
            </div>

            <aside id="vortex-v6-context" class="vortex-v6-panel">
                <div class="vortex-v6-panel-title">Silos</div>
                <div id="vortex-v6-silo-hub" class="vortex-v6-silo-hub"></div>
                <div id="vortex-v6-briefing" class="vortex-v6-briefing"></div>
                <section id="vortex-v6-template-shelf" class="vortex-v6-template-shelf" aria-label="Biblioteca de templates"></section>
                <div id="vortex-v6-strategy-summary" class="vortex-v6-summary">
                    <div class="vortex-v6-shimmer"></div>
                    <span>Carregando contexto...</span>
                </div>
            </aside>

            <aside id="vortex-v6-performance" class="vortex-v6-panel">
                <div class="vortex-v6-panel-title">Score de Impacto</div>
                <div class="vortex-v6-score"><span id="vortex-v6-score-value">73</span><small>/100</small></div>
                <div id="vortex-v6-metrics" class="vortex-v6-metrics"></div>
                <div id="vortex-v6-upgrades" class="vortex-v6-upgrades"></div>
            </aside>

            <section id="vortex-v6-proposal" class="vortex-v6-proposal" aria-live="polite"></section>
            <aside id="vortex-v6-widgets" class="vortex-v6-widgets" aria-label="Widgets do builder"></aside>
            <div id="vortex-v6-preview-bar" class="vortex-v6-preview-bar">
                <span id="vortex-v6-preview-label">Preview</span>
                <div>
                    <button class="vortex-device-btn" data-device="desktop" onclick="vortexStudio.setDevice('desktop')">Desktop</button>
                    <button class="vortex-device-btn" data-device="tablet" onclick="vortexStudio.setDevice('tablet')">Tablet</button>
                    <button class="vortex-device-btn" data-device="mobile" onclick="vortexStudio.setDevice('mobile')">Mobile</button>
                </div>
            </div>

            <div id="vortex-v6-prompt" class="vortex-v6-prompt">
                <div class="vortex-v6-pills">
                    <button onclick="vortexStudio.runVisualPrompt('Refinar Hero')">Refinar Hero</button>
                    <button onclick="vortexStudio.runVisualPrompt('Melhorar CTA')">Melhorar CTA</button>
                    <button onclick="vortexStudio.runVisualPrompt('Trocar Paleta')">Trocar Paleta</button>
                    <button onclick="vortexStudio.runVisualPrompt('Adicionar Secao')">Adicionar Secao</button>
                    <button onclick="vortexStudio.runVisualPrompt('Simplificar Texto')">Simplificar Texto</button>
                    <button onclick="vortexStudio.runVisualPrompt('Otimizar Mobile')">Otimizar Mobile</button>
                </div>
                <div class="vortex-v6-input-row">
                    <textarea id="vortex-v6-input" rows="1" placeholder="Digite direto no preview. Ou use IA para melhorar a intenÃ§Ã£o..." onkeydown="if(event.key==='Enter' && !event.shiftKey){event.preventDefault();vortexStudio.runVisualPrompt();}"></textarea>
                    <button id="vortex-v6-send" onclick="vortexStudio.runVisualPrompt()" title="Enviar"><i data-lucide="send"></i></button>
                    <button id="vortex-v6-ai-mode" onclick="vortexStudio.toggleVisualAIMode()" title="Alternar mock/IA">Mock</button>
                </div>
                <div id="vortex-v6-progress" class="vortex-v6-progress"></div>
            </div>

            <div id="vortex-v6-publish-backdrop" class="vortex-v6-publish-backdrop" hidden></div>
            <div id="vortex-v6-publish-card" class="vortex-v6-publish-card" hidden>
                <h3>Pronto para publicar?</h3>
                <p id="vortex-v6-publish-summary">VocÃª melhorou o tÃ­tulo, ajustou a intenÃ§Ã£o e preservou o preview.</p>
                <div class="vortex-v6-publish-score"><span id="vortex-v6-publish-score-value">81</span>/100</div>
                <small id="vortex-v6-version-label">Esta versÃ£o serÃ¡ salva como melhoria do Hero</small>
                <div class="vortex-v6-publish-actions">
                    <button onclick="vortexStudio.publishVisualVersion()">Publicar PÃ¡gina</button>
                    <button onclick="vortexStudio.setVisualLayer('edit')">Voltar e Refinar</button>
                </div>
            </div>

            <div id="vortex-v6-success" class="vortex-v6-success" hidden>Publicado com sucesso</div>
        `;
        studio.appendChild(surface);
        renderV6Silos();
        renderV6Performance();
        renderV6Briefing();
        renderV6TemplateShelf();
        renderV6Proposal();
        renderV6Widgets();
    }

    function getBriefTemplateHint() {
        const selectedKeyword = TIER_1_KEYWORDS.find(k => k.id === state.creationBrief.keywordId);
        return selectedKeyword?.templateHint || (state.creationBrief.objective === 'blog_post' ? 'artigo' : 'landing');
    }

    function renderV6Briefing() {
        const panel = document.getElementById('vortex-v6-briefing');
        if (!panel) return;
        const brief = state.creationBrief;
        const selectedKeyword = TIER_1_KEYWORDS.find(k => k.id === brief.keywordId);
        const menus = state.metadata.menus || [];
        const silos = state.metadata.silos || [];
        
        panel.innerHTML = `
            <div class="vortex-v6-brief-head">
                <strong>Briefing Estratégico (V7)</strong>
                <span>${escapeHtml(brief.hubName || 'Selecione um Hub acima')}</span>
            </div>

            <div class="vortex-briefing-columns">
                <!-- COLUNA 1: CRIATIVO -->
                <div class="vortex-briefing-column">
                    <div class="vortex-column-title"><i class="fas fa-lightbulb"></i> Criativo</div>
                    
                    <label>Palavra-chave principal</label>
                    <div class="vortex-v6-keyword-row">
                        <input value="${escapeHtml(brief.themeKeyword)}" placeholder="Digite a palavra-chave..." oninput="vortexStudio.setCreationBriefField('themeKeyword', this.value)">
                    </div>
                    
                    <label>Motor AI</label>
                    <select onchange="vortexStudio.setCreationBriefField('model', this.value)">
                        <option value="gemini-2.5-flash" ${brief.model === 'gemini-2.5-flash' ? 'selected' : ''}>Gemini 2.5 Flash (Rápido)</option>
                        <option value="gemini-2.5-pro" ${brief.model === 'gemini-2.5-pro' ? 'selected' : ''}>Gemini 2.5 Pro (Auditivo)</option>
                    </select>

                    <label>Objetivo</label>
                    <select onchange="vortexStudio.setCreationBriefField('objective', this.value)">
                        <option value="landing_page" ${brief.objective === 'landing_page' ? 'selected' : ''}>Landing Page</option>
                        <option value="content_page" ${brief.objective === 'content_page' ? 'selected' : ''}>Página do Site</option>
                        <option value="blog_post" ${brief.objective === 'blog_post' ? 'selected' : ''}>Blog / SEO</option>
                    </select>

                    <label>Contexto & Ideias</label>
                    <textarea style="flex: 1; min-height: 80px;" placeholder="Voz clínica, detalhes do rascunho..." oninput="vortexStudio.setCreationBriefField('ideaContext', this.value)">${escapeHtml(brief.ideaContext || selectedKeyword?.context || '')}</textarea>
                </div>

                <!-- COLUNA 2: ABIDOS -->
                <div class="vortex-briefing-column">
                    <div class="vortex-column-title"><i class="fas fa-brain"></i> Abidos</div>

                    <label>Hub / Silo Estratégico</label>
                    <select onchange="vortexStudio.setCreationBriefField('siloId', this.value)">
                        <option value="">Sem Silo (Opcional)</option>
                        ${silos.map(s => {
                            const id = String(s.id || s.slug || s.hub || '');
                            const label = s.hub || s.name || s.title || id;
                            return `<option value="${escapeHtml(id)}" ${brief.siloId === id ? 'selected' : ''}>${escapeHtml(label)}</option>`;
                        }).join('')}
                    </select>

                    <label>Menu de Navegação</label>
                    <select onchange="vortexStudio.setCreationBriefField('menuId', this.value)">
                        <option value="">Sem Menu</option>
                        ${menus.map(m => `<option value="${escapeHtml(m.id)}" ${brief.menuId === String(m.id) ? 'selected' : ''}>${escapeHtml(m.name || m.label || m.title || m.id)}</option>`).join('')}
                    </select>

                    <label>Modo de Geração</label>
                    <div style="display: flex; gap: 5px;">
                        <button class="vortex-btn ${brief.generationMode === 'structured' ? 'vortex-btn-primary' : 'vortex-btn-secondary'}" onclick="vortexStudio.setGenerationMode('structured')" style="flex:1; font-size: 9px;">Abidos</button>
                        <button class="vortex-btn ${brief.generationMode === 'free' ? 'vortex-btn-primary' : 'vortex-btn-secondary'}" onclick="vortexStudio.setGenerationMode('free')" style="flex:1; font-size: 9px;">Livre</button>
                    </div>

                    <label style="margin-top: 10px;">Estrutura Abidos (sections_json)</label>
                    <div class="vortex-abidos-struct-row">
                        <span id="vortex-sections-status" class="vortex-sections-status ${brief.sectionsJson ? 'has-data' : 'empty'}">
                            ${brief.sectionsJson
                                ? `✅ ${(brief.sectionsJson.sections || []).length} seções geradas`
                                : '— Não gerado'}
                        </span>
                        <button class="vortex-btn vortex-btn-secondary" onclick="vortexStudio.generateSectionsFromBrief()" style="font-size: 9px; padding: 4px 8px;" title="Gerar sections_json estruturado via Abidos Engine">Gerar</button>
                        ${brief.sectionsJson ? `<button class="vortex-btn vortex-btn-secondary" onclick="vortexStudio.clearSectionsJson()" style="font-size: 9px; padding: 4px 6px;" title="Limpar">✕</button>` : ''}
                    </div>

                    <label style="margin-top: 8px;">Imagem Hero</label>
                    <div class="vortex-asset-row">
                        ${brief.heroAssetUrl
                            ? `<img src="${escapeHtml(brief.heroAssetUrl)}" class="vortex-asset-thumb" alt="Hero">`
                            : `<span style="font-size: 10px; color: #475569;">Sem imagem selecionada</span>`}
                        <button class="vortex-btn vortex-btn-secondary" onclick="vortexStudio.openAssetPicker('hero')" style="font-size: 9px; padding: 4px 8px;">Selecionar</button>
                        ${brief.heroAssetUrl ? `<button class="vortex-btn vortex-btn-secondary" onclick="vortexStudio.clearAsset('hero')" style="font-size: 9px; padding: 4px 6px;">✕</button>` : ''}
                    </div>
                </div>

                <!-- COLUNA 3: CONVERSÃO -->
                <div class="vortex-briefing-column">
                    <div class="vortex-column-title"><i class="fas fa-shopping-cart"></i> Conversão</div>

                    <label>WhatsApp Clínico</label>
                    <input value="${escapeHtml(brief.contacts.whatsapp)}" placeholder="Ex: 5511999999999" oninput="vortexStudio.setCreationBriefField('contacts.whatsapp', this.value)">

                    <label>Email de Contato</label>
                    <input value="${escapeHtml(brief.contacts.email)}" placeholder="contato@exemplo.com" oninput="vortexStudio.setCreationBriefField('contacts.email', this.value)">

                    <label>Instagram (@)</label>
                    <input value="${escapeHtml(brief.contacts.instagram)}" placeholder="perfil_clinico" oninput="vortexStudio.setCreationBriefField('contacts.instagram', this.value)">

                    <label>Link de Agendamento</label>
                    <input value="${escapeHtml(brief.contacts.bookingLink)}" placeholder="doctoralia.com/..." oninput="vortexStudio.setCreationBriefField('contacts.bookingLink', this.value)">

                    <div style="margin-top: auto; padding-top: 15px;">
                        <button class="vortex-v6-primary-action" onclick="vortexStudio.generateFromBrief()" style="width: 100%; margin: 0;">Gerar com Briefing</button>
                    </div>
                </div>
            </div>
        `;
    }


    // =====================================================================
    // ABIDOS-NATIVE ENGINE — Frontend (1.5.1)
    // =====================================================================

    async function generateSectionsFromBrief() {
        const brief = state.creationBrief;
        const statusEl = document.getElementById('vortex-sections-status');
        if (statusEl) { statusEl.textContent = 'Gerando...'; statusEl.className = 'vortex-sections-status loading'; }

        const pageTypeMap = { landing_page: 'landing', content_page: 'spoke', blog_post: 'article' };
        const page_type = pageTypeMap[brief.objective] || 'spoke';

        try {
            const resp = await fetch('/api/vortex/generate-sections', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    briefing_json: {
                        keyword: brief.themeKeyword,
                        hub: brief.hubName,
                        silo: brief.siloId,
                        objective: brief.objective,
                        context: brief.ideaContext,
                        contacts: brief.contacts
                    },
                    page_type,
                    model: brief.model || 'gemini-2.5-flash'
                })
            });
            const data = await resp.json();
            if (!resp.ok || data.error) throw new Error(data.error || 'Erro desconhecido');

            state.creationBrief.sectionsJson = data.sections_json;
            addAuditLog('success', `Estrutura Abidos gerada: ${(data.sections_json?.sections || []).length} seções.`);
            renderV6Briefing();
        } catch (e) {
            addAuditLog('error', `Falha ao gerar estrutura Abidos: ${e.message}`);
            if (statusEl) { statusEl.textContent = '✗ Erro — tente novamente'; statusEl.className = 'vortex-sections-status error'; }
        }
    }

    function clearSectionsJson() {
        state.creationBrief.sectionsJson = null;
        renderV6Briefing();
    }

    // =====================================================================
    // SELETOR DE ASSETS (2.2)
    // =====================================================================

    async function openAssetPicker(field) {
        let modal = document.getElementById('vortex-asset-picker');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'vortex-asset-picker';
            modal.className = 'vortex-editorial-modal';
            modal.innerHTML = `
                <div class="vortex-editorial-backdrop" onclick="vortexStudio.closeAssetPicker()"></div>
                <div class="vortex-editorial-panel" style="width:min(720px,96vw)">
                    <div class="vortex-editorial-header">
                        <h3>Acervo Visual — Selecionar Asset</h3>
                        <button class="vortex-editorial-close" onclick="vortexStudio.closeAssetPicker()">✕</button>
                    </div>
                    <div style="padding:12px 16px;border-bottom:1px solid #1e1e3a;display:flex;gap:8px;align-items:center">
                        <select id="vortex-asset-cat" onchange="vortexStudio.loadAssets()" style="padding:5px 8px;background:#1a1a2e;border:1px solid #3a3a5c;color:#e8eaf0;border-radius:6px;font-size:12px">
                            <option value="">Todas as categorias</option>
                            <option value="hero">Hero</option>
                            <option value="clinical">Clínica</option>
                            <option value="general">Geral</option>
                        </select>
                        <span style="font-size:11px;color:#475569" id="vortex-asset-count"></span>
                    </div>
                    <div id="vortex-asset-grid" class="vortex-asset-grid">
                        <span class="vortex-review-loading">Carregando...</span>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        modal._targetField = field;
        modal.style.display = 'flex';
        await loadAssets();
    }

    function closeAssetPicker() {
        const modal = document.getElementById('vortex-asset-picker');
        if (modal) modal.style.display = 'none';
    }

    async function loadAssets() {
        const grid = document.getElementById('vortex-asset-grid');
        const countEl = document.getElementById('vortex-asset-count');
        const catEl = document.getElementById('vortex-asset-cat');
        if (!grid) return;

        const cat = catEl?.value || '';
        grid.innerHTML = '<span class="vortex-review-loading">Carregando...</span>';

        try {
            const url = cat ? `/api/vortex/assets?category=${encodeURIComponent(cat)}` : '/api/vortex/assets';
            const resp = await fetch(url);
            const assets = resp.ok ? await resp.json() : [];
            if (countEl) countEl.textContent = `${assets.length} asset(s)`;

            if (!assets.length) {
                grid.innerHTML = '<p class="vortex-editorial-empty">Nenhum asset encontrado. Sincronize o Cloudinary primeiro.</p>';
                return;
            }

            grid.innerHTML = assets.map(a => `
                <div class="vortex-asset-card" onclick="vortexStudio.selectAsset('${escapeHtml(a.id)}','${escapeHtml(a.url)}')">
                    ${a.thumbnail_url || a.mime_type?.startsWith('image/')
                        ? `<img src="${escapeHtml(a.thumbnail_url || a.url)}" alt="${escapeHtml(a.alt_text || a.filename || '')}" loading="lazy">`
                        : `<div class="vortex-asset-card-icon">${a.mime_type?.startsWith('video/') ? '🎬' : '📄'}</div>`}
                    <div class="vortex-asset-card-meta">
                        <span>${escapeHtml(a.filename || a.id)}</span>
                        ${a.seo_role ? `<small>${escapeHtml(a.seo_role)}</small>` : ''}
                    </div>
                </div>`).join('');
        } catch (e) {
            grid.innerHTML = `<p class="vortex-editorial-empty">Erro: ${escapeHtml(e.message)}</p>`;
        }
    }

    function selectAsset(assetId, url) {
        const modal = document.getElementById('vortex-asset-picker');
        const field = modal?._targetField || 'hero';
        if (field === 'hero') {
            state.creationBrief.heroAssetId = assetId;
            state.creationBrief.heroAssetUrl = url;
        }
        closeAssetPicker();
        renderV6Briefing();
        addAuditLog('info', `Asset selecionado para ${field}: ${assetId}`);
    }

    function clearAsset(field) {
        if (field === 'hero') {
            state.creationBrief.heroAssetId = '';
            state.creationBrief.heroAssetUrl = '';
        }
        renderV6Briefing();
    }

    function renderV6TemplateShelf() {
        const shelf = document.getElementById('vortex-v6-template-shelf');
        if (!shelf) return;
        const brief = state.creationBrief;
        const templates = state.template.catalog || [];
        const cards = templates.slice(0, 11).map(t => `
            <button class="${brief.templateId === t.id ? 'active' : ''}" onclick="vortexStudio.selectVisualTemplate('${safeJsString(t.id)}')">
                <small>${escapeHtml(t.id)}</small>
                <strong>${escapeHtml(t.name || t.title || `Template ${t.id}`)}</strong>
                <span>${escapeHtml(t.type || 'Abidos')}</span>
            </button>
        `).join('');
        shelf.innerHTML = `
            <div class="vortex-v6-template-head">
                <strong>CriaÃ§Ã£o</strong>
                <div>
                    <button class="${brief.generationMode === 'structured' ? 'active' : ''}" onclick="vortexStudio.setGenerationMode('structured')">Estruturado</button>
                    <button class="${brief.generationMode === 'free' ? 'active' : ''}" onclick="vortexStudio.setGenerationMode('free')">Livre Premium</button>
                    <button class="${brief.generationMode === 'hybrid' ? 'active' : ''}" onclick="vortexStudio.setGenerationMode('hybrid')">HÃ­brido</button>
                </div>
            </div>
            <div class="vortex-v6-template-grid">
                ${cards}
                <button class="${!brief.templateId ? 'active' : ''}" onclick="vortexStudio.selectVisualTemplate('')">
                    <small>00</small>
                    <strong>Em branco</strong>
                    <span>Do zero</span>
                </button>
            </div>
        `;
    }

    function setCreationBriefField(field, value) {
        if (field.startsWith('contacts.')) {
            const key = field.split('.')[1];
            state.creationBrief.contacts[key] = value;
        } else {
            state.creationBrief[field] = value;
        }
        if (field === 'siloId') {
            const silo = getSiloById(value);
            state.creationBrief.hubName = silo?.hub || '';
        }
        if (field === 'menuId') updateMetadata('menu', value);
        persistVisualSession();
        renderV6TemplateShelf();
    }

    function setCreationMode(mode) {
        state.creationBrief.mode = mode === 'create' ? 'create' : 'edit';
        persistVisualSession();
        renderV6Briefing();
    }

    function setGenerationMode(mode) {
        state.creationBrief.generationMode = ['structured', 'free', 'hybrid'].includes(mode) ? mode : 'hybrid';
        setOperationMode(state.creationBrief.generationMode === 'free' ? 'canvas' : 'template');
        persistVisualSession();
        renderV6TemplateShelf();
    }

    function applyTierKeyword(keywordId) {
        const keyword = TIER_1_KEYWORDS.find(k => k.id === keywordId);
        state.creationBrief.keywordId = keywordId || '';
        if (keyword) {
            const silo = state.metadata.silos.find(s => (s.hub || s.name || '').toLowerCase() === keyword.hub.toLowerCase());
            state.creationBrief = {
                ...state.creationBrief,
                mode: 'create',
                generationMode: keyword.generationMode,
                objective: keyword.objective,
                themeKeyword: keyword.keyword,
                ideaContext: keyword.context,
                siloId: String(silo?.id || silo?.slug || keyword.hub),
                hubName: keyword.hub,
                spokeSlug: slugifyDraftName(keyword.spoke)
            };
            const input = document.getElementById('vortex-v6-input');
            if (input) input.value = `Criar ${keyword.spoke} com foco em "${keyword.keyword}".`;
        }
        persistVisualSession();
        renderV6Briefing();
        renderV6TemplateShelf();
    }

    function applyCustomKeyword() {
        const keyword = String(state.creationBrief.themeKeyword || '').trim();
        if (!keyword) return;
        state.creationBrief.keywordId = 'custom';
        state.creationBrief.mode = 'create';
        state.creationBrief.spokeSlug = slugifyDraftName(keyword);
        state.visual.targetPage = keyword;
        persistVisualSession();
        renderV6Briefing();
        renderV6Silos();
        addAuditLog('info', `Palavra-chave livre adicionada: ${keyword}`);
    }

    async function selectVisualTemplate(templateId) {
        state.creationBrief.templateId = templateId || '';
        if (templateId) {
            await selectTemplate(templateId);
            if (state.creationBrief.generationMode !== 'free') setOperationMode('template');
        } else {
            await selectTemplate('');
            setOperationMode('canvas');
        }
        persistVisualSession();
        renderV6TemplateShelf();
    }

    async function generateFromBrief() {
        const brief = state.creationBrief;
        const modeLabel = {
            structured: 'Estruturado Abidos',
            free: 'Livre Premium',
            hybrid: 'HÃ­brido'
        }[brief.generationMode] || 'HÃ­brido';
        const sectionsContext = brief.sectionsJson
            ? `\n[ESTRUTURA ABIDOS PRÉ-GERADA — SIGA RIGOROSAMENTE]\n${JSON.stringify(brief.sectionsJson, null, 2).slice(0, 3000)}`
            : '';
        const heroContext = brief.heroAssetUrl
            ? `\nImagem Hero: use "${brief.heroAssetUrl}" como background do hero (object-fit: cover).`
            : '';

        const prompt = [
            `Modo: ${modeLabel}`,
            `Objetivo: ${brief.objective}`,
            brief.themeKeyword ? `Tema/keyword: ${brief.themeKeyword}` : '',
            brief.hubName ? `Hub/Silo: ${brief.hubName}` : '',
            brief.spokeSlug ? `Spoke destino: ${brief.spokeSlug}` : '',
            brief.menuId ? `Menu: ${brief.menuId}` : '',
            `CTAs reais: WhatsApp ${brief.contacts.whatsapp}; Email ${brief.contacts.email}; Instagram ${brief.contacts.instagram}; Agendamento ${brief.contacts.bookingLink}`,
            brief.ideaContext ? `Contexto: ${brief.ideaContext}` : '',
            'Padrão visual: ultra premium, sóbrio, moderno, autoral, sem estética genérica, com ética clínica, E-E-A-T, H1 único e CTA claro.',
            sectionsContext,
            heroContext
        ].filter(Boolean).join('\n');

        const modelSelect = document.getElementById('vortex-model-select');
        if (modelSelect) modelSelect.value = brief.model;
        if (brief.menuId) updateMetadata('menu', brief.menuId);
        if (brief.siloId) updateMetadata('silo', `hub:${brief.siloId}`);

        if (brief.generationMode !== 'free' && brief.templateId) {
            if (state.template.selectedId !== brief.templateId) await selectTemplate(brief.templateId);
            setOperationMode('template');
            state.template.values = {
                ...state.template.values,
                tema: brief.themeKeyword,
                keyword_principal: brief.themeKeyword,
                contexto_extra: brief.ideaContext,
                whatsapp: brief.contacts.whatsapp,
                email: brief.contacts.email,
                instagram: brief.contacts.instagram,
                link_agendamento: brief.contacts.bookingLink
            };
            syncTemplateEditor();
            await sendTemplatePrompt(prompt, brief.model, buildAbidosContext());
        } else {
            setOperationMode('canvas');
            const input = document.getElementById('vortex-v6-input');
            if (input) input.value = prompt;
            await runVisualPrompt(prompt);
        }
        setVisualLayer('edit');
        addAuditLog('success', `Briefing criativo enviado em modo ${modeLabel}.`);
    }

    function startNewSpokeFromSilo(siloId) {
        const silo = getSiloById(siloId);
        state.visual.expandedSilos[siloId] = true;
        state.creationBrief = {
            ...state.creationBrief,
            mode: 'create',
            generationMode: 'hybrid',
            siloId,
            hubName: silo?.hub || silo?.name || '',
            spokeSlug: '',
            themeKeyword: '',
            ideaContext: ''
        };
        setVisualLayer('context');
        renderV6Silos();
        renderV6Briefing();
    }

    function startNewSiloFromPanel() {
        state.creationBrief = {
            ...state.creationBrief,
            mode: 'create',
            siloId: '',
            hubName: '',
            spokeSlug: '',
            themeKeyword: '',
            ideaContext: 'Criar novo silo com Hub principal e primeiro spoke editavel.'
        };
        setVisualLayer('context');
        renderV6Briefing();
        addAuditLog('info', 'Novo Silo preparado no briefing.');
    }

    function applyPerformanceUpgrade(label, delta) {
        const intent = `Aplicar upgrade de performance (+${delta}): ${label}`;
        const input = document.getElementById('vortex-v6-input');
        if (input) input.value = intent;
        runVisualPrompt(intent);
    }

    function applyVisualModeState() {
        const studio = document.getElementById('vortex-studio');
        if (!studio) return;
        renderV6Surface();
        studio.classList.toggle('vortex-visual-mode', state.visual.enabled);
        studio.classList.toggle('vortex-xray-open', state.visual.enabled && state.visual.xrayOpen);
        studio.setAttribute('data-vortex-layer', state.visual.layer);
        document.querySelectorAll('[data-vortex-layer]').forEach(btn => {
            const active = btn.dataset.vortexLayer === state.visual.layer;
            btn.classList.toggle('active', active);
            btn.classList.toggle('done', layerIndex(btn.dataset.vortexLayer) < layerIndex(state.visual.layer));
        });
        const toggle = document.getElementById('vortex-v6-toggle');
        if (toggle) {
            toggle.classList.toggle('active', state.visual.enabled);
            const label = toggle.querySelector('span');
            if (label) label.textContent = state.visual.enabled ? 'Visual V6' : 'Visual V6';
        }
        const ai = document.getElementById('vortex-v6-ai-mode');
        if (ai) ai.textContent = state.visual.aiMode === 'real' ? 'âœ¦ IA' : 'Mock';
        renderV6Briefing();
        renderV6TemplateShelf();
        renderV6Proposal();
        if (state.visual.enabled) {
            setTimeout(ensureVisualStarterPage, 120);
            setTimeout(() => {
                installV6PreviewFieldTools();
                renderV6Proposal();
            }, 520);
        }
    }

    function layerIndex(layer) {
        return { context: 1, edit: 2, performance: 3, publish: 4 }[layer] || 2;
    }

    function setVisualLayer(layer) {
        if (!['context', 'edit', 'performance', 'publish'].includes(layer)) return;
        state.visual.layer = layer;
        persistVisualSession();
        applyVisualModeState();
        if (layer === 'context') renderV6Silos();
        if (layer === 'performance') renderV6Performance(true);
        if (layer === 'publish') renderV6PublishCard();
        if (layer !== 'publish') {
            const card = document.getElementById('vortex-v6-publish-card');
            if (card) card.hidden = true;
            const backdrop = document.getElementById('vortex-v6-publish-backdrop');
            if (backdrop) backdrop.hidden = true;
        }
    }

    function toggleXrayMode(force) {
        state.visual.xrayOpen = typeof force === 'boolean' ? force : !state.visual.xrayOpen;
        applyVisualModeState();
        if (state.editor) setTimeout(() => state.editor.layout(), 260);
        addAuditLog('info', state.visual.xrayOpen ? 'Modo Raio-X aberto.' : 'Modo Raio-X fechado.');
    }

    function toggleVisualAIMode() {
        state.visual.aiMode = state.visual.aiMode === 'mock' ? 'real' : 'mock';
        applyVisualModeState();
        addAuditLog('info', state.visual.aiMode === 'real' ? 'Prompt visual usara IA real.' : 'Prompt visual voltou para mock.');
    }

    function ensureVisualStarterPage() {
        if (!state.visual.enabled) return;
        const fields = readVortexFields();
        if (fields.length) return;
        const starter = getVisualStarterHtml();
        updatePreview(starter);
        state.currentFile = state.currentFile || '/src/app/masking-e-exaustao.html';
        state.lastPreviewCode = starter;
        setTimeout(() => {
            installV6PreviewFieldTools();
            renderV6Proposal();
        }, 180);
    }

    function getVisualStarterHtml() {
        return `
<style>
  .vortex-v6-page { min-height: 100vh; background: #f8fafc; color: #111827; font-family: Inter, system-ui, sans-serif; }
  .vortex-v6-hero { min-height: 72vh; display: grid; align-content: center; gap: 22px; padding: clamp(40px, 8vw, 92px); background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 55%, #ecfeff 100%); }
  .vortex-v6-kicker { color: #6d28d9; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: .12em; }
  .vortex-v6-hero h1 { max-width: 920px; margin: 0; font-size: clamp(38px, 6vw, 74px); line-height: .96; letter-spacing: 0; color: #0f172a; }
  .vortex-v6-hero p { max-width: 680px; margin: 0; color: #475569; font-size: clamp(17px, 2vw, 22px); line-height: 1.55; }
  .vortex-v6-hero a { width: fit-content; display: inline-flex; padding: 14px 18px; border-radius: 8px; background: #111827; color: #fff; text-decoration: none; font-weight: 800; }
  .vortex-v6-copy { padding: 48px clamp(28px, 8vw, 92px); display: grid; gap: 10px; background: white; }
  .vortex-v6-copy h2 { margin: 0; font-size: 28px; color: #111827; }
  .vortex-v6-copy p { max-width: 760px; color: #475569; font-size: 18px; line-height: 1.65; }
  .vortex-v6-widget-section { padding: 52px clamp(28px, 8vw, 92px); background: #fff; border-top: 1px solid #e5e7eb; }
  .vortex-v6-widget-section h2 { margin: 0 0 12px; font-size: clamp(28px, 4vw, 44px); line-height: 1.05; color: #0f172a; }
  .vortex-v6-widget-section p { max-width: 760px; color: #475569; font-size: 18px; line-height: 1.65; }
  .vortex-v6-widget-section a { width: fit-content; display: inline-flex; margin-top: 12px; padding: 13px 17px; border-radius: 8px; background: #111827; color: #fff; text-decoration: none; font-weight: 800; }
  .vortex-v6-faq-item { padding: 18px 0; border-top: 1px solid #e5e7eb; }
  .vortex-v6-faq-item strong { display: block; color: #0f172a; margin-bottom: 6px; }
</style>
<main class="vortex-v6-page">
  <section data-vortex-section="hero" class="vortex-v6-hero">
    <div class="vortex-v6-kicker">Nucleo Clinico</div>
    <h1 data-vortex-field="headline">Masking e exaustao: quando parecer bem custa energia demais</h1>
    <p data-vortex-field="subtitle">Uma pagina acolhedora para adultos que suspeitam de TEA e procuram entender por que adaptar-se o tempo todo pode esgotar.</p>
    <a data-vortex-field="cta" href="#contato">Conversar com cuidado</a>
  </section>
  <section data-vortex-section="insight" class="vortex-v6-copy">
    <h2 data-vortex-field="title">O que esta pagina precisa fazer</h2>
    <p data-vortex-field="body">Validar a experiencia de quem mascara sinais, explicar o custo emocional e conduzir para um proximo passo clinico sem prometer resultado.</p>
  </section>
</main>`;
    }

    function getPreviewDocument() {
        const frame = document.getElementById('vortex-preview-frame');
        try {
            return frame?.contentDocument || frame?.contentWindow?.document || null;
        } catch (err) {
            return null;
        }
    }

    function readVortexFields() {
        const doc = getPreviewDocument();
        if (!doc) return [];
        return Array.from(doc.querySelectorAll('[data-vortex-section] [data-vortex-field]')).map(el => ({
            section: el.closest('[data-vortex-section]')?.dataset.vortexSection || '',
            field: el.dataset.vortexField || '',
            value: el.textContent.trim(),
            element: el
        })).filter(item => item.section && item.field);
    }

    function findVortexField(section, field) {
        return readVortexFields().find(item => item.section === section && item.field === field) || null;
    }

    function installV6PreviewFieldTools() {
        const doc = getPreviewDocument();
        if (!doc || !doc.head || !doc.body || doc.__vortexV6Installed) return;
        doc.__vortexV6Installed = true;
        const style = doc.createElement('style');
        style.textContent = `
            [data-vortex-section] { position: relative; }
            [data-vortex-section].vortex-v6-active-section { outline: 2px solid rgba(139,92,246,.72); outline-offset: 6px; }
            [data-vortex-section].vortex-v6-drop-target { outline: 2px dashed rgba(45,212,191,.95); outline-offset: 10px; }
            [data-vortex-field] { transition: opacity .22s ease, filter .22s ease, outline .22s ease; }
            [data-vortex-field]:hover { outline: 2px solid rgba(45,212,191,.75); outline-offset: 4px; cursor: text; }
            [data-vortex-field][contenteditable="true"] { outline: 2px solid rgba(45,212,191,.95); outline-offset: 5px; border-radius: 6px; }
            .vortex-v6-mini-toolbar { position: fixed; z-index: 2147483647; display:flex; gap:5px; background: rgba(5,8,16,.94); border:1px solid rgba(45,212,191,.5); border-radius: 9px; padding: 6px; box-shadow: 0 14px 40px rgba(0,0,0,.35); }
            .vortex-v6-mini-toolbar button { border:0; border-radius:6px; background: rgba(255,255,255,.08); color:#e5e7eb; font: 800 11px Inter, sans-serif; padding: 6px 8px; cursor:pointer; }
            .vortex-v6-mini-toolbar button[data-role="ai"] { background: rgba(139,92,246,.24); color:#ddd6fe; }
            .vortex-v6-mini-toolbar button[data-role="danger"] { background: rgba(239,68,68,.18); color:#fecaca; }
            .vortex-v6-mini-toolbar button[data-role="close"] { background: rgba(255,255,255,.14); color:#fff; }
            [data-vortex-field].vortex-v6-working { opacity: .5; filter: blur(1px); }
            [data-vortex-section].vortex-v6-section-working::after {
                content: '';
                position: absolute;
                inset: -10px;
                border-radius: 18px;
                background: rgba(139,92,246,.14);
                backdrop-filter: blur(2px);
                pointer-events: none;
                animation: vortexV6Pulse 1.2s ease-in-out infinite;
            }
            @keyframes vortexV6Pulse { 0%,100% { opacity: .45; } 50% { opacity: .9; } }
        `;
        doc.head.appendChild(style);
        doc.addEventListener('click', event => {
            const field = event.target?.closest?.('[data-vortex-field]');
            const section = event.target?.closest?.('[data-vortex-section]');
            if (!field || !section || !state.visual.enabled) return;
            state.visual.selectedSection = section.dataset.vortexSection;
            state.visual.selectedField = field.dataset.vortexField;
            activateManualFieldEdit(field, section);
            renderV6Proposal();
            addAuditLog('info', `Campo visual selecionado: ${state.visual.selectedSection}.${state.visual.selectedField}`);
        }, true);
        doc.addEventListener('keydown', event => {
            if (event.key === 'Escape') {
                event.preventDefault();
                clearManualFieldSelection();
            }
        }, true);
        doc.addEventListener('dragover', event => {
            const section = event.target?.closest?.('[data-vortex-section]');
            if (!section) return;
            event.preventDefault();
            section.classList.add('vortex-v6-drop-target');
        }, true);
        doc.addEventListener('dragleave', event => {
            event.target?.closest?.('[data-vortex-section]')?.classList.remove('vortex-v6-drop-target');
        }, true);
        doc.addEventListener('drop', event => {
            const widgetType = event.dataTransfer?.getData('application/x-vortex-widget') || event.dataTransfer?.getData('text/plain');
            if (!widgetType || !VORTEX_WIDGETS.some(widget => widget.type === widgetType)) return;
            event.preventDefault();
            const section = event.target?.closest?.('[data-vortex-section]');
            doc.querySelectorAll('.vortex-v6-drop-target').forEach(el => el.classList.remove('vortex-v6-drop-target'));
            window.parent.vortexStudio.addVortexWidget(widgetType, section?.dataset?.vortexSection || '');
        }, true);
    }

    function activateManualFieldEdit(field, section) {
        const doc = field.ownerDocument;
        const sectionName = section.dataset.vortexSection;
        const fieldName = field.dataset.vortexField;
        const key = `${sectionName}.${fieldName}`;
        doc.querySelectorAll('.vortex-v6-mini-toolbar').forEach(el => el.remove());
        doc.querySelectorAll('[data-vortex-field][contenteditable="true"]').forEach(el => {
            if (el !== field) el.removeAttribute('contenteditable');
        });

        const before = field.textContent.trim();
        field.setAttribute('contenteditable', 'true');
        field.focus();
        try {
            const range = doc.createRange();
            range.selectNodeContents(field);
            range.collapse(false);
            const selection = doc.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
        } catch (err) {}

        field.oninput = () => {
            state.visual.selectedSection = sectionName;
            state.visual.selectedField = fieldName;
            renderV6Proposal();
        };
        field.onblur = () => {
            const after = field.textContent.trim();
            if (after && after !== before) {
                createManualFieldSnapshot(sectionName, fieldName, before, after);
            }
        };

        const rect = field.getBoundingClientRect();
        const toolbar = doc.createElement('div');
        toolbar.className = 'vortex-v6-mini-toolbar';
        toolbar.style.left = `${Math.max(8, rect.left)}px`;
        toolbar.style.top = `${Math.max(8, rect.top - 46)}px`;
        toolbar.innerHTML = `
            <button onclick="window.parent.vortexStudio.manualFieldCommand('bold')">B</button>
            <button onclick="window.parent.vortexStudio.manualFieldCommand('h1')">H1</button>
            <button onclick="window.parent.vortexStudio.manualFieldCommand('h2')">H2</button>
            <button onclick="window.parent.vortexStudio.manualFieldCommand('copy')">Copiar</button>
            <button onclick="window.parent.vortexStudio.undoVisualEdit()">Desfazer</button>
            <button onclick="window.parent.vortexStudio.focusVisualPromptForField()">âœ¦ IA</button>
        `;
        toolbar.innerHTML = [
            `<button data-role="close" onclick="window.parent.vortexStudio.clearManualFieldSelection()">X</button>`,
            `<button onclick="window.parent.vortexStudio.manualFieldCommand('bold')">B</button>`,
            `<button onclick="window.parent.vortexStudio.manualFieldCommand('h1')">H1</button>`,
            `<button onclick="window.parent.vortexStudio.manualFieldCommand('h2')">H2</button>`,
            `<button onclick="window.parent.vortexStudio.manualFieldCommand('link')">Link</button>`,
            `<button onclick="window.parent.vortexStudio.manualFieldCommand('color')">Cor</button>`,
            `<button onclick="window.parent.vortexStudio.manualFieldCommand('duplicate')">Duplicar</button>`,
            `<button data-role="danger" onclick="window.parent.vortexStudio.manualFieldCommand('delete')">Apagar</button>`,
            `<button onclick="window.parent.vortexStudio.undoVisualEdit()">Desfazer</button>`,
            `<button data-role="ai" onclick="window.parent.vortexStudio.focusVisualPromptForField()">IA</button>`
        ].join('');
        doc.body.appendChild(toolbar);
    }

    function clearManualFieldSelection() {
        const doc = getPreviewDocument();
        if (!doc) return;
        doc.querySelectorAll('.vortex-v6-mini-toolbar').forEach(el => el.remove());
        doc.querySelectorAll('[data-vortex-field][contenteditable="true"]').forEach(el => el.removeAttribute('contenteditable'));
        doc.querySelectorAll('.vortex-v6-active-section').forEach(el => el.classList.remove('vortex-v6-active-section'));
        addAuditLog('info', 'Selecao visual cancelada.');
    }

    function createManualFieldSnapshot(section, field, previousValue, nextValue) {
        const snapshot = {
            id: Date.now(),
            section,
            field,
            previousValue,
            nextValue,
            intent: 'edicao manual direta',
            timestamp: new Date().toISOString()
        };
        state.visual.snapshots = [...state.visual.snapshots, snapshot].slice(-20);
        const key = `${section}.${field}`;
        state.visual.manualFieldHistory[key] = [
            { value: nextValue, timestamp: snapshot.timestamp },
            ...(state.visual.manualFieldHistory[key] || [])
        ].slice(0, 8);
        state.visual.history = [
            {
                id: snapshot.id,
                title: `Edicao manual - ${key}`,
                section,
                field,
                value: nextValue,
                timestamp: snapshot.timestamp
            },
            ...state.visual.history
        ].slice(0, 20);
        state.lastPreviewCode = getPreviewDocument()?.documentElement?.outerHTML || state.lastPreviewCode;
        persistVisualSession();
        renderSnapshotTimeline();
        renderV6Proposal();
    }

    function manualFieldCommand(command) {
        const target = findVortexField(state.visual.selectedSection, state.visual.selectedField);
        if (!target?.element) return;
        const doc = target.element.ownerDocument;
        if (command === 'bold') {
            doc.execCommand('bold', false, null);
            return;
        }
        if (command === 'copy') {
            navigator.clipboard?.writeText(target.element.textContent.trim());
            return;
        }
        if (command === 'link') {
            const url = prompt('URL do link', '#contato');
            if (url) doc.execCommand('createLink', false, url);
            return;
        }
        if (command === 'color') {
            const color = prompt('Cor em HEX', '#6d28d9');
            if (color) target.element.style.color = color;
            return;
        }
        if (command === 'duplicate') {
            duplicateVortexSection(state.visual.selectedSection);
            return;
        }
        if (command === 'delete') {
            removeVortexSection(state.visual.selectedSection);
            return;
        }
        if (command === 'h1' || command === 'h2') {
            const replacement = doc.createElement(command);
            Array.from(target.element.attributes).forEach(attr => replacement.setAttribute(attr.name, attr.value));
            replacement.innerHTML = target.element.innerHTML;
            target.element.replaceWith(replacement);
            activateManualFieldEdit(replacement, replacement.closest('[data-vortex-section]'));
        }
    }

    function focusVisualPromptForField() {
        const input = document.getElementById('vortex-v6-input');
        const selected = `${state.visual.selectedSection}.${state.visual.selectedField}`;
        if (input) {
            input.value = `Melhore o campo ${selected}: `;
            input.focus();
        }
    }

    function setManualFieldMode(mode) {
        state.visual.manualMode = mode === 'ai' ? 'ai' : 'direct';
        if (state.visual.manualMode === 'ai') focusVisualPromptForField();
        renderV6Proposal();
    }

    function formatManualField(mode) {
        const target = findVortexField(state.visual.selectedSection, state.visual.selectedField);
        if (!target?.element) return;
        const before = target.element.textContent.trim();
        let after = before;
        if (mode === 'upper') after = before.toUpperCase();
        if (mode === 'lower') after = before.toLowerCase();
        if (mode === 'title') {
            after = before.toLowerCase().replace(/\b\p{L}/gu, char => char.toUpperCase());
        }
        if (after !== before) {
            target.element.textContent = after;
            createManualFieldSnapshot(state.visual.selectedSection, state.visual.selectedField, before, after);
        }
    }

    function nextWidgetSectionName(type) {
        state.visual.widgetCounter = (state.visual.widgetCounter || 0) + 1;
        return `${type}_${Date.now()}_${state.visual.widgetCounter}`;
    }

    function createVortexWidgetHtml(type) {
        const section = nextWidgetSectionName(type);
        const label = VORTEX_WIDGETS.find(widget => widget.type === type)?.label || 'Widget';
        if (type === 'headline') {
            return `<section data-vortex-section="${section}" class="vortex-v6-widget-section"><h2 data-vortex-field="title">Novo titulo estrategico</h2></section>`;
        }
        if (type === 'text') {
            return `<section data-vortex-section="${section}" class="vortex-v6-widget-section"><p data-vortex-field="body">Escreva aqui o texto da nova secao. Clique para editar manualmente ou use a IA contextual.</p></section>`;
        }
        if (type === 'cta') {
            return `<section data-vortex-section="${section}" class="vortex-v6-widget-section"><h2 data-vortex-field="title">Pronto para o proximo passo?</h2><p data-vortex-field="body">Convide a pessoa para uma acao simples, clara e segura.</p><a data-vortex-field="cta" href="#contato">Agendar conversa</a></section>`;
        }
        if (type === 'hero') {
            return `<section data-vortex-section="${section}" class="vortex-v6-hero"><div class="vortex-v6-kicker" data-vortex-field="kicker">Nova pagina</div><h1 data-vortex-field="headline">Uma promessa clara para a pagina</h1><p data-vortex-field="subtitle">Explique o valor principal em linguagem humana e direta.</p><a data-vortex-field="cta" href="#contato">Comecar agora</a></section>`;
        }
        if (type === 'faq') {
            return `<section data-vortex-section="${section}" class="vortex-v6-widget-section"><h2 data-vortex-field="title">Perguntas frequentes</h2><div class="vortex-v6-faq-item"><strong data-vortex-field="question">Essa abordagem e indicada para mim?</strong><p data-vortex-field="answer">A resposta deve orientar com clareza, sem prometer resultado.</p></div></section>`;
        }
        if (type === 'testimonial') {
            return `<section data-vortex-section="${section}" class="vortex-v6-widget-section"><h2 data-vortex-field="title">Relato de experiencia</h2><p data-vortex-field="body">Use este bloco para prova social etica, contextual e sem expor dados sensiveis.</p></section>`;
        }
        return `<section data-vortex-section="${section}" class="vortex-v6-widget-section"><h2 data-vortex-field="title">${escapeHtml(label)}</h2><p data-vortex-field="body">Novo bloco editavel.</p></section>`;
    }

    function findVortexSectionElement(sectionName) {
        const doc = getPreviewDocument();
        if (!doc || !sectionName) return null;
        return Array.from(doc.querySelectorAll('[data-vortex-section]'))
            .find(section => section.dataset.vortexSection === sectionName) || null;
    }

    function addVortexWidget(type, afterSection = '') {
        const doc = getPreviewDocument();
        if (!doc || !VORTEX_WIDGETS.some(widget => widget.type === type)) return;
        const html = createVortexWidgetHtml(type);
        const anchor = afterSection ? findVortexSectionElement(afterSection) : null;
        if (anchor) {
            anchor.insertAdjacentHTML('afterend', html);
        } else {
            const main = doc.querySelector('main') || doc.body;
            main.insertAdjacentHTML('beforeend', html);
        }
        installV6PreviewFieldTools();
        state.lastPreviewCode = doc.documentElement?.outerHTML || state.lastPreviewCode;
        state.visual.lastIntent = `Adicionar widget ${type}`;
        persistVisualSession();
        renderV6Proposal();
        addAuditLog('success', `Widget adicionado: ${type}.`);
    }

    function duplicateVortexSection(sectionName) {
        const doc = getPreviewDocument();
        const section = findVortexSectionElement(sectionName);
        if (!section) return;
        const clone = section.cloneNode(true);
        clone.dataset.vortexSection = nextWidgetSectionName(sectionName.replace(/_\d+_\d+$/, '') || 'section');
        clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
        section.insertAdjacentElement('afterend', clone);
        state.lastPreviewCode = doc.documentElement?.outerHTML || state.lastPreviewCode;
        persistVisualSession();
        renderV6Proposal();
        addAuditLog('success', 'Secao duplicada.');
    }

    function removeVortexSection(sectionName) {
        const doc = getPreviewDocument();
        const section = findVortexSectionElement(sectionName);
        if (!section) return;
        section.remove();
        clearManualFieldSelection();
        state.lastPreviewCode = doc.documentElement?.outerHTML || state.lastPreviewCode;
        persistVisualSession();
        renderV6Proposal();
        addAuditLog('warn', 'Secao removida do preview.');
    }

    function createVisualSnapshot(section, field, nextValue, intent) {
        const target = findVortexField(section, field);
        if (!target) return null;
        const snapshot = {
            id: Date.now(),
            section,
            field,
            previousValue: target.value,
            nextValue,
            intent: intent || 'ajuste visual',
            timestamp: new Date().toISOString()
        };
        state.visual.snapshots = [...state.visual.snapshots, snapshot].slice(-20);
        persistVisualSession();
        return snapshot;
    }

    function restoreVisualSnapshot(id) {
        const snapshot = state.visual.snapshots.find(item => String(item.id) === String(id)) || state.visual.snapshots[state.visual.snapshots.length - 1];
        if (!snapshot) return;
        applyTargetedFieldEdit(snapshot.section, snapshot.field, snapshot.previousValue, `Restaurar: ${snapshot.intent}`, { skipSnapshot: true });
    }

    async function applyTargetedFieldEdit(section, field, value, intent, options = {}) {
        const target = findVortexField(section, field);
        if (!target || !target.element) {
            addAuditLog('warn', `Campo visual nao encontrado: ${section}.${field}`);
            return false;
        }
        if (!options.skipSnapshot) createVisualSnapshot(section, field, value, intent);

        const sectionEl = target.element.closest('[data-vortex-section]');
        sectionEl?.classList.add('vortex-v6-section-working');
        target.element.classList.add('vortex-v6-working');
        await new Promise(resolve => setTimeout(resolve, options.instant ? 0 : 160));
        target.element.textContent = value;
        target.element.classList.remove('vortex-v6-working');
        sectionEl?.classList.remove('vortex-v6-section-working');

        state.visual.lastIntent = intent || '';
        state.visual.history = [
            {
                id: Date.now(),
                title: buildHumanVersionName(intent, section, field),
                section,
                field,
                value,
                timestamp: new Date().toISOString()
            },
            ...state.visual.history
        ].slice(0, 20);
        state.lastPreviewCode = getPreviewDocument()?.documentElement?.outerHTML || state.lastPreviewCode;
        persistVisualSession();
        renderSnapshotTimeline();
        renderV6Proposal();
        return true;
    }

    function buildHumanVersionName(intent, section, field) {
        const cleanIntent = String(intent || 'Ajuste visual').replace(/\s+/g, ' ').trim();
        return `${cleanIntent.slice(0, 54)} - ${section}.${field}`;
    }

    function getMockVisualSuggestion(intent) {
        const lower = String(intent || '').toLowerCase();
        if (lower.includes('cta')) {
            return { section: 'hero', field: 'cta', value: 'Agendar uma conversa acolhedora', explanation: 'CTA ficou mais humano e claro.' };
        }
        if (lower.includes('simpl')) {
            return { section: 'hero', field: 'subtitle', value: 'Entenda o custo de se adaptar o tempo todo e encontre um caminho clinico mais leve.', explanation: 'Subtitulo ficou mais direto.' };
        }
        if (lower.includes('mobile')) {
            return { section: 'hero', field: 'subtitle', value: 'Um guia claro sobre masking, exaustao e proximos passos em avaliacao clinica.', explanation: 'Texto ficou mais compacto para telas menores.' };
        }
        return {
            section: 'hero',
            field: 'headline',
            value: 'Masking e exaustao: o peso invisivel de parecer bem o tempo todo',
            explanation: 'Headline reforca reconhecimento e acolhimento sem dramatizar.'
        };
    }

    async function getRealVisualSuggestion(intent) {
        const fields = readVortexFields().map(({ section, field, value }) => ({ section, field, value }));
        const model = document.getElementById('vortex-model-select')?.value || 'gemini-2.5-flash';
        const response = await fetch('/api/vortex/visual-intent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${VORTEX_API_KEY}`
            },
            body: JSON.stringify({
                prompt: intent,
                model,
                target: { section: state.visual.selectedSection, field: state.visual.selectedField },
                page: state.visual.targetPage,
                fields,
                context: buildAbidosContext()
            })
        });
        const data = await response.json();
        if (!response.ok || data.error) throw new Error(data.error || `Visual intent ${response.status}`);
        return {
            section: data.section || state.visual.selectedSection,
            field: data.field || state.visual.selectedField,
            value: data.value,
            explanation: data.explanation || 'Proposta gerada pela IA.'
        };
    }

    async function runVisualPrompt(intentOverride) {
        if (!state.visual.enabled) return sendPrompt(typeof intentOverride === 'string' ? intentOverride : undefined);
        const input = document.getElementById('vortex-v6-input');
        const sendBtn = document.getElementById('vortex-v6-send');
        const progress = document.getElementById('vortex-v6-progress');
        const intent = String(intentOverride || input?.value || '').trim() || 'Melhore o Hero';
        if (input) {
            input.value = '';
            input.style.height = 'auto';
        }
        if (sendBtn) sendBtn.classList.add('working');
        if (progress) progress.classList.add('active');
        setGenerating(true);

        try {
            const suggestion = state.visual.aiMode === 'real'
                ? await getRealVisualSuggestion(intent)
                : await new Promise(resolve => setTimeout(() => resolve(getMockVisualSuggestion(intent)), 900));
            state.visual.pendingProposal = { ...suggestion, intent };
            await applyTargetedFieldEdit(suggestion.section, suggestion.field, suggestion.value, intent);
            renderV6Proposal();
            addAuditLog('success', suggestion.explanation || 'Proposta visual aplicada.');
        } catch (err) {
            addAuditLog('error', `Prompt visual falhou: ${err.message}`);
        } finally {
            if (sendBtn) sendBtn.classList.remove('working');
            if (progress) progress.classList.remove('active');
            setGenerating(false);
        }
    }

    function renderV6Widgets() {
        const panel = document.getElementById('vortex-v6-widgets');
        if (!panel) return;
        const selectedSection = state.visual.selectedSection || '';
        panel.innerHTML = `
            <div class="vortex-v6-widgets-head">
                <strong>Widgets</strong>
                <span>Arraste para o preview</span>
            </div>
            <div class="vortex-v6-widget-grid">
                ${VORTEX_WIDGETS.map(widget => `
                    <button draggable="true"
                        ondragstart="vortexStudio.startWidgetDrag(event, '${safeJsString(widget.type)}')"
                        onclick="vortexStudio.addVortexWidget('${safeJsString(widget.type)}', '${safeJsString(selectedSection)}')">
                        <strong>${escapeHtml(widget.label)}</strong>
                        <span>${escapeHtml(widget.hint)}</span>
                    </button>
                `).join('')}
            </div>
        `;
    }

    function startWidgetDrag(event, type) {
        event.dataTransfer?.setData('application/x-vortex-widget', type);
        event.dataTransfer?.setData('text/plain', type);
        if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy';
    }

    function renderV6Proposal() {
        const panel = document.getElementById('vortex-v6-proposal');
        if (!panel) return;
        const selected = `${state.visual.selectedSection}.${state.visual.selectedField}`;
        const proposal = state.visual.pendingProposal;
        const snapshots = state.visual.snapshots.slice(-5).reverse();
        const target = findVortexField(state.visual.selectedSection, state.visual.selectedField);
        const fieldText = target?.value || '';
        const fieldHistory = state.visual.manualFieldHistory[selected] || [];
        const visibleFieldHistory = fieldHistory.slice(-2).reverse();
        const hiddenFieldHistoryCount = Math.max(0, fieldHistory.length - visibleFieldHistory.length);
        const visibleVersions = state.visual.history.slice(0, 2);
        const hiddenVersionsCount = Math.max(0, state.visual.history.length - visibleVersions.length);
        const charState = fieldText.length >= 50 && fieldText.length <= 70 ? 'ideal' : 'attention';
        renderV6Widgets();
        panel.innerHTML = `
            <div class="vortex-v6-proposal-head">
                <strong>${proposal ? 'AlteraÃ§Ãµes propostas' : 'Campo selecionado'}</strong>
                <span>${escapeHtml(selected)}</span>
            </div>
            ${proposal ? `<p>${escapeHtml(proposal.explanation || 'ConteÃºdo atualizado no preview.')}</p>` : '<p>Clique e digite direto no preview. Ou use IA pelo prompt.</p>'}
            <div class="vortex-v6-field-panel">
                <div class="vortex-v6-char-count ${charState}"><strong>${fieldText.length}</strong><span> caracteres</span></div>
                <div class="vortex-v6-field-toggle">
                    <button class="${state.visual.manualMode === 'direct' ? 'active' : ''}" onclick="vortexStudio.setManualFieldMode('direct')">Direto</button>
                    <button class="${state.visual.manualMode === 'ai' ? 'active' : ''}" onclick="vortexStudio.setManualFieldMode('ai')">âœ¦ IA</button>
                </div>
                <div class="vortex-v6-field-actions">
                    <button onclick="vortexStudio.formatManualField('title')">TÃ­tulo</button>
                    <button onclick="vortexStudio.formatManualField('upper')">MAIÃšS</button>
                    <button onclick="vortexStudio.formatManualField('lower')">minÃºs</button>
                </div>
                <div class="vortex-v6-field-local-history">
                    ${visibleFieldHistory.map(item => `<button onclick="vortexStudio.applyTargetedFieldEdit('${safeJsString(state.visual.selectedSection)}', '${safeJsString(state.visual.selectedField)}', '${safeJsString(item.value)}', 'restaurar edicao manual')">${new Date(item.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} Â· ${escapeHtml(String(item.value).slice(0, 34))}</button>`).join('') || '<small>Sem histÃ³rico manual neste campo.</small>'}
                    ${hiddenFieldHistoryCount ? `<small>Ver mais (${hiddenFieldHistoryCount})</small>` : ''}
                </div>
            </div>
            <div class="vortex-v6-proposal-actions">
                <button onclick="vortexStudio.acceptVisualProposal()">Aplicar</button>
                <button onclick="vortexStudio.undoVisualEdit()">Desfazer</button>
                <button onclick="vortexStudio.toggleVisualCompare()">Comparar</button>
            </div>
            <div class="vortex-v6-history">
                ${snapshots.map(s => `<button onclick="vortexStudio.restoreVisualSnapshot(${s.id})">${new Date(s.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} ${escapeHtml(`${s.section}.${s.field}`)}</button>`).join('') || '<small>Sem snapshots nesta sessÃ£o.</small>'}
            </div>
            <div class="vortex-v6-versions">
                <strong>HistÃ³rico</strong>
                ${visibleVersions.map(v => `
                    <div>
                        <span>${escapeHtml(v.title)}</span>
                        <button onclick="vortexStudio.restoreVisualVersion(${v.id})">Restaurar</button>
                        <button onclick="vortexStudio.compareVisualVersion(${v.id})">Comparar</button>
                        <button onclick="vortexStudio.duplicateVisualVersion(${v.id})">Duplicar</button>
                    </div>
                `).join('') || '<small>Nenhuma versÃ£o visual ainda.</small>'}
                ${hiddenVersionsCount ? `<small>Ver mais (${hiddenVersionsCount})</small>` : ''}
            </div>
        `;
        return;
        panel.innerHTML = `
            <div class="vortex-v6-proposal-head">
                <strong>${proposal ? 'Alteracoes propostas' : 'Campo selecionado'}</strong>
                <span>${selected}</span>
            </div>
            ${proposal ? `<p>${proposal.explanation || 'Conteudo atualizado no preview.'}</p>` : '<p>Clique e digite direto no preview. Ou use IA pelo prompt.</p>'}
            <div class="vortex-v6-field-panel">
                <div><strong>${fieldText.length}</strong><span> caracteres</span></div>
                <div class="vortex-v6-field-toggle">
                    <button class="${state.visual.manualMode === 'direct' ? 'active' : ''}" onclick="vortexStudio.setManualFieldMode('direct')">Direto</button>
                    <button class="${state.visual.manualMode === 'ai' ? 'active' : ''}" onclick="vortexStudio.setManualFieldMode('ai')">IA</button>
                </div>
                <div class="vortex-v6-field-actions">
                    <button onclick="vortexStudio.formatManualField('title')">TÃ­tulo</button>
                    <button onclick="vortexStudio.formatManualField('upper')">MAIÃšS</button>
                    <button onclick="vortexStudio.formatManualField('lower')">minÃºs</button>
                </div>
                <div class="vortex-v6-field-local-history">
                    ${fieldHistory.map(item => `<button onclick="vortexStudio.applyTargetedFieldEdit('${state.visual.selectedSection}', '${state.visual.selectedField}', '${String(item.value).replace(/'/g, "\\'")}', 'restaurar edicao manual')">${new Date(item.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} Â· ${String(item.value).slice(0, 34)}</button>`).join('') || '<small>Sem histÃ³rico manual neste campo.</small>'}
                </div>
            </div>
            <div class="vortex-v6-proposal-actions">
                <button onclick="vortexStudio.acceptVisualProposal()">Aplicar</button>
                <button onclick="vortexStudio.undoVisualEdit()">Desfazer</button>
                <button onclick="vortexStudio.toggleVisualCompare()">Comparar</button>
            </div>
            <div class="vortex-v6-history">
                ${snapshots.map(s => `<button onclick="vortexStudio.restoreVisualSnapshot(${s.id})">${new Date(s.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} ${s.section}.${s.field}</button>`).join('') || '<small>Sem snapshots nesta sessao.</small>'}
            </div>
            <div class="vortex-v6-versions">
                <strong>Historico</strong>
                ${state.visual.history.slice(0, 5).map(v => `
                    <div>
                        <span>${v.title}</span>
                        <button onclick="vortexStudio.restoreVisualVersion(${v.id})">Restaurar</button>
                        <button onclick="vortexStudio.compareVisualVersion(${v.id})">Comparar</button>
                        <button onclick="vortexStudio.duplicateVisualVersion(${v.id})">Duplicar</button>
                    </div>
                `).join('') || '<small>Nenhuma versao visual ainda.</small>'}
            </div>
        `;
    }

    function acceptVisualProposal() {
        if (!state.visual.pendingProposal) return;
        state.visual.pendingProposal = null;
        renderV6Proposal();
        addAuditLog('success', 'Proposta visual mantida no preview.');
    }

    function undoVisualEdit() {
        restoreVisualSnapshot();
    }

    function toggleVisualCompare() {
        const last = state.visual.snapshots[state.visual.snapshots.length - 1];
        if (!last) return;
        state.visual.compareMode = !state.visual.compareMode;
        const target = findVortexField(last.section, last.field);
        if (!target) return;
        target.element.textContent = state.visual.compareMode ? last.previousValue : last.nextValue;
        renderV6Proposal();
    }

    function getVisualVersion(id) {
        return state.visual.history.find(item => String(item.id) === String(id)) || null;
    }

    function restoreVisualVersion(id) {
        const version = getVisualVersion(id);
        if (!version || !version.section || !version.field) return;
        applyTargetedFieldEdit(version.section, version.field, version.value, `Restaurar ${version.title}`, { skipSnapshot: false });
    }

    function compareVisualVersion(id) {
        const version = getVisualVersion(id);
        if (!version) return;
        const target = findVortexField(version.section, version.field);
        if (!target) return;
        const current = target.value;
        target.element.textContent = current === version.value
            ? (state.visual.snapshots.find(s => s.section === version.section && s.field === version.field)?.previousValue || version.value)
            : version.value;
    }

    function duplicateVisualVersion(id) {
        const version = getVisualVersion(id);
        if (!version) return;
        state.visual.history = [
            { ...version, id: Date.now(), title: `Copia - ${version.title}`, timestamp: new Date().toISOString() },
            ...state.visual.history
        ].slice(0, 20);
        persistVisualSession();
        renderV6Proposal();
        addAuditLog('info', `Versao duplicada: ${version.title}`);
    }

    function renderV6Performance(animate = false) {
        const metricsEl = document.getElementById('vortex-v6-metrics');
        const upgradesEl = document.getElementById('vortex-v6-upgrades');
        const scoreEl = document.getElementById('vortex-v6-score-value');
        const score = state.visual.score || {
            total: 81,
            metrics: [
                { label: 'Conversao', value: 78 },
                { label: 'Clareza', value: 86 },
                { label: 'SEO', value: 74 },
                { label: 'Etica Clinica', value: 91 }
            ],
            upgrades: [
                { label: 'Adicionar meta description', delta: 8 },
                { label: 'Aumentar contraste do CTA', delta: 5 },
                { label: 'Simplificar paragrafo 2', delta: 4 }
            ]
        };
        state.visual.score = score;
        persistVisualSession();
        if (scoreEl) {
            if (animate) animateScore(scoreEl, score.total);
            else scoreEl.textContent = score.total;
        }
        if (metricsEl) {
            metricsEl.innerHTML = score.metrics.map(m => `
                <div class="vortex-v6-metric">
                    <span>${m.label}</span>
                    <strong>${m.value}</strong>
                    <i style="--w:${m.value}%"></i>
                </div>
            `).join('');
        }
        if (upgradesEl) {
            upgradesEl.innerHTML = score.upgrades.map(u => `
                <div class="vortex-v6-upgrade-row">
                    <div><span>${escapeHtml(u.label)}</span><strong>+${u.delta}</strong></div>
                    <button onclick="vortexStudio.applyPerformanceUpgrade('${safeJsString(u.label)}', ${Number(u.delta) || 0})">âœ¦ Aplicar</button>
                </div>
            `).join('');
        }
    }

    function animateScore(el, finalValue) {
        const start = performance.now();
        const duration = 600;
        const tick = now => {
            const progress = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.round(finalValue * eased);
            if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }

    function renderV6PublishCard() {
        renderV6Performance();
        const card = document.getElementById('vortex-v6-publish-card');
        const backdrop = document.getElementById('vortex-v6-publish-backdrop');
        const score = document.getElementById('vortex-v6-publish-score-value');
        const summary = document.getElementById('vortex-v6-publish-summary');
        const version = document.getElementById('vortex-v6-version-label');
        if (!card) return;
        if (backdrop) backdrop.hidden = false;
        card.hidden = false;
        if (score) score.textContent = state.visual.score?.total || 81;
        if (summary) summary.textContent = state.visual.lastIntent
            ? `VocÃª aplicou "${state.visual.lastIntent}" e preservou o histÃ³rico de sessÃ£o.`
            : 'VocÃª revisou a pÃ¡gina, manteve snapshots e preparou uma versÃ£o publicÃ¡vel.';
        if (version) version.textContent = `Esta versÃ£o serÃ¡ salva como v${state.visual.history.length + 1} - Melhoria do Hero`;
    }

    async function publishVisualVersion() {
        const card = document.getElementById('vortex-v6-publish-card');
        const actionsEl = card?.querySelector('.vortex-v6-publish-actions');
        const summaryEl = document.getElementById('vortex-v6-publish-summary');
        const scoreEl = document.getElementById('vortex-v6-publish-score-value');

        if (summaryEl) summaryEl.textContent = 'Verificando conformidade Abidos...';
        if (actionsEl) actionsEl.innerHTML = '<span class="vortex-review-loading">Analisando...</span>';

        const doc = getPreviewDocument();
        const html = doc?.documentElement?.outerHTML || state.lastPreviewCode || '';
        const seoJson = state.creationBrief.seoJson || null;

        let reviewResult = { status: 'approved', score: 100, issues: [] };
        try {
            const resp = await fetch('/api/vortex/abidos-review', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ html_code: html, seo_json: seoJson })
            });
            if (resp.ok) reviewResult = await resp.json();
        } catch (e) {
            addAuditLog('warn', 'Review Gate inacessível, prosseguindo com aviso.');
            reviewResult = { status: 'warning', score: 70, issues: [{ severity: 'warning', code: 'GATE_OFFLINE', message: 'Review Gate offline — publicação sob responsabilidade do editor.' }] };
        }

        if (scoreEl) scoreEl.textContent = reviewResult.score ?? 100;
        if (summaryEl) {
            const label = { approved: '✅ Conteúdo aprovado pelo Abidos Gate.', warning: '⚠️ Conteúdo com alertas. Verifique antes de publicar.', blocked: '🚫 Publicação bloqueada. Corrija os erros abaixo.' }[reviewResult.status];
            summaryEl.textContent = label;
        }

        const issuesList = (reviewResult.issues || []).map(i =>
            `<li class="vortex-review-issue vortex-review-issue--${i.severity}">${escapeHtml(i.message)}</li>`
        ).join('');

        let issuesHtml = issuesList ? `<ul class="vortex-review-issues">${issuesList}</ul>` : '';

        if (reviewResult.status === 'blocked') {
            if (actionsEl) actionsEl.innerHTML = `${issuesHtml}<button onclick="vortexStudio.setVisualLayer('edit')" class="vortex-btn vortex-btn-secondary">Voltar e Corrigir</button>`;
            addAuditLog('error', 'Publicação bloqueada pelo Abidos Review Gate.');
            return;
        }

        if (actionsEl) {
            const confirmLabel = reviewResult.status === 'warning' ? 'Publicar mesmo assim' : 'Confirmar Publicação';
            actionsEl.innerHTML = `${issuesHtml}
                <button onclick="vortexStudio._doPublishVisualVersion()">${confirmLabel}</button>
                <button onclick="vortexStudio.setVisualLayer('edit')">Voltar e Refinar</button>`;
        }
    }

    async function _doPublishVisualVersion() {
        const doc = getPreviewDocument();
        const html = doc?.documentElement?.outerHTML || state.lastPreviewCode || getVisualStarterHtml();
        state.currentFile = state.currentFile || '/src/app/masking-e-exaustao.html';
        if (state.db) {
            await vfsWrite(state.currentFile, html);
        }

        // Salvar no Postgres V7 se disponível
        try {
            const draftPayload = {
                id: state.draft.id || undefined,
                slug: state.metadata.spokeSlug || state.metadata.hubId || null,
                title: state.visual.targetPage || state.draft.name || 'Rascunho sem título',
                briefing_json: state.creationBrief || {},
                sections_json: state.creationBrief.sectionsJson || null,
                seo_json: state.creationBrief.seoJson || {},
                generation_context_snapshot_json: {
                    model: state.creationBrief.model || 'gemini-2.5-flash',
                    generation_mode: state.creationBrief.generationMode,
                    keyword: state.creationBrief.themeKeyword,
                    hero_asset_id: state.creationBrief.heroAssetId || null,
                    saved_at: new Date().toISOString(),
                    schema_version: '1.0'
                }
            };
            const saveResp = await fetch('/api/vortex/save-draft', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(draftPayload)
            });
            if (saveResp.ok) {
                const saved = await saveResp.json();
                if (saved.draft?.id) {
                    state.draft.id = saved.draft.id;
                    await fetch('/api/vortex/publish', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ draft_id: saved.draft.id, author_id: 'vortex-studio' })
                    });
                }
            }
        } catch (e) {
            addAuditLog('warn', 'Publicação Postgres falhou, salvo apenas no VFS local.');
        }

        state.visual.history = [
            {
                id: Date.now(),
                title: `Publicacao visual v${state.visual.history.length + 1} - ${state.visual.targetPage}`,
                section: state.visual.selectedSection,
                field: state.visual.selectedField,
                value: 'publicado',
                timestamp: new Date().toISOString()
            },
            ...state.visual.history
        ].slice(0, 20);
        persistVisualSession();

        const success = document.getElementById('vortex-v6-success');
        if (success) {
            success.hidden = false;
            setTimeout(() => { success.hidden = true; }, 1600);
        }
        const card = document.getElementById('vortex-v6-publish-card');
        if (card) card.hidden = true;
        const backdrop = document.getElementById('vortex-v6-publish-backdrop');
        if (backdrop) backdrop.hidden = true;

        addAuditLog('success', 'Versão publicada e salva (VFS + Postgres).');
    }

    // =====================================================================
    // MODAL DE GESTÃO EDITORIAL (2.3)
    // =====================================================================

    function openEditorialModal() {
        let modal = document.getElementById('vortex-editorial-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'vortex-editorial-modal';
            modal.className = 'vortex-editorial-modal';
            modal.innerHTML = `
                <div class="vortex-editorial-backdrop" onclick="vortexStudio.closeEditorialModal()"></div>
                <div class="vortex-editorial-panel">
                    <div class="vortex-editorial-header">
                        <h3>Gestão Editorial</h3>
                        <button class="vortex-editorial-close" onclick="vortexStudio.closeEditorialModal()">✕</button>
                    </div>
                    <div class="vortex-editorial-tabs">
                        <button class="vortex-editorial-tab active" data-tab="drafts" onclick="vortexStudio.loadEditorialTab('drafts', this)">Rascunhos</button>
                        <button class="vortex-editorial-tab" data-tab="revisions" onclick="vortexStudio.loadEditorialTab('revisions', this)">Revisões</button>
                        <button class="vortex-editorial-tab" data-tab="published" onclick="vortexStudio.loadEditorialTab('published', this)">Publicados</button>
                    </div>
                    <div id="vortex-editorial-content" class="vortex-editorial-content">
                        <span class="vortex-review-loading">Carregando...</span>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        modal.style.display = 'flex';
        loadEditorialTab('drafts', modal.querySelector('[data-tab="drafts"]'));
    }

    function closeEditorialModal() {
        const modal = document.getElementById('vortex-editorial-modal');
        if (modal) modal.style.display = 'none';
    }

    async function loadEditorialTab(tab, btnEl) {
        const content = document.getElementById('vortex-editorial-content');
        if (!content) return;

        document.querySelectorAll('.vortex-editorial-tab').forEach(b => b.classList.remove('active'));
        if (btnEl) btnEl.classList.add('active');

        content.innerHTML = '<span class="vortex-review-loading">Carregando...</span>';

        try {
            if (tab === 'drafts') {
                const resp = await fetch('/api/vortex/drafts');
                const rows = resp.ok ? await resp.json() : [];
                if (!rows.length) { content.innerHTML = '<p class="vortex-editorial-empty">Nenhum rascunho encontrado.</p>'; return; }
                content.innerHTML = rows.map(d => `
                    <div class="vortex-editorial-row">
                        <div class="vortex-editorial-row-info">
                            <strong>${escapeHtml(d.title || d.id)}</strong>
                            <small>${escapeHtml(d.slug || '')} · ${new Date(d.updated_at).toLocaleString('pt-BR')}</small>
                        </div>
                        <div class="vortex-editorial-row-actions">
                            <button class="vortex-btn vortex-btn-secondary" onclick="vortexStudio.applyEditorialDraft('${escapeHtml(d.id)}')">Carregar</button>
                        </div>
                    </div>`).join('');

            } else if (tab === 'revisions') {
                const currentPath = state.metadata.spokeSlug || state.metadata.hubId || '';
                const inputVal = currentPath ? `value="${escapeHtml(currentPath)}"` : 'placeholder="ex: ansiedade/hipnose-clinica"';
                content.innerHTML = `
                    <div class="vortex-editorial-path-search">
                        <input id="vortex-editorial-rev-path" type="text" ${inputVal} style="flex:1;padding:6px 10px;background:#1a1a2e;border:1px solid #3a3a5c;color:#e8eaf0;border-radius:6px;">
                        <button class="vortex-btn vortex-btn-secondary" onclick="vortexStudio._loadRevisionsByPath()">Buscar</button>
                    </div>
                    <div id="vortex-editorial-revisions-list"></div>`;
                if (currentPath) await _loadRevisionsByPath();

            } else if (tab === 'published') {
                const resp = await fetch('/api/vortex/published-pages');
                const rows = resp.ok ? await resp.json() : [];
                if (!rows.length) { content.innerHTML = '<p class="vortex-editorial-empty">Nenhuma página publicada.</p>'; return; }
                content.innerHTML = rows.map(p => `
                    <div class="vortex-editorial-row">
                        <div class="vortex-editorial-row-info">
                            <strong>${escapeHtml(p.title || p.path)}</strong>
                            <small>/${escapeHtml(p.path)} · ${new Date(p.updated_at).toLocaleString('pt-BR')}</small>
                        </div>
                        <div class="vortex-editorial-row-actions">
                            <button class="vortex-btn vortex-btn-secondary" onclick="vortexStudio._createRevisionDraft('${escapeHtml(p.path)}')">Criar Revisão</button>
                            <button class="vortex-btn vortex-btn-secondary" onclick="vortexStudio.loadEditorialTab('revisions', document.querySelector('[data-tab=revisions]')); setTimeout(()=>{const i=document.getElementById('vortex-editorial-rev-path');if(i){i.value='${escapeHtml(p.path)}';vortexStudio._loadRevisionsByPath();}},50)">Histórico</button>
                        </div>
                    </div>`).join('');
            }
        } catch (e) {
            content.innerHTML = `<p class="vortex-editorial-empty">Erro: ${escapeHtml(e.message)}</p>`;
        }
    }

    async function _loadRevisionsByPath() {
        const input = document.getElementById('vortex-editorial-rev-path');
        const listEl = document.getElementById('vortex-editorial-revisions-list');
        if (!input || !listEl) return;
        const pagePath = input.value.trim();
        if (!pagePath) return;
        listEl.innerHTML = '<span class="vortex-review-loading">Carregando...</span>';
        try {
            const resp = await fetch(`/api/vortex/revisions/${encodeURIComponent(pagePath)}`);
            const rows = resp.ok ? await resp.json() : [];
            if (!rows.length) { listEl.innerHTML = '<p class="vortex-editorial-empty">Nenhuma revisão para esse caminho.</p>'; return; }
            listEl.innerHTML = rows.map(r => `
                <div class="vortex-editorial-row">
                    <div class="vortex-editorial-row-info">
                        <strong>${escapeHtml(r.title || r.id)}</strong>
                        <small>${new Date(r.created_at).toLocaleString('pt-BR')} · ${r.author_id || 'sistema'}</small>
                    </div>
                    <div class="vortex-editorial-row-actions">
                        <button class="vortex-btn vortex-btn-secondary" onclick="vortexStudio._rollbackToRevision('${escapeHtml(pagePath)}','${escapeHtml(r.id)}')">Restaurar</button>
                    </div>
                </div>`).join('');
        } catch (e) {
            listEl.innerHTML = `<p class="vortex-editorial-empty">Erro: ${escapeHtml(e.message)}</p>`;
        }
    }

    async function applyEditorialDraft(draftId) {
        closeEditorialModal();
        try {
            const resp = await fetch('/api/vortex/drafts');
            const rows = resp.ok ? await resp.json() : [];
            const draft = rows.find(d => String(d.id) === String(draftId));
            if (!draft) { addAuditLog('error', 'Rascunho não encontrado.'); return; }
            state.draft.id = draft.id;
            state.draft.name = draft.title || '';
            if (draft.slug) {
                const parts = draft.slug.split('/');
                state.metadata.spokeSlug = parts[parts.length - 1] || '';
            }
            addAuditLog('info', `Rascunho carregado: ${draft.title || draftId}`);
            addMessage('system', `Rascunho "${escapeHtml(draft.title || draftId)}" carregado.`);
        } catch (e) {
            addAuditLog('error', `Erro ao carregar rascunho: ${e.message}`);
        }
    }

    async function _createRevisionDraft(pagePath) {
        try {
            const resp = await fetch('/api/vortex/revision-draft', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: pagePath })
            });
            const data = await resp.json();
            if (!resp.ok || data.error) throw new Error(data.error);
            addAuditLog('info', `Revisão criada: ${data.draft.title}`);
            addMessage('system', `Revisão de "${escapeHtml(pagePath)}" criada. Carregue-a na aba Rascunhos.`);
            loadEditorialTab('drafts', document.querySelector('[data-tab="drafts"]'));
        } catch (e) {
            addAuditLog('error', `Erro ao criar revisão: ${e.message}`);
        }
    }

    async function _rollbackToRevision(pagePath, revisionId) {
        if (!confirm(`Restaurar "${pagePath}" para a revisão ${revisionId.slice(0, 8)}...?`)) return;
        try {
            const resp = await fetch('/api/vortex/rollback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: pagePath, revision_id: revisionId, author_id: 'vortex-studio' })
            });
            const data = await resp.json();
            if (!resp.ok || data.error) throw new Error(data.error);
            addAuditLog('success', `Rollback aplicado: ${pagePath}`);
            addMessage('system', `Rollback concluído para "${escapeHtml(pagePath)}".`);
        } catch (e) {
            addAuditLog('error', `Rollback falhou: ${e.message}`);
        }
    }

    function getVisualSyncLabel(status) {
        const normalized = String(status || 'nao_sincronizado');
        if (normalized === 'disponivel' || normalized === 'publicado' || normalized === 'alinhado') return 'Pronto';
        if (normalized === 'nao_sincronizado') return 'Revisar';
        return normalized.replace(/_/g, ' ');
    }

    function renderV6Silos() {
        const hub = document.getElementById('vortex-v6-silo-hub');
        const summary = document.getElementById('vortex-v6-strategy-summary');
        if (!hub) return;
        const silos = state.metadata.silos.length ? state.metadata.silos.slice(0, 8) : [
            { id: 'clinico', slug: 'nucleo-clinico', hub: 'Nucleo Clinico', spokes: [{ title: 'Pagina principal', slug: 'pagina-principal' }] },
            { id: 'marketing', slug: 'marketing', hub: 'Marketing', spokes: [{ title: 'Landing de conversao', slug: 'landing-de-conversao' }] }
        ];
        const activeSiloId = String(state.creationBrief.siloId || state.metadata.siloId || '');

        hub.innerHTML = silos.map((s, index) => {
            const siloId = String(s.id || s.slug || s.name || index);
            const label = s.hub || s.name || s.title || `Silo ${index + 1}`;
            const slug = s.slug || slugifyDraftName(label);
            const spokes = Array.isArray(s.spokes) ? s.spokes : [];
            const isExpanded = Boolean(state.visual.expandedSilos[siloId] || siloId === activeSiloId);
            const status = getVisualSyncLabel(s.vortexSyncStatus);
            return `
                <div class="vortex-v6-silo-card ${isExpanded ? 'expanded' : ''}">
                    <button class="vortex-v6-hub-button" onclick="vortexStudio.toggleVisualSilo('${safeJsString(siloId)}')">
                        <span class="vortex-v6-hub-icon">${escapeHtml(label.slice(0, 1).toUpperCase())}</span>
                        <span class="vortex-v6-hub-main">
                            <strong>${escapeHtml(label)}</strong>
                            <small>Hub · /${escapeHtml(slug)} · ${spokes.length} spokes</small>
                        </span>
                        <i class="${status.toLowerCase()}">${escapeHtml(status)}</i>
                        <em>${isExpanded ? '⌃' : '⌄'}</em>
                    </button>
                    <div class="vortex-v6-hub-actions" ${isExpanded ? '' : 'hidden'}>
                        <button onclick="vortexStudio.editVisualSilo('${safeJsString(siloId)}')">Editar Silo</button>
                    </div>
                    <div class="vortex-v6-spoke-list" ${isExpanded ? '' : 'hidden'}>
                        ${spokes.map((spoke, idx) => {
                            const title = spoke.title || spoke;
                            const spokeSlug = spoke.slug || slugifyDraftName(title);
                            const active = state.metadata.siloId === siloId && Number(state.metadata.spokeIndex) === idx;
                            return `
                                <div class="vortex-v6-spoke-row ${active ? 'active' : ''}">
                                    <button class="vortex-v6-spoke-select" onclick="vortexStudio.openVisualSpoke('${safeJsString(siloId)}', ${idx})">
                                        <span></span>
                                        <strong>${escapeHtml(title)}</strong>
                                        <small>/${escapeHtml(slug)}/${escapeHtml(spokeSlug)}</small>
                                    </button>
                                    <button class="vortex-v6-spoke-edit" onclick="vortexStudio.editVisualSpoke('${safeJsString(siloId)}', ${idx})">Editar</button>
                                </div>
                            `;
                        }).join('')}
                        <button class="vortex-v6-new-spoke" onclick="vortexStudio.startNewSpokeFromSilo('${safeJsString(siloId)}')">+ Novo spoke</button>
                    </div>
                </div>
            `;
        }).join('') + `<button class="vortex-v6-new-silo" onclick="vortexStudio.startNewSiloFromPanel()">+ Criar novo Silo</button>`;

        if (summary) {
            summary.innerHTML = `
                <strong>Contexto ativo</strong>
                <p>${escapeHtml(state.metadata.hubName || state.creationBrief.hubName || 'Escolha um Hub ou crie um novo Spoke.')}</p>
                <strong>Destino</strong>
                <p>${escapeHtml(state.metadata.spokeTitle || state.creationBrief.themeKeyword || 'Briefing criativo pronto para orientar o Vortex.')}</p>
            `;
        }
        renderV6Briefing();
    }
    function toggleVisualSilo(id) {
        state.visual.expandedSilos[id] = !state.visual.expandedSilos[id];
        openVisualSilo(id);
        renderV6Silos();
    }

    function openVisualSilo(id) {
        state.metadata.siloId = id;
        const silo = getSiloById(id);
        state.metadata.hubId = id;
        state.metadata.hubName = silo?.hub || '';
        state.metadata.spokeIndex = null;
        state.metadata.spokeTitle = '';
        state.metadata.spokeSlug = '';
        state.metadata.pageType = 'hub';
        state.metadata.syncStatus = silo?.vortexSyncStatus || '';
        state.metadata.vortexPageId = silo?.vortexPageId || '';
        state.creationBrief = {
            ...state.creationBrief,
            mode: 'edit',
            siloId: id,
            hubName: silo?.hub || '',
            themeKeyword: silo?.hub || state.creationBrief.themeKeyword
        };
        persistVisualSession();
        renderMetadataStatus();
        renderV6Briefing();
        addAuditLog('info', `Silo ativo no V6: ${id}`);
    }

    function editVisualSilo(id) {
        openVisualSilo(id);
        setVisualLayer('edit');
        ensureVisualStarterPage();
    }

    function openVisualSpoke(siloId, spokeIndex) {
        const silo = getSiloById(siloId);
        const spoke = silo?.spokes?.[spokeIndex];
        if (!silo || !spoke) return;
        state.metadata.siloId = siloId;
        state.metadata.hubId = siloId;
        state.metadata.hubName = silo.hub;
        state.metadata.spokeIndex = spokeIndex;
        state.metadata.spokeTitle = spoke.title;
        state.metadata.spokeSlug = spoke.slug;
        state.metadata.pageType = 'spoke';
        state.metadata.syncStatus = spoke.vortexSyncStatus;
        state.metadata.vortexPageId = spoke.vortexPageId;
        state.creationBrief = {
            ...state.creationBrief,
            mode: 'edit',
            siloId,
            hubName: silo.hub,
            spokeSlug: spoke.slug || '',
            themeKeyword: spoke.title || state.creationBrief.themeKeyword,
            ideaContext: `Editar spoke "${spoke.title}" dentro do Hub ${silo.hub}.`
        };
        persistVisualSession();
        renderMetadataStatus();
        renderV6Silos();
        renderV6Briefing();
        addAuditLog('info', `Spoke selecionado como contexto: ${spoke.title}`);
    }

    function editVisualSpoke(siloId, spokeIndex) {
        const silo = getSiloById(siloId);
        const spoke = silo?.spokes?.[spokeIndex];
        if (!silo || !spoke) return;
        openVisualSpoke(siloId, spokeIndex);
        importFromSilo({
            siloId,
            hubId: siloId,
            siloName: silo.hub,
            hubName: silo.hub,
            spokeIndex,
            spokeTitle: spoke.title,
            spokeSlug: spoke.slug,
            pageType: 'spoke',
            syncStatus: spoke.vortexSyncStatus,
            vortexPageId: spoke.vortexPageId,
            title: spoke.title,
            slug: `/${silo.slug}/${spoke.slug}`,
            keywords: [silo.hub, spoke.title].filter(Boolean),
            templateHint: 'artigo'
        });
        setVisualLayer('edit');
    }

    function installPreviewInteractionTools() {
        const frame = document.getElementById('vortex-preview-frame');
        const doc = frame?.contentDocument;
        if (!doc || !doc.head || doc.__vortexMicroInstalled) return;
        doc.__vortexMicroInstalled = true;

        const style = doc.createElement('style');
        style.textContent = `
            [data-vortex-hover] { outline: 2px solid #2dd4bf !important; outline-offset: 2px !important; cursor: crosshair !important; }
            .vortex-micro-bar { position: fixed; z-index: 2147483647; display: flex; gap: 6px; align-items: center; background: rgba(5, 8, 16, 0.94); border: 1px solid #2dd4bf; border-radius: 8px; padding: 6px; box-shadow: 0 12px 30px rgba(0,0,0,.35); }
            .vortex-micro-bar input { width: 260px; background: #111827; color: #e5e7eb; border: 1px solid rgba(255,255,255,.14); border-radius: 6px; padding: 7px 9px; font: 12px Inter, sans-serif; }
            .vortex-micro-bar button { background: #2dd4bf; color: #04111a; border: 0; border-radius: 6px; padding: 7px 10px; font: 800 11px Inter, sans-serif; cursor: pointer; }
        `;
        doc.head.appendChild(style);

        doc.addEventListener('mouseover', event => {
            const target = event.target;
            if (!target || target === doc.body || target.closest?.('.vortex-micro-bar')) return;
            target.setAttribute('data-vortex-hover', 'true');
        }, true);

        doc.addEventListener('mouseout', event => {
            event.target?.removeAttribute?.('data-vortex-hover');
        }, true);

        doc.addEventListener('click', event => {
            const target = event.target;
            if (!target || target.closest?.('.vortex-micro-bar')) return;
            if (state.visual.enabled && target.closest?.('[data-vortex-field]')) return;
            event.preventDefault();
            event.stopPropagation();
            selectPreviewNode(target);
        }, true);
    }

    function selectPreviewNode(node) {
        const rect = node.getBoundingClientRect();
        const doc = node.ownerDocument;
        doc.querySelectorAll('.vortex-micro-bar').forEach(el => el.remove());
        state.selectedPreviewNode = {
            html: node.outerHTML,
            label: node.tagName.toLowerCase() + (node.id ? `#${node.id}` : '') + (node.className ? `.${String(node.className).split(/\s+/).slice(0, 2).join('.')}` : '')
        };

        const bar = doc.createElement('div');
        bar.className = 'vortex-micro-bar';
        bar.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - 360)) + 'px';
        bar.style.top = Math.max(8, rect.top - 48) + 'px';
        bar.innerHTML = `<input id="vortex-micro-input" placeholder="Ajustar somente este bloco..." /><button id="vortex-micro-apply">Aplicar</button>`;
        doc.body.appendChild(bar);
        const input = bar.querySelector('#vortex-micro-input');
        input.focus();
        bar.querySelector('#vortex-micro-apply').onclick = () => runMicroPrompt(input.value);
        input.onkeydown = event => {
            if (event.key === 'Enter') runMicroPrompt(input.value);
        };
        addAuditLog('info', `Componente selecionado: ${state.selectedPreviewNode.label}`);
    }

    async function runMicroPrompt(promptText) {
        if (!promptText || !state.selectedPreviewNode) return;
        const model = document.getElementById('vortex-model-select')?.value || 'gemini-2.5-flash';
        setGenerating(true);
        try {
            const before = getEditorContent();
            await createSnapshot(`micro:${promptText}`);
            const response = await fetch('/api/vortex/micro-edit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${VORTEX_API_KEY}`
                },
                body: JSON.stringify({
                    prompt: promptText,
                    model,
                    selectedHtml: state.selectedPreviewNode.html,
                    selectedSource: state.selectedPreviewNode.html,
                    context: buildAbidosContext()
                })
            });
            const data = await response.json();
            if (!response.ok || data.error) throw new Error(data.error || `Micro ${response.status}`);

            const replacement = sanitizeAIContent(data.replacement);
            const nextCode = before.includes(state.selectedPreviewNode.html)
                ? before.replace(state.selectedPreviewNode.html, replacement)
                : `${before}\n\n{/* Micro-prompt: ${promptText.replace(/\*\//g, '')} */}\n${replacement}`;
            const audit = auditCode(nextCode);
            setEditorContent(nextCode, state.operationMode === 'template' ? 'json' : 'typescriptreact');
            updatePreview(nextCode);
            addMessage('ai', data.explanation || 'Componente atualizado por micro-prompt.');
            if (!audit.passes) addMessage('system', 'Micro-prompt aplicado com alertas Abidos.');
        } catch (err) {
            addAuditLog('error', `Micro-prompt falhou: ${err.message}`);
        } finally {
            setGenerating(false);
        }
    }

    async function sendStyleFeedback(sentiment) {
        const code = state.selectedPreviewNode?.html || state.lastPreviewCode || getEditorContent();
        try {
            const response = await fetch('/api/vortex/style-preferences/feedback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${VORTEX_API_KEY}`
                },
                body: JSON.stringify({
                    sentiment,
                    code,
                    componentLabel: state.selectedPreviewNode?.label || 'preview'
                })
            });
            const data = await response.json();
            if (!response.ok || data.error) throw new Error(data.error || `Feedback ${response.status}`);
            state.stylePreferences = data.preferences;
            renderStyleMemoryStatus();
            addAuditLog('success', `Memoria estetica atualizada: ${data.signals.length} sinais.`);
        } catch (err) {
            addAuditLog('error', `Feedback estetico falhou: ${err.message}`);
        }
    }

    async function loadStylePreferences() {
        try {
            const response = await fetch('/api/vortex/style-preferences', {
                headers: { 'Authorization': `Bearer ${VORTEX_API_KEY}` }
            });
            state.stylePreferences = await response.json();
            renderStyleMemoryStatus();
        } catch (err) {
            addAuditLog('warn', 'Memoria estetica indisponivel.');
        }
    }

    function renderStyleMemoryStatus() {
        const el = document.getElementById('vortex-style-memory-status');
        if (!el) return;
        const pos = state.stylePreferences.positive?.length || 0;
        const neg = state.stylePreferences.negative?.length || 0;
        el.textContent = `${pos} aprovados / ${neg} evitados`;
    }

    async function loadVortexMedia() {
        try {
            const response = await fetch('/api/vortex/media', {
                headers: { 'Authorization': `Bearer ${VORTEX_API_KEY}` }
            });
            const data = await response.json();
            state.mediaAssets = data.items || [];
            renderMediaStrip();
        } catch (err) {
            addAuditLog('warn', 'Acervo Visual indisponivel no Vortex.');
        }
    }

    function renderMediaStrip() {
        const strip = document.getElementById('vortex-media-strip');
        if (!strip) return;
        const items = state.mediaAssets.slice(0, 8);
        strip.innerHTML = items.length ? items.map(item => `
            <button class="vortex-media-chip ${item.overused ? 'overused' : ''}" title="${item.title || item.alt || item.url}" onclick="vortexStudio.insertMediaAsset('${encodeURIComponent(item.url || '')}', '${encodeURIComponent(item.id || '')}')">
                <img src="${item.url}" alt="${item.alt || item.title || 'Midia do acervo'}">
                <span>${item.usageCount || 0}</span>
            </button>
        `).join('') : '<span class="vortex-empty-chip">Sem midia</span>';
    }

    function buildMediaContext() {
        if (!state.mediaAssets.length) return '';
        const items = state.mediaAssets.slice(0, 12).map(item => {
            const label = item.title || item.alt || item.url;
            const usage = item.usageCount || 0;
            return `- ${label}: ${item.url} (uso: ${usage}${item.overused ? ', evitar sobreuso' : ''})`;
        }).join('\n');
        return `--- ACERVO VISUAL DISPONIVEL ---\n${items}`;
    }

    async function insertMediaAsset(encodedUrl, encodedId) {
        const url = decodeURIComponent(encodedUrl || '');
        const id = decodeURIComponent(encodedId || '');
        if (!url) return;
        const input = document.getElementById('vortex-chat-input');
        if (input) {
            input.value = `${input.value ? input.value + '\n' : ''}Use esta imagem do acervo: ${url}`;
            input.focus();
        }
        await fetch('/api/vortex/media/track', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${VORTEX_API_KEY}`
            },
            body: JSON.stringify({ itemId: id, url })
        }).catch(() => {});
        loadVortexMedia();
    }

    async function auditCurrentDraft() {
        try {
            const response = await fetch('/api/vortex/audit-draft', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${VORTEX_API_KEY}`
                },
                body: JSON.stringify({
                    draft: state.draft,
                    code: getEditorContent(),
                    templateValues: state.template.values
                })
            });
            const data = await response.json();
            if (!response.ok || data.error) throw new Error(data.error || `Audit ${response.status}`);
            state.auditStatus = data;
            renderFormalAuditBadge();
            addAuditLog(data.approved ? 'success' : 'warn', `Auditoria formal: ${data.approved ? 'aprovado' : 'requer ajustes'}.`);
            return data;
        } catch (err) {
            addAuditLog('error', `Auditoria formal falhou: ${err.message}`);
            return null;
        }
    }

    function renderFormalAuditBadge() {
        const badge = document.getElementById('vortex-formal-audit-badge');
        if (!badge) return;
        if (!state.auditStatus) {
            badge.textContent = 'Audit -';
            badge.className = 'vortex-audit-badge idle';
            return;
        }
        badge.textContent = state.auditStatus.approved ? 'Audit OK' : 'Audit alerta';
        badge.className = `vortex-audit-badge ${state.auditStatus.approved ? 'approved' : 'warning'}`;
    }

    async function deployDraftPreview() {
        try {
            const name = state.draft.name || state.template.current?.name || 'vortex-preview';
            const response = await fetch('/api/vortex/deploy-draft', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${VORTEX_API_KEY}`
                },
                body: JSON.stringify({
                    draftId: state.draft.id,
                    name,
                    files: [{ file: 'index.html', data: state.lastPreviewCode || getEditorContent() }]
                })
            });
            const data = await response.json();
            if (!response.ok || data.error) throw new Error(data.error || `Deploy ${response.status}`);
            state.deploymentUrl = data.url;
            renderDeployLink();
            addAuditLog('success', `Preview Vercel criado: ${data.url}`);
        } catch (err) {
            addAuditLog('error', `Deploy preview falhou: ${err.message}`);
        }
    }

    function renderDeployLink() {
        const link = document.getElementById('vortex-deploy-link');
        if (!link) return;
        if (!state.deploymentUrl) {
            link.style.display = 'none';
            return;
        }
        link.href = state.deploymentUrl;
        link.style.display = 'inline-flex';
    }

    async function renderSnapshotTimeline() {
        const bar = document.getElementById('vortex-snapshot-timeline');
        if (!bar || !state.db) return;
        const snapshots = await state.db.snapshots.orderBy('timestamp').reverse().limit(20).toArray();
        bar.innerHTML = snapshots.map(s => `
            <button class="vortex-snapshot-dot" title="${new Date(s.timestamp).toLocaleString()} - ${s.prompt || 'manual'}" onclick="vortexStudio.restoreSnapshot(${s.id})"></button>
        `).join('');
    }

    async function restoreSnapshot(id) {
        if (!state.db) return;
        const snapshot = await state.db.snapshots.get(Number(id));
        if (!snapshot) return;
        state.currentFile = snapshot.filePath;
        setEditorContent(snapshot.content, snapshot.filePath.endsWith('.json') ? 'json' : 'typescriptreact');
        updatePreview(snapshot.content);
        updateBreadcrumbs(snapshot.filePath);
        addAuditLog('info', `Snapshot restaurado: ${snapshot.prompt || snapshot.id}`);
    }

    // =========================================================================
    // SAVE & COMMIT
    // =========================================================================
    async function saveToVFS() {
        if (!state.currentFile) {
            state.currentFile = '/src/app/page.tsx';
        }
        let content = getEditorContent();

        // [VÃ“RTEX 3.1] MaterializaÃ§Ã£o via HidrataÃ§Ã£o (Next.js Ready)
        if (typeof window.hydrate === 'function' && (state.currentFile.endsWith('.tsx') || state.currentFile.endsWith('.js'))) {
            try {
                const hydrated = window.hydrate(content);
                if (hydrated && hydrated !== content) {
                    content = hydrated;
                    setEditorContent(content); // Sincroniza o editor com a versÃ£o hidratada
                    addAuditLog('info', 'ðŸŒ€ CÃ³digo hidratado para produÃ§Ã£o (Next.js Materialized).');
                }
            } catch (e) {
                console.error('âŒ [HYDRATION ERROR]', e);
            }
        }
        
        // 1. Browser Sync (IndexedDB)
        await vfsWrite(state.currentFile, content);
        
        // 2. Physical Sync (Disk Mirroring - Phase 5.1)
        try {
            const filename = state.currentFile.replace(/^\/src\/app\//, '');
            await fetch('/api/vortex/save-local', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${VORTEX_API_KEY}`
                },
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
        
        addMessage('system', `ðŸ’¾ Arquivo salvo e espelhado: ${state.currentFile}`);
    }

    async function commitAndPush() {
        const code = getEditorContent();
        if (!code || code.length < 10) return addMessage('system', 'âš ï¸ CÃ³digo insuficiente para commit.');
        
        // [PHASE 2.4] Gate: Bloquear commit se auditoria falhou
        const auditResult = auditCode(code);
        if (!auditResult.passes) {
            addMessage('system', `ðŸ›¡ï¸ **COMMIT BLOQUEADO** â€” A auditoria Abidos detectou ${auditResult.errors.length} violaÃ§Ã£o(Ãµes).\nCorrija os erros ou use AI Auto-Repair antes de fazer deploy.`);
            addAuditLog('error', `ðŸš« Commit bloqueado: ${auditResult.errors.length} violaÃ§Ãµes.`);
            return;
        }

        // [VÃ³rtex 3.1] Auditoria SemÃ¢ntica removida â€” overhead de tokens eliminado.
        // A compliance Abidos (auditCode acima) permanece como gate.

        addMessage('system', 'ðŸš€ Preparando Deploy para Vercel...');
        addAuditLog('info', 'ðŸš€ Commit iniciado...');
        
        // [PHASE 4.2] Mostrar barra de progresso
        showDeployProgress();  
        try {
            const filename = state.currentFile ? state.currentFile.split('/').pop() : 'page.tsx';

            const response = await fetch('/api/vortex/commit', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${VORTEX_API_KEY}`
                },
                body: JSON.stringify({
                    filename,
                    content: code,
                    message: `[VÃ³rtex] Auto-Deploy: Update ${filename} with Abidos V5 rules`
                })
            });

            const data = await response.json();
            if (data.success) {
                const shortSha = data.sha ? data.sha.substring(0, 7) : 'N/A';
                addMessage('ai', `âœ… **DEPLOY CONCLUÃDO!**\n\nA pÃ¡gina foi enviada para o GitHub e a Vercel iniciou o build.\n\nðŸ”— [Ver no GitHub](${data.url || '#'})\nðŸ“¦ Commit: \`${shortSha}\``);
                addAuditLog('success', `âœ… Deploy: ${filename} â†’ ${shortSha}`);
            } else {
                throw new Error(data.error || 'Erro desconhecido no commit.');
            }
        } catch (e) {
            console.error('Commit error:', e);
            addMessage('system', `âš ï¸ Falha no Deploy: ${e.message}`);
            addAuditLog('error', `âŒ Deploy falhou: ${e.message}`);
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
            addAuditLog('info', 'ðŸªŸ Preview aberto em nova aba.');
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
        addAuditLog('info', isZen ? 'ðŸ§˜ Modo Zen ativado.' : 'ðŸ§˜ Modo Zen desativado.');
        if (state.editor) setTimeout(() => state.editor.layout(), 300);
    }

    // =========================================================================
    // [PHASE 3.12] BIBLIOTECA DE TEMPLATES
    // =========================================================================
    const TEMPLATES_LIBRARY = [
        { id: 'landing-clinic', name: 'Landing ClÃ­nica', icon: 'ðŸ¥', description: 'Landing page para profissional de saÃºde com hero, serviÃ§os e CTA WhatsApp.' },
        { id: 'article-page', name: 'PÃ¡gina de Artigo', icon: 'ðŸ“°', description: 'Estrutura para artigos longos com Ã­ndice lateral e breadcrumbs SEO.' },
        { id: 'service-page', name: 'PÃ¡gina de ServiÃ§o', icon: 'ðŸ’¼', description: 'PÃ¡gina focada em apresentar um serviÃ§o especÃ­fico com FAQ e schema.' },
        { id: 'bio-page', name: 'Biografia/Sobre', icon: 'ðŸ‘¤', description: 'PÃ¡gina sobre o profissional com timeline, formaÃ§Ã£o e credenciais.' },
        { id: 'contact-form', name: 'Contato + FormulÃ¡rio', icon: 'ðŸ“‹', description: 'PÃ¡gina de contato com formulÃ¡rio, mapa e informaÃ§Ãµes de atendimento.' }
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
        addMessage('ai', `ðŸ“¦ **Biblioteca de Templates**\\n\\nEscolha um template para comeÃ§ar:\\n\\n${html}`);
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
                    <span>ðŸ“ Diff Review: <strong>${filename || 'page.tsx'}</strong></span>
                    <div class="vortex-diff-actions">
                        <button class="vortex-btn vortex-btn-success" id="vortex-diff-accept">âœ… Aceitar AlteraÃ§Ãµes</button>
                        <button class="vortex-btn vortex-btn-secondary" id="vortex-diff-reject">âŒ Rejeitar</button>
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
            addAuditLog('success', 'âœ… AlteraÃ§Ãµes aceitas via Diff Review.');
        };
        document.getElementById('vortex-diff-reject').onclick = () => {
            closeDiffReview();
            addAuditLog('warn', 'âŒ AlteraÃ§Ãµes rejeitadas no Diff Review.');
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
                <span class="deploy-progress-text" id="vortex-deploy-text">ðŸš€ Enviando...</span>
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
            { pct: 20, msg: 'ðŸ“¦ Preparando arquivos...' },
            { pct: 45, msg: 'ðŸš€ Enviando para GitHub...' },
            { pct: 70, msg: 'ðŸ”„ Vercel build iniciado...' },
            { pct: 90, msg: 'âœ… Quase lÃ¡...' },
            { pct: 100, msg: 'ðŸŽ‰ Deploy concluÃ­do!' }
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
    // [PHASE 4.3] CLUSTERIZAÃ‡ÃƒO SEO (silos.json)
    // =========================================================================
    async function generateSEOCluster() {
        try {
            addMessage('system', 'ðŸŒ Carregando estrutura de Silos...');
            const response = await fetch('/api/seo/silos');
            if (!response.ok) {
                addMessage('system', 'âš ï¸ Arquivo silos.json nÃ£o encontrado. Crie em /data/silos.json');
                return;
            }
            const silos = await response.json();

            if (!silos.clusters || silos.clusters.length === 0) {
                addMessage('system', 'âš ï¸ Nenhum cluster definido no silos.json.');
                return;
            }

            const clusterList = silos.clusters.map(c => 
                `â€¢ **${c.hub}** (Hub) â†’ ${c.spokes?.map(s => '`' + s + '`').join(', ') || 'sem spokes'}`
            ).join('\n');

            addMessage('ai', `ðŸŒ **Estrutura de Silos Detectada:**\n\n${clusterList}\n\nDigite o nome do cluster para gerar todas as pÃ¡ginas.`);
            addAuditLog('info', `ðŸŒ ${silos.clusters.length} cluster(s) carregado(s).`);
        } catch(e) {
            addMessage('system', `âš ï¸ Erro ao carregar silos: ${e.message}`);
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
    // [PHASE 4.5] DESIGN SYSTEM TOKENS â†’ TAILWIND CONFIG
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
    // [PHASE 4.7] EXPORT HTML ESTÃTICO
    // =========================================================================
    function exportHTML() {
        const frame = document.getElementById('vortex-preview-frame');
        if (!frame || !frame.srcdoc) {
            addMessage('system', 'âš ï¸ Nenhum preview disponÃ­vel para exportar.');
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

        addAuditLog('success', `ðŸ“¥ HTML exportado: ${a.download}`);
        addMessage('system', `ðŸ“¥ Arquivo **${a.download}** baixado com sucesso.`);
    }

    /**
     * downloadCode()
     * Exporta o cÃ³digo-fonte atual devidamente hidratado (Next.js Component).
     */
    function downloadCode() {
        let content = getEditorContent();
        
        // Garante a hidrataÃ§Ã£o antes do download
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

        addAuditLog('success', `ðŸ“‚ Fonte exportado: ${filename}`);
        addMessage('system', `ðŸ“‚ CÃ³digo-fonte **${filename}** baixado com hidrataÃ§Ã£o Next.js.`);
    }

    // =========================================================================
    // [PHASE 4.8] CACHE LOCAL DE GERAÃ‡Ã•ES
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
    // [PHASE 1.3] CONTINUE ENGINE (RESILIÃŠNCIA SSE)
    // =========================================================================
    function isSyntacticallyComplete(code) {
        if (!code) return true;

        // --- NÃVEL 1: SOBERANIA AST (Babel) ---
        if (window.Babel && Babel.packages && Babel.packages.parser) {
            try {
                Babel.packages.parser.parse(code, {
                    sourceType: "module",
                    plugins: ["jsx", "typescript"]
                });
                console.log('âœ… [VORTEX SYNTAX] AST Validated.');
                return true; 
            } catch (e) {
                // Se o erro indicar que o arquivo terminou inesperadamente, Ã© truncado
                if (e.message.includes('Unexpected token') || e.message.includes('Unexpected EOF') || e.message.includes('Unterminated')) {
                    console.warn('âš ï¸ [VORTEX SYNTAX] AST detected truncation:', e.message);
                    return false;
                }
                // Para outros erros (sintaxe quebrada no meio), tratamos conforme o fallback ou assumimos "fechado" se nÃ£o pudermos decidir
            }
        }

        // --- NÃVEL 2: FALLBACK RESILIENTE (Stack-based) ---
        let stack = [];
        let inString = null;
        let inComment = false;
        let i = 0;

        while (i < code.length) {
            const char = code[i];
            const nextChar = code[i + 1];

            // 1. Handle Comments
            if (!inString && !inComment && char === '/' && nextChar === '/') {
                inComment = 'line';
                i += 2; continue;
            }
            if (!inString && !inComment && char === '/' && nextChar === '*') {
                inComment = 'block';
                i += 2; continue;
            }
            if (inComment === 'line' && char === '\n') {
                inComment = false;
                i++; continue;
            }
            if (inComment === 'block' && char === '*' && nextChar === '/') {
                inComment = false;
                i += 2; continue;
            }
            if (inComment) { i++; continue; }

            // 2. Handle Strings
            if (!inString && (char === "'" || char === '"' || char === '`')) {
                inString = char;
                i++; continue;
            }
            if (inString === char && code[i - 1] !== '\\') {
                inString = null;
                i++; continue;
            }
            if (inString) { i++; continue; }

            // 3. Handle Braces and Brackets
            if (char === '{' || char === '(' || char === '[') stack.push(char);
            if (char === '}') { if (stack.pop() !== '{') return false; }
            if (char === ')') { if (stack.pop() !== '(') return false; }
            if (char === ']') { if (stack.pop() !== '[') return false; }

            i++;
        }

        return stack.length === 0;
    }

    function notifyTruncated() {
        const msg = addMessage('system', `âš ï¸ **GeraÃ§Ã£o Truncada** â€” O Gemini atingiu o limite de tokens ou o fluxo SSE foi interrompido.\n\nDeseja que eu continue de onde parei?`);
        
        // Injetar botÃ£o de aÃ§Ã£o no container de mensagens
        setTimeout(() => {
            const container = document.getElementById('vortex-chat-messages');
            if (!container) return;
            const lastMsg = container.lastElementChild;
            if (lastMsg && lastMsg.classList.contains('vortex-msg-system')) {
                const btnArea = document.createElement('div');
                btnArea.style.marginTop = '12px';
                btnArea.innerHTML = `
                    <button onclick="vortexStudio.continueGeneration()" class="vortex-btn-primary" style="padding: 6px 12px; font-size: 12px; display: flex; align-items: center; gap: 8px;">
                        <i data-lucide="play-circle" style="width:14px;"></i> Continuar GeraÃ§Ã£o
                    </button>
                `;
                lastMsg.appendChild(btnArea);
                if (window.lucide) window.lucide.createIcons();
                container.scrollTop = container.scrollHeight;
            }
        }, 100);

        addAuditLog('warning', 'âš ï¸ Truncamento detectado. Motor de Continuidade pronto.');
    }

    async function continueGeneration() {
        if (state.isGenerating) return;

        const currentCode = getEditorContent();
        const anchor = currentCode.slice(-200); // Pegar os Ãºltimos 200 caracteres para contexto
        
        state.preContinuationCode = currentCode;
        state.isContinuing = true;
        state.isTruncated = false;

        addMessage('user', 'Continuar geraÃ§Ã£o...');
        setGenerating(true);

        try {
            const model = document.getElementById('vortex-model-select')?.value || 'gemini-2.5-flash';
            const payload = {
                prompt: `CONTINUE de onde vocÃª parou.
                
                [ANCHOR TEXT (O ÃšLTIMO TRECHO GERADO)]
                "${anchor}"
                
                [REGRAS]
                - NÃ£o repita o cÃ³digo que jÃ¡ foi gerado.
                - Comece exatamente apÃ³s o Ãºltimo caractere do Anchor Text.
                - Garanta que as tags </file> sejam fechadas corretamente ao final.`,
                model,
                currentCode: '', // NÃ£o enviamos o cÃ³digo inteiro para economizar tokens, o Anchor basta
                abidosRules: state.abidosRules,
                context: buildAbidosContext(),
                isContinuation: true // Flag opcional para o log
            };

            await sendPromptStream(payload);

        } catch (err) {
            console.error('âŒ [VORTEX CONTINUE] Error:', err);
            addMessage('system', `âš ï¸ Falha ao continuar: ${err.message}`);
            state.isContinuing = false;
        } finally {
            setGenerating(false);
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
        console.log('ðŸŒ€ [VORTEX] Initializing AI Studio...');
        
        loadVoiceProfilePreference();
        loadOperationModePreference();
        loadVisualModePreference();

        // 1. Render the UI skeleton
        renderUI();
        renderV6Surface();
        renderOperationMode();
        applyVisualModeState();
        await loadMasterTemplates();
        await loadVortexMetadata();
        await loadVoiceProfile();
        await loadStylePreferences();
        await loadVortexMedia();
        updatePreview(`
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: 'Inter', sans-serif; background: #f8fafc; color: #64748b; text-align: center; padding: 40px;">
                <div style="font-size: 48px; margin-bottom: 20px;">ðŸŒ€</div>
                <h2 style="font-size: 18px; font-weight: 800; color: #1e293b; margin: 0 0 10px;">Vortex Preview</h2>
                <p style="font-size: 13px; max-width: 300px; line-height: 1.6;">Envie um prompt no chat para gerar sua pagina Next.js. O preview aparecera aqui em tempo real.</p>
            </div>
        `);

        // 2. Init VFS and External Libs
        if (!window.Babel) {
            console.log('ðŸŒ€ [VORTEX] Loading Babel for AST Sovereignty...');
            loadScript('https://unpkg.com/@babel/standalone/babel.min.js').catch(e => console.error('Failed to load Babel:', e));
        }
        await initVFS();
        await renderSnapshotTimeline();

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
                <div style="font-size: 48px; margin-bottom: 20px;">ðŸŒ€</div>
                <h2 style="font-size: 18px; font-weight: 800; color: #1e293b; margin: 0 0 10px;">VÃ³rtex Preview</h2>
                <p style="font-size: 13px; max-width: 300px; line-height: 1.6;">Envie um prompt no chat para gerar sua pÃ¡gina Next.js. O preview aparecerÃ¡ aqui em tempo real.</p>
            </div>
        `);

        console.log('ðŸŒ€ [VORTEX] Studio ready.');
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
        restoreSnapshot,
        saveAsDraft,
        loadDraft,
        loadDraftById,
        // auditSemantic â€” REMOVED (VÃ³rtex 3.1 Purge)
        // Phase 3
        toggleZenMode,
        refreshPreview,
        popOutPreview,
        closeQuickOpen,
        showTemplateLibrary,
        useTemplate,
        selectTemplate,
        loadMasterTemplates,
        updateMetadata,
        loadVortexMetadata,
        importFromSilo,
        loadVoiceProfile,
        toggleVoiceProfile,
        setOperationMode,
        toggleVisualMode,
        setVisualLayer,
        toggleXrayMode,
        toggleVisualAIMode,
        runVisualPrompt,
        applyTargetedFieldEdit,
        restoreVisualSnapshot,
        restoreVisualVersion,
        compareVisualVersion,
        duplicateVisualVersion,
        acceptVisualProposal,
        undoVisualEdit,
        toggleVisualCompare,
        manualFieldCommand,
        clearManualFieldSelection,
        focusVisualPromptForField,
        setManualFieldMode,
        formatManualField,
        addVortexWidget,
        startWidgetDrag,
        publishVisualVersion,
        _doPublishVisualVersion,
        generateSectionsFromBrief,
        clearSectionsJson,
        openAssetPicker,
        closeAssetPicker,
        loadAssets,
        selectAsset,
        clearAsset,
        openEditorialModal,
        closeEditorialModal,
        loadEditorialTab,
        applyEditorialDraft,
        _createRevisionDraft,
        _rollbackToRevision,
        _loadRevisionsByPath,
        openVisualSilo,
        openVisualSpoke,
        sendStyleFeedback,
        insertMediaAsset,
        auditCurrentDraft,
        deployDraftPreview,
        runMicroPrompt,
        updateBreadcrumbs,
        // Briefing Criativo / Templates / Keywords (Studio Central)
        setCreationMode,
        setCreationBriefField,
        setGenerationMode,
        applyTierKeyword,
        applyCustomKeyword,
        selectVisualTemplate,
        generateFromBrief,
        startNewSpokeFromSilo,
        startNewSiloFromPanel,
        toggleVisualSilo,
        editVisualSilo,
        editVisualSpoke,
        applyPerformanceUpgrade,
        // Phase 4
        showDiffReview,
        closeDiffReview,
        exportHTML,
        downloadCode,
        generateSEOCluster,
        getDesignSystemConfig,
        notifyTruncated,
        continueGeneration,
        isSyntacticallyComplete,
        getState: () => state
    };
})();
