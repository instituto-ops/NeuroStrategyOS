/**
 * Menu Manager - NeuroEngine OS
 * Gerencia a estrutura de navegação desacoplada.
 */

window.menuSystem = {
    menus: [],
    inventory: { drafts: [], published: [] },
    currentMenu: null,

    init: async function() {
        console.log("🌳 Inicializando Gestor de Menus...");
        try { await this.loadMenus(); } catch(e) { console.warn("Menus não carregados:", e); }
        try { await this.loadInventory(); } catch(e) { console.warn("Inventário não carregado:", e); }
        
        this.renderMenuList();
        this.loadMenusIntoStudio();
    },

    loadInventory: async function() {
        console.log("📂 [neuroAPI] Sincronizando inventário com o Acervo Vercel...");
        try {
            const paginas = await window.neuroAPI.fetchAcervo();
            this.inventory = {
                drafts: [],
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
            <li class="menu-item-row" onclick="window.menuSystem.editMenu('${m.id}')" style="padding: 12px; background: white; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s; margin-bottom: 8px;">
                <span style="font-weight: 600; font-size: 13px; color: #1e293b;">${m.name}</span>
                <span style="font-size: 9px; color: #94a3b8; text-transform: uppercase;">ID: ${m.id}</span>
            </li>
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
        if (!container || !this.currentMenu) return;

        if (this.currentMenu.items.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 40px; color: #94a3b8; font-size: 13px;">Nenhum link adicionado. Use o botão acima.</div>';
            return;
        }

        const buildHtml = (items, level = 0) => {
            return items.map((item, index) => `
                <div class="menu-node" style="margin-left: ${level * 30}px; background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; display: flex; flex-direction: column; gap: 8px; border-left: 4px solid ${level === 0 ? '#6366f1' : '#94a3b8'}; margin-bottom: 5px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-weight: bold; font-size: 13px;">${item.label}</span>
                            <span style="font-size: 11px; color: #64748b; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${item.url}</span>
                            <span style="font-size: 9px; padding: 2px 5px; border-radius: 4px; background: ${item.status === 'draft' ? '#fee2e2' : '#dcfce7'}; color: ${item.status === 'draft' ? '#991b1b' : '#166534'};">${item.status.toUpperCase()}</span>
                        </div>
                        <div style="display: flex; gap: 5px;">
                            <button onclick="window.menuSystem.toggleStatus('${item.id}')" class="btn" style="padding: 2px 8px; font-size: 10px; background: #f1f5f9; border: 1px solid #e2e8f0;">${item.status === 'draft' ? '🚀 Publicar' : '⏸️ Draft'}</button>
                            ${level === 0 ? `<button onclick="window.menuSystem.addMenuItem('${item.id}')" class="btn btn-secondary" style="padding: 2px 8px; font-size: 10px;">+ Sub</button>` : ''}
                            <button onclick="window.menuSystem.removeItem('${item.id}')" class="btn" style="padding: 2px 8px; font-size: 10px; color: #ef4444; background: #fef2f2; border: 1px solid #fecaca;">🗑️</button>
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

    loadSilos: function() {
        if (window.aiStudioTemplate) window.aiStudioTemplate.loadSilos();
    }
};

window.addEventListener('DOMContentLoaded', () => { window.menuSystem.init(); });
