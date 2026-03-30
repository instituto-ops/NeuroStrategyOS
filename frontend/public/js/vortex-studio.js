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
        monacoReady: false
    };

    // =========================================================================
    // VFS (Virtual File System via Dexie.js)
    // =========================================================================
    async function initVFS() {
        try {
            // Dynamically load Dexie if not present
            if (!window.Dexie) {
                await loadScript('https://cdn.jsdelivr.net/npm/dexie@4/dist/dexie.min.js');
            }

            state.db = new Dexie('VortexVFS');
            state.db.version(1).stores({
                files: 'path, name, content, type, modified',
                projects: 'id, name, repo, branch, created',
                sessions: 'id, projectId, messages, created'
            });

            await state.db.open();
            console.log('🌀 [VORTEX VFS] IndexedDB initialized successfully.');
            
            // Request persistent storage
            if (navigator.storage && navigator.storage.persist) {
                const persisted = await navigator.storage.persist();
                console.log(`🌀 [VORTEX VFS] Persistent storage: ${persisted ? 'GRANTED' : 'DENIED'}`);
            }

            return true;
        } catch (err) {
            console.error('❌ [VORTEX VFS] Init failed:', err);
            return false;
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

        state.editor = monaco.editor.create(container, {
            value: '// 🌀 Vórtex AI Studio\n// Envie um prompt no chat para gerar código Next.js\n',
            language: 'typescriptreact',
            theme: 'vs-dark',
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

        // Handle resize
        const resizeObserver = new ResizeObserver(() => {
            if (state.editor) state.editor.layout();
        });
        resizeObserver.observe(container);

        state.monacoReady = true;
        console.log('🌀 [VORTEX MONACO] Editor initialized.');
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

    async function sendPrompt() {
        const input = document.getElementById('vortex-chat-input');
        if (!input || !input.value.trim() || state.isGenerating) return;

        const prompt = input.value.trim();
        input.value = '';
        input.style.height = 'auto';

        addMessage('user', prompt);
        setGenerating(true);

        try {
            const model = document.getElementById('vortex-model-select')?.value || 'gemini-2.5-flash';
            
            // Build Abidos context
            const abidosContext = buildAbidosContext();
            const currentCode = getEditorContent();

            const response = await fetch('/api/vortex/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    model,
                    currentCode: currentCode !== '// 🌀 Vórtex AI Studio\n// Envie um prompt no chat para gerar código Next.js\n' ? currentCode : '',
                    abidosRules: state.abidosRules,
                    context: abidosContext
                })
            });

            if (!response.ok) throw new Error(`API Error: ${response.status}`);

            const data = await response.json();

            if (data.code) {
                setEditorContent(data.code, data.language || 'typescriptreact');
                updateFileTab(data.filename || 'page.tsx', true);
                
                // Save to VFS
                const filePath = `/src/app/${data.filename || 'page.tsx'}`;
                await vfsWrite(filePath, data.code);
                state.currentFile = filePath;

                // Update preview
                if (data.preview) {
                    updatePreview(data.preview);
                }
            }

            if (data.explanation) {
                addMessage('ai', data.explanation);
            } else {
                addMessage('ai', '✅ Código gerado com sucesso. Verifique o editor.');
            }

        } catch (err) {
            console.error('❌ [VORTEX] Generation error:', err);
            addMessage('system', `⚠️ Erro na geração: ${err.message}`);
        } finally {
            setGenerating(false);
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

    function setGenerating(isGen) {
        state.isGenerating = isGen;
        const indicator = document.getElementById('vortex-generating');
        const sendBtn = document.getElementById('vortex-send-btn');
        if (indicator) indicator.style.display = isGen ? 'flex' : 'none';
        if (sendBtn) sendBtn.disabled = isGen;
    }

    // =========================================================================
    // PREVIEW
    // =========================================================================
    function updatePreview(htmlContent) {
        const frame = document.getElementById('vortex-preview-frame');
        if (!frame) return;

        // Wrap in a full HTML document if needed
        let fullHtml = htmlContent;
        if (!htmlContent.includes('<!DOCTYPE') && !htmlContent.includes('<html')) {
            fullHtml = `<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
    <style>body { font-family: 'Inter', sans-serif; }</style>
</head>
<body>${htmlContent}</body>
</html>`;
        }

        frame.srcdoc = fullHtml;
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
    // FILE TABS
    // =========================================================================
    function updateFileTab(filename, modified = false) {
        const tabs = document.getElementById('vortex-file-tabs');
        if (!tabs) return;

        // Check if tab exists
        let tab = tabs.querySelector(`[data-file="${filename}"]`);
        if (!tab) {
            tab = document.createElement('button');
            tab.className = 'vortex-file-tab active';
            tab.dataset.file = filename;
            tab.innerHTML = `<span class="dot"></span>${filename}`;
            tab.onclick = () => openFile(filename);
            
            // Deactivate other tabs
            tabs.querySelectorAll('.vortex-file-tab').forEach(t => t.classList.remove('active'));
            tabs.appendChild(tab);
        } else {
            tabs.querySelectorAll('.vortex-file-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
        }

        if (modified) tab.classList.add('modified');
    }

    async function openFile(filename) {
        const filePath = `/src/app/${filename}`;
        const content = await vfsRead(filePath);
        if (content) {
            setEditorContent(content);
            state.currentFile = filePath;
            updateFileTab(filename, false);
        }
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
                    <button class="vortex-btn vortex-btn-secondary" onclick="vortexStudio.saveToVFS()">
                        <i data-lucide="save"></i> SALVAR
                    </button>
                    <button class="vortex-btn vortex-btn-success" onclick="vortexStudio.commitAndPush()">
                        <i data-lucide="git-branch"></i> COMMIT & PUSH
                    </button>
                    <button class="vortex-btn vortex-btn-secondary" onclick="app.showSection('dashboard')">
                        <i data-lucide="x"></i>
                    </button>
                </div>
            </div>

            <!-- 3-COLUMN WORKSPACE -->
            <div class="vortex-workspace">
                <!-- LEFT: CHAT PANEL -->
                <div class="vortex-panel vortex-chat-panel">
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
                        <div class="vortex-generating-dots">
                            <span></span><span></span><span></span>
                        </div>
                        <div class="vortex-generating-text">Gemini gerando código...</div>
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
                    <div class="vortex-chat-input-area">
                        <div class="vortex-chat-input-wrapper">
                            <textarea id="vortex-chat-input" class="vortex-chat-input" placeholder="Descreva a página ou componente..." rows="1"
                                onkeydown="if(event.key==='Enter' && !event.shiftKey){event.preventDefault();vortexStudio.send();}"></textarea>
                            <button id="vortex-send-btn" class="vortex-chat-send" onclick="vortexStudio.send()">
                                <i data-lucide="send"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- CENTER: EDITOR PANEL -->
                <div class="vortex-panel vortex-editor-panel">
                    <div class="vortex-panel-header" style="background: #252526; border-color: #3c3c3c;">
                        <div id="vortex-file-tabs" class="vortex-file-tabs">
                            <button class="vortex-file-tab active" data-file="page.tsx">
                                <span class="dot"></span>page.tsx
                            </button>
                        </div>
                        <div class="vortex-panel-title" style="color: #6a737d;">
                            <i data-lucide="code-2" style="color: #6366f1;"></i>
                            EDITOR
                        </div>
                    </div>
                    <div id="vortex-monaco-container" class="vortex-panel-body" style="background: #1e1e1e;"></div>
                </div>

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
        `;

        // Initialize Lucide icons
        if (window.lucide) window.lucide.createIcons();
    }

    // =========================================================================
    // SAVE & COMMIT
    // =========================================================================
    async function saveToVFS() {
        if (!state.currentFile) {
            state.currentFile = '/src/app/page.tsx';
        }
        const content = getEditorContent();
        await vfsWrite(state.currentFile, content);
        
        // Update tab to show saved
        const filename = state.currentFile.split('/').pop();
        const tab = document.querySelector(`[data-file="${filename}"]`);
        if (tab) tab.classList.remove('modified');
        
        addMessage('system', `💾 Arquivo salvo: ${state.currentFile}`);
    }

    async function commitAndPush() {
        addMessage('system', '🔄 Preparando commit...');
        
        try {
            const code = getEditorContent();
            const filename = state.currentFile ? state.currentFile.split('/').pop() : 'page.tsx';

            const response = await fetch('/api/vortex/commit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename,
                    content: code,
                    message: `[Vórtex] Update ${filename} via AI Studio`
                })
            });

            const data = await response.json();
            if (data.success) {
                addMessage('ai', `✅ Commit realizado com sucesso!\n**SHA:** \`${data.sha?.substring(0, 7) || 'N/A'}\`\n**Mensagem:** ${data.message}`);
            } else {
                addMessage('system', `⚠️ Erro no commit: ${data.error}`);
            }
        } catch (err) {
            addMessage('system', `❌ Falha no commit: ${err.message}`);
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

        // 4. Init Monaco Editor (deferred for performance)
        setTimeout(async () => {
            await initMonaco();
        }, 300);

        // 5. Set initial preview
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
        setDevice: setPreviewDevice,
        toggleRule: toggleAbidosRule,
        saveToVFS,
        commitAndPush,
        getState: () => state
    };
})();
