/**
 * NeuroEngine Copilot - Core Logic
 * Handles Chat, AI Studio, WP Integration and Method Abidos analysis.
 */

window.chatApp = {
    currentItemId: null,
    currentType: null,
    selectedElement: null,
    // [NOVO] Dados de Autoridade do Dr. Victor Lawrence (E-E-A-T)
    authorityContext: {
        name: "Victor Lawrence Bernardes Santana",
        crp: "09/012681",
        title: "Mestrando em Ciências da Saúde (UFU)",
        institution: "Instituto Lawrence de Hipnose Clínica",
        socials: {
            instagram: "https://www.instagram.com/hipnolawrence",
            doctoralia: "https://www.doctoralia.com.br/victor-lawrence-bernardes-santana/psicologo-terapeuta-complementar/goiania",
            whatsapp: "5562991545295"
        }
    },

    showNeuroToast(message, type = 'info') {
        const existingContainer = document.getElementById('neuro-toast-container');
        const container = existingContainer || document.createElement('div');
        if (!existingContainer) {
            container.id = 'neuro-toast-container';
            container.style.cssText = 'position:fixed; top:20px; right:20px; z-index:10000; display:flex; flex-direction:column; gap:10px; pointer-events:none;';
            document.body.appendChild(container);
            
            // Inject animation
            if (!document.getElementById('toast-style')) {
                const style = document.createElement('style');
                style.id = 'toast-style';
                style.innerHTML = `@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`;
                document.head.appendChild(style);
            }
        }

        const toast = document.createElement('div');
        const bgColor = type === 'success' ? '#10b981' : (type === 'error' ? '#ef4444' : '#3b82f6');
        toast.style.cssText = `background:${bgColor}; color:white; padding:12px 20px; border-radius:8px; font-size:13px; font-weight:bold; box-shadow:0 4px 12px rgba(0,0,0,0.15); animation: slideIn 0.3s ease-out; pointer-events:auto; cursor:pointer; min-width:200px; display:flex; align-items:center; gap:10px;`;
        toast.innerHTML = `<span>${type === 'success' ? '✅' : (type === 'error' ? '❌' : 'ℹ️')}</span> <span>${message}</span>`;
        
        toast.onclick = () => toast.remove();
        container.appendChild(toast);

        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.opacity = '0';
                toast.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
                toast.style.transform = 'translateX(20px)';
                setTimeout(() => toast.remove(), 500);
            }
        }, 5000);
    },
    mediaGallery: [], // Cache de mídias para a IA
    historyStack: [],  // Undo history
    redoStack: [],     // Redo history
    currentKeyword: '', // Store current keyword for AI sync
    lastGeneratedHtml: null, // [AUTO-DNA] Versão original gerada pela IA para comparação
    auditLog: [], // [GOVERNANÇA] Trilha de Auditoria Clínica

    connectSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        this.socket = new WebSocket(`${protocol}//${window.location.host}`);
        
        this.socket.onopen = () => console.log("📡 Conectado ao Fluxo de Log Real-time.");
        this.socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'agent_log') {
                    // REGRA DE OURO: No Studio, mostramos apenas logs da fase de CONSTRUÇÃO.
                    const studioAgents = ["Agente Construtor", "NeuroEngine", "Gerador", "Constructor"];
                    if (studioAgents.includes(data.agent)) {
                        const statusText = data.status + (data.reason ? ` (${data.reason})` : '');
                        this.addAgentLog(data.agent, statusText, data.isDone);
                    }
                }
            } catch (e) {
                console.error("Erro no processamento do log socket", e);
            }
        };
        
        this.socket.onclose = () => {
            console.warn("⚠️ Conexão de log perdida. Tentando reconectar em 5s...");
            setTimeout(() => this.connectSocket(), 5000);
        };
    },

    bindEvents() {
        this.setupEventListeners();
        this.setupInspector();
        this.setupKeyboardShortcuts();
        console.log("🧠 NeuroEngine Copilot Initialized");
    },

    init() {
        console.log("🤖 ChatApp (Abidos V4) Initialized.");
        this.addMessage("NeuroEngine AI online. Como posso ajudar com sua estratégia Abidos hoje?");
        this.bindEvents();
        this.connectSocket(); // Conecta ao Mission Control para logs reais
        
        // Log de inicialização de sessão (Governabilidade)
        this.addAuditLog("Psicólogo Victor Lawrence", "Sessão de construção clínica iniciada no AI Studio.", "human");
        
        // Inicializa resumo de parâmetros
        this.updatePreflightSummary();
    },

    // --- HISTORY (Undo / Redo) ---
    saveHistory() {
        const preview = document.getElementById('live-preview');
        this.historyStack.push(preview.innerHTML);
        this.redoStack = []; // clear redo on new change
        if (this.historyStack.length > 50) this.historyStack.shift();
    },

    undoHistory() {
        const preview = document.getElementById('live-preview');
        if (this.historyStack.length === 0) {
            this.addMessage("↩️ Nada para desfazer.", false);
            return;
        }
        this.redoStack.push(preview.innerHTML);
        preview.innerHTML = this.historyStack.pop();
        this.addMessage("↩️ Desfeito.", false);
    },

    redoHistory() {
        const preview = document.getElementById('live-preview');
        if (this.redoStack.length === 0) {
            this.addMessage("↪️ Nada para refazer.", false);
            return;
        }
        this.historyStack.push(preview.innerHTML);
        preview.innerHTML = this.redoStack.pop();
        this.addMessage("↪️ Refeito.", false);
    },

    // --- DELETE SELECTED ---
    deleteSelected() {
        if (!this.selectedElement) {
            this.addMessage("🗑️ Clique em um elemento no Preview para selecioná-lo antes de deletar.", false);
            return;
        }

        const previewContainer = document.getElementById('live-preview');

        // PROTEÇÃO: Não permitir deletar o container raiz ou elementos críticos do painel
        if (this.selectedElement === previewContainer || 
            this.selectedElement.id === 'live-preview' || 
            this.selectedElement.closest('.float-controls') ||
            !previewContainer.contains(this.selectedElement)) {
            this.addMessage("⚠️ Operação negada: Você tentou deletar um container do sistema ou um elemento fora do canvas.", false);
            return;
        }

        if (!confirm(`Deletar elemento <${this.selectedElement.tagName.toLowerCase()}>?`)) return;
        this.saveHistory();
        this.selectedElement.remove();
        this.selectedElement = null;
        this.hideMicroCommandsMenu();
        this.addMessage("🗑️ Elemento deletado. Use ↩️ Desfazer se necessário.", false);
    },

    // --- KEYBOARD SHORTCUTS ---
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'z') { e.preventDefault(); this.undoHistory(); }
            if (e.ctrlKey && e.key === 'y') { e.preventDefault(); this.redoHistory(); }
            if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedElement && document.activeElement.tagName !== 'TEXTAREA' && document.activeElement.tagName !== 'INPUT') {
                e.preventDefault();
                this.deleteSelected();
            }
        });
    },

    // --- JACKAL PANEL TOGGLE ---
    toggleJackal() {
        const panel = document.getElementById('jackal-panel');
        const buttons = document.getElementById('jackal-buttons');
        const isOpen = buttons.style.display === 'flex';
        if (isOpen) {
            buttons.style.display = 'none';
            panel.style.width = '40px';
        } else {
            buttons.style.display = 'flex';
            panel.style.width = '110px';
        }
    },

    // --- Keyword helper (from header dropdown) ---
    getKeyword() {
        const sel = document.getElementById('ai-studio-keyword');
        return (sel && sel.value) ? sel.value : 'psicólogo especialista em Goiânia';
    },

    // --- SISTEMA DE BLOCOS MODULAR (Método Abidos) ---
    // Delega para window.AbidosBlocks definido em js/blocks.js.
    // Cada bloco = seção HTML autossuficiente com <style> interno (Mobile-First).
    // INSTRUÇÃO ELEMENTOR: Cole cada bloco no Widget HTML — nunca no Editor de Texto.
    insertAbidosBlock(blockType) {
        const preview = document.getElementById('live-preview');
        if (preview.style.display === 'none') {
            preview.style.display = 'block';
            const welcome = document.getElementById('blueprint-welcome');
            if (welcome) welcome.style.display = 'none';
        }
        this.saveHistory();

        const kw  = this.getKeyword();
        const lib = window.AbidosBlocks;

        let inserted = false;
        if (blockType === 'hero') {
            const h = lib.get('h1', kw);
            const s = lib.get('subtitulo', kw);
            const c = lib.get('cta', kw);
            if (h && s && c) {
                preview.insertAdjacentHTML('afterbegin', h + s + c);
                inserted = true;
            }
        } else {
            const html = lib.get(blockType, kw);
            if (html) {
                preview.insertAdjacentHTML('beforeend', html);
                inserted = true;
            }
        }

        if (!inserted) {
            this.addMessage(`⚠️ Bloco "${blockType}" não reconhecido.`, false);
            return;
        }

        this.injectCopyButtons();

        this.addMessage(
            `✅ Bloco **${blockType}** inserido!\n\n` +
            `👉 **Como publicar no WordPress/Elementor:**\n` +
            `1. Passe o mouse sobre o bloco → clique **📋 Copiar Bloco**\n` +
            `2. No Elementor: arraste um widget **HTML** (nunca "Editor de Texto")\n` +
            `3. Cole e clique em **Publicar**`,
            false
        );
    },

    // --- Copia o HTML de um bloco isolado ---
    copyBlock(sectionEl) {
        const clone = sectionEl.cloneNode(true);
        clone.querySelectorAll('.bloco-copy-btn').forEach(b => b.remove());
        const html = clone.outerHTML;
        const msg  = '📋 Bloco copiado!\n\nCole no **Widget HTML** do Elementor (nunca no Editor de Texto).';
        if (navigator.clipboard) {
            navigator.clipboard.writeText(html).then(() => this.addMessage(msg, false));
        } else {
            const ta = document.createElement('textarea');
            ta.value = html;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            this.addMessage(msg, false);
        }
    },

    // --- Injeta botões "📋 Copiar" e "🗑️ Excluir" em cada <section data-bloco> ---
    injectCopyButtons() {
        const preview = document.getElementById('live-preview');
        preview.querySelectorAll('section[data-bloco]').forEach(sec => {
            if (sec.querySelector('.bloco-controls')) return;
            sec.style.position = 'relative';

            const controls = document.createElement('div');
            controls.className = 'bloco-controls';
            Object.assign(controls.style, {
                position: 'absolute', top: '10px', right: '10px',
                display: 'flex', gap: '5px', opacity: '0', transition: 'opacity .2s', zIndex: '999',
                background: 'rgba(30, 41, 59, 0.7)', padding: '5px', borderRadius: '8px', backdropFilter: 'blur(5px)'
            });

            // Botão Comando (Novo)
            const btnCmd = this.createControlButton('🪄 Comando', '#6366f1', () => {
                this.selectedElement = sec;
                this.showCustomCommandBox(sec);
            });
            
            // Botão Nova Sugestão (Novo)
            const btnSug = this.createControlButton('✨ Nova Sugestão', '#10b981', () => {
                this.executeMicroCommand('Gere uma nova variante completa para este bloco, mantendo a estrutura mas mudando o texto e tom');
            });

            // Botão Copiar
            const btnCopy = this.createControlButton('📋 Copiar', '#1e293b', () => this.copyBlock(sec));

            // Botão Estilo (Local)
            const btnStyle = this.createControlButton('🎨', '#f59e0b', (e) => this.showGlobalStyleMenu(e.clientX, e.clientY, sec));

            // Botão Excluir
            const btnDel = this.createControlButton('🗑️', '#ef4444', () => this.deleteBlock(sec));

            // Botão Inserir (+)
            const btnAdd = this.createControlButton('➕', '#3b82f6', (e) => this.showBlockInserterMenu(e.clientX, e.clientY, sec));

            controls.appendChild(btnCmd);
            controls.appendChild(btnSug);
            controls.appendChild(btnStyle);
            controls.appendChild(btnCopy);
            controls.appendChild(btnAdd);
            controls.appendChild(btnDel);
            sec.appendChild(controls);

            sec.onmouseenter = () => controls.style.opacity = '1';
            sec.onmouseleave = () => controls.style.opacity = '0';
        });
    },

    createControlButton(text, bg, onclick) {
        const btn = document.createElement('button');
        btn.textContent = text;
        Object.assign(btn.style, {
            background: bg, color: 'white', border: 'none',
            padding: '6px 10px', borderRadius: '6px', fontSize: '11px',
            cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap'
        });
        btn.onclick = (e) => { e.stopPropagation(); onclick(e); };
        return btn;
    },

    deleteBlock(sec) {
        if (!confirm("Deseja realmente excluir este bloco inteiro?")) return;
        this.saveHistory();
        sec.remove();
        this.updateAbidusScore();
        this.addMessage("🗑️ Bloco removido.");
    },

    showBlockInserterMenu(x, y, relativeTo = null) {
        let menu = document.getElementById('block-inserter-menu');
        if (!menu) {
            menu = document.createElement('div');
            menu.id = 'block-inserter-menu';
            menu.style.cssText = 'position: fixed; z-index: 10001; background: #1e293b; color: white; border-radius: 8px; box-shadow: var(--shadow-xl); padding: 8px; display: flex; flex-direction: column; gap: 4px; min-width: 180px; max-height: 400px; overflow-y: auto;';
            document.body.appendChild(menu);
        }

        const blocks = window.AbidosBlocks.getList();
        let html = `<div style="font-size: 10px; font-weight: bold; color: #94a3b8; padding: 4px 8px; border-bottom: 1px solid #334155; margin-bottom: 4px;">🎯 INSERIR BLOCO ABIDOS</div>`;
        
        let lastGroup = '';
        blocks.forEach(b => {
            if (b.group !== lastGroup) {
                html += `<div style="font-size: 9px; color: #6366f1; margin-top: 6px; padding: 0 8px;">${b.group}</div>`;
                lastGroup = b.group;
            }
            html += `<button onclick="window.chatApp.insertBlockAt('${b.id}', ${relativeTo ? 'true' : 'false'})" style="background: transparent; color: #e2e8f0; border: none; text-align: left; padding: 6px 8px; border-radius: 4px; cursor: pointer; font-size: 12px; transition: background .2s;" onmouseover="this.style.background='#334155'" onmouseout="this.style.background='transparent'">${b.label}</button>`;
        });

        menu.innerHTML = html;
        menu.style.left = `${Math.min(x, window.innerWidth - 200)}px`;
        menu.style.top = `${Math.min(y, window.innerHeight - 300)}px`;
        menu.style.display = 'flex';

        // Fechar ao clicar fora
        const closer = (e) => {
            if (!menu.contains(e.target)) {
                menu.style.display = 'none';
                document.removeEventListener('mousedown', closer);
            }
        };
        setTimeout(() => document.addEventListener('mousedown', closer), 10);
        
        // Armazenar referência para inserção
        this.insertTarget = relativeTo;
    },

    insertBlockAt(blockId, isRelative) {
        const kw = this.getKeyword();
        const html = window.AbidosBlocks.get(blockId, kw);
        const preview = document.getElementById('live-preview');
        
        if (!html) return;
        this.saveHistory();

        if (isRelative && this.insertTarget) {
            this.insertTarget.insertAdjacentHTML('afterend', html);
        } else {
            preview.insertAdjacentHTML('beforeend', html);
        }

        document.getElementById('block-inserter-menu').style.display = 'none';
        this.injectCopyButtons();
        this.updateAbidusScore();
        this.addMessage(`✅ Bloco **${blockId}** inserido!`);
    },

    setupEventListeners() {
        const chatInput = document.getElementById('chat-input');
        const btnSend = document.getElementById('btn-send-chat');
        const btnSnap = document.getElementById('btn-snap-error');

        btnSend.addEventListener('click', () => this.sendMessage(false));
        btnSnap.addEventListener('click', () => {
            if (!chatInput.value.trim()) {
                chatInput.value = "Por favor, olhe como a página está ficando. Pode corrigir a formatação?";
            }
            this.sendMessage(true);
        });

        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage(false);
            }
        });
    },

    setupInspector() {
        const preview = document.getElementById('live-preview');
        preview.addEventListener('click', (e) => {
            const validTags = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'li', 'a', 'strong', 'em', 'button'];
            const tagName = e.target.tagName.toLowerCase();

            if (!validTags.includes(tagName)) return;

            e.preventDefault();
            e.stopPropagation();

            // Limpa seleção anterior
            if (this.selectedElement) {
                this.selectedElement.classList.remove('element-selected', 'outline-blue');
                this.selectedElement.style.outline = '';
            }

            this.selectedElement = e.target;
            this.selectedElement.classList.add('element-selected', 'outline-blue');
            this.selectedElement.style.outline = '2px dashed #3b82f6';
            this.selectedElement.style.outlineOffset = '2px';

            this.showMicroCommandsMenu(e.target, e.clientX, e.clientY);
        });

        // Clique com botão direito ou segurando ALT para mostrar caixa de comando direto
        preview.addEventListener('contextmenu', (e) => {
            const valid = ['p', 'h1', 'h2', 'h3', 'span', 'li', 'a', 'section', 'div', 'img'];
            // Impede selecionar o próprio container do preview ou elementos estruturais
            if (valid.includes(e.target.tagName.toLowerCase()) && e.target.id !== 'live-preview') {
                e.preventDefault();
                this.selectedElement = e.target;
                this.showCustomCommandBox(e.target);
            }
        });

        // Permitir seleção de IMAGENS especificamente
        preview.addEventListener('click', (e) => {
            if (e.target.tagName === 'IMG') {
                e.preventDefault();
                e.stopPropagation();
                if (this.selectedElement) this.selectedElement.style.outline = '';
                this.selectedElement = e.target;
                this.selectedElement.style.outline = '4px solid #ef4444';
                this.showMicroCommandsMenu(e.target, e.clientX, e.clientY, true);
            }
        });

        // Fechar menu ao clicar fora
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#micro-commands-menu') && !e.target.closest('#live-preview')) {
                this.hideMicroCommandsMenu();
            }
        });
    },

    showMicroCommandsMenu(target, x, y, isImage = false) {
        let menu = document.getElementById('micro-commands-menu');
        if (!menu) {
            menu = document.createElement('div');
            menu.id = 'micro-commands-menu';
            menu.style.cssText = 'position: fixed; z-index: 10000; background: white; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); padding: 5px; display: flex; flex-direction: column; gap: 5px; min-width: 150px;';
            document.body.appendChild(menu);
        }

        if (isImage) {
            menu.innerHTML = `
                <div style="font-size: 10px; font-weight: bold; color: #64748b; padding: 4px 5px; border-bottom: 1px solid #f1f5f9; margin-bottom: 3px;">Comandos de Imagem</div>
                <button onclick="window.chatApp.openMediaPicker()" class="btn" style="background: #eff6ff; color: #1d4ed8; font-size: 11px; text-align: left; padding: 6px 10px; border: none; border-radius: 4px; cursor: pointer;">🖼️ Trocar Imagem WP</button>
                <button onclick="window.chatApp.executeMicroCommand('Sugira e troque esta imagem por uma mais adequada ao contexto da clínica de psicologia victor lawrence')" class="btn" style="background: #f0fdf4; color: #166534; font-size: 11px; text-align: left; padding: 6px 10px; border: none; border-radius: 4px; cursor: pointer;">🪄 Sugestão IA</button>
                <button onclick="window.chatApp.deleteSelected()" class="btn" style="background: #fee2e2; color: #ef4444; font-size: 11px; text-align: left; padding: 6px 10px; border: none; border-radius: 4px; cursor: pointer;">🗑️ Excluir Imagem</button>
                <button onclick="window.chatApp.hideMicroCommandsMenu()" class="btn" style="background: transparent; color: #94a3b8; font-size: 10px; text-align: center; margin-top: 3px; padding: 4px; border: none; cursor: pointer; width: 100%;">✕ Cancelar</button>
            `;
        } else {
            const linkEl = target.closest('a');
            let linkBtn = '';
            if (linkEl) {
                linkBtn = `<button onclick="window.chatApp.editSelectedLink()" class="btn" style="background: #fff7ed; color: #c2410c; font-size: 11px; text-align: left; padding: 6px 10px; border: none; border-radius: 4px; cursor: pointer;">🔗 Editar Link (href)</button>`;
            }

            menu.innerHTML = `
                <div style="font-size: 10px; font-weight: bold; color: #64748b; padding: 4px 5px; border-bottom: 1px solid #f1f5f9; margin-bottom: 3px; cursor: default;">Micro-Comandos IA</div>
                <button onclick="window.chatApp.editSelectedManually()" class="btn" style="background: #1e293b; color: white; font-size: 11px; text-align: left; padding: 6px 10px; border: none; border-radius: 4px; cursor: pointer;">✏️ Editar Texto e Estilo</button>
                ${linkBtn}
                <button onclick="window.chatApp.executeMicroCommand('Reescreva de forma mais empática, acolhedora e focada na dor emocional do paciente')" class="btn" style="background: #eff6ff; color: #1d4ed8; font-size: 11px; text-align: left; padding: 6px 10px; border: none; border-radius: 4px; cursor: pointer;">🪄 + Empático</button>
                <button onclick="window.chatApp.executeMicroCommand('Reescreva com mais autoridade clínica profissional, adicionando tom técnico de psicologia')" class="btn" style="background: #fdf2f8; color: #be185d; font-size: 11px; text-align: left; padding: 6px 10px; border: none; border-radius: 4px; cursor: pointer;">🪄 + Clínico</button>
                <button onclick="window.chatApp.executeMicroCommand('Reescreva de forma mais curta, concisa e direta ao ponto')" class="btn" style="background: #f0fdf4; color: #15803d; font-size: 11px; text-align: left; padding: 6px 10px; border: none; border-radius: 4px; cursor: pointer;">🪄 Mais Curto</button>
                
                <div style="border-top: 1px solid #f1f5f9; margin-top: 3px; padding-top: 3px;">
                    <button onclick="window.chatApp.showBlockInserterMenu(event.clientX, event.clientY, window.chatApp.selectedElement.closest('section'))" class="btn" style="background: #f8fafc; color: #334155; font-size: 11px; text-align: left; padding: 6px 10px; border: none; border-radius: 4px; cursor: pointer; width: 100%;">➕ Inserir Bloco Aqui</button>
                    <button onclick="window.chatApp.deleteBlock(window.chatApp.selectedElement.closest('section'))" class="btn" style="background: #fee2e2; color: #ef4444; font-size: 11px; text-align: left; padding: 6px 10px; border: none; border-radius: 4px; cursor: pointer; width: 100%; margin-top: 2px;">🗑️ Excluir Seção Inteira</button>
                </div>

                <button onclick="window.chatApp.hideMicroCommandsMenu()" class="btn" style="background: transparent; color: #94a3b8; font-size: 10px; text-align: center; margin-top: 3px; padding: 4px; border: none; cursor: pointer; width: 100%;">✕ Cancelar</button>
            `;
        }

        // Evitar que o menu saia da tela
        const menuWidth = 150;
        const menuHeight = 160;
        const adjustedX = x + menuWidth > window.innerWidth ? window.innerWidth - menuWidth - 20 : x + 15;
        const adjustedY = y + menuHeight > window.innerHeight ? window.innerHeight - menuHeight - 20 : y + 15;

        menu.style.left = `${adjustedX}px`;
        menu.style.top = `${adjustedY}px`;
        menu.style.display = 'flex';
    },

    hideMicroCommandsMenu() {
        const menu = document.getElementById('micro-commands-menu');
        if (menu) menu.style.display = 'none';
        if (this.selectedElement) {
            this.selectedElement.classList.remove('element-selected', 'outline-blue');
            this.selectedElement.style.outline = '';
        }
        this.closeManualEdit();
    },

    editSelectedLink() {
        if (!this.selectedElement) return;
        const linkEl = this.selectedElement.tagName === 'A' ? this.selectedElement : this.selectedElement.closest('a');
        if (!linkEl) return;
        
        const currentUrl = linkEl.getAttribute('href') || '#';
        const newUrl = prompt("Digite a nova URL para este botão/link:", currentUrl);
        
        if (newUrl !== null) {
            linkEl.setAttribute('href', newUrl);
            this.addMessage(`✅ Link atualizado para: **${newUrl}**`, false);
            this.updateAbidusScore(); // Recalcula o score Abidos
        }
        this.hideMicroCommandsMenu();
    },

    // ── EDIÇÃO MANUAL ────────────────────────────────────────────────────────
    editSelectedManually() {
        if (!this.selectedElement) return;
        this.hideMicroCommandsMenu();

        this.selectedElement.contentEditable = 'true';
        this.selectedElement.focus();

        const bar = document.getElementById('manual-edit-bar');
        if (!bar) return;
        const rect = this.selectedElement.getBoundingClientRect();
        bar.style.display = 'flex';
        bar.style.left = `${Math.max(10, rect.left)}px`;
        bar.style.top = `${Math.max(10, rect.top - 55)}px`;

        const style = window.getComputedStyle(this.selectedElement);
        const colorInput = document.getElementById('edit-color');
        const sizeSelect = document.getElementById('edit-size');
        if (colorInput) colorInput.value = this.rgbToHex(style.color);
        if (sizeSelect) {
            const fSize = parseInt(style.fontSize);
            const closest = Array.from(sizeSelect.options).reduce((a, b) =>
                Math.abs(parseInt(b.value) - fSize) < Math.abs(parseInt(a.value) - fSize) ? b : a
            );
            sizeSelect.value = closest.value;
        }
    },

    rgbToHex(rgb) {
        if (!rgb || !rgb.startsWith('rgb')) return '#000000';
        const vals = rgb.match(/\d+/g);
        if (!vals) return '#000000';
        return '#' + vals.slice(0, 3).map(x => {
            const h = parseInt(x).toString(16);
            return h.length === 1 ? '0' + h : h;
        }).join('');
    },

    applyManualStyle(prop, val) {
        if (!this.selectedElement) return;
        this.saveHistory();
        this.selectedElement.style[prop] = val;
    },

    closeManualEdit() {
        if (this.selectedElement && this.selectedElement.contentEditable === 'true') {
            this.selectedElement.contentEditable = 'false';
        }
        const bar = document.getElementById('manual-edit-bar');
        if (bar) bar.style.display = 'none';
    },

    // ── MEDIA PICKER ─────────────────────────────────────────────────────────
    async openMediaPicker(callback) {
        const modal = document.getElementById('media-picker-modal');
        const grid  = document.getElementById('media-picker-grid'); // Changed from media-grid to media-picker-grid
        if (!modal || !grid) return;

        modal.style.display = 'flex';
        grid.innerHTML = '<p style="grid-column:1/4;text-align:center;color:#64748b;padding:20px;">⏳ Carregando biblioteca...</p>';

        // Use visualAssets if available, otherwise fetch from WP
        const mediaToDisplay = this.visualAssets && this.visualAssets.length > 0
            ? this.visualAssets.map(url => ({ source_url: url, alt_text: 'Imagem do repositório' }))
            : await wpAPI.fetchMedia(24);
        
        grid.innerHTML = '';
        if (!mediaToDisplay || mediaToDisplay.length === 0) {
            grid.innerHTML = '<p style="grid-column:1/4;text-align:center;color:#94a3b8;">Nenhuma imagem encontrada na biblioteca.</p>';
            return;
        }
        mediaToDisplay.forEach(m => {
            const img = document.createElement('img');
            img.src = m.source_url;
            img.title = m.alt_text || m.slug;
            img.style.cssText = 'width:100%;height:80px;object-fit:cover;cursor:pointer;border-radius:6px;border:2px solid transparent;transition:border-color .15s,transform .15s;';
            img.onmouseover = () => { img.style.borderColor = '#6366f1'; img.style.transform = 'scale(1.04)'; };
            img.onmouseout  = () => { img.style.borderColor = 'transparent'; img.style.transform = ''; };
            img.onclick = () => {
                if (callback) callback(m.source_url);
                else this.insertImageAtCanvas(m.source_url, m.alt_text || '');
                modal.style.display = 'none';
            };
            grid.appendChild(img);
        });
    },

    closeMediaPicker() {
        document.getElementById('media-picker-modal').style.display = 'none';
    },

    insertImageAtCanvas(url, alt) {
        this.saveHistory();
        const html = `<img src="${url}" alt="${alt}" style="width:100%;max-width:600px;height:auto;display:block;margin:20px auto;border-radius:12px;box-shadow:0 4px 15px rgba(0,0,0,0.1);">`;

        if (this.selectedElement && this.selectedElement.tagName === 'IMG') {
            this.selectedElement.src = url;
            this.selectedElement.alt = alt;
        } else if (this.selectedElement) {
            this.selectedElement.insertAdjacentHTML('afterend', html);
        } else {
            const preview = document.getElementById('live-preview');
            if (preview) {
                if (preview.innerText.includes('Crie algo') || preview.style.display === 'none') {
                    preview.style.display = 'block';
                    preview.innerHTML = '';
                }
                preview.insertAdjacentHTML('beforeend', html);
            }
        }
        this.addMessage('🖼️ Imagem inserida com sucesso no canvas.');
        this.injectCopyButtons();
    },

    async executeMicroCommand(instruction) {
        if (!this.selectedElement) return;

        const target = this.selectedElement;
        const originalContent = target.outerHTML;
        
        if (target.tagName !== 'IMG') target.innerText = "⏳ Reescrevendo...";
        this.hideMicroCommandsMenu();

        try {
            const prompt = `Você é um Copywriter Clínico focado em Psicologia (Método Abidos). Sua tarefa é reescrever o texto ou trocar a imagem a seguir aplicando esta exata instrução: "${instruction}".\n\nOriginal: "${originalContent}"\n\nREGRAS CRÍTICAS:\n- Se for texto: Retorne APENAS o texto puro renovado.\n- Se for imagem: Retorne APENAS a nova tag <img src="..." alt="...">.\n- Não forneça explicações.`;
            
            this.saveHistory(); // Salva estado antes da mudança
            let newContent = null;
            
            const formData = new FormData();
            formData.append('message', prompt);
            if (this.currentKeyword) formData.append('currentKeyword', this.currentKeyword);
            
            // WhatsApp dinâmico
            const waInput = document.getElementById('setting-whatsapp');
            if (waInput && waInput.value) formData.append('whatsapp', waInput.value);
            
            const response = await fetch('/api/chat', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            newContent = data.reply;

            if (newContent) {
                if (target.tagName === 'IMG') {
                    const temp = document.createElement('div');
                    temp.innerHTML = newContent.trim();
                    const newImg = temp.querySelector('img');
                    if (newImg) {
                        target.src = newImg.src;
                        target.alt = newImg.alt;
                    }
                } else {
                    let cleanedText = newContent.replace(/<[^>]*>?/gm, '').replace(/^"|"$/g, '').trim();
                    target.innerText = cleanedText;
                }
                this.addMessage(`✅ Elemento atualizado via Micro-Comando.`, false);
            } else {
                throw new Error("Resposta vazia da IA");
            }
        } catch (error) {
            console.error("MicroCommand Error:", error);
            if (target.tagName !== 'IMG' && typeof originalContent !== 'undefined') target.innerHTML = originalContent;
            alert("Erro ao processar comando IA.");
        }
    },

    showCustomCommandBox(target) {
        const box = document.getElementById('custom-command-box');
        const tag = document.getElementById('cc-target-tag');
        const input = document.getElementById('custom-command-input');
        
        tag.textContent = target.tagName;
        box.style.display = 'flex';
        
        // Posicionar próximo ao elemento (se possível) ou centro
        const rect = target.getBoundingClientRect();
        box.style.left = `${Math.min(rect.left, window.innerWidth - 320)}px`;
        box.style.top = `${Math.min(rect.bottom + 10, window.innerHeight - 200)}px`;
        
        input.value = '';
        input.focus();
    },

    hideCustomCommandBox() {
        document.getElementById('custom-command-box').style.display = 'none';
    },

    async applyCustomCommand() {
        const input = document.getElementById('custom-command-input');
        const instruction = input.value.trim();
        if (!instruction) return;
        
        this.hideCustomCommandBox();
        await this.executeMicroCommand(instruction);
    },

    visualAssets: [
        "https://hipnolawrence.com/wp-content/uploads/2026/03/Facetune_23-05-2023-21-43-27.jpg",
        "https://hipnolawrence.com/wp-content/uploads/2026/03/IMG_4469.jpg",
        "https://hipnolawrence.com/wp-content/uploads/2026/03/IMG_4511.jpg",
        "https://hipnolawrence.com/wp-content/uploads/2026/03/IMG_5605.jpg",
        "https://hipnolawrence.com/wp-content/uploads/2026/02/IMG_0876.jpg",
        "https://hipnolawrence.com/wp-content/uploads/2026/03/IMG_4875.jpg",
        "https://hipnolawrence.com/wp-content/uploads/2026/03/IMG_2046.jpg",
        "https://hipnolawrence.com/wp-content/uploads/2026/03/5b6b7fbf-d665-4d68-96b0-aa8d28890ac.jpg",
        "https://hipnolawrence.com/wp-content/uploads/2026/03/palestra-IFG2.jpeg",
        "https://hipnolawrence.com/wp-content/uploads/2026/03/11148819_865048126899579_5754455918839697297_o.jpg",
        "https://hipnolawrence.com/wp-content/uploads/2026/03/defesa-TCC.jpg",
        "https://hipnolawrence.com/wp-content/uploads/2026/02/IMG_0298-scaled.jpeg",
        "https://hipnolawrence.com/wp-content/uploads/2026/02/IMG_0312-scaled.jpeg",
        "https://hipnolawrence.com/wp-content/uploads/2026/02/IMG_0359-scaled.jpeg",
        "https://hipnolawrence.com/wp-content/uploads/2026/03/98593981-F8A7-4F8E-86A4-BBF2C04F704C.jpg"
    ],

    // Novo: Escuta do Canvas para Troca de Imagem
    initCanvasEvents() {
        const preview = document.getElementById('live-preview');
        if (!preview) return;

        preview.addEventListener('click', (e) => {
            if (e.target.tagName === 'IMG') {
                e.preventDefault();
                e.stopPropagation();
                // Oferece troca de imagem
                this.addMessage("📸 **Modo Edição de Imagem Ativado.** Selecione a nova foto no Repositório Abidos.");
                this.openMediaPicker((url) => {
                    e.target.src = url;
                    this.addMessage("✅ Imagem atualizada com sucesso no rascunho.");
                });
            }
        });
    },

    showGlobalStyleMenu(x, y, target = null) {
        let menu = document.getElementById('global-style-menu');
        if (!menu) {
            menu = document.createElement('div');
            menu.id = 'global-style-menu';
            menu.style.cssText = 'position: fixed; z-index: 10002; background: #1e293b; color: white; border-radius: 12px; box-shadow: var(--shadow-2xl); padding: 12px; width: 240px; max-height: 80vh; overflow-y: auto;';
            document.body.appendChild(menu);
        }

        const themes = [
            { name: 'Modern Dark', colors: ['#0f172a', '#1e293b', '#38bdf8'] },
            { name: 'Clinical White', colors: ['#ffffff', '#f8fafc', '#0ea5e9'] },
            { name: 'Professional Blue', colors: ['#1e40af', '#eff6ff', '#1d4ed8'] },
            { name: 'Warm Empathy', colors: ['#78350f', '#fffbeb', '#d97706'] }
        ];

        const fonts = [
            { name: 'Inter (Moderno)', pair: 'Inter, sans-serif' },
            { name: 'Outfit (Premium)', pair: 'Outfit, sans-serif' },
            { name: 'Roboto (Clinico)', pair: 'Roboto, sans-serif' },
            { name: 'Merriweather (Serif)', pair: 'Merriweather, serif' }
        ];

        let html = `<div style="font-size: 11px; font-weight: bold; margin-bottom: 10px; color: #94a3b8;">${target ? '🎨 ESTILO DO BLOCO' : '🎨 ESTILO GLOBAL'}</div>`;
        
        // Cores
        html += `<div style="font-size: 10px; color: #64748b; margin-bottom: 5px;">PALETA DE CORES</div>`;
        html += `<div style="display: grid; grid-template-columns: 1fr; gap: 6px; margin-bottom: 15px;">`;
        themes.forEach(t => {
            html += `
                <button onclick="window.chatApp.applyTheme('${t.name}', ${target ? 'true' : 'false'})" style="background:#334155; border:none; color:white; padding:8px; border-radius:6px; font-size:12px; cursor:pointer; display:flex; align-items:center; gap:8px; text-align:left; transition: background .2s;" onmouseover="this.style.background='#475569'">
                    <div style="display:flex; gap:2px;">
                        ${t.colors.map(c => `<div style="width:8px; height:8px; border-radius:50%; background:${c}"></div>`).join('')}
                    </div>
                    ${t.name}
                </button>
            `;
        });
        html += `</div>`;

        // Tipografia
        html += `<div style="font-size: 10px; color: #64748b; margin-bottom: 5px;">TIPOGRAFIA / FONTES</div>`;
        html += `<div style="display: grid; grid-template-columns: 1fr; gap: 6px;">`;
        fonts.forEach(f => {
            html += `
                <button onclick="window.chatApp.applyFont('${f.pair}', ${target ? 'true' : 'false'})" style="background:#334155; border:none; color:white; padding:8px; border-radius:6px; font-size:12px; cursor:pointer; font-family:${f.pair}; text-align:left; transition: background .2s;" onmouseover="this.style.background='#475569'">
                    Aa - ${f.name}
                </button>
            `;
        });
        html += `</div>`;
        
        menu.innerHTML = html;
        menu.style.left = `${Math.min(x, window.innerWidth - 240)}px`;
        menu.style.top = `${Math.min(y, window.innerHeight - 200)}px`;
        menu.style.display = 'block';

        const closer = (e) => {
            if (!menu.contains(e.target)) {
                menu.style.display = 'none';
                document.removeEventListener('mousedown', closer);
            }
        };
        setTimeout(() => document.addEventListener('mousedown', closer), 10);
    },

    async applyTheme(themeName, isLocal = false) {
        const targetDesc = isLocal ? "este bloco selecionado" : "toda a página (rascunho inteiro)";
        const instruction = `Aplique o tema visual "${themeName}" em ${targetDesc}. Mude cores de fundo, cores de texto e botões para seguirem esta paleta. Mantenha o equilíbrio visual profissional e legível.`;
        
        document.getElementById('global-style-menu').style.display = 'none';
        
        if (isLocal && this.selectedElement) {
            await this.executeMicroCommand(instruction);
        } else {
            this.addMessage(`🎨 Aplicando tema **${themeName}** globalmente...`);
            // Aqui enviamos para o chat geral para reformular tudo
            document.getElementById('chat-input').value = instruction;
            this.sendMessage(false);
        }
    },

    async applyFont(fontStack, isLocal = false) {
        const targetDesc = isLocal ? "este bloco selecionado" : "toda a página (rascunho inteiro)";
        const instruction = `Altere a tipografia (família de fontes) para "${fontStack}" em ${targetDesc}. Garanta que os H1, H2 e textos fiquem visualmente elegantes e profissionais usando esta fonte.`;
        
        document.getElementById('global-style-menu').style.display = 'none';
        
        if (isLocal && this.selectedElement) {
            await this.executeMicroCommand(instruction);
        } else {
            this.addMessage(`🔡 Aplicando fonte **${fontStack}** globalmente...`);
            document.getElementById('chat-input').value = instruction;
            this.sendMessage(false);
        }
    },

    async generateBlueprint(theme) {
        // Mostra o loading state
        const welcomeContainer = document.getElementById('blueprint-welcome');
        if (welcomeContainer) welcomeContainer.style.display = 'none';
        
        const preview = document.getElementById('live-preview');
        preview.style.display = 'block';
        preview.innerHTML = `<div style="text-align:center; padding-top: 100px;">
            <div class="spinner" style="font-size:40px;">⚙️</div>
            <h3 style="color:#334155; margin-top:20px;">Montando Blueprint: ${theme}</h3>
            <p style="color:#64748b; font-size:14px;">Injetando Método Abidos... isso leva em média 10 segundos.</p>
        </div>`;
        
        const chatCanvas = document.getElementById('studio-canvas');
        if(chatCanvas) chatCanvas.classList.add('split-active');
        const studioSidebarArea = document.getElementById('studio-sidebar');
        if (studioSidebarArea) studioSidebarArea.style.display = 'flex'; // Mostra sidebar de edição
        
        // Define o contexto SEO sugerido baseado no Blueprint para o frontend e chat
        document.getElementById('seo-context').value = theme;
        document.getElementById('ai-studio-new-title').value = `Campanha ${theme}`;
        
        try {
            const formData = new FormData();
            formData.append('theme', theme);
            
            // Clima Clínico Selecionado
            const moodSelector = document.getElementById('global-mood-selector');
            if (moodSelector) formData.append('moodId', moodSelector.value);

            // Tipo de Conteúdo (Silo/Page ou Spoke/Post)
            const typeSelector = document.getElementById('ai-studio-type');
            if (typeSelector) formData.append('type', typeSelector.value);

            // WhatsApp dinâmico
            const waInput = document.getElementById('setting-whatsapp');
            if (waInput && waInput.value) {
                formData.append('whatsapp', waInput.value);
                this.authorityContext.socials.whatsapp = waInput.value;
            } else {
                formData.append('whatsapp', this.authorityContext.socials.whatsapp);
            }
            
            const response = await fetch('/api/blueprint', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) throw new Error(`Network response was not ok: ${response.status}`);
            
            const data = await response.json();
            
            if (data.html) {
                preview.innerHTML = data.html;
                this.addMessage(`✅ Blueprint de **${theme}** gerado com sucesso. Clique em qualquer texto à esquerda para usar os Micro-Comandos.`, false);
                // Automatiza Geração do SEO
                this.generateSEOMeta();
            } else {
                throw new Error("HTML não retornado pela API");
            }
        } catch (error) {
            console.error("Blueprint Error:", error);
            preview.innerHTML = `<div style="text-align:center; padding-top: 100px; color:red;">
                <h3>Status Vermelho</h3><p>Ocorreu um erro (${error.message}) ao gerar o Blueprint. O servidor Node.js está rodando?</p>
                <button class="btn" onclick="window.location.reload()">Recarregar Studio</button>
            </div>`;
        }
    },
    
    openCodeImport() {
        const preview = document.getElementById('live-preview');
        const welcomeContainer = document.getElementById('blueprint-welcome');
        if (welcomeContainer) welcomeContainer.style.display = 'none';

        const chatCanvas = document.getElementById('studio-canvas');
        if(chatCanvas) chatCanvas.classList.add('split-active');
        const studioSidebarArea = document.getElementById('studio-sidebar');
        if (studioSidebarArea) studioSidebarArea.style.display = 'flex';
        
        preview.style.display = 'block';
        preview.innerHTML = `
            <div style="padding: 20px; text-align: center; margin-top: 40px; background: #f8fafc; border-radius: 12px; border: 2px dashed #cbd5e1; max-width: 800px; margin-left: auto; margin-right: auto;">
                <h3 style="color: #334155; margin-bottom: 20px; font-size: 18px;">📦 Cole o código HTML do WordPress</h3>
                <textarea id="import-code-textarea" placeholder="Cole o código do Elementor/Rascunho (<section>...) aqui..." style="width: 100%; height: 400px; padding: 15px; border-radius: 8px; border: 1px solid #cbd5e1; font-family: monospace; font-size: 13px; outline: none; resize: vertical; margin-bottom: 10px;"></textarea>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button onclick="window.chatApp.submitImportedCode()" class="btn btn-primary" style="padding: 12px 24px; font-size: 14px; background: #6366f1; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">Carregar no Canvas 🎬</button>
                    <button onclick="window.location.reload()" class="btn btn-secondary" style="padding: 12px 24px; font-size: 14px; background: #e2e8f0; color: #475569; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">Cancelar</button>
                </div>
            </div>
        `;
        this.addMessage("📦 Modo de importação ativado. Cole o código HTML à esquerda e clique em Carregar.", false);
    },

    submitImportedCode() {
        const textarea = document.getElementById('import-code-textarea');
        if(!textarea || !textarea.value.trim()) return alert("O código está vazio!");
        const preview = document.getElementById('live-preview');
        preview.innerHTML = textarea.value;
        this.addMessage("✅ Código carregado no canvas com sucesso! Você pode usar os Micro-Comandos clicando nos blocos ou comandar no chat.", false);
        this.generateSEOMeta();
    },

    async auditAbidos() {
        const preview = document.getElementById('live-preview');
        const currentHtml = preview.innerHTML;
        const keyword = document.getElementById('ai-studio-keyword').value || 'Terapia em Goiânia';

        if(currentHtml.trim().length === 0 || currentHtml.includes('Crie algo novo')) {
            this.addMessage("⚠️ Rascunho vazio. Gere um Blueprint ou adicione conteúdo antes de auditar.", false);
            return;
        }

        this.addMessage("🔍 Rodando Auditoria Abidos...", false);
        
        try {
            const formData = new FormData();
            formData.append('html', currentHtml);
            formData.append('keyword', keyword);
            
            const response = await fetch('/api/audit', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error(`Network response was not ok: ${response.status}`);
            
            const data = await response.json();
            
            if (data.checklist) {
                this.renderAuditFeedback(data.checklist);
            } else {
                throw new Error("Checklist não retornado.");
            }
        } catch (error) {
            console.error("Audit Error:", error);
            alert("🚨 Erro na auditoria. Verifique a conexão com o servidor local.");
            this.addMessage("❌ Falha ao rodar Auditoria Abidos.");
        }
        
        this.addAuditLog("Agente Auditor", "Auditoria de SEO Local e Autoridade (Abidos) concluída.", "ia");
    },

    // --- GOVERNANCE & AUDIT LOG ---
    addAuditLog(actor, message, type = 'human') {
        const timestamp = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        this.auditLog.unshift({ actor, message, type, time: timestamp });
        if (this.auditLog.length > 20) this.auditLog.pop();
        this.renderAuditTimeline();
    },

    renderAuditTimeline() {
        const container = document.getElementById('audit-timeline');
        if (!container) return;
        
        container.innerHTML = '';
        if (this.auditLog.length === 0) {
            container.innerHTML = '<p style="text-align:center; font-size:11px; color:#94a3b8;">Nenhum registro de auditoria nesta sessão.</p>';
            return;
        }

        this.auditLog.forEach(log => {
            const item = document.createElement('div');
            item.className = 'timeline-item';
            item.innerHTML = `
                <div class="timeline-dot ${log.type}"></div>
                <div class="timeline-content">
                    <div class="timeline-time">${log.time}</div>
                    <span class="timeline-actor">${log.actor}</span>
                    <div style="font-size: 11px; color: #475569; line-height: 1.3;">${log.message}</div>
                </div>
            `;
            container.appendChild(item);
        });
    },

    openAuditModal() {
        document.getElementById('modal-audit-log').style.display = 'flex';
        this.renderAuditTimeline();
    },

    closeAuditModal() {
        document.getElementById('modal-audit-log').style.display = 'none';
    },

    // --- UI HELPERS (Chips & Pre-flight) ---

    insertPresetPrompt(type) {
        const input = document.getElementById('chat-input');
        const presets = {
            'Refinar Termos Clínicos': "Reescreva este trecho utilizando terminologia clínica mais precisa, porém acessível, focando em evidências das neurociências.",
            'Adaptar para Leigo': "Simplifique a linguagem deste parágrafo para que um paciente sem formação técnica compreenda perfeitamente as dores e soluções.",
            'Revisão Ética CFP': "Revise o conteúdo para garantir total conformidade com o Código de Ética do Psicólogo (CFP), eliminando qualquer tom de promessa de cura.",
            'Diagnóstico Tardio TEA': "Aprofunde a discussão sobre os desafios do diagnóstico tardio em adultos, mencionando especificamente o fenômeno do Mascaramento (Masking)."
        };
        
        const message = presets[type] || "";
        if (input.value.trim() === "") {
            input.value = message;
        } else {
            input.value += "\n\n" + message;
        }
        input.focus();
    },

    updatePreflightSummary() {
        const silo = document.getElementById('seo-silo')?.value || '---';
        const context = document.getElementById('seo-context')?.value || '---';
        const keywordSelect = document.getElementById('ai-studio-keyword');
        const keyword = keywordSelect?.options[keywordSelect.selectedIndex]?.text || '---';

        const siloEl = document.getElementById('preflight-silo');
        const contextEl = document.getElementById('preflight-context');
        const keywordEl = document.getElementById('preflight-keyword');

        if (siloEl) siloEl.innerText = silo;
        if (contextEl) contextEl.innerText = context;
        if (keywordEl) keywordEl.innerText = keyword;
    },

    renderAuditFeedback(checklist) {
        const chatHistory = document.getElementById('chat-history');
        const msgDiv = document.createElement('div');
        msgDiv.style.padding = '10px 15px';
        msgDiv.style.borderRadius = '10px 10px 10px 0';
        msgDiv.style.alignSelf = 'flex-start';
        msgDiv.style.maxWidth = '85%';
        msgDiv.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
        msgDiv.style.background = '#fef2f2';
        msgDiv.style.border = '1px solid #fee2e2';

        let html = '<div style="font-weight:bold; color:#b91c1c; margin-bottom: 8px;">📋 Checklist Método Abidos:</div><ul style="padding-left: 20px; list-style-type: none; margin: 0; color: #7f1d1d; font-size: 12px; display:flex; flex-direction:column; gap:8px;">';
        
        checklist.forEach(item => {
            if (item.passou) {
                html += `<li style="display:flex; align-items:flex-start; gap:5px;"><span style="color:#15803d; font-weight:bold;">✅</span> <span>${item.criterio}</span></li>`;
            } else {
                let actionBtn = "";
                if (item.acao) {
                    actionBtn = `<button onclick="window.chatApp.injectBlock('${item.acao}')" style="margin-top:4px; padding:3px 8px; font-size:10px; border:none; background:#991b1b; color:white; border-radius:3px; cursor:pointer;">Inserir Bloco</button>`;
                }
                html += `<li style="display:flex; align-items:flex-start; gap:5px;"><span style="color:#b91c1c; font-weight:bold;">❌</span> <div><span>${item.criterio}</span><br>${actionBtn}</div></li>`;
            }
        });
        
        html += '</ul>';
        msgDiv.innerHTML = html;
        chatHistory.appendChild(msgDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    },

    injectBlock(action) {
        const preview = document.getElementById('live-preview');
        let blockHtml = "";
        
        if (action === "inserir_prova_social") {
            blockHtml = `
                <section class="abidos-social-proof" style="padding: 40px 20px; background: #fffbe8; border-top: 1px solid #fef08a;">
                    <h2 style="text-align:center; color:#854d0e;">O que dizem os pacientes</h2>
                    <div style="display:flex; justify-content:center; gap:20px; margin-top:20px; flex-wrap:wrap;">
                        <div style="background:white; padding:15px; border-radius:8px; width:250px; box-shadow:0 2px 4px rgba(0,0,0,0.05);">⭐️⭐️⭐️⭐️⭐️<br>"Encontrei no Dr. Lawrence um espaço seguro para falar sobre meu diagnóstico tardio."<br><em>- M. S.</em></div>
                        <div style="background:white; padding:15px; border-radius:8px; width:250px; box-shadow:0 2px 4px rgba(0,0,0,0.05);">⭐️⭐️⭐️⭐️⭐️<br>"A hipnose ajudou a focar e a entender o meu burnout."<br><em>- J. P.</em></div>
                    </div>
                </section>`;
        } else if (action === "inserir_cta") {
            blockHtml = `
                <div class="abidos-cta-block" style="text-align:center; padding: 20px; margin: 20px 0;">
                    <a href="https://wa.me/${this.whatsapp}" style="background:#16a34a; color:white; padding: 12px 24px; font-weight:bold; border-radius:30px; text-decoration:none; display:inline-block;">Agendar Avaliação via WhatsApp</a>
                </div>`;
        }

        if (blockHtml) {
            preview.innerHTML += blockHtml;
            this.addMessage("✅ Bloco injetado no final da página. Revise o Live Preview.", false);
        }
    },
    
    addMessage(text, isUser = false) {
        const chatHistory = document.getElementById('chat-history');
        const msgDiv = document.createElement('div');
        msgDiv.style.padding = '10px 15px';
        msgDiv.style.borderRadius = isUser ? '10px 10px 0 10px' : '10px 10px 10px 0';
        msgDiv.style.alignSelf = isUser ? 'flex-end' : 'flex-start';
        msgDiv.style.maxWidth = '85%';
        msgDiv.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
        
        if (isUser) {
            msgDiv.style.background = '#1e293b';
            msgDiv.style.color = 'white';
            msgDiv.innerHTML = `<strong>Você:</strong><br>${text.replace(/\n/g, '<br>')}`;
        } else {
            msgDiv.style.background = '#e0f2fe';
            msgDiv.style.color = '#0369a1';
            
            // Formatando blocos de código HTML (Refatorado para Injeção Não-Destrutiva)
            let formattedText = text.replace(/```html([\s\S]*?)```/g, (match, p1) => {
                return `<br><br><div style="background:#1e293b; color:#fbbf24; padding:10px; border-radius:5px; font-family:monospace; font-size:12px; overflow-x:auto;">${p1.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
                <div style="margin-top:8px; display:flex; gap:5px; align-items:center;">
                    <select class="injection-mode" style="padding:4px; font-size:11px; border-radius:4px; border:1px solid #cbd5e1;">
                        <option value="append">➕ Adicionar ao Final</option>
                        <option value="prepend">🔙 Adicionar ao Início</option>
                        <option value="replace">🔄 Substituir Tudo</option>
                    </select>
                    <button onclick="window.injectCode(this)" data-code="${encodeURIComponent(p1)}" style="padding:5px 12px; background:#6366f1; color:white; border:none; border-radius:4px; cursor:pointer; font-size:11px; font-weight:bold;">⚡ Aplicar no Canvas</button>
                </div><br><br>`;
            });

            // Formatando markdown básico
            formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            msgDiv.innerHTML = `<strong>NeuroEngine AI:</strong><br>${formattedText}`;
        }
        
        chatHistory.appendChild(msgDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    },

    async sendMessage(hasScreenshot = false) {
        const chatInput = document.getElementById('chat-input');
        const btnSend = document.getElementById('btn-send-chat');
        const livePreview = document.getElementById('live-preview');

        const message = chatInput.value.trim();
        if (!message) return;

        chatInput.value = '';
        
        if (hasScreenshot) {
            this.addMessage(message + "<br><em>📸 (Anexou Visualização da Tela)</em>", true);
        } else {
            this.addMessage(message, true);
        }

        btnSend.innerHTML = '⚙️ Agindo...';
        btnSend.disabled = true;

        // --- INÍCIO DO FLUXO MULTI-AGENTE ---
        await this.runAgentChain(message, livePreview.innerHTML, hasScreenshot);
        
        btnSend.innerHTML = '🚀 Executar';
        btnSend.disabled = false;
    },

    async addAgentLog(agent, status, isDone = false) {
        const headerLog = document.getElementById('agent-log-content-header');
        if (headerLog) {
            headerLog.innerHTML = `<span style="color:#94a3b8;">[${agent}]</span> ${status}`;
            if (isDone) {
                headerLog.style.color = '#10b981';
                setTimeout(() => {
                    headerLog.innerHTML = `🛡️ Agente ${agent} concluiu a missão.`;
                }, 3000);
            } else {
                headerLog.style.color = '#3b82f6';
            }
        }
        
        const logPanel = document.getElementById('agent-logs-panel');
        if (logPanel) {
            const entry = document.createElement('div');
            entry.className = 'agent-log-entry';
            entry.style.cssText = 'font-size: 11px; margin-bottom: 5px; border-bottom: 1px solid #f1f5f9; padding-bottom: 3px;';
            entry.innerHTML = `<span style="font-weight:bold; color:#1e293b;">${agent}:</span> ${status}`;
            logPanel.prepend(entry);
        }
    },

    async runAgentChain(userMessage, currentHtml, hasScreenshot) {
        const logPanel = document.getElementById('agent-logs-panel');
        const content = document.getElementById('agent-log-content');
        
        if (logPanel) logPanel.style.display = 'block';
        if (content) content.innerHTML = '';

        this.addAgentLog("Agente Construtor", "Sintetizando DNA clínico e estruturando rascunho...", false);

        const formData = new FormData();
        const kw = document.getElementById('ai-studio-keyword')?.value || 'psicologia';

        // CONSOLIDADO MASTER PROTOCOLO V5 (PREÂMBULO OBRIGATÓRIO)
        let promptContext = `Você opera no Modo Headless V5. Sua saída DEVE ser exclusivamente um JSON plano. 
        Não use tags H na UI (apenas div/span estilizados). 
        Siga o Manual de Governança para escolher o Shell de 01 a 11. 
        Use Dados E-E-A-T reais de Victor Lawrence.
        
        DIRETRIZES TÉCNICAS:
        1. SEO INVISÍVEL: Preencha a camada técnica (seo_h1_tecnico, etc) com rigor semântico.
        2. DESIGN PREMIUM: Vidromorfismo, bordas 12px e tipografia Inter.
        3. ÉTICA CFP: Bloqueie promessas de cura ou depoimentos.
        
        [DADOS DO USUÁRIO]: ${userMessage}`;

        // Style/Tone rules do Reverse Prompt Engineering
        const toneRules = localStorage.getItem('user_tone_rules');
        if (toneRules) promptContext += `\n\n[STYLE RULES]: ${toneRules}`;

        // Autoridade E-E-A-T
        promptContext += `\n\n[AUTORIDADE]: Psicólogo ${this.authorityContext.name} (${this.authorityContext.crp}). Clínica: ${this.authorityContext.institution}.`;

        // Mídia
        if (this.mediaGallery && this.mediaGallery.length > 0) {
            const mediaLinks = this.mediaGallery.slice(0, 10).map(m => `[URL: ${m.source_url}] Alt: ${m.alt_text}`).join('\n');
            promptContext += `\n\n[MIDIAS DISPONÍVEIS]:\n${mediaLinks}`;
        }

        // Elemento Selecionado
        if (this.selectedElement) {
            promptContext += `\n\n[AJUSTE FINO]: Altere este elemento:\n${this.selectedElement.outerHTML}`;
        }

        formData.append('prompt', promptContext);
        if (currentHtml) formData.append('htmlContext', currentHtml);
        
        // Recupera o Clima Clínico Selecionado
        const moodSelector = document.getElementById('global-mood-selector');
        if (moodSelector) formData.append('moodId', moodSelector.value);

        // Recupera o Tipo de Conteúdo
        const typeSelector = document.getElementById('ai-studio-type');
        if (typeSelector) formData.append('type', typeSelector.value || 'pages');

        // WhatsApp dinâmico das configurações
        const waInput = document.getElementById('setting-whatsapp');
        if (waInput && waInput.value) {
            formData.append('whatsapp', waInput.value);
            this.authorityContext.socials.whatsapp = waInput.value;
        } else {
            formData.append('whatsapp', this.whatsapp); // Use this.whatsapp if setting-whatsapp is empty
        }

        if (hasScreenshot && window.html2canvas) {
            const canvas = await html2canvas(document.getElementById('live-preview'));
            const blob = await new Promise(resolve => canvas.toBlob(resolve));
            formData.append('screenshot', blob, 'preview.png');
        }

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                body: formData
            });
            const rawData = await response.text();
            
            // BLINDAGEM JSON: Remove markdown e limpa espaços
            let cleanJson = rawData.replace(/```json|```/g, "").trim();
            const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
            if (jsonMatch) cleanJson = jsonMatch[0];

            let data;
            try {
                data = JSON.parse(cleanJson);
            } catch (e) {
                console.warn("Retorno da IA não é um JSON padrão. Buscando campo 'reply'...", e);
                data = { reply: rawData };
            }
            
            await this.addAgentLog("NeuroEngine AI", "Decisão Final Tomada", true);

            if (data?.reply) {
                this.addMessage(data.reply, false);
                if (data.diff) {
                    const diffPanel = document.getElementById('diff-panel');
                    const diffContent = document.getElementById('diff-content');
                    if (diffPanel) diffPanel.style.display = 'block';
                    if (diffContent) diffContent.innerHTML = data.diff;
                }
            } else {
                this.addMessage("⚠️ IA retornou uma resposta sem campo 'reply'.", false);
            }
        } catch (error) {
            console.error(error);
            this.addMessage("❌ Erro na comunicação com os agentes.", false);
        } finally {
            if (logPanel) setTimeout(() => { logPanel.style.display = 'none'; }, 5000);
        }
    },

    // --- LAYOUT CONTROLS ---

    toggleHeaderAI() {
        const header = document.getElementById('studio-header');
        const btn = event.currentTarget;
        if (header.classList.contains('collapsed')) {
            header.classList.remove('collapsed');
            header.style.maxHeight = '300px';
            header.style.padding = '10px 20px';
            header.style.opacity = '1';
            header.style.pointerEvents = 'auto';
            btn.innerHTML = '🔼';
        } else {
            header.classList.add('collapsed');
            header.style.maxHeight = '0';
            header.style.padding = '0';
            header.style.opacity = '0';
            header.style.pointerEvents = 'none';
            btn.innerHTML = '🔽';
        }
    },

    toggleSidebarAI() {
        const sidebar = document.querySelector('.studio-sidebar');
        const btn = event.currentTarget;
        if (sidebar.classList.contains('collapsed')) {
            sidebar.classList.remove('collapsed');
            btn.innerHTML = '▶️';
        } else {
            sidebar.classList.add('collapsed');
            btn.innerHTML = '◀️';
        }
    },

    previewLive() {
        if (!this.currentItemId) return alert("Salve um rascunho primeiro para visualizar no site.");
        const baseUrl = wpAPI.url.replace('/wp-json/wp/v2', '').replace(/\/$/, '');
        window.open(`${baseUrl}/?p=${this.currentItemId}&preview=true`, '_blank');
    },

    async publishWP() {
        if (!this.currentItemId) return alert("Salve um rascunho antes de publicar.");
        if (!confirm("Deseja publicar esta página oficialmente no site?")) return;

        const btn = event.currentTarget;
        const originalText = btn.innerText;
        btn.innerText = "🚀 Publicando..."; btn.disabled = true;

        const result = await wpAPI.saveContent(this.currentType, { status: 'publish' }, this.currentItemId);
        if (result) {
            alert("Página publicada com sucesso!");
            this.addMessage("✅ **Página Publicada!** Ela agora está visível para o público.");
        }
        btn.innerText = originalText; btn.disabled = false;
    },

    onSEOContextChange() {
        const ctx = document.getElementById('seo-context').value;
        const kw = document.getElementById('ai-studio-keyword').value;
        
        if (ctx) this.currentKeyword = kw || ctx;
        if (kw) this.currentKeyword = kw;
        
        console.log(`🎯 Contexto Abidos atualizado: ${ctx} | KW: ${kw}`);
        
        // Se o título estiver vazio, sugere um baseado no contexto
        const titleInput = document.getElementById('ai-studio-new-title');
        if (titleInput && !titleInput.value) {
            this.suggestTitle();
        }
        this.updatePreflightSummary();
    },

    // --- WP INTEGRATION ---

    async loadList(selectedId = null) {
        const typeSelect = document.getElementById('ai-studio-type');
        const itemSelect = document.getElementById('ai-studio-item');
        const type = typeSelect.value;
        
        itemSelect.innerHTML = '<option>Carregando...</option>';
        itemSelect.style.display = 'block';

        const data = await wpAPI.fetchContent(type);
        
        // Sincroniza mídias para o contexto da IA
        this.mediaGallery = await wpAPI.fetchMedia(20);
        
        if(!data || data.length === 0) {
            itemSelect.innerHTML = '<option>Nenhum item encontrado.</option>';
            return;
        }

        itemSelect.innerHTML = '<option value="">-- Selecione para Editar --</option>';
        data.forEach(item => {
            const title = item.title && item.title.rendered ? item.title.rendered : `Sem Título #${item.id}`;
            const statusLabel = item.status === 'publish' ? '[PUBLICADO]' : '[RASCUNHO]';
            const isSelected = selectedId && parseInt(item.id) === parseInt(selectedId) ? 'selected' : '';
            itemSelect.innerHTML += `<option value="${item.id}" data-status="${item.status}" data-title="${title}" ${isSelected}>${statusLabel} ${title}</option>`;
        });
        
        document.getElementById('ai-studio-load-btn')?.remove(); // Not needed if we use onchange or separate btn
        // Let's keep a Load Button for safety
        const existingBtn = document.getElementById('ai-studio-load-btn');
        if(!existingBtn) {
            const btn = document.createElement('button');
            btn.id = 'ai-studio-load-btn';
            btn.className = 'btn btn-primary';
            btn.style.padding = '5px 10px';
            btn.innerText = '📥 Carregar';
            btn.onclick = () => this.loadItem();
            itemSelect.after(btn);
        }
    },

    async loadItem() {
        const type = document.getElementById('ai-studio-type').value;
        const id = document.getElementById('ai-studio-item').value;
        if(!id) return;

        const titleSpan = document.getElementById('ai-studio-title');
        titleSpan.innerText = `⏳ Baixando do WordPress...`;

        const data = await wpAPI.getContent(type, id);
        if(data) {
            this.currentItemId = id;
            this.currentType = type;

            const preview = document.getElementById('live-preview');
            const contentHtml = data.content?.rendered || data.content?.raw || '';

            if (contentHtml.trim()) {
                preview.style.display = 'flex';
                // Remove placeholder se existir
                const placeholder = document.getElementById('canvas-placeholder');
                if (placeholder) placeholder.remove();
                
                preview.innerHTML = contentHtml;
                this.injectCopyButtons();
                this.updateAbidusScore();
                titleSpan.innerText = `Editando: ${data.title?.rendered || data.title || 'Sem Título'}`;
                this.addMessage(`✅ Carreguei **${data.title?.rendered || 'página'}**. O que deseja ajustar?`);
            } else {
                // Conteúdo não veio (WAF bloqueou) - mostra aviso amigável
                titleSpan.innerText = `⚠️ Carregado parcialmente: ${data.title?.rendered || ''}`;
                this.addMessage(`⚠️ Carregado apenas os metadados de **${data.title?.rendered || 'página'}** — o conteúdo HTML foi bloqueado pelo servidor de segurança do Hostinger (ModSecurity). Você pode começar a escrever do zero ou usar um Blueprint.`);
            }

            document.getElementById('ai-studio-new-title').style.display = 'none';
            const acceptBtn = document.getElementById('ai-studio-accept-btn');
            if (acceptBtn) acceptBtn.style.display = 'none';

            const suggestBtn = document.getElementById('ai-studio-suggest-btn');
            if (suggestBtn) suggestBtn.style.display = 'none';

            const previewBtn = document.getElementById('ai-studio-preview-btn');
            if (previewBtn) previewBtn.style.display = 'block';

            const itemSelect = document.getElementById('ai-studio-item');
            if (itemSelect) itemSelect.style.display = 'block';
        }
    },


    createNew() {
        this.currentItemId = null;
        this.currentType = document.getElementById('ai-studio-type').value;
        
        document.getElementById('ai-studio-item').style.display = 'none';
        const titleInput = document.getElementById('ai-studio-new-title');
        titleInput.style.display = 'block';
        titleInput.value = "";
        titleInput.focus();
        
        const acceptBtn = document.getElementById('ai-studio-accept-btn');
        if (acceptBtn) acceptBtn.style.display = 'block';

        const suggestBtn = document.getElementById('ai-studio-suggest-btn');
        if (suggestBtn) suggestBtn.style.display = 'block';

        const previewCanvas = document.getElementById('live-preview');
        if (previewCanvas) {
            previewCanvas.innerHTML = `
                <div id="canvas-placeholder" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; min-height: 600px; color: #cbd5e1; user-select: none;">
                    <div style="font-size: 60px; margin-bottom: 20px; opacity: 0.5;">📄</div>
                    <h2 style="font-size: 20px; font-weight: 700; color: #94a3b8;">Mapa em Branco</h2>
                    <p style="font-size: 14px; color: #94a3b8; max-width: 300px; text-align: center;">Comande a IA no chat lateral para começar a construir sua estratégia Abidos v4.</p>
                </div>`;
        }
        
        const titleLabel = document.getElementById('ai-studio-title');
        if (titleLabel) titleLabel.innerText = "Novo Rascunho";
        
        this.addMessage(`Pronto! Digite o título, clique em ✅ para confirmar e use os botões de prompts rápidos para começar.`);
    },

    acceptTitle() {
        const title = document.getElementById('ai-studio-new-title').value.trim();
        if(!title) return alert("Digite o título primeiro.");
        this.addMessage(`Título **"${title}"** aceito! Vou usá-lo como base para os comandos.`);
        document.getElementById('ai-studio-title').innerText = `Rascunho: ${title}`;
    },

    async saveToWP() {
        const titleInput = document.getElementById('ai-studio-new-title');
        const isNew = !this.currentItemId;
        const newTitle = titleInput.value.trim();
        const type = document.getElementById('ai-studio-type').value;

        if (isNew && !newTitle) return alert("Digite um título.");

        const htmlContent = document.getElementById('live-preview')?.innerHTML;
        const slug = document.getElementById('seo-slug')?.value?.trim();
        
        const payload = { 
            content: htmlContent, 
            status: "draft" 
        };

        if (isNew) payload.title = newTitle;
        if (slug) payload.slug = slug;

        // Feedback Visual
        const saveBtn = document.querySelector('button[onclick*="saveToWP"]');
        const originalText = saveBtn ? saveBtn.innerHTML : "💾 SALVAR RASCUNHO";
        if (saveBtn) {
            saveBtn.innerHTML = '<i class="animate-spin">⏳</i> Salvando...';
            saveBtn.disabled = true;
        }

        try {
            const result = await wpAPI.saveContent(type, payload, this.currentItemId);
            
            if(result && result.id) {
                this.currentItemId = result.id;
                this.currentType = type;
                if (titleInput) titleInput.style.display = 'none';
                
                const suggestBtn = document.getElementById('ai-studio-suggest-btn');
                const previewBtn = document.getElementById('ai-studio-preview-btn');
                const titleHeading = document.getElementById('ai-studio-title');
                
                if (suggestBtn) suggestBtn.style.display = 'none';
                if (previewBtn) previewBtn.style.display = 'block';
                if (titleHeading) titleHeading.innerText = `Rascunho: ${result.title?.rendered || newTitle}`;
                
                this.showNeuroToast("Rascunho salvo no banco de dados local.", "success");
                
                // Recarrega a lista para o novo rascunho aparecer no dropdown e mantém selecionado
                this.loadList(result.id);
            }
        } catch (error) {
            console.error("Salvar WP Erro:", error);
            this.showNeuroToast("Falha ao salvar rascunho. Verifique a conexão.", "error");
        } finally {
            if (saveBtn) {
                saveBtn.innerHTML = originalText;
                saveBtn.disabled = false;
            }
        }
    },

    // --- ANALYTICS & TOOLS ---

    async suggestTitle() {
        const kw = document.getElementById('ai-studio-keyword').value || document.getElementById('seo-context').value;
        if (!kw) return alert("Por favor, selecione um Contexto Ouro ou Keyword primeiro.");

        this.addAgentLog("NeuroEngine", "Raciocinando sobre estratégia de SEO e conversão...", false);
        
        const prompt = `Gere uma estratégia de SEO Abidos para um post/página de psicologia.
                        KEYWORD ALVO: "${kw}".
                        ESPECIALISTA: Dr. Victor Lawrence (Goiânia).
                        
                        RETORNE APENAS UM JSON VÁLIDO no seguinte formato:
                        {
                          "title": "Um título irresistível focado em dor e solução",
                          "slug": "url-amigavel-com-keywords",
                          "titleTag": "Title Tag SEO otimizada (máx 60 caracteres)",
                          "metaDescription": "Meta Description persuasiva de alta conversão (máx 155 caracteres)"
                        }
                        
                        REGRAS: 
                        - Aplique o Método Abidos (E-E-A-T, Prova Social implícita, Foco Local).
                        - Pense como um anúncio de alta performance no Google Ads.
                        - Não retorne nenhum outro texto fora do JSON.`;
        
        try {
            const rawResponse = await gemini.callAPI(prompt);
            
            // BLINDAGEM JSON
            const cleanJson = rawResponse.replace(/```json|```/g, "").trim();
            const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
            const data = JSON.parse(jsonMatch ? jsonMatch[0] : cleanJson);

            if (data?.title) {
                const titleInput = document.getElementById('ai-studio-new-title');
                const slugInput = document.getElementById('seo-slug');
                const tagInput = document.getElementById('seo-title-tag');
                const descInput = document.getElementById('seo-meta-desc');

                if (titleInput) titleInput.value = data.title || "";
                if (slugInput) slugInput.value = data.slug || "";
                if (tagInput) tagInput.value = data.titleTag || "";
                if (descInput) descInput.value = data.metaDescription || "";
                
                this.addAgentLog("NeuroEngine", "Estratégia de SEO sugerida com sucesso.", true);
                this.addMessage(`🪄 **Estratégia Abidos Gerada!**\n\n📌 **Título:** ${data.title}\n🔗 **Slug:** ${data.slug}\n🔍 **SEO:** Otimizado com foco em Google Ads.`);
            }
        } catch (e) {
            console.error("Erro ao sugerir título:", e);
            this.addAgentLog("NeuroEngine", "Erro ao processar sugestão estratégica.", true);
            try {
                const title = await gemini.callAPI(`Retorne APENAS um título curto para a keyword: ${kw}`);
                const titleInput = document.getElementById('ai-studio-new-title');
                if (titleInput) titleInput.value = title.trim();
            } catch (innerE) {}
        }
    },

    async generateDraft() {
        const title = document.getElementById('ai-studio-new-title').value;
        const kw = document.getElementById('ai-studio-keyword').value || document.getElementById('seo-context').value;
        const type = document.getElementById('ai-studio-type').value;
        const templateName = document.getElementById('ai-studio-template').value;

        if (!title) return alert("Por favor, defina um título para o rascunho.");
        if (!templateName) return alert("Por favor, selecione um Blueprint de Design.");

        this.addMessage(`🏗️ **Iniciando Protocolo Headless Assembly (V5)...**\nBlueprint: **${templateName}**\nAlvo: **${title}**\nContexto: **${kw || 'Psicologia Clínica'}**`);
        
        const preview = document.getElementById('live-preview');
        preview.innerHTML = '<div style="display:flex; flex-direction:column; justify-content:center; align-items:center; height:400px; background:white;"><div class="loader"></div><p style="margin-top:20px; font-weight:bold; color:#1e293b; font-family:sans-serif;">🔨 Agente de Injeção está processando o Blueprint...</p><p style="font-size:12px; color:#64748b;">(Preenchendo variáveis {{ }} com alta persuasão Abidos)</p></div>';

        try {
            // 1. CARREGA O TEMPLATE
            const templateResp = await fetch(`/templates/${templateName}`);
            let templateHtml = await templateResp.text();

            // Extrai variáveis
            const matches = templateHtml.match(/\{\{([a-zA-Z0-9_-]+)\}\}/g) || [];
            const uniqueVars = [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '')))];

            // 2. SOLICITA À IA APENAS OS TEXTOS (COPY-FIRST)
            const prompt = `VOCÊ É O AGENTE DE INJEÇÃO ABIDOS V5. Sua missão é preencher as variáveis do template "${templateName}" para o tópico: "${title}".
                            
                            DADOS DO CONTEXTO:
                            - Título: ${title}
                            - Keyword Alvo: ${kw}
                            - Tipo: ${type}
                            
                            LISTA DE VARIÁVEIS {{ }} IDENTIFICADAS NO TEMPLATE (PREENCHA TODAS):
                            ${uniqueVars.join(', ')}
                            
                            REGRAS DE OURO (PROTOCOLO HEADLESS):
                            - SEO INVISÍVEL: Preencha as variáveis de SEO (seo_h1, seo_h2_dor, etc) com hierarquia semântica rigorosa (Goiânia inclusa).
                            - VISUAL ESTÉTICO: Nas variáveis de exibição visual, use apenas <div> e <span>. NÃO use H1-H3.
                            - CÓDIGO: NÃO gere HTML estrutural. Gere APENAS um JSON plano com os valores para cada variável.
                            - GATILHOS: Use gatilhos mentais de autoridade, escassez e quebra de objeções clínica.
                            
                            Retorne APENAS o JSON plano: { "var1": "valor", "var2": "valor" }`;

            const formData = new FormData();
            formData.append('message', prompt);
            formData.append('currentKeyword', kw);
            
            // Timeout de 15 segundos para resiliência
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            try {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    body: formData,
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                
                const data = await response.json();

                if (data?.reply) {
                    // BLINDAGEM JSON
                    const cleanJson = data.reply.replace(/```json|```/g, "").trim();
                    const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
                    let varsData = {};
                    
                    try {
                        varsData = JSON.parse(jsonMatch ? jsonMatch[0] : cleanJson);
                    } catch (e) {
                        throw new Error("Agente retornou JSON malformado.");
                    }

                    // 3. ASSEMBLE (MONTAGEM DO HEADLESS)
                    let finalHtml = templateHtml;
                    for (let key in varsData) {
                        const value = varsData[key] || ""; // Fallback para string vazia
                        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
                        finalHtml = finalHtml.replace(regex, value);
                    }

                    this.saveHistory();
                    if (preview) {
                        preview.innerHTML = finalHtml;
                        this.lastGeneratedHtml = finalHtml;
                        document.getElementById('studio-canvas')?.scrollTo(0, 0);
                    }
                    
                    this.injectCopyButtons();
                    this.updateAbidusScore();
                    this.showNeuroToast("Assemble Concluído! Conteúdo injetado.", "success");
                    this.addAuditLog("Agente de Injeção", `Headless Assembly finalizado usando ${templateName}.`, "ia");
                }
            } catch (fetchError) {
                clearTimeout(timeoutId);
                console.error("Timeout ou Erro de Injeção:", fetchError);
                if (preview) {
                    preview.innerHTML = `
                        <div style="text-align:center; padding:60px; color:#ef4444;">
                            <div style="font-size:40px; margin-bottom:15px;">⚠️</div>
                            <h3 style="margin-bottom:10px;">Falha na Injeção Abidos</h3>
                            <p style="font-size:14px; color:#64748b;">O Agente de Injeção encontrou uma instabilidade no Blueprint ou excedeu o tempo de resposta (15s).</p>
                            <button class="btn btn-primary" style="margin-top:20px;" onclick="window.chatApp.generateDraft()">🔄 Tentar Novamente</button>
                        </div>
                    `;
                }
                this.showNeuroToast("Instabilidade no Agente de Injeção. Tentando recalibrar...", "error");
            }
        } catch (e) {
            console.error("Erro na geração Headless:", e);
            this.showNeuroToast("Falha Crítica no Protocolo Headless.", "error");
        }
    },

    toggleChecklist() {
        const panel = document.getElementById('abidus-checklist-panel');
        if (panel) panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    },

    updateAbidusScore() {
        const html = document.getElementById('live-preview').innerHTML;
        const text = document.getElementById('live-preview').innerText;
        let score = 0;
        let suggestions = [];

        const checks = {
            'check-seo': text.toLowerCase().includes('goiânia'),
            'check-eat': ['crp', 'crm', 'psicó', 'especialista'].some(k => text.toLowerCase().includes(k)),
            'check-pain': ['tea', 'autismo', 'masking', 'burnout'].some(k => text.toLowerCase().includes(k)),
            'check-cta': html.toLowerCase().includes('href') && (html.toLowerCase().includes('whatsapp') || html.toLowerCase().includes('agende')),
            'check-keyword': html.toLowerCase().includes('hipnolawrence.com')
        };

        // Custom label for checklist items to show what they are
        const labels = {
            'check-seo': 'SEO Local (Goiânia)',
            'check-eat': 'Autoridade (E-E-A-T)',
            'check-pain': 'Foco na Dor (TEA/Adulto)',
            'check-cta': 'Conversão (WhatsApp)',
            'check-keyword': 'Link Interno (Home)'
        };

        Object.keys(checks).forEach(id => {
            const el = document.getElementById(id);
            if(el) {
                if(checks[id]) {
                    score += 20;
                    el.style.color = '#059669';
                    el.innerHTML = `✅ ${labels[id]}`;
                } else {
                    el.style.color = '#dc2626';
                    el.innerHTML = `❌ ${labels[id]}`;
                }
            }
        });

        const progressEl = document.getElementById('abidus-progress');
        const percentEl = document.getElementById('abidus-percentage');
        if (progressEl) progressEl.style.width = score + '%';
        if (percentEl) percentEl.innerText = score + '%';
    },

    runQuickPrompt(type) {
        const keyword = document.getElementById('ai-studio-keyword').value || "TEA em Adultos";
        const title = document.getElementById('ai-studio-new-title').value || "Psicoterapia Especializada";
        const prompts = {
            full: `Sugira a estrutura ideal para uma Landing Page de Conversão para "${title}" com o foco "${keyword}". 
                Liste os BLOCOS ABIDOS na ordem estratégica: hero, dor, beneficios, objections, autoridade, ambiente, social, faq, linkagem.
                Explique por que cada bloco é crucial no Método Abidos para psicologia.`,
            hero: `Como posso otimizar a seção 'hero' (H1 + Promessa) para converter pacientes de ${keyword} em Goiânia?`,
            social: `Sugira 3 variações de texto para a seção 'social' (Prova Social Acadêmica) focadas no Mestrado e no atendimento de TEA Adulto.`,
            faq: `Identifique as 3 maiores dores ocultas de quem busca ${keyword} e sugira incluí-las na seção 'faq'.`,
            eeat: `Como a seção 'autoridade' pode destacar melhor o Registro CRP e a formação acadêmica do Dr. Lawrence?`,
            cta: `Qual a melhor frase de agendamento (CTA) para converter pacientes em Goiânia via WhatsApp para ${keyword}?`
        };
        const input = document.getElementById('chat-input');
        input.value = prompts[type];
        this.sendMessage();
    },

    // [NOVO] Handler para os novos botões do Painel Abidos
    runAbidusShortcut(type) {
        // Agora usa o sistema modular de blocos oficial
        this.insertAbidosBlock(type);
    },

    async analyzeConversion() {
        this.addMessage("⚙️ Iniciando Auditoria Abidos CRO...", false);
        const html = document.getElementById('live-preview').innerHTML;
        const prompt = `Analise este HTML sob a ótica do Método Abidos (Conversão em Saúde). CRITIQUE: Contraste de botões, clareza da promessa e E-E-A-T. Aponte 3 melhorias código:\n\n${html}`;
        const critique = await gemini.callAPI(prompt);
        if(critique) this.addMessage(`🔍 **Crítica CRO:**\n\n${critique}`);
    },

    previewDraft() {
        if (!this.currentItemId) return alert("Salve primeiro.");
        const baseUrl = wpAPI.url.replace('/wp-json/wp/v2', '');
        window.open(`${baseUrl}/?p=${this.currentItemId}&preview=true`, '_blank');
    },

    toggleSettings() {
        const panel = document.getElementById('ai-studio-settings-panel');
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        this.addMessage("⚙️ Painel de Configurações SEO aberto. Você pode definir a URL, Título SEO e Meta Description aqui.");
    },

    async generateSEOMeta() {
        const title = document.getElementById('ai-studio-new-title').value || "Página de Serviço";
        const keyword = document.getElementById('ai-studio-keyword').value || "Terapia";
        const html = document.getElementById('live-preview').innerHTML;
        
        this.addMessage("⚙️ Gerando configurações de SEO otimizadas com base no conteúdo (Abidos 3.1)...");

        const prompt = `Atue como um Especialista em SEO Técnico. Leia o seguinte código HTML e extraia as intenções principais para criar metadados otimizados para a palavra-chave provável sobre o tema: "${title}" (foco: "${keyword}").
        
HTML DA PÁGINA:
"""${html.substring(0, 3000)}..."""

REGRAS:
1. URL (Slug): Silo geolocalizado, curta e sem acentos (ex: terapia-ansiedade-em-goiania).
2. Título SEO: Keyword nos primeiros 50 caracteres (total 50-60 carac.).
3. Meta Description: 150-160 caracteres, persuasiva, com a keyword e um CTA implícito.

RETORNE APENAS UM JSON no formato exato:
{
  "slug": "url-aqui",
  "seoTitle": "Título SEO aqui",
  "metaDesc": "Descrição aqui"
}`;

        const response = await gemini.callAPI(prompt);
        if (response) {
            try {
                // Tenta extrair JSON do texto (limpa ```json se a IA colocar)
                const jsonStr = response.replace(/```json|```/g, '').trim();
                const meta = JSON.parse(jsonStr);
                
                document.getElementById('seo-slug').value = meta.slug;
                document.getElementById('seo-title-tag').value = meta.seoTitle;
                document.getElementById('seo-meta-desc').value = meta.metaDesc;
                
                this.addMessage("✅ Configurações SEO geradas com sucesso! Verifique os campos no painel de Configurações.");
            } catch (e) {
                console.error("Erro ao processar JSON de SEO", e);
                this.addMessage("❌ Erro ao formatar sugestão de SEO. Tente novamente ou use o título sugerido.");
            }
        }
    },

    // [NOVO] Análise de Necessidades de Mídia via IA (Abidos Method)
    async analyzeMediaNeeds() {
        const html = document.getElementById('live-preview').innerHTML;
        const panel = document.getElementById('media-needs-panel');
        const list = document.getElementById('media-needs-list');
        
        if (html.includes('Crie algo novo')) {
            return this.addMessage("⚠️ Crie ou carregue algum conteúdo antes de planejar a mídia.");
        }

        this.addMessage("⚙️ NeuroEngine está mapeando oportunidades visuais no seu texto...");
        panel.style.display = 'block';
        list.innerHTML = '<p style="font-size:11px; color:#64748b;">Analisando estrutura de conversão...</p>';

        const prompt = `Atue como um Diretor de Arte e Especialista em Conversão (Método Abidos).
Analise o conteúdo HTML abaixo e identifique 3 pontos onde uma imagem aumentaria a conversão ou autoridade.
Para cada ponto, defina uma "Necessidade".

RETORNE APENAS UM JSON no formato de array:
[
  {"need": "Imagem do Consultório Goiânia", "reason": "Aumentar E-E-A-T e confiança no ambiente físico."},
  {"need": "Foto do Dr. Lawrence sorrindo", "reason": "Gerar conexão humana na seção de autoridade."},
  {"need": "Ilustração de TEA Adulto", "reason": "Representação visual da dor do Mascaramento."}
]

HTML: \n${html}`;

        const response = await gemini.callAPI(prompt);
        if (response) {
            try {
                const jsonStr = response.replace(/```json|```/g, '').trim();
                const needs = JSON.parse(jsonStr);
                list.innerHTML = '';
                
                needs.forEach(n => {
                    const row = document.createElement('div');
                    row.style.display = 'flex';
                    row.style.justifyContent = 'space-between';
                    row.style.alignItems = 'center';
                    row.style.background = '#f9fafb';
                    row.style.padding = '8px';
                    row.style.borderRadius = '5px';
                    row.style.border = '1px solid #e2e8f0';
                    
                    row.innerHTML = `
                        <div style="flex:1;">
                            <p style="font-size:12px; font-weight:bold; margin:0;">${n.need}</p>
                            <p style="font-size:10px; color:#64748b; margin:0;">${n.reason}</p>
                        </div>
                        <div style="display:flex; gap:5px;">
                            <button class="btn btn-secondary" style="font-size:10px; padding:3px 8px;" onclick="document.querySelector('[data-target=&quot;media-library&quot;]').click()">📂 Selecionar</button>
                            <button class="btn btn-primary" style="font-size:10px; padding:3px 8px; background:#6366f1;" onclick="window.chatApp.suggestBestMedia('${n.need.replace(/'/g, "\\'")}')">🪄 Sugestão IA</button>
                        </div>
                    `;
                    list.appendChild(row);
                });
            } catch (e) {
                list.innerHTML = '<p style="color:red; font-size:11px;">Erro ao mapear mídia. Tente novamente.</p>';
            }
        }
    },

    // [NOVO] Sugestão Inteligente de Mídia do Banco de Dados
    async suggestBestMedia(needText) {
        this.addMessage(`🪄 Buscando a melhor imagem para: **"${needText}"** no seu acervo WP...`);
        
        // 1. Busca lista de mídia atual do WP
        const mediaList = await wpAPI.fetchMedia();
        if (!mediaList || mediaList.length === 0) {
            return this.addMessage("❌ Sua biblioteca WP está vazia. Faça upload de imagens primeiro.");
        }

        // 2. Prepara mini-catálogo para a IA
        const catalog = mediaList.map(m => ({
            id: m.id,
            title: m.title.rendered,
            alt: m.alt_text,
            url: m.source_url
        }));

        const prompt = `Atue como Bibliotecário Estratégico do Método Abidos.
O usuário precisa de uma imagem para o seguinte objetivo: "${needText}".

Temos o seguinte acervo de mídia (ID, Título, Alt Text, URL):
${JSON.stringify(catalog)}

REGRAS:
1. Escolha a imagem que melhor se adapta à necessidade.
2. Priorize imagens com Alt Text que combine com o objetivo.
3. Se nenhuma for perfeita, escolha a "menos pior" ou mais genérica/clínica.
4. RETORNE APENAS O JSON da imagem escolhida (exatamente como fornecido no catálogo).

RETORNE APENAS O JSON, sem comentários.`;

        const response = await gemini.callAPI(prompt);
        if (response) {
            try {
                const jsonStr = response.replace(/```json|```/g, '').trim();
                const selected = JSON.parse(jsonStr);
                
                this.addMessage(`✅ **Sugestão Encontrada!**\n\nA IA escolheu: **"${selected.title}"**.\nAlt Text: *${selected.alt || 'Nenhum'}*`);
                
                // Feedback visual no chat com a imagem
                this.addMessage(`<img src="${selected.url}" style="width:100px; height:60px; object-fit:cover; border-radius:4px; border:2px solid #6366f1;"><br>
                <button class="btn" style="background:#6366f1; color:white; font-size:11px; padding:4px 10px;" onclick="navigator.clipboard.writeText('${selected.url}'); alert('URL Copiada! Basta colar no seu HTML.')">📋 Copiar Link da Imagem</button>`);
                
            } catch (e) {
                console.error("Erro ao processar sugestão de mídia", e);
                this.addMessage("❌ A IA não conseguiu decidir. Tente abrir a Biblioteca de Mídia e escolher manualmente.");
            }
        }
    },

    // --- [NOVO] Tom de Voz & Publicação ---
    toggleToneTraining() {
        const panel = document.getElementById('tone-training-panel');
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    },

    async saveTone() {
        const sample = document.getElementById('tone-sample').value;
        if (!sample) return alert("Por favor, cole um rascunho seu para a IA aprender.");
        
        this.addMessage("🎯 **Iniciando Reverse Prompt Engineering...** Decodificando seu estilo de escrita em regras lógicas.");
        this.toggleToneTraining();
        
        const prompt = `Atue como Especialista em Reverse Prompt Engineering. Analise o seguinte corpus de texto e decodifique o Estilo, Tom de Voz e Cadência.
        TEXTO: "${sample}"
        
        REGRAS:
        1. Identifique a relação de pronomes (ex: 2ª pessoa acolhedora).
        2. Identifique jargões clínicos recorrentes.
        3. Identifique restrições (o que a IA NÃO deve fazer para não parecer robótica).
        4. Retorne APENAS um JSON com o campo "style_rules" contendo essas diretrizes em bullet points.`;

        const response = await gemini.callAPI(prompt);
        if (response) {
            try {
                const jsonStr = response.replace(/```json|```/g, '').trim();
                localStorage.setItem('user_tone_rules', jsonStr);
                this.addMessage("✅ **Estilo Decodificado!** As regras de tom de voz foram salvas e serão aplicadas em todas as novas gerações.");
            } catch (e) {
                localStorage.setItem('user_tone_sample', sample);
                this.addMessage("⚠️ Não foi possível gerar regras lógicas, salvando como amostra bruta para as próximas consultas.");
            }
        }
    },

    async publishDirectly() {
        const itemSelect = document.getElementById('ai-studio-item');
        const selectedOption = itemSelect ? itemSelect.options[itemSelect.selectedIndex] : null;
        
        // Se for novo rascunho sem ID ainda
        const currentTitle = document.getElementById('ai-studio-new-title').value || (this.currentItemId && selectedOption ? selectedOption.getAttribute('data-title') : "Novo Rascunho");
        const currentStatus = this.currentItemId && selectedOption ? selectedOption.getAttribute('data-status') : "NOVO";
        
        document.getElementById('confirm-wp-title').innerText = currentTitle;
        const statusLabel = currentStatus === 'publish' ? 'PUBLICADO' : (currentStatus === 'NOVO' ? 'CRIANDO NOVO' : 'RASCUNHO');
        document.getElementById('confirm-wp-status').innerText = statusLabel;
        
        // Reseta checkbox e botão
        document.getElementById('check-revisao-clinica').checked = false;
        document.getElementById('btn-export-final').disabled = true;
        
        // Abre o modal
        document.getElementById('modal-confirmacao-wp').style.display = 'flex';
    },

    closeWPModal() {
        document.getElementById('modal-confirmacao-wp').style.display = 'none';
    },

    toggleExportButton() {
        const checked = document.getElementById('check-revisao-clinica').checked;
        document.getElementById('btn-export-final').disabled = !checked;
    },

    async confirmAndSendToWP() {
        this.closeWPModal();
        this.addAuditLog("Victor Lawrence", "Revisão clínica aprovada e autorizada para exportação.", "human");
        await this.executeWPExport();
    },

    async executeWPExport() {
        const preview = document.getElementById('live-preview');
        const placeholder = document.getElementById('canvas-placeholder');
        if (placeholder) return alert("O mapa está em branco!");

        const btn = document.getElementById('btn-export-final');
        const stepBtn = document.querySelector('button[onclick*="publishDirectly"]');
        
        if (btn) { 
            btn.innerHTML = '<i class="animate-spin">⏳</i> Exportando...'; 
            btn.disabled = true; 
        }
        if (stepBtn) { stepBtn.disabled = true; }

        this.addMessage("🚀 **Iniciado Deploy Abidos...** Extraindo DNA estratégico.");
        
        // 1. Extrai Título (Busca o primeiro H1)
        const firstH1 = preview.querySelector('h1');
        const titleInput = document.getElementById('ai-studio-new-title');
        const title = firstH1 ? firstH1.innerText : (titleInput?.value || "Rascunho AI Studio " + new Date().toLocaleDateString());

        // 2. Metadados SEO
        let metaTitle = document.getElementById('seo-title-tag').value;
        if (!metaTitle) {
            this.addMessage("🪄 **Otimizando Título SEO (Meta Title) Abidos...**");
            const keyword = document.getElementById('ai-studio-keyword').value || "Psicólogo em Goiânia";
            const prompt = `Gere um Meta Title SEO de alta conversão (50-60 caracteres). FÓRMULA ABIDOS: Palavra-chave foco nos primeiros 50 caracteres. FOCO: "${keyword}". BASEADO EM: "${title}". SAÍDA: Apenas o texto do título SEO.`;
            metaTitle = await gemini.callAPI(prompt);
            document.getElementById('seo-title-tag').value = metaTitle;
        }

        let metaDesc = document.getElementById('seo-meta-desc').value;
        if (!metaDesc) {
            this.addMessage("🪄 **Gerando Meta Description estratégica...**");
            const cleanText = preview.innerText.substring(0, 1000);
            const prompt = `Gere uma Meta Description de alta conversão para esta página. Regras Abidos: Máximo 160 caracteres. Foco em saúde mental e autoridade. SAÍDA: Apenas o texto da meta description.`;
            metaDesc = await gemini.callAPI(prompt);
            document.getElementById('seo-meta-desc').value = metaDesc;
        }

        const payload = {
            type: document.getElementById('ai-studio-type').value || 'pages',
            title: title,
            content: preview.innerHTML,
            status: "draft", // FORÇADO como Rascunho para segurança clínica
            slug: document.getElementById('seo-slug').value,
            metaDesc: metaDesc,
            metaTitle: document.getElementById('seo-title-tag').value || title
        };

        try {
            // Em vez de fetch direto, vamos usar o wpAPI que é o padrão atual
            const result = await wpAPI.saveContent(payload.type, payload, this.currentItemId);
            
            if (btn) { btn.innerHTML = "Exportar como Rascunho"; btn.disabled = false; }
            if (stepBtn) { stepBtn.disabled = false; }

                this.currentItemId = result.id;
                this.addMessage(`✅ **PUBLICAÇÃO CONCLUÍDA NO WP!**\n\nID: #${result.id}\nStatus: Enviado como Rascunho.\nLink: [Ver no Painel WP](${result.link})`);
                this.addMessage(`<br><a href="${result.link}" target="_blank" class="btn btn-primary" style="display:inline-block; margin-top:5px; background:#10b981; border:none; color:white;">👁️ Ver no WordPress</a>`);
                this.showNeuroToast("Publicado com sucesso! Google já pode indexar.", "success");
                this.loadList(result.id);
                this.addAuditLog("Sistema", `Exportação concluída para WP (ID #${result.id}) como Rascunho Seguro.`, "ia");
            } else {
                this.addMessage("❌ Erro ao enviar para o WordPress. Verifique o console.");
            }
        } catch (e) {
            console.error(e);
            this.addMessage("🚨 Erro Crítico: A ponte de publicação foi bloqueada ou o servidor está offline.");
        } finally {
            if (btn) { btn.innerHTML = "Exportar como Rascunho"; btn.disabled = false; }
            if (stepBtn) { stepBtn.disabled = false; }
            this.refineAutoDNA();
        }
    },

    async refineAutoDNA() {
        const currentHtml = document.getElementById('live-preview').innerHTML;
        if (!this.lastGeneratedHtml || this.lastGeneratedHtml === currentHtml) return;

        console.log("🧠 [AUTO-DNA] Detectada edição manual. Refinando estilo...");
        
        try {
            const response = await fetch('/api/dna/auto-refine', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    originalHtml: this.lastGeneratedHtml, 
                    editedHtml: currentHtml 
                })
            }).then(r => r.json());

            if (response.success && response.newRules && response.newRules.length > 0) {
                this.addMessage(`🧬 **Auto-DNA Progressivo:** Detectei que você fez ajustes manuais. Aprendi **${response.newRules.length} novas preferências** de estilo e tom que aplicarei nos próximos rascunhos.`);
                // Reset da referência para não aprender a mesma coisa de novo no próximo save
                this.lastGeneratedHtml = currentHtml;
            }
        } catch (e) {
            console.warn("⚠️ [AUTO-DNA] Falha no aprendizado passivo.", e);
        }
    },

    async generateBlueprint(tema) {
        this.addMessage(`🚀 **Iniciando Construção de Blueprint Abidos...**\nFoco: **${tema}**`);
        const livePreview = document.getElementById('live-preview');
        
        // Limpa placeholder se existir
        const placeholder = document.getElementById('canvas-placeholder');
        if (placeholder) placeholder.remove();
        
        livePreview.innerHTML = '<div style="display:flex; justify-content:center; align-items:center; height:300px;"><div class="loader"></div><p style="margin-left:15px; font-weight:bold; color:#64748b;">Orquestrando Agentes Abidos...</p></div>';

        const prompt = `Gere um rascunho completo de uma Landing Page de alta conversão para o Dr. Victor Lawrence.
        TEMA: ${tema}
        REGRAS ABIDOS:
        1. Use Seções Flexbox modernas.
        2. Inclua Hero, Seção de Dor, Seção de Autoridade (E-E-A-T) e CTA de WhatsApp.
        3. Use o tom clínico do Dr. Victor (Mestrado UFU, Ericksoniano).
        4. O rascunho deve ser em HTML semântico limpo, pronto para o Elementor/Gutenberg.
        5. NÃO inclua <html> ou <body>, apenas o conteúdo interno.
        6. Use vidromorfismo e cards premium.`;

        try {
            const result = await gemini.callAPI(prompt);
            if (result) {
                this.saveHistory();
                livePreview.innerHTML = result;
                this.lastGeneratedHtml = result; // [AUTO-DNA] Marca versão base
                this.updateAbidusScore();
                this.addMessage("✅ **Blueprint Gerado com Sucesso!** Ajuste os detalhes via chat ou use o Inspector.");
                
                // Remove o loader se a IA não retornou HTML substituto correto
                if (livePreview.innerHTML.includes('loader')) livePreview.innerHTML = result;
            }
        } catch (e) {
            this.addMessage("❌ Falha ao orquestrar agentes para o Blueprint.");
            console.error(e);
        }
    }, // Fim da função generateBlueprint(tema)

    async createCluster() {
        const titleInput = document.getElementById('ai-studio-new-title');
        const theme = titleInput ? titleInput.value : "TEA em Adultos";
        const moodId = document.getElementById('global-mood-selector')?.value || '1_introspeccao_profunda';
        const waNumber = document.getElementById('setting-whatsapp')?.value || this.whatsapp; // Use this.whatsapp
        const btn = document.getElementById('ai-studio-cluster-btn');

        if (!theme || theme.length < 5) return alert("Por favor, digite um tema sólido ou um título estratégico para basear o Cluster.");

        if(btn) { btn.innerText = "💠 Orquestrando..."; btn.disabled = true; }
        
        this.addMessage(`💠 **Iniciando Orquestração de Cluster Abidos (Silo Neural)...**\n\nNeste momento, os agentes estão:\n1. Planejando a rede de interligação entre Hub e Spokes para **"${theme}"**.\n2. Produzindo individualmente 6 rascunhos de alta qualidade (1 Página Hub + 5 Posts Spokes).\n3. Auditando cada item via Esteira QA.\n\n*Aguarde de 2 a 3 minutos. O Mission Control notificará ao concluir.*`);
        
        await this.addAgentLog("NeuroEngine AI", "Iniciando Planejador de Silos", true);

        try {
            const response = await fetch('/api/blueprint/cluster', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ theme, moodId, whatsapp: waNumber })
            });
            
            // TRAVA DE SEGURANÇA: Verifica se a resposta não é um erro HTTP (como 404 ou 500)
            if (!response.ok) {
                throw new Error(`O Mission Control respondeu com erro ${response.status}`);
            }
            
            const data = await response.json(); // Agora é seguro dar parse

            if (data.success && data.items) {
                let msg = `✅ **MISSION CONTROL: CLUSTER CONCLUÍDO!**\n\nForam criados ${data.items.length} rascunhos estratégicos para o Silo **"${data.mainTopic}"**. Clique em cada um para carregar no canvas e revisar:\n\n<div style="background:#f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; margin-top: 10px;">`;
                
                data.items.forEach((item, idx) => {
                    const clusterKey = `clstr_${Date.now()}_${idx}`;
                    window.AbidosClusterCache = window.AbidosClusterCache || {};
                    window.AbidosClusterCache[clusterKey] = item.html;

                    const typeIcon = item.type === 'pages' ? '📄' : '📰';
                    msg += `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px; font-size: 13px; border-bottom: 1px solid #f1f5f9; padding-bottom: 5px;">
                                <span style="flex:1; padding-right: 10px;">${typeIcon} <strong>${item.title}</strong></span>
                                <button onclick="window.chatApp.loadFromCluster('${clusterKey}', '${item.title.replace(/'/g, "\\'")}', '${item.type}')" 
                                        style="background:#6366f1; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:11px; cursor:pointer; font-weight:bold;">
                                    📂 Abrir
                                </button>
                            </div>`;
                });
                msg += `</div>\n\n*Dica: Após carregar e ajustar, use o botão Publicar para enviar individualmente ao WordPress.*`;
                this.addMessage(msg);
            } else {
                this.addMessage(`❌ **Falha na Esteira de Clusters:** ${data.error || 'Erro desconhecido'}`);
            }
        } catch (e) {
            console.error(e);
            this.addMessage(`❌ **Erro de Rede no Mission Control.**`);
        } finally {
            if(btn) { btn.innerText = "💠 Gerar Cluster"; btn.disabled = false; }
        }
    },

    loadFromCluster(key, title, type) {
        if (!window.AbidosClusterCache || !window.AbidosClusterCache[key]) return;
        const html = window.AbidosClusterCache[key];
        const preview = document.getElementById('live-preview');
        
        // Limpa canvas
        const placeholder = document.getElementById('canvas-placeholder');
        if (placeholder) placeholder.remove();
        
        preview.innerHTML = html;
        this.injectCopyButtons();
        this.updateAbidusScore();
        
        // Atualiza UI
        document.getElementById('ai-studio-title').innerText = `Cluster: ${title}`;
        document.getElementById('ai-studio-new-title').value = title;
        document.getElementById('ai-studio-new-title').style.display = 'block';
        document.getElementById('ai-studio-type').value = type;
        
        this.addMessage(`📌 Item do Cluster carregado: **${title}** (${type}).\n\nPronto para revisão e publicação.`);
        this.lastGeneratedHtml = html;
    },

    // --- BLOCOS MODULARES ABIDOS ---
    insertAbidosBlock(id) {
        const preview = document.getElementById('live-preview');
        const placeholder = document.getElementById('canvas-placeholder');
        if (placeholder) {
            placeholder.remove();
            preview.innerHTML = "";
        }

        if (!window.AbidosBlocks) {
            console.error("AbidosBlocks not loaded.");
            return alert("Erro: Biblioteca de blocos não carregada.");
        }

        const kw = document.getElementById('ai-studio-keyword')?.value || "Psicologia Clínica";
        const html = window.AbidosBlocks.get(id, kw);
        
        if (html) {
            this.saveHistory();
            preview.insertAdjacentHTML('beforeend', html);
            this.updateAbidusScore();
            this.addMessage(`𓂀 Bloco **${id.toUpperCase()}** inserido com sucesso.`);
            
            // Auto-scroll para o novo bloco
            const lastBlock = preview.lastElementChild;
            if (lastBlock) lastBlock.scrollIntoView({ behavior: 'smooth' });
        }
    },

    // --- MEDIA PICKER (REPOSITÓRIO VISUAL) ---
    async openMediaPicker(callback) {
        const modal = document.getElementById('media-picker-modal');
        const grid  = document.getElementById('media-grid');
        if (!modal || !grid) return;

        modal.style.display = 'flex';
        grid.innerHTML = '<p style="grid-column:1/4;text-align:center;color:#64748b;padding:20px;">⏳ Carregando biblioteca...</p>';

        // Asset mapping
        const mediaToDisplay = this.visualAssets && this.visualAssets.length > 0
            ? this.visualAssets.map(url => ({ source_url: url, alt_text: 'Imagem Abidos' }))
            : (window.wpAPI ? await window.wpAPI.fetchMedia(24) : []);
        
        grid.innerHTML = '';
        if (!mediaToDisplay || mediaToDisplay.length === 0) {
            grid.innerHTML = '<p style="grid-column:1/4;text-align:center;color:#94a3b8;">Nenhuma imagem encontrada.</p>';
            return;
        }

        mediaToDisplay.forEach(m => {
            const container = document.createElement('div');
            container.style.cssText = 'cursor:pointer; border:2px solid transparent; border-radius:8px; overflow:hidden; transition:all .2s;';
            container.innerHTML = `<img src="${m.source_url}" title="${m.alt_text}" style="width:100%; height:100px; object-fit:cover; display:block;">`;
            
            container.onmouseover = () => container.style.borderColor = '#6366f1';
            container.onmouseout  = () => container.style.borderColor = 'transparent';
            
            container.onclick = () => {
                if (callback) callback(m.source_url);
                else this.applyImageToCanvas(m.source_url);
                this.closeMediaPicker();
            };
            grid.appendChild(container);
        });
    },

    closeMediaPicker() {
        const modal = document.getElementById('media-picker-modal');
        if (modal) modal.style.display = 'none';
    },

    applyImageToCanvas(url) {
        const imgHtml = `<div class="reveal !my-12" contenteditable="false"><img src="${url}" class="!rounded-3xl !shadow-2xl !w-full"></div>`;
        this.saveHistory();
        const preview = document.getElementById('live-preview');
        const placeholder = document.getElementById('canvas-placeholder');
        if (placeholder) {
            placeholder.remove();
            preview.innerHTML = "";
        }
        preview.insertAdjacentHTML('beforeend', imgHtml);
        this.addMessage("🖼️ Imagem inserida.");
    }
}; 

// Helpers globais fora do objeto chatApp
window.injectCode = function(btn) {
    const code = decodeURIComponent(btn.getAttribute('data-code'));
    const preview = document.getElementById('live-preview');
    const modeSelect = btn.parentElement.querySelector('.injection-mode');
    const mode = modeSelect ? modeSelect.value : 'replace';

    const placeholder = document.getElementById('canvas-placeholder');
    if (placeholder || (preview && preview.innerText.includes('Crie algo novo')) || (preview && preview.innerText.includes('Comece a escrever'))) {
        if (preview) preview.innerHTML = '';
    }

    if (mode === 'append' && preview) {
        preview.insertAdjacentHTML('beforeend', code);
    } else if (mode === 'prepend' && preview) {
        preview.insertAdjacentHTML('afterbegin', code);
    } else if (preview) {
        preview.innerHTML = code;
        window.chatApp.lastGeneratedHtml = code;
    }

    window.chatApp.updateAbidusScore();
    window.chatApp.showNeuroToast("Bloco injetado com sucesso.", "info");
};

document.addEventListener('DOMContentLoaded', () => window.chatApp.init());
