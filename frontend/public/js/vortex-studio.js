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
        monacoReady: false,
        fs: null,               // LightningFS instance
        pfs: null,              // LightningFS Promises API
        contextHubEnabled: false
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

            // Init LightningFS for isomorphic-git
            if (window.LightningFS) {
                state.fs = new LightningFS('VortexGitFS');
                state.pfs = state.fs.promises;
                console.log('🌀 [VORTEX GIT] LightningFS initialized.');
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

            const payload = {
                prompt: typeof arguments[0] === 'string' ? arguments[0] : prompt,
                model,
                currentCode: currentCode !== defaultCode ? currentCode : '',
                abidosRules: state.abidosRules,
                context: abidosContext,
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
                                    setEditorContent(partialMatch[1].trimStart(), 'typescriptreact');
                                }
                            } else {
                                // Ainda não chegou no bloco <file>, mostrar texto bruto
                                setEditorContent(fullStreamText, 'typescriptreact');
                            }
                            break;

                        case 'complete':
                            // Metadados finais com código limpo
                            if (event.code) {
                                const audit = auditCode(event.code);
                                setEditorContent(event.code, event.language || 'typescriptreact');
                                updateFileTab(event.filename || 'page.tsx', true);

                                const filePath = `/src/app/${event.filename || 'page.tsx'}`;
                                await vfsWrite(filePath, event.code);
                                state.currentFile = filePath;

                                if (event.preview) {
                                    updatePreview(event.preview);
                                }

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

            if (data.preview) {
                updatePreview(data.preview);
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

        // 3. Check for CFP Forbidden Terms
        if (state.abidosRules.cfpTerms) {
            const forbidden = ['cura', 'curar', 'garantido', 'garantia de 100%', 'melhor serviço', 'o único'];
            forbidden.forEach(term => {
                if (code.toLowerCase().includes(term)) {
                    results.passes = false;
                    results.errors.push(`⚖️ ETHICS ALERT: Uso do termo proibido "${term}". Risco de suspensão pelo CFP.`);
                }
            });
        }

        // Update UI Status
        updateAuditUI(results);
        return results;
    }

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
    // PREVIEW
    // =========================================================================
    function updatePreview(htmlContent) {
        const frame = document.getElementById('vortex-preview-frame');
        if (!frame) return;

        // [PHASE 5.2] Sanitização Anti-Hallucination
        let processedHtml = htmlContent;
        // Fix for double-quoted/escaped CDN URLs common in AI JSON outputs
        processedHtml = processedHtml.replace(/src=["'](?:%22|\\")+(https:\/\/unpkg\.com\/lucide[^"']?.*?)(?:%22|\\")+["']/g, 'src="$1"');
        processedHtml = processedHtml.replace(/src=["'](?:%22|\\")+(https:\/\/cdn\.tailwindcss\.com[^"']?.*?)(?:%22|\\")+["']/g, 'src="$1"');

        // [PHASE 4.2] Injetar Web Vitals Telemetry
        const telemetryScript = `
            <script type="module">
                import { onLCP, onCLS, onINP } from 'https://unpkg.com/web-vitals@3?module';
                const send = (name, val) => window.parent.postMessage({ type: 'vortex-vital', name, value: val }, '*');
                onLCP(m => send('LCP', m.value));
                onCLS(m => send('CLS', m.value));
                onINP(m => send('INP', m.value));
            </script>
            <script>
                // Garantir que ícones lucide sejam criados após o carregamento
                window.addEventListener('load', () => {
                    if (window.lucide) window.lucide.createIcons();
                });
            </script>
        `;

        // Wrap in a full HTML document if needed
        let fullHtml = processedHtml;
        if (!processedHtml.includes('<!DOCTYPE') && !processedHtml.includes('<html')) {
            fullHtml = `<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.tailwindcss.com"></script>
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
        } else {
            // Case where it is already a full HTML, inject before </body> or </head>
            if (!fullHtml.includes('unpkg.com/lucide')) {
                fullHtml = fullHtml.replace('</head>', '<script src="https://unpkg.com/lucide@latest"></script></head>');
            }
            fullHtml = fullHtml.replace('</body>', `${telemetryScript}</body>`);
        }

        frame.srcdoc = fullHtml;
    }

    // [PHASE 4.2] Listener para Telemetria
    window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'vortex-vital') {
            const { name, value } = event.data;
            const el = document.getElementById(`vortex-${name.toLowerCase()}`);
            if (el) {
                let formatted = value;
                if (name === 'LCP' || name === 'INP') formatted = (value / 1000).toFixed(2) + 's';
                if (name === 'CLS') formatted = value.toFixed(3);
                el.innerText = formatted;

                // Color coding
                if (name === 'LCP') el.className = value < 2500 ? 'vortex-vital-value good' : value < 4000 ? 'vortex-vital-value neutral' : 'vortex-vital-value bad';
                if (name === 'CLS') el.className = value < 0.1 ? 'vortex-vital-value good' : value < 0.25 ? 'vortex-vital-value neutral' : 'vortex-vital-value bad';
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
        // Find matching paths for this filename (e.g. /src/app/page.tsx)
        const allFiles = await vfsList();
        const fileMatch = allFiles.find(f => f.name === filename || f.path.endsWith(filename));
        
        const filePath = fileMatch ? fileMatch.path : `/src/app/${filename}`;
        const content = await vfsRead(filePath);
        if (content) {
            setEditorContent(content);
            state.currentFile = filePath;
            updateFileTab(filename, false);
            addMessage('system', `📂 Arquivo aberto: ${filename}`);
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

        // Update tab to show saved
        const filename = state.currentFile.split('/').pop();
        const tab = document.querySelector(`[data-file="${filename}"]`);
        if (tab) tab.classList.remove('modified');
        
        addMessage('system', `💾 Arquivo salvo e espelhado: ${state.currentFile}`);
    }

    async function commitAndPush() {
        const code = getEditorContent();
        if (!code || code.length < 10) return addMessage('system', '⚠️ Código insuficiente para commit.');
        
        addMessage('system', '🚀 Preparando Deploy para Vercel...');
        
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
            } else {
                throw new Error(data.error || 'Erro desconhecido no commit.');
            }
        } catch (e) {
            console.error('Commit error:', e);
            addMessage('system', `⚠️ Falha no Deploy: ${e.message}`);
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
        syncContextHub,
        handleImageUpload,
        handleDrop,
        removeImage,
        setDevice: setPreviewDevice,
        toggleRule: toggleAbidosRule,
        saveToVFS,
        commitAndPush,
        repairCode,
        getState: () => state
    };
})();
