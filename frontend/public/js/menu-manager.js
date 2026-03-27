/**
 * Menu Manager - NeuroEngine OS
 * Gerencia a estrutura de silos e navegação desacoplada.
 */

window.menuSystem = {
    menus: [],
    silos: [],
    inventory: { drafts: [], published: [] },
    currentMenu: null,
    currentSilo: null,

    init: async function() {
        console.log("🌳 Inicializando Gestor de Menus e Silos...");
        try { await this.loadMenus(); } catch(e) { console.warn("Menus não carregados:", e); }
        try { await this.loadSilos(); } catch(e) { console.warn("Silos não carregados:", e); }
        try { await this.loadInventory(); } catch(e) { console.warn("Inventário não carregado:", e); }
        
        this.renderMenuList();
        this.renderSiloList();
        this.loadMenusIntoStudio();
        this.loadSilosIntoStudio();
        
        // Auto-run Abidos Analysis
        try { this.suggestSilos(); } catch(e) { console.warn("Sugestões não processadas:", e); }
    },

    loadInventory: async function() {
        console.log("📂 [neuroAPI] Sincronizando inventário com o Acervo Vercel...");
        try {
            // CORREÇÃO: Usa a rota do acervo via neuroAPI
            const paginas = await window.neuroAPI.fetchAcervo();
            this.inventory = {
                drafts: [], // Adicionar se necessário
                published: (paginas || []).map(p => p.titulo || p.slug)
            };
            console.log(`✅ ${paginas.length} páginas detectadas no Next.js.`);
        } catch (e) {
            console.error("❌ Falha na sincronização do Acervo:", e);
        }
    },

    loadMenus: async function() {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const listContainer = document.getElementById('menu-list');

        try {
            const res = await fetch('/api/menus', { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
            this.menus = await res.json();
            this.renderMenuList();
        } catch (e) {
            clearTimeout(timeoutId);
            console.error("❌ Erro ao carregar menus:", e);
            
            if (listContainer) {
                listContainer.innerHTML = `
                    <div class="error-state" style="padding: 20px; text-align: center; color: #ef4444; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px;">
                        <p style="font-size: 13px; margin-bottom: 10px;">⚠️ Servidor offline ou falha de conexão.</p>
                        <button onclick="window.menuSystem.loadMenus()" class="btn btn-secondary" style="font-size: 11px;">🔄 Tentar Novamente</button>
                    </div>
                `;
            }
        }
    },

    loadSilos: async function() {
        try {
            const res = await fetch('/api/seo/silos');
            const data = await res.json();
            this.silos = data.silos || [];
            
            // Corrige se slugs estiverem faltando (Retrocompatibilidade)
            this.silos.forEach(s => {
                if (!s.slug) s.slug = s.hub.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
            });

            this.renderSiloList();
        } catch (e) { console.error("Erro ao carregar silos:", e); }
    },

    suggestSilos: async function() {
        const btn = document.getElementById('btn-suggest-silos');
        const container = document.getElementById('silo-suggestions-list');
        if(btn) { btn.innerText = "🧠 ESCANEANDO..."; btn.disabled = true; }
        if(container) container.innerHTML = '<div style="padding: 10px; font-size: 11px; color: #94a3b8;">🧠 Agente Abidos analisando arquitetura...</div>';
        
        try {
            const res = await fetch('/api/seo/analyze-silos');
            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(errorText.substring(0, 100) || `Erro no servidor (Status: ${res.status})`);
            }
            const data = await res.json();
            if(data.error) throw new Error(data.error);
            if(!data.suggestions) throw new Error("A IA não retornou sugestões.");
            this.renderSiloSuggestions(data.suggestions);
        } catch (e) {
            console.error("Erro na sugestão:", e);
            if (container) container.innerHTML = `<div style="color: #ef4444; font-size: 10px; padding: 10px;">⚠️ Erro na Análise: ${e.message}</div>`;
        } finally {
            if(btn) { btn.innerText = "ATUALIZAR SUGESTÕES"; btn.disabled = false; }
        }
    },

    renderSiloSuggestions: function(suggestions) {
        const container = document.getElementById('silo-suggestions-list');
        if(!container) return;
        
        container.innerHTML = suggestions.map((s, idx) => `
            <div style="background: #fdf2f8; border: 1px solid #fbcfe8; padding: 12px; border-radius: 10px; margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                    <strong style="color: #be185d; font-size: 13px;">🎯 ${s.hub}</strong>
                    <button onclick='window.menuSystem.applySiloSuggestion(${JSON.stringify(s)})' style="background: white; border: 1px solid #fbcfe8; border-radius: 20px; padding: 3px 10px; font-size: 10px; cursor: pointer;">✨ Criar</button>
                </div>
                <div style="font-size: 10px; color: #db2777;">Spokes: ${s.spokes.join(', ')}</div>
            </div>
        `).join('');
    },

    applySiloSuggestion: function(s) {
        const newSilo = {
            id: 'silo_' + Date.now(),
            hub: s.hub,
            slug: s.slug,
            spokes: s.spokes
        };
        this.silos.push(newSilo);
        this.saveCurrentSilo(); // Salva e sincroniza
    },

    switchTab: function(tab, btn) {
        document.querySelectorAll('.tab-btn').forEach(b => {
            b.classList.remove('active');
            b.style.color = '#64748b';
            b.style.background = 'transparent';
        });
        btn.classList.add('active');
        btn.style.color = '#1e293b';
        btn.style.background = 'white';

        document.querySelectorAll('.menu-tab-pane').forEach(p => p.style.display = 'none');
        const targetTab = document.getElementById(`tab-${tab}-content`);
        if (targetTab) targetTab.style.display = 'block';
    },

    loadMenusIntoStudio: function() {
        const select = document.getElementById('ai-studio-menu');
        if (!select) return;

        let html = '<option value="">Sem Menu (Default)</option>';
        if (this.menus && this.menus.forEach) {
            this.menus.forEach(m => {
                html += `<option value="${m.id}">${m.name}</option>`;
            });
        }
        select.innerHTML = html;
        
        // Se houver um menuId já carregado no Studio (pelo Acervo), seleciona ele
        if (window.aiStudioTemplate && window.aiStudioTemplate.menuId) {
            select.value = window.aiStudioTemplate.menuId;
        }
    },

    renderMenuList: function() {
        const list = document.getElementById('menu-list');
        if (!list) return;

        if (this.menus.length === 0) {
            list.innerHTML = '<li><span style="color: #64748b; font-size: 13px;">Nenhum menu criado.</span></li>';
            return;
        }

        list.innerHTML = this.menus.map(m => `
            <li class="menu-item-row" onclick="window.menuSystem.editMenu('${m.id}')" style="padding: 12px; background: white; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s;">
                <span style="font-weight: 600; font-size: 13px; color: #1e293b;">${m.name}</span>
                <span style="font-size: 9px; color: #94a3b8; text-transform: uppercase;">ID: ${m.id}</span>
            </li>
        `).join('');
    },

    renderSiloList: function() {
        const list = document.getElementById('silo-manager-list');
        if (!list) return;

        if (this.silos.length === 0) {
            list.innerHTML = '<div style="color: #64748b; font-size: 13px; text-align: center; padding: 20px;">Nenhum silo ativo.</div>';
            return;
        }

        list.innerHTML = this.silos.map(s => `
            <div onclick="window.menuSystem.editSilo('${s.id}')" style="padding: 12px; background: white; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s;">
                <div style="display: flex; flex-direction: column;">
                    <span style="font-weight: 700; font-size: 13px; color: #10b981;">${s.hub}</span>
                    <span style="font-size: 10px; color: #94a3b8;">/${s.slug}</span>
                </div>
                <div style="font-size: 10px; color: #94a3b8;">${s.spokes.length} Spokes</div>
            </div>
        `).join('');
    },

    createNewMenu: function() {
        const name = prompt("Nome do novo menu (ex: Silo Autismo):");
        if (!name) return;

        const newMenu = {
            id: 'menu_' + Date.now(),
            name: name,
            items: []
        };

        this.menus.push(newMenu);
        this.renderMenuList();
        this.editMenu(newMenu.id);
    },

    editMenu: function(id) {
        this.currentMenu = this.menus.find(m => m.id === id);
        if (!this.currentMenu) return;

        const editorCard = document.getElementById('menu-editor-card');
        const editorTitle = document.getElementById('menu-editor-title');
        const editorName = document.getElementById('menu-editor-name');
        const editorId = document.getElementById('menu-editor-id');

        if (editorCard) editorCard.style.display = 'block';
        if (editorTitle) editorTitle.innerText = `Editando: ${this.currentMenu.name}`;
        if (editorName) editorName.value = this.currentMenu.name;
        if (editorId) editorId.value = this.currentMenu.id;

        this.renderTree();
    },

    addMenuItem: function(parentId = null) {
        const label = prompt("Rótulo do Link (ex: Sobre):");
        if (!label) return;
        const url = prompt("URL/Slug (ex: /sobre ou #id):", "/");

        const newItem = {
            id: 'item_' + Date.now(),
            label: label,
            url: url,
            status: "published",
            children: []
        };

        if (parentId) {
            const findAndAdd = (items) => {
                for (let i = 0; i < items.length; i++) {
                    if (items[i].id === parentId) {
                        items[i].children.push(newItem);
                        return true;
                    }
                    if (items[i].children && findAndAdd(items[i].children)) return true;
                }
                return false;
            };
            findAndAdd(this.currentMenu.items);
        } else {
            this.currentMenu.items.push(newItem);
        }

        this.renderTree();
    },

    renderTree: function() {
        const container = document.getElementById('menu-tree-container');
        if (!container) return;

        if (this.currentMenu.items.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 40px; color: #94a3b8; font-size: 13px;">Nenhum link adicionado. Use o botão acima.</div>';
            return;
        }

        const buildHtml = (items, level = 0) => {
            return items.map((item, index) => `
                <div class="menu-node" style="margin-left: ${level * 30}px; background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; display: flex; flex-direction: column; gap: 8px; border-left: 4px solid ${level === 0 ? '#6366f1' : '#94a3b8'};">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-weight: bold; font-size: 13px;">${item.label}</span>
                            <span style="font-size: 11px; color: #64748b; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${item.url}</span>
                            <span style="font-size: 9px; padding: 2px 5px; border-radius: 4px; background: ${item.status === 'draft' ? '#fee2e2' : '#dcfce7'}; color: ${item.status === 'draft' ? '#991b1b' : '#166534'};">${item.status.toUpperCase()}</span>
                        </div>
                        <div style="display: flex; gap: 5px;">
                            <button onclick="window.menuSystem.toggleStatus('${item.id}')" class="btn" style="padding: 2px 8px; font-size: 10px;">${item.status === 'draft' ? '🚀 Publicar' : '⏸️ Draft'}</button>
                            ${level === 0 ? `<button onclick="window.menuSystem.addMenuItem('${item.id}')" class="btn btn-secondary" style="padding: 2px 8px; font-size: 10px;">+ Sub</button>` : ''}
                            <button onclick="window.menuSystem.removeItem('${item.id}')" class="btn" style="padding: 2px 8px; font-size: 10px; color: #ef4444;">Deletar</button>
                        </div>
                    </div>
                </div>
                ${item.children && item.children.length > 0 ? buildHtml(item.children, level + 1) : ''}
            `).join('');
        };

        container.innerHTML = buildHtml(this.currentMenu.items);
    },

    toggleStatus: function(id) {
        const findAndToggle = (items) => {
            for (let i = 0; i < items.length; i++) {
                if (items[i].id === id) {
                    items[i].status = items[i].status === 'draft' ? 'published' : 'draft';
                    return true;
                }
                if (items[i].children && findAndToggle(items[i].children)) return true;
            }
            return false;
        };
        findAndToggle(this.currentMenu.items);
        this.renderTree();
    },

    removeItem: function(id) {
        if (!confirm("Deletar este item e todos os seus sub-links?")) return;

        const findAndRemove = (items) => {
            for (let i = 0; i < items.length; i++) {
                if (items[i].id === id) {
                    items.splice(i, 1);
                    return true;
                }
                if (items[i].children && findAndRemove(items[i].children)) return true;
            }
            return false;
        };
        findAndRemove(this.currentMenu.items);
        this.renderTree();
    },

    saveCurrentMenu: async function() {
        if (!this.currentMenu) return;

        const btn = document.getElementById('btn-save-menu');
        const originalText = btn?.innerText || "💾 Salvar Árvore";
        if (btn) { btn.innerText = "⏳ PROCESSANDO..."; btn.disabled = true; }

        try {
            this.currentMenu.name = document.getElementById('menu-editor-name').value;
            
            const res = await fetch('/api/menus', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(this.menus)
            });

            if (!res.ok) {
                const error = await res.json().catch(() => ({}));
                throw new Error(error.error || "Erro no servidor.");
            }

            alert("✅ SUCESSO! Menus persistidos.");
            this.renderMenuList();
        } catch (e) {
            alert("⚠️ Erro ao salvar menu: " + e.message);
        } finally {
            if (btn) { btn.innerText = originalText; btn.disabled = false; }
            this.loadMenusIntoStudio();
        }
    },

    // --- MÉTODOS SILO CRUD ---
    createNewSilo: function() {
        const hub = prompt("Nome do Hub (Eixo Central):");
        if (!hub) return;
        const slug = hub.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');

        const newSilo = {
            id: 'silo_' + Date.now(),
            hub: hub,
            slug: slug,
            spokes: []
        };
        this.silos.push(newSilo);
        this.renderSiloList();
        this.editSilo(newSilo.id);
    },

    editSilo: function(id) {
        this.currentSilo = this.silos.find(s => s.id === id);
        if (!this.currentSilo) return;

        const emptyState = document.getElementById('silo-empty-state');
        const editorCard = document.getElementById('silo-editor-card');
        const editorTitle = document.getElementById('silo-editor-title');
        const editorHub = document.getElementById('silo-editor-hub');
        const editorSlug = document.getElementById('silo-editor-slug');

        if (emptyState) emptyState.style.display = 'none';
        if (editorCard) editorCard.style.display = 'block';
        if (editorTitle) editorTitle.innerText = `Gestão Silo: ${this.currentSilo.hub}`;
        if (editorHub) editorHub.value = this.currentSilo.hub;
        if (editorSlug) editorSlug.value = this.currentSilo.slug;

        this.renderSiloSpokes();
    },

    addSiloSpoke: function() {
        const spoke = prompt("Nome da Página Spoke (Apoio):");
        if (!spoke) return;
        this.currentSilo.spokes.push(spoke);
        this.renderSiloSpokes();
    },

    removeSiloSpoke: function(idx) {
        this.currentSilo.spokes.splice(idx, 1);
        this.renderSiloSpokes();
    },

    renderSiloSpokes: function() {
        const container = document.getElementById('silo-spokes-container');
        if (!this.currentSilo.spokes.length) {
            container.innerHTML = '<div style="color: #94a3b8; font-size: 11px; text-align: center; padding: 20px;">Nenhum spoke para esta arquitetura.</div>';
            return;
        }

        container.innerHTML = this.currentSilo.spokes.map((s, idx) => {
            const isPublished = this.inventory.published.some(p => p.toLowerCase().includes(s.toLowerCase()));
            const isDraft = this.inventory.drafts.some(d => d.toLowerCase().includes(s.toLowerCase()));
            
            let statusBadge = '<span style="background: #f1f5f9; color: #64748b; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 800;">📋 PLANO</span>';
            if (isPublished) statusBadge = '<span style="background: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 800;">✅ LIVE</span>';
            else if (isDraft) statusBadge = '<span style="background: #fef9c3; color: #854d0e; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 800;">📝 RASCUNHO</span>';

            return `
                <div style="display: flex; justify-content: space-between; align-items: center; background: white; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; transition: border-color 0.2s;">
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <span style="font-size: 13px; font-weight: 700; color: #1e293b;">📄 ${s}</span>
                        <div style="display: flex; gap: 5px; align-items: center;">
                            ${statusBadge}
                            <span style="font-size: 9px; color: #94a3b8; font-family: monospace;">/${s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-')}</span>
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <button onclick="window.menuSystem.writeSpokePost('${this.currentSilo.hub}', '${s}')" title="Gerar no AI Studio" style="background: #6366f1; border: none; color: white; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px;">🪄</button>
                        <button onclick="window.menuSystem.removeSiloSpoke(${idx})" style="background: none; border: none; color: #ef4444; font-size: 10px; cursor: pointer; font-weight: 800;">remover 🗑️</button>
                    </div>
                </div>
            `;
        }).join('');
    },

    writeSpokePost: function(hub, spoke) {
        // Redireciona para o AI Studio
        const navBtn = document.querySelector('[data-target="ai-studio"]');
        if (navBtn) navBtn.click();
        
        // Pauta o Studio (IDs Stepper V5)
        setTimeout(() => {
            const themeInput = document.getElementById('ai-studio-theme');
            const contextInput = document.getElementById('ai-studio-context');
            const siloSelect = document.getElementById('ai-studio-silo');
            
            if (themeInput) themeInput.value = spoke;
            if (contextInput) contextInput.value = `Focado no Silo: ${hub}. Artigo técnico com E-E-A-T.`;
            if (siloSelect) siloSelect.value = hub;
            
            console.log(`🪄 [Silo-Flow] Preparando Studio para: ${spoke}`);
            
            if (window.chatApp && window.chatApp.addMessage) {
                window.chatApp.addMessage(`🪄 **Fluxo Silo Master:** Vamos gerar o Spoke **"${spoke}"** para o Hub **${hub}**. Seguiremos as diretrizes de autoridade clínica.`);
            }
        }, 100);
    },

    saveCurrentSilo: async function() {
        if (!this.currentSilo && (!this.silos || !this.silos.length)) return;

        // Se estiver editando no card, atualiza o silo específico primeiro
        if (this.currentSilo) {
            this.currentSilo.hub = document.getElementById('silo-editor-hub').value;
            this.currentSilo.slug = document.getElementById('silo-editor-slug').value;
        }

        try {
            console.log("Saving silos:", this.silos);
            const res = await fetch('/api/seo/silos', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(this.silos)
            });

            if (!res.ok) {
                const error = await res.json().catch(() => ({}));
                throw new Error(error.error || "Erro ao salvar silos no servidor.");
            }

            alert("✅ Arquitetura de Silos salva e sincronizada.");
            this.renderSiloList();
            this.loadSilosIntoStudio();
            
            // Sincroniza o AI Studio se estiver aberto
            if (window.aiStudioTemplate) {
                window.aiStudioTemplate.loadSilos();
                window.aiStudioTemplate.loadMenus();
            }
        } catch (e) {
            alert("⚠️ " + e.message);
        }
    },

    loadSilosIntoStudio: function() {
        const select = document.getElementById('ai-studio-silo');
        if (!select) return;
        select.innerHTML = '<option value="">Selecione o Hub Silo...</option>';
        if (this.silos && this.silos.length) {
            this.silos.forEach(s => {
                select.innerHTML += `<option value="${s.hub}">${s.hub}</option>`;
            });
        }
    }
};

// Auto-init
document.addEventListener('DOMContentLoaded', () => {
    window.menuSystem.init();
});
