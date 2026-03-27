window.seoEngine = {
    upcomingPosts: JSON.parse(localStorage.getItem('abidos_upcoming_posts') || '[]'),
    fullData: null,
    currentHub: null,

    init() {
        this.renderUpcomingPosts();
        this.analyze();
    },

    async analyze() {
        try {
            const res = await fetch('/api/seo/silos');
            const data = await res.json();
            this.fullData = data; 
            
            // Popula Selector para retrocompatibilidade em outros módulos se necessário
            const selector = document.getElementById('planning-silo-selector');
            if (selector) {
                selector.innerHTML = '<option value="">Selecione um Silo...</option>';
                data.silos.forEach(silo => {
                    const opt = document.createElement('option');
                    opt.value = silo.hub;
                    opt.innerText = silo.hub;
                    selector.appendChild(opt);
                });
            }

            // Renderiza nova Visão Mestre
            this.renderSiloMaster();

            if(window.cytoscape) {
                this.renderGraph(data);
            }

        } catch (e) {
            console.error("Erro interno no Planejamento:", e);
        }
    },

    renderSiloMaster() {
        const tbody = document.getElementById('silo-master-table-body');
        if (!tbody || !this.fullData) return;

        if (this.fullData.silos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px;">Nenhum Hub Silo definido.</td></tr>';
            return;
        }

        tbody.innerHTML = this.fullData.silos.map(silo => {
            const isSelected = this.currentHub && this.currentHub.id === silo.id;
            return `
                <tr onclick="window.seoEngine.selectSilo('${silo.id}')" style="cursor: pointer; transition: background 0.2s; ${isSelected ? 'background: rgba(99, 102, 241, 0.15) !important;' : ''} border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <td style="padding: 12px;">
                        <input type="text" value="${silo.hub}" class="inline-edit" 
                            style="background: transparent; border: none; color: #fff; font-weight: 700; width: 100%; transition: color 0.2s;"
                            onchange="window.seoEngine.updateSiloField('${silo.id}', 'hub', this.value)"
                            onclick="event.stopPropagation()">
                    </td>
                    <td style="padding: 12px;">
                        <input type="text" value="${silo.slug}" class="inline-edit" 
                            style="background: transparent; border: none; color: var(--color-secondary); font-family: monospace; font-size: 11px; width: 100%;"
                            onchange="window.seoEngine.updateSiloField('${silo.id}', 'slug', this.value)"
                            onclick="event.stopPropagation()">
                    </td>
                    <td style="padding: 12px; text-align: center;">
                        <span style="background: rgba(16, 185, 129, 0.1); color: #10b981; font-size: 10px; font-weight: 900; padding: 2px 8px; border-radius: 4px;">
                            ${silo.spokes.length} SPOKES
                        </span>
                    </td>
                    <td style="padding: 12px; text-align: right;">
                        <button class="btn" style="background: transparent; color: #ef4444; font-size: 14px; border: none;" onclick="event.stopPropagation(); window.seoEngine.deleteSilo('${silo.id}')">🗑️</button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    selectSilo(id) {
        if (!this.fullData) return;
        const silo = this.fullData.silos.find(s => s.id === id);
        if (!silo) return;

        this.currentHub = silo;
        this.renderSiloMaster(); // Atualiza seleção visual

        // Atualiza painel de spokes
        const emptyState = document.getElementById('spoke-empty-state');
        if(emptyState) emptyState.style.display = 'none';
        
        const panel = document.getElementById('spoke-manager-panel');
        if(panel) panel.style.display = 'flex';

        const hubNameDisplay = document.getElementById('current-hub-name');
        if(hubNameDisplay) hubNameDisplay.innerText = silo.hub;
        
        this.renderSpokes();

        // Limpa e oculta sugestões se não houver
        const suggestPanel = document.getElementById('silo-suggestions-panel');
        if(suggestPanel) suggestPanel.style.display = 'none';
    },

    renderSpokes() {
        const container = document.getElementById('spoke-list-container');
        if (!this.currentHub || !container) return;

        if (this.currentHub.spokes.length === 0) {
            container.innerHTML = '<div style="color: #94a3b8; font-size: 12px; text-align: center; padding: 20px;">Nenhum artigo de apoio vinculado a este Hub.</div>';
            return;
        }

        container.innerHTML = this.currentHub.spokes.map((spoke, idx) => `
            <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <input type="text" value="${spoke}" class="inline-edit" 
                        style="background: transparent; border: none; color: #fff; font-size: 13px; font-weight: 600; width: 100%;"
                        onchange="window.seoEngine.updateSpokeField(${idx}, this.value)">
                    <span style="font-size: 9px; color: #94a3b8; font-family: monospace;">/${spoke.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-')}</span>
                </div>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <button class="btn btn-primary" style="padding: 5px 10px; font-size: 10px;" onclick="window.seoEngine.writePostPrompt('${spoke}', 'Foco no Hub: ${this.currentHub.hub}')">Produzir</button>
                    <button class="btn" style="background: transparent; color: #ef4444; border: none; font-size: 12px;" onclick="window.seoEngine.removeSpoke(${idx})">🗑️</button>
                </div>
            </div>
        `).join('');
    },

    async updateSiloField(id, field, value) {
        const silo = this.fullData.silos.find(s => s.id === id);
        if (silo) {
            silo[field] = value;
            await this.saveSilos();
            this.renderGraph(this.fullData);
        }
    },

    async updateSpokeField(idx, value) {
        if (this.currentHub) {
            this.currentHub.spokes[idx] = value;
            await this.saveSilos();
            this.renderGraph(this.fullData);
        }
    },

    async addSiloPrompt() {
        const title = prompt("Qual o nome do novo Hub de Silo?");
        if (!title) return;

        if (!this.fullData) this.fullData = { silos: [] };
        const newSilo = { 
            id: 'silo_' + Date.now(), 
            hub: title, 
            slug: title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-'),
            spokes: [] 
        };
        
        if (!this.fullData.silos) this.fullData.silos = [];
        this.fullData.silos.push(newSilo);
        await this.saveSilos();
        this.analyze();
        setTimeout(() => this.selectSilo(newSilo.id), 100);
    },

    async deleteSilo(id) {
        if (!confirm("Excluir permanentemente este Hub e todos os seus Spokes?")) return;
        this.fullData.silos = this.fullData.silos.filter(s => s.id !== id);
        if (this.currentHub && this.currentHub.id === id) {
            this.currentHub = null;
            document.getElementById('spoke-manager-panel').style.display = 'none';
            document.getElementById('spoke-empty-state').style.display = 'flex';
        }
        await this.saveSilos();
        this.analyze();
    },

    async addSpokePrompt() {
        if (!this.currentHub) return;
        const spoke = prompt(`Qual o novo Spoke para o Silo "${this.currentHub.hub}"?`);
        if (!spoke) return;
        
        this.currentHub.spokes.push(spoke);
        await this.saveSilos();
        this.renderSpokes();
        this.renderGraph(this.fullData);
    },

    async removeSpoke(idx) {
        if (!this.currentHub) return;
        this.currentHub.spokes.splice(idx, 1);
        await this.saveSilos();
        this.renderSpokes();
        this.renderGraph(this.fullData);
    },

    async saveSilos() {
        try {
            await fetch('/api/seo/silos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.fullData.silos)
            });
            console.log("✅ Silos persistidos.");
            if (window.menuSystem) window.menuSystem.loadSilos();
        } catch (e) {
            console.error("Erro ao persistir silos:", e);
        }
    },

    async suggestSilos() {
        const container = document.getElementById('silo-suggestions-list-planning');
        const panel = document.getElementById('silo-suggestions-panel');
        if (!container || !panel) return;

        panel.style.display = 'block';
        container.innerHTML = '<div style="padding: 10px; font-size: 11px; color: #9f1239;">🧠 Analisando arquitetura...</div>';

        try {
            const res = await fetch('/api/seo/analyze-silos');
            const data = await res.json();
            if (data.suggestions && data.suggestions.length > 0) {
                container.innerHTML = data.suggestions.map(s => `
                    <div style="background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; border: 1px solid #fecdd3; display: flex; flex-direction: column; gap: 8px;">
                        <div style="display: flex; justify-content: space-between; align-items: start;">
                            <strong style="color: #be185d; font-size: 12px;">HUB: ${s.hub}</strong>
                            <button class="btn btn-primary" style="font-size: 9px; padding: 4px 10px; background: #e11d48;" onclick='window.seoEngine.applySiloSuggestion(${JSON.stringify(s)})'>✨ Criar</button>
                        </div>
                        <div style="font-size: 10px; color: #db2777;">Spokes sugeridos: ${s.spokes.join(', ')}</div>
                    </div>
                `).join('');
            } else {
                container.innerHTML = '<div style="font-size: 10px; color: #9f1239; padding:10px;">Nenhuma nova sugestão detectada.</div>';
            }
        } catch (e) {
            container.innerHTML = `<div style="color: #ef4444; font-size: 10px; padding: 10px;">Erro: ${e.message}</div>`;
        }
    },

    async applySiloSuggestion(s) {
        if (!this.fullData) this.fullData = { silos: [] };
        if (!this.fullData.silos) this.fullData.silos = [];
        const newSilo = {
            id: 'silo_' + Date.now(),
            hub: s.hub,
            slug: s.slug || s.hub.toLowerCase().replace(/\s+/g, '-'),
            spokes: s.spokes || []
        };
        this.fullData.silos.push(newSilo);
        await this.saveSilos();
        this.analyze();
        document.getElementById('silo-suggestions-panel').style.display = 'none';
        setTimeout(() => this.selectSilo(newSilo.id), 100);
    },

    addUpcomingPost() {
        const newPost = {
            id: Date.now(),
            title: "Novo Título Clínico...",
            focus: "TEA, Ansiedade, etc",
            silo: this.currentHub ? this.currentHub.hub : "",
            status: 'Pendente'
        };

        this.upcomingPosts.unshift(newPost);
        this.saveUpcomingPosts();
        this.renderUpcomingPosts();
    },

    updatePostField(id, field, value) {
        const post = this.upcomingPosts.find(p => p.id === id);
        if (post) {
            post[field] = value;
            this.saveUpcomingPosts();
        }
    },

    removeUpcomingPost(id) {
        if(!confirm("Remover este item da pauta?")) return;
        this.upcomingPosts = this.upcomingPosts.filter(p => p.id !== id);
        this.saveUpcomingPosts();
        this.renderUpcomingPosts();
    },

    saveUpcomingPosts() {
        localStorage.setItem('abidos_upcoming_posts', JSON.stringify(this.upcomingPosts));
    },

    renderUpcomingPosts() {
        const tbody = document.getElementById('upcoming-posts-table');
        if (!tbody) return;

        if (this.upcomingPosts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="padding: 30px; text-align: center; color: #94a3b8; font-style: italic;">Nenhum título na pauta. Comece agora.</td></tr>';
            return;
        }

        tbody.innerHTML = this.upcomingPosts.map(p => `
            <tr style="background: rgba(255,255,255,0.03); border-bottom: 1px solid rgba(255,255,255,0.05);">
                <td style="padding: 12px;">
                    <input type="text" value="${p.title}" class="inline-edit" style="width: 100%; border: none; background: transparent; color: #fff; font-weight: 800; font-size: 13px;" onchange="window.seoEngine.updatePostField(${p.id}, 'title', this.value)">
                </td>
                <td style="padding: 12px;">
                    <input type="text" value="${p.focus}" class="inline-edit" style="width: 100%; border: none; background: transparent; color: var(--color-text-light); font-size: 12px;" onchange="window.seoEngine.updatePostField(${p.id}, 'focus', this.value)">
                </td>
                <td style="padding: 12px;">
                    <select class="inline-edit" style="width: 100%; border: none; background: transparent; color: var(--color-secondary); font-size: 11px; font-weight: 700;" onchange="window.seoEngine.updatePostField(${p.id}, 'silo', this.value)">
                        <option value="">Nenhum Silo</option>
                        ${this.fullData ? (this.fullData.silos || []).map(s => `<option value="${s.hub}" ${p.silo === s.hub ? 'selected' : ''}>${s.hub}</option>`).join('') : ''}
                    </select>
                </td>
                <td style="padding: 12px; text-align: center;">
                    <span style="background: rgba(30, 41, 59, 0.5); padding: 4px 12px; border-radius: 20px; font-size: 9px; font-weight: 900; color: #94a3b8; border: 1px solid rgba(255,255,255,0.1);">${p.status.toUpperCase()}</span>
                </td>
                <td style="padding: 12px; text-align: right;">
                    <div style="display: flex; gap: 8px; justify-content: flex-end;">
                        <button onclick="window.seoEngine.writePostPrompt('${p.title}', '${p.focus}')" class="btn btn-primary" style="font-size: 10px; padding: 6px 15px; background: #10b981; border: none; font-weight: 800;">🚀 Escrever</button>
                        <button onclick="window.seoEngine.removeUpcomingPost(${p.id})" class="btn" style="background: transparent; color: #ef4444; border: none; font-size: 14px;">🗑️</button>
                    </div>
                </td>
            </tr>
        `).join('');
    },

    writePostPrompt(title, focus) {
        const choice = confirm(`ESCOLHER FLUXO DE PRODUÇÃO PARA:\n"${title}"\n\nOK = Ir para o AI Studio (Automação Abidos)\nCancelar = Criar Manualmente (Inserção HTML)`);
        
        if (choice) {
            this.writePost(title, focus);
        } else {
            if(window.acervoManager) {
                app.showSection('acervo-publicacoes');
                setTimeout(() => {
                    window.acervoManager.openCreateManualModal();
                    const titleInput = document.getElementById('manual-title');
                    const slugInput = document.getElementById('manual-slug');
                    if(titleInput) titleInput.value = title;
                    if(slugInput) slugInput.value = '/' + title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
                }, 100);
            }
        }
    },

    async writePost(title, focus) {
        if (window.aiStudioTemplate) {
            app.showSection('ai-studio');
            await window.aiStudioTemplate.importIntoStudio({
                theme: title,
                context: focus,
                reset: true
            });
            if(window.sparkEngine) console.log(`✨ [SPARK] Flow: Planning ➔ AI Studio: "${title}"`);
        } else {
            alert("Studio não carregado.");
        }
    },

    renderGraph(data) {
        if(!data || !data.silos) return;
        const elements = [];
        const publishedPages = window.acervoManager?.allPages || [];
        const activeDrafts = window.abidosReview?.allDrafts || [];

        data.silos.forEach(silo => {
            const isPublished = publishedPages.some(p => p.slug.includes(silo.slug) || p.title === silo.hub);
            const isDraft = activeDrafts.some(d => d.theme === silo.hub);

            elements.push({ 
                data: { 
                    id: silo.hub, 
                    label: silo.hub, 
                    type: 'hub',
                    status: isPublished ? 'published' : (isDraft ? 'draft' : 'planned')
                } 
            });

            silo.spokes.forEach(spoke => {
                const spPublished = publishedPages.some(p => p.title.toLowerCase() === spoke.toLowerCase());
                const spDraft = activeDrafts.some(d => d.theme.toLowerCase() === spoke.toLowerCase());

                elements.push({ 
                    data: { 
                        id: spoke, 
                        label: spoke, 
                        type: 'spoke',
                        status: spPublished ? 'published' : (spDraft ? 'draft' : 'planned')
                    } 
                });
                elements.push({ data: { source: spoke, target: silo.hub } });
            });
        });

        this.cy = cytoscape({
            container: document.getElementById('cy-map'),
            elements: elements,
            wheelSensitivity: 0.2,
            style: [
                {
                    selector: 'node',
                    style: {
                        'background-color': '#475569',
                        'label': 'data(label)',
                        'color': '#cbd5e1',
                        'font-size': '10px',
                        'width': '20px',
                        'height': '20px',
                        'text-outline-width': 1,
                        'text-outline-color': '#020617',
                        'text-valign': 'bottom',
                        'text-halign': 'center',
                        'text-margin-y': 8,
                        'font-weight': '600',
                        'border-width': 2,
                        'border-color': '#1e293b'
                    }
                },
                {
                    selector: 'node[status="published"]',
                    style: { 'border-color': '#10b981', 'border-width': 3 }
                },
                {
                    selector: 'node[status="draft"]',
                    style: { 'border-color': '#f59e0b', 'border-width': 3 }
                },
                {
                    selector: 'node[type="hub"]',
                    style: {
                        'background-color': '#6366f1',
                        'width': '40px',
                        'height': '40px',
                        'font-size': '11px',
                        'color': '#fff'
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'width': 2,
                        'line-color': 'rgba(99, 102, 241, 0.2)',
                        'target-arrow-color': 'rgba(99, 102, 241, 0.4)',
                        'target-arrow-shape': 'triangle',
                        'curve-style': 'bezier',
                        'opacity': 0.5
                    }
                }
            ],
            layout: { 
                name: 'cose', 
                animate: true, 
                padding: 40,
                componentSpacing: 80,
                nodeRepulsion: 10000
            }
        });

        this.cy.on('tap', 'node', (evt) => {
            const node = evt.target;
            const label = node.data('label');
            this.writePostPrompt(label, "Iniciado via Mapa de Autoridade");
        });
    },

    resetGraph() {
        if (this.cy) {
            this.cy.fit();
            this.cy.center();
        }
    },

    reorganizeGraph() {
        if (this.cy) {
            this.cy.layout({ name: 'cose', animate: true }).run();
        }
    }
};

const styleSeo = document.createElement('style');
styleSeo.textContent = `
    .inline-edit { cursor: pointer; border-radius: 4px; padding: 4px 8px !important; }
    .inline-edit:hover { background: rgba(255,255,255,0.05) !important; color: #fff !important; }
    .inline-edit:focus { background: rgba(99, 102, 241, 0.15) !important; outline: 1px solid #6366f1 !important; color: #fff !important; }
`;
document.head.appendChild(styleSeo);

