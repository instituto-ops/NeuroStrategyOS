window.seoEngine = {
    upcomingPosts: JSON.parse(localStorage.getItem('abidos_upcoming_posts') || '[]'),
    fullData: null,
    expandedHubs: new Set(),

    init() {
        this.analyze();
    },

    async analyze() {
        try {
            const res = await fetch('/api/seo/silos');
            const data = await res.json();
            this.fullData = data; 
            
            this.renderSilos();
            this.renderUpcomingPosts();

            if(window.cytoscape && document.getElementById('cy-map')) {
                this.renderGraph(data);
            }

        } catch (e) {
            console.error("Erro interno no Planejamento:", e);
        }
    },

    copyArchitecture() {
        if (!this.fullData || !this.fullData.silos) return;
        
        let text = `# ARQUITETURA DE SILOS - NEUROENGINE\n\n`;
        this.fullData.silos.forEach(silo => {
            text += `## HUB: ${silo.hub} (/${silo.slug})\n`;
            if (silo.spokes && silo.spokes.length > 0) {
                silo.spokes.forEach(spoke => {
                    const spokeSlug = spoke.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
                    text += `- SPOKE: ${spoke} (/${silo.slug}/${spokeSlug})\n`;
                });
            } else {
                text += `(Nenhum spoke definido)\n`;
            }
            text += `\n`;
        });

        navigator.clipboard.writeText(text).then(() => {
            alert("✅ Arquitetura copiada para o clipboard!\nIdeal para enviar a chats externos (ChatGPT/Gemini).");
        }).catch(err => {
            console.error('Erro ao copiar:', err);
            alert("Erro ao copiar arquitetura.");
        });
    },

    renderSilos() {
        const tbody = document.getElementById('silo-table-body');
        if (!tbody || !this.fullData) return;

        if (this.fullData.silos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px; color: #94a3b8;">Nenhum Hub Silo definido. Clique em "+ NOVO HUB SILO".</td></tr>';
            return;
        }

        let html = '';
        this.fullData.silos.forEach(silo => {
            const isExpanded = this.expandedHubs.has(silo.id);
            const spokeCount = silo.spokes ? silo.spokes.length : 0;
            
            html += `
                <tr class="hub-row" onclick="window.seoEngine.toggleHub('${silo.id}')" style="cursor: pointer; transition: background 0.2s;">
                    <td style="text-align: center; color: #6366f1; font-size: 14px;">${isExpanded ? '▼' : '▶'}</td>
                    <td style="padding: 12px;">
                        <input type="text" value="${silo.hub}" class="inline-edit" 
                            style="background: transparent; border: none; color: #fff; font-weight: 700; width: 100%;"
                            onchange="window.seoEngine.updateSiloField('${silo.id}', 'hub', this.value)"
                            onclick="event.stopPropagation()">
                    </td>
                    <td style="padding: 12px;">
                        <input type="text" value="${silo.slug}" class="inline-edit" 
                            style="background: transparent; border: none; color: #94a3b8; font-family: monospace; font-size: 11px; width: 100%;"
                            onchange="window.seoEngine.updateSiloField('${silo.id}', 'slug', this.value)"
                            onclick="event.stopPropagation()">
                    </td>
                    <td style="padding: 12px; text-align: center;">
                        <span class="badge" style="background: rgba(99, 102, 241, 0.1); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.2); font-size: 10px; padding: 2px 10px;">
                            ${spokeCount} SPOKES
                        </span>
                    </td>
                    <td style="padding: 12px; text-align: right;">
                        <button class="btn" style="background: transparent; color: #ef4444; border: none;" onclick="event.stopPropagation(); window.seoEngine.deleteSilo('${silo.id}')">🗑️</button>
                    </td>
                </tr>
            `;

            if (isExpanded) {
                html += `
                    <tr class="spoke-detail-row" style="background: rgba(0,0,0,0.15);">
                        <td colspan="5" style="padding: 0;">
                            <div style="padding: 20px; border-left: 4px solid #6366f1; margin: 10px 20px; background: rgba(255,255,255,0.02); border-radius: 0 8px 8px 0;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                                    <h4 style="margin: 0; font-size: 11px; color: #818cf8; text-transform: uppercase; letter-spacing: 1px;">📄 Artigos de Apoio (Spokes) para: ${silo.hub}</h4>
                                    <button class="btn btn-secondary" style="font-size: 9px; padding: 4px 12px; border-color: #10b981; color: #10b981;" onclick="window.seoEngine.addSpokePrompt('${silo.id}')">+ NOVO SPOKE</button>
                                </div>
                                <div id="spoke-list-${silo.id}" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 10px;">
                                    ${this.renderSpokeItems(silo)}
                                </div>
                            </div>
                        </td>
                    </tr>
                `;
            }
        });

        tbody.innerHTML = html;
    },

    renderSpokeItems(silo) {
        if (!silo.spokes || silo.spokes.length === 0) {
            return `<div style="grid-column: 1/-1; text-align: center; color: #64748b; font-size: 11px; padding: 10px; font-style: italic;">Nenhum spoke vinculado.</div>`;
        }

        return silo.spokes.map((spoke, idx) => {
            const spokeSlug = spoke.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
            return `
                <div style="background: rgba(255,255,255,0.03); padding: 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center;">
                    <div style="overflow: hidden; flex: 1; margin-right: 10px;">
                        <input type="text" value="${spoke}" class="inline-edit" 
                            style="background: transparent; border: none; color: #cbd5e1; font-size: 12px; font-weight: 500; width: 100%;"
                            onchange="window.seoEngine.updateSpokeField('${silo.id}', ${idx}, this.value)">
                        <div style="font-size: 9px; color: #64748b; font-family: monospace;">/${silo.slug}/${spokeSlug}</div>
                    </div>
                    <div style="display: flex; gap: 5px;">
                        <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 9px; border-color: #10b981; color: #10b981;" onclick="window.seoEngine.writePostPrompt('${spoke}', 'Foco no Hub: ${silo.hub}')">ESCREVER</button>
                        <button class="btn" style="background: transparent; color: #ef4444; border: none; font-size: 12px; padding: 0 5px;" onclick="window.seoEngine.removeSpoke('${silo.id}', ${idx})">&times;</button>
                    </div>
                </div>
            `;
        }).join('');
    },

    toggleHub(id) {
        if (this.expandedHubs.has(id)) {
            this.expandedHubs.delete(id);
        } else {
            this.expandedHubs.add(id);
        }
        this.renderSilos();
    },

    async updateSiloField(id, field, value) {
        const silo = this.fullData.silos.find(s => s.id === id);
        if (silo) {
            silo[field] = value;
            await this.saveSilos();
            this.renderUpcomingPosts(); // Update selectors
            if(window.cytoscape && document.getElementById('cy-map')) this.renderGraph(this.fullData);
        }
    },

    async updateSpokeField(siloId, idx, value) {
        const silo = this.fullData.silos.find(s => s.id === siloId);
        if (silo) {
            silo.spokes[idx] = value;
            await this.saveSilos();
            if(window.cytoscape && document.getElementById('cy-map')) this.renderGraph(this.fullData);
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
        this.expandedHubs.add(newSilo.id);
        setTimeout(() => this.renderSilos(), 100);
    },

    async deleteSilo(id) {
        if (!confirm("Excluir permanentemente este Hub e todos os seus Spokes?")) return;
        this.fullData.silos = this.fullData.silos.filter(s => s.id !== id);
        this.expandedHubs.delete(id);
        await this.saveSilos();
        this.analyze();
    },

    async addSpokePrompt(siloId) {
        const silo = this.fullData.silos.find(s => s.id === siloId);
        if (!silo) return;
        const spoke = prompt(`Qual o novo Spoke para o Silo "${silo.hub}"?`);
        if (!spoke) return;
        
        if (!silo.spokes) silo.spokes = [];
        silo.spokes.push(spoke);
        await this.saveSilos();
        this.renderSilos();
        if(window.cytoscape && document.getElementById('cy-map')) this.renderGraph(this.fullData);
    },

    async removeSpoke(siloId, idx) {
        const silo = this.fullData.silos.find(s => s.id === siloId);
        if (!silo) return;
        silo.spokes.splice(idx, 1);
        await this.saveSilos();
        this.renderSilos();
        if(window.cytoscape && document.getElementById('cy-map')) this.renderGraph(this.fullData);
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

    addUpcomingPost() {
        const newPost = {
            id: Date.now(),
            title: "Novo Título Clínico...",
            focus: "TEA, Ansiedade, etc",
            silo: "", // Combinado "Hub | Spoke"
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
                        ${this.renderSiloOptions(p.silo)}
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

    renderSiloOptions(currentValue) {
        if (!this.fullData || !this.fullData.silos) return '';
        
        return this.fullData.silos.map(hub => {
            let options = `<optgroup label="HUB: ${hub.hub}">`;
            options += `<option value="${hub.hub}" ${currentValue === hub.hub ? 'selected' : ''}>[HUB] ${hub.hub}</option>`;
            if (hub.spokes) {
                hub.spokes.forEach(spoke => {
                    const combined = `${hub.hub} > ${spoke}`;
                    options += `<option value="${combined}" ${currentValue === combined ? 'selected' : ''}>↳ Spoke: ${spoke}</option>`;
                });
            }
            options += `</optgroup>`;
            return options;
        }).join('');
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
        const container = document.getElementById('cy-map');
        if(!data || !data.silos || !container) return;
        
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

            if (silo.spokes) {
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
            }
        });

        this.cy = cytoscape({
            container: container,
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

const _styleSeo = document.createElement('style');
_styleSeo.textContent = `
    .inline-edit { cursor: pointer; border-radius: 4px; padding: 4px 8px !important; transition: all 0.2s; }
    .inline-edit:hover { background: rgba(255,255,255,0.05) !important; color: #fff !important; }
    .inline-edit:focus { background: rgba(99, 102, 241, 0.15) !important; outline: 1px solid #6366f1 !important; color: #fff !important; }
    .hub-row:hover { background: rgba(99, 102, 241, 0.05) !important; }
    .spoke-detail-row:hover { background: rgba(0,0,0,0.2) !important; }
`;
document.head.appendChild(_styleSeo);
