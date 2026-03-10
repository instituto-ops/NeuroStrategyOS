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
            whatsapp: "62 98217-1845"
        }
    },
    mediaGallery: [], // Cache de mídias para a IA
    historyStack: [],  // Undo history
    redoStack: [],     // Redo history
    currentKeyword: '', // Store current keyword for AI sync

    init() {
        this.setupEventListeners();
        this.setupInspector();
        this.setupKeyboardShortcuts();
        console.log("🧠 NeuroEngine Copilot Initialized");
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
                display: 'flex', gap: '5px', opacity: '0', transition: 'opacity .2s', zIndex: '999'
            });

            // Botão Copiar
            const btnCopy = document.createElement('button');
            btnCopy.textContent = '📋 Copiar';
            btnCopy.title = 'Copiar para Elementor';
            Object.assign(btnCopy.style, {
                background: '#1e293b', color: 'white', border: 'none',
                padding: '6px 12px', borderRadius: '6px', fontSize: '11px',
                cursor: 'pointer', fontWeight: '700'
            });
            btnCopy.onclick = (e) => { e.stopPropagation(); this.copyBlock(sec); };

            // Botão Excluir
            const btnDel = document.createElement('button');
            btnDel.textContent = '🗑️';
            btnDel.title = 'Excluir Bloco';
            Object.assign(btnDel.style, {
                background: '#ef4444', color: 'white', border: 'none',
                padding: '6px 10px', borderRadius: '6px', fontSize: '11px',
                cursor: 'pointer'
            });
            btnDel.onclick = (e) => { e.stopPropagation(); this.deleteBlock(sec); };

            // Botão Inserir (+)
            const btnAdd = document.createElement('button');
            btnAdd.textContent = '➕';
            btnAdd.title = 'Inserir Bloco Abaixo';
            Object.assign(btnAdd.style, {
                background: '#3b82f6', color: 'white', border: 'none',
                padding: '6px 10px', borderRadius: '6px', fontSize: '11px',
                cursor: 'pointer'
            });
            btnAdd.onclick = (e) => { 
                e.stopPropagation(); 
                this.showBlockInserterMenu(e.clientX, e.clientY, sec); 
            };

            controls.appendChild(btnCopy);
            controls.appendChild(btnAdd);
            controls.appendChild(btnDel);
            sec.appendChild(controls);

            sec.onmouseenter = () => controls.style.opacity = '1';
            sec.onmouseleave = () => controls.style.opacity = '0';
        });
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
                <button onclick="window.chatApp.executeMicroCommand('Sugira e troque esta imagem por uma mais adequada ao contexto da clínica de psicologia victor lawrence')" class="btn" style="background: #eff6ff; color: #1d4ed8; font-size: 11px; text-align: left; padding: 6px 10px; border: none; border-radius: 4px; cursor: pointer;">🪄 Trocar Imagem (IA)</button>
                <button onclick="window.chatApp.deleteSelected()" class="btn" style="background: #fee2e2; color: #ef4444; font-size: 11px; text-align: left; padding: 6px 10px; border: none; border-radius: 4px; cursor: pointer;">🗑️ Excluir Imagem</button>
                <button onclick="window.chatApp.hideMicroCommandsMenu()" class="btn" style="background: transparent; color: #94a3b8; font-size: 10px; text-align: center; margin-top: 3px; padding: 4px; border: none; cursor: pointer; width: 100%;">✕ Cancelar</button>
            `;
        } else {
            menu.innerHTML = `
                <div style="font-size: 10px; font-weight: bold; color: #64748b; padding: 4px 5px; border-bottom: 1px solid #f1f5f9; margin-bottom: 3px; cursor: default;">Micro-Comandos IA</div>
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
            // Não anulamos o selectedElement para permitir que o chat normal ainda faça referência a ele se necessário
        }
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
            
            const response = await fetch('/api/blueprint', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) throw new Error(`Network response was not ok: ${response.status}`);
            
            const data = await response.json();
            
            if (data.html) {
                preview.innerHTML = data.html;
                this.addMessage(`✅ Blueprint de **${theme}** gerado com sucesso. Clique em qualquer texto à esquerda para usar os Micro-Comandos.`, false);
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
            this.addMessage("🚨 Erro na auditoria. Verifique a conexão com o node.", false);
        }
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
                    <a href="${this.authorityContext.socials.whatsapp}" style="background:#16a34a; color:white; padding: 12px 24px; font-weight:bold; border-radius:30px; text-decoration:none; display:inline-block;">Agendar Avaliação via WhatsApp</a>
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
            msgDiv.innerHTML = `<strong>NeuroEngine:</strong><br>${formattedText}`;
        }
        
        chatHistory.appendChild(msgDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    },

    async sendMessage(hasScreenshot = false) {
        const chatInput = document.getElementById('chat-input');
        const btnSend = document.getElementById('btn-send-chat');
        const btnSnap = document.getElementById('btn-snap-error');
        const livePreview = document.getElementById('live-preview');
        this.currentKeyword = document.getElementById('ai-studio-keyword').value;

        const message = chatInput.value.trim();
        if (!message) return;

        chatInput.value = '';
        
        // [NOVO] Injeção de Contexto de SEO Dinâmico
        const seoContext = document.getElementById('seo-context').value;
        let enhancedMessage = message;
        if (seoContext) {
            enhancedMessage += `\n\n[INSTRUÇÃO DE SEO OCULTA]: Certifique-se de usar a palavra-chave "${seoContext}" nas tags H1, H2 ou no primeiro parágrafo gerado. Foco em conversão clínica.`;
        }

        if (hasScreenshot) {
            this.addMessage(message + "<br><em>📸 (Anexou Visualização da Tela)</em>", true);
            btnSnap.innerHTML = '⚙️ Processando...';
            btnSnap.disabled = true;
        } else {
            this.addMessage(message, true);
            btnSend.innerHTML = '⚙️ Processando...';
            btnSend.disabled = true;
        }

        const formData = new FormData();
        
        // CONSTRUÇÃO DO PROMPT COM CONTEXTO
        let promptContext = enhancedMessage;
        
        // 1. Contexto de Keyword SEO
        if (keyword) {
            promptContext += `\n\n[FOCO SEO]: A keyword prioritária é "${keyword}". Use-a estrategicamente conforme o Método Abidos.`;
        }

        // 1.1 Contexto de Autoridade (E-E-A-T / Psicólogo Victor Lawrence)
        promptContext += `\n\n[DADOS DO ESPECIALISTA]: Nome: ${this.authorityContext.name}, CRP: ${this.authorityContext.crp}, Titulação: ${this.authorityContext.title}, Clínica: ${this.authorityContext.institution}. 
        Tratamento Profissional: Utilize sempre "Psicólogo Victor Lawrence" em vez de "Dr.".
        Linkagem Interna: Sempre cite a home www.hipnolawrence.com.
        WhatsApp: ${this.authorityContext.socials.whatsapp}.
        IMPORTANTE: Sempre inclua o CRP próximo ao nome do especialista em seções de autoridade.`;

        // 1.2 Contexto de Mídia (Imagens Reais)
        if (this.mediaGallery && this.mediaGallery.length > 0) {
            const mediaLinks = this.mediaGallery.map(m => `[ID: ${m.id}] Title: ${m.title.rendered} | Alt: ${m.alt_text || 'vazio'} | URL: ${m.source_url}`).join('\n');
            promptContext += `\n\n[ATIVOS DE MÍDIA DISPONÍVEIS]: Você tem acesso às seguintes imagens reais do banco de dados do usuário:
            ${mediaLinks}
            SYSTEM NOTE: Sempre que gerar um código HTML (<img src>), utilize EXCLUSIVAMENTE as URLs reais desta lista que sejam mais adequadas ao contexto gerado no Método Abidos. Se nenhuma servir, use um placeholder de cor sólida condizente com a paleta.`;
        }

        // 2. Contexto de Ajuste Fino (Elemento Selecionado)
        if (this.selectedElement) {
            const elHtml = this.selectedElement.outerHTML;
            promptContext += `\n\n[AJUSTE FINO]: O usuário selecionou este elemento: \n${elHtml}\nAltere apenas este elemento ou o bloco sugerido.`;
        }

        // 2.1 [NOVO] Sistema de Blocos Abidos Modular
        promptContext += `\n\n[SISTEMA DE BLOCOS MODULARES]: O sistema possui blocos pré-definidos (que o usuário pode inserir via comandos ou manualmente).
        IDs Disponíveis: hero, dor, beneficios, objections, autoridade, ambiente, social, faq, linkagem.
        VANTAGEM: Esses blocos são Mobile-First e compatíveis com o Widget HTML do Elementor.
        AÇÃO: Se o usuário pedir algo novo ou estrutural, sugiro que ele utilize esses blocos específicos (ex: "Sugiro inserir o bloco 'dor' para conectar com o paciente").`;

        formData.append('currentKeyword', this.currentKeyword);
        
        // 3. Contexto da Página Inteira
        const currentHtml = livePreview.innerHTML;
        if(currentHtml.trim().length > 0 && !currentHtml.includes('Crie algo novo')) {
            formData.append('htmlContext', currentHtml);
        }

        try {
            if (hasScreenshot && window.html2canvas) {
                const canvas = await html2canvas(livePreview);
                const blob = await new Promise(resolve => canvas.toBlob(resolve));
                formData.append('screenshot', blob, 'preview.png');
            }
            
            const response = await fetch('/api/chat', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            
            if (data.reply) {
                this.addMessage(data.reply, false);
            } else {
                this.addMessage("Desculpe, deu um erro interno na IA.", false);
            }
        } catch (error) {
            console.error(error);
            this.addMessage("Erro de conexão com o terminal IA (Port 3001).", false);
        } finally {
            btnSend.innerHTML = '🚀 Executar';
            btnSnap.innerHTML = '📷 Corrigir Layout Visualmente';
            btnSend.disabled = false;
            btnSnap.disabled = false;
        }
    },

    // --- LAYOUT CONTROLS ---

    toggleHeaderAI() {
        const header = document.getElementById('studio-header');
        header.classList.toggle('collapsed');
        const btn = document.querySelector('button[title="Esconder Topo"]');
        btn.innerText = header.classList.contains('collapsed') ? '🔽' : '🔼';
    },

    toggleSidebarAI() {
        const sidebar = document.getElementById('studio-sidebar');
        sidebar.classList.toggle('collapsed');
        const btn = document.querySelector('button[title="Esconder Assistente"]');
        btn.innerText = sidebar.classList.contains('collapsed') ? '◀️' : '▶️';
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
        const seoContext = document.getElementById('seo-context').value;
        const keyword = document.getElementById('ai-studio-keyword').value;
        const titleInput = document.getElementById('ai-studio-new-title');
        
        if (seoContext || keyword) {
            let msg = `Você selecionou um novo foco SEO.\nContexto: **${seoContext || 'Nenhum'}**\nPalavra-chave: **${keyword || 'Nenhuma'}**`;
            this.addMessage(msg, false);
            
            // Sugerir automaticamente um título estratégico se o usuário ainda não tiver preenchido
            if (titleInput && !titleInput.value) {
                this.suggestTitle();
            }
        }
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
            const isSelected = selectedId && parseInt(item.id) === parseInt(selectedId) ? 'selected' : '';
            itemSelect.innerHTML += `<option value="${item.id}" ${isSelected}>${title}</option>`;
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
        titleSpan.innerText = `Baixando...`;

        const data = await wpAPI.getContent(type, id);
        if(data) {
            this.currentItemId = id;
            this.currentType = type;
            document.getElementById('live-preview').innerHTML = data.content.rendered;
            titleSpan.innerText = `Editando: ${data.title.rendered}`;
            
        document.getElementById('ai-studio-new-title').style.display = 'none';
        document.getElementById('ai-studio-accept-btn').style.display = 'none';
        document.getElementById('ai-studio-suggest-btn').style.display = 'none';
        document.getElementById('ai-studio-preview-btn').style.display = 'block';
            document.getElementById('ai-studio-item').style.display = 'block';
            
            this.updateAbidusScore();
            this.addMessage(`Carreguei **${data.title.rendered}**. O que deseja ajustar?`);
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
        
        document.getElementById('ai-studio-accept-btn').style.display = 'block';
        document.getElementById('ai-studio-suggest-btn').style.display = 'block';
        document.getElementById('live-preview').innerHTML = '<h1 style="color: #1a202c; font-size: 24px; text-align: center; margin-top: 50px; opacity: 0.5;">Comece a escrever seu novo rascunho ou peça para a IA...</h1>';
        document.getElementById('ai-studio-title').innerText = "Novo Rascunho";
        
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

        const htmlContent = document.getElementById('live-preview').innerHTML;
        const slug = document.getElementById('seo-slug').value.trim();
        
        const payload = { 
            content: htmlContent, 
            status: "draft" 
        };

        if (isNew) payload.title = newTitle;
        if (slug) payload.slug = slug;

        const result = await wpAPI.saveContent(type, payload, this.currentItemId);
        
        if(result && result.id) {
            this.currentItemId = result.id;
            this.currentType = type;
            titleInput.style.display = 'none';
            document.getElementById('ai-studio-suggest-btn').style.display = 'none';
            document.getElementById('ai-studio-preview-btn').style.display = 'block';
            document.getElementById('ai-studio-title').innerText = `Rascunho: ${result.title.rendered || newTitle}`;
            alert("Rascunho salvo!");
            
            // Recarrega a lista para o novo rascunho aparecer no dropdown e mantém selecionado
            this.loadList(result.id);
        }
    },

    // --- ANALYTICS & TOOLS ---

    async suggestTitle() {
        const type = document.getElementById('ai-studio-type').value;
        const keyword = document.getElementById('ai-studio-keyword').value || "TEA em Adultos";
        const btn = document.getElementById('ai-studio-suggest-btn');
        const originalText = btn.innerText;

        btn.innerText = "⏳..."; btn.disabled = true;
        
        const prompt = `Atue como um Especialista em Copywriting de Conversão (Método Abidos).
Sugerir EXATAMENTE UM (1) título de impacto para um(a) ${type === 'pages' ? 'Página' : 'Post'}.
Foco: "${keyword}".
REGRAS:
1. FOCO na DOR ou DESEJO do paciente.
2. Seja direto e persuasivo.
3. RETORNE APENAS O TEXTO DO TÍTULO.`;

        try {
            const suggestion = await gemini.callAPI(prompt);
            if(suggestion) {
                const cleanTitle = suggestion.replace(/^["']|["']$/g, '').trim();
                const titleInput = document.getElementById('ai-studio-new-title');
                titleInput.value = cleanTitle;
                titleInput.style.display = 'block';
                this.addMessage(`💡 Sugestão de Título: **"${cleanTitle}"**`);
            }
        } catch(e) { console.error(e); }
        
        btn.innerText = originalText; btn.disabled = false;
    },

    toggleChecklist() {
        const panel = document.getElementById('abidus-checklist-panel');
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
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

        document.getElementById('abidus-progress').style.width = score + '%';
        document.getElementById('abidus-percentage').innerText = score + '%';
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
        const title = document.getElementById('ai-studio-new-title').value || "Psicoterapia em Goiânia";
        const keyword = document.getElementById('ai-studio-keyword').value || "Autismo Adulto";
        
        this.addMessage("⚙️ Gerando configurações de SEO otimizadas...");

        const prompt = `Atue como um Especialista em SEO Técnico e Copywriter.
Sugerir configurações de SEO para o conteúdo: "${title}" com a keyword foco "${keyword}".
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
    }
};

// Global Helpers (Refatorado para suportar Append-Only)
window.injectCode = function(btn) {
    const code = decodeURIComponent(btn.getAttribute('data-code'));
    const preview = document.getElementById('live-preview');
    const modeSelect = btn.parentElement.querySelector('.injection-mode');
    const mode = modeSelect ? modeSelect.value : 'replace';

    // Se o preview tiver o texto placeholder, limpa antes de injetar
    if (preview.innerText.includes('Crie algo novo') || preview.innerText.includes('Comece a escrever')) {
        preview.innerHTML = '';
    }

    if (mode === 'append') {
        preview.insertAdjacentHTML('beforeend', code);
    } else if (mode === 'prepend') {
        preview.insertAdjacentHTML('afterbegin', code);
    } else {
        preview.innerHTML = code;
    }

    window.chatApp.updateAbidusScore();
};

document.addEventListener('DOMContentLoaded', () => window.chatApp.init());
