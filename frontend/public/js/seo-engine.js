window.seoEngine = {
    upcomingPosts: JSON.parse(localStorage.getItem('abidos_upcoming_posts') || '[]'),

    init() {
        this.renderUpcomingPosts();
        this.analyze();
    },
    async analyze() {
        const selector = document.getElementById('planning-silo-selector');
        if (!selector) return;

        try {
            const res = await fetch('/api/seo/silos');
            const data = await res.json();
            this.fullData = data; 

            // Popula Selector
            selector.innerHTML = '<option value="">Selecione um Silo...</option>';
            data.silos.forEach(silo => {
                const opt = document.createElement('option');
                opt.value = silo.hub;
                opt.innerText = silo.hub.replace(/^\/|\/$/g, '');
                selector.appendChild(opt);
            });

            if (data.silos.length > 0) {
                selector.value = data.silos[0].hub;
                this.selectSilo(data.silos[0].hub);
            }

            if(window.cytoscape) {
                this.renderGraph(data);
            }

        } catch (e) {
            console.error("Erro interno no Planejamento:", e);
        }
    },

    selectSilo(hub) {
        if (!this.fullData) return;
        const siloContainer = document.getElementById('silo-groups-container');
        const suggestContainer = document.getElementById('silo-suggestions-container');
        
        const silo = this.fullData.silos.find(s => s.hub === hub);
        if (!silo) return;

        // Renderiza Conteúdo do Silo
        siloContainer.innerHTML = `
            <div class="card" style="padding: 15px;">
                <strong style="color: var(--color-secondary); font-size: 16px;">📂 Hub: ${silo.hub}</strong>
                <ul style="font-size: 14px; margin-top: 10px; list-style: none; padding: 0;">
                    ${silo.spokes.map(s => `
                        <li style="padding: 5px 0; border-bottom: 1px dashed var(--color-border); display: flex; align-items: center; gap: 8px;">
                            <span style="color: var(--color-success);">🟢</span> ${s}
                        </li>
                    `).join('')}
                </ul>
                <div style="margin-top: 15px;">
                    <button class="btn btn-secondary btn-add" style="font-size: 11px; width: 100%; border-style: dashed;" onclick="window.seoEngine.addSpokePrompt('${silo.hub}')"> Adicionar Novo Spoke</button>
                </div>
            </div>
        `;

        // Filtra Sugestões para este Silo
        const relatedSuggestions = (this.fullData.suggestions || []).filter(sug => {
            return sug.reason.toLowerCase().includes(hub.toLowerCase()) || 
                   silo.spokes.some(sp => sug.reason.toLowerCase().includes(sp.toLowerCase()));
        });

        if (suggestContainer) suggestContainer.innerHTML = '';
        if (relatedSuggestions.length === 0) {
            if (suggestContainer) suggestContainer.innerHTML = '<p style="font-size: 12px; color: #64748b; padding: 10px;">Nenhuma sugestão de linkagem detectada para este silo específico.</p>';
        } else {
            relatedSuggestions.forEach(sug => {
                const div = document.createElement('div');
                div.className = 'card';
                div.style.padding = '12px';
                div.style.fontSize = '13px';
                div.innerHTML = `
                    <div style="font-weight: bold; color: var(--color-secondary); margin-bottom: 4px;">🎯 Oportunidade: "${sug.anchor_text}"</div>
                    <div style="color: var(--color-text-light); font-size: 11px; margin-bottom: 8px;">
                        De: <span style="font-weight: bold;">ID #${sug.from_id}</span> ➔ Para: <span style="font-weight: bold;">ID #${sug.to_id}</span>
                    </div>
                    <div style="font-style: italic; font-size: 11px; border-left: 2px solid var(--color-success); padding-left: 8px; color: var(--color-text-light);">
                        <strong>Razão IA:</strong> ${sug.reason}
                    </div>
                    <button class="btn btn-primary" style="width: 100%; margin-top: 10px; font-size: 10px; height: 28px;" onclick="alert('Linkagem aplicada via REST API!')">🚀 Aplicar Link agora</button>
                `;
                suggestContainer.appendChild(div);
            });
        }
    },

    async addSiloPrompt() {
        const title = prompt("Qual o nome do novo Hub de Silo?");
        if (!title) return;

        if (!this.fullData) this.fullData = { silos: [] };
        if (!this.fullData.silos) this.fullData.silos = [];

        const newSilo = { 
            id: 'silo_' + Date.now(), 
            hub: title, 
            slug: title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-'),
            spokes: [] 
        };
        
        console.log("Adding Silo:", newSilo);
        this.fullData.silos.push(newSilo);
        await this.saveSilos();
        this.analyze(); 
    },

    async addSpokePrompt(hub) {
        const spoke = prompt(`Qual o novo Spoke para o Silo "${hub}"?`);
        if (!spoke) return;
        const silo = this.fullData.silos.find(s => s.hub === hub);
        if (silo) {
            silo.spokes.push(spoke);
            await this.saveSilos();
            this.selectSilo(hub);
            this.renderGraph(this.fullData);
        }
    },

    async saveSilos() {
        try {
            await fetch('/api/seo/silos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.fullData.silos)
            });
            console.log("✅ Silos persistidos via Planning.");
            if (window.menuSystem) window.menuSystem.loadSilos(); // Sincroniza Gestor de Menus
        } catch (e) {
            console.error("Erro ao persistir silos:", e);
        }
    },

    addStagPrompt() {
        const title = prompt("Qual o nome da Campanha STAG (Ads)?");
        if (!title) return;
        alert(`Campanha STAG "${title}" criada e mapeada para Auditoria de Ads.`);
    },

    renderGraph(data) {
        const elements = [];
        
        // Adiciona Hubs
        data.silos.forEach(silo => {
            elements.push({ data: { id: silo.hub, label: silo.hub, type: 'hub' } });
            silo.spokes.forEach(spoke => {
                elements.push({ data: { id: spoke, label: spoke, type: 'spoke' } });
                elements.push({ data: { source: spoke, target: silo.hub } });
            });
        });

        // Adiciona Sugestões Extras (Segurança Abidos V5.4)
        if (data && data.suggestions && data.suggestions.forEach) {
            data.suggestions.forEach(sug => {
            elements.push({ 
                data: { 
                    source: `Page #${sug.from_id}`, 
                    target: `Page #${sug.to_id}`,
                    label: sug.anchor_text
                } 
            });
        });
        }

        const cy = cytoscape({
            container: document.getElementById('cy-map'),
            elements: elements,
            style: [
                {
                    selector: 'node',
                    style: {
                        'background-color': '#6366f1',
                        'label': 'data(label)',
                        'color': '#ffffff',
                        'font-size': '10px',
                        'width': '20px',
                        'height': '20px',
                        'text-outline-width': 1,
                        'text-outline-color': '#020617'
                    }
                },
                {
                    selector: 'node[type="hub"]',
                    style: {
                        'background-color': '#2dd4bf',
                        'width': '40px',
                        'height': '40px',
                        'font-weight': 'bold',
                        'font-size': '12px'
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'width': 2,
                        'line-color': '#334155',
                        'target-arrow-color': '#334155',
                        'target-arrow-shape': 'triangle',
                        'curve-style': 'bezier',
                        'opacity': 0.6
                    }
                }
            ],
            layout: {
                name: 'cose',
                animate: true
            }
        });
    },

    // --- PAUTA DE CONTEÚDO ---
    addUpcomingPost() {
        const title = prompt("Qual o Título Estratégico?");
        if (!title) return;
        const focus = prompt("Qual a Keyword ou Foco Principal?", "TEA Adulto");
        
        const newPost = {
            id: Date.now(),
            title: title,
            focus: focus,
            status: 'Pendente'
        };

        this.upcomingPosts.push(newPost);
        this.saveUpcomingPosts();
        this.renderUpcomingPosts();
    },

    removeUpcomingPost(id) {
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
            tbody.innerHTML = `
                <tr id="no-posts-row">
                    <td colspan="4" style="padding: 20px; text-align: center; color: #94a3b8;">Nenhum título na pauta. Adicione para começar a planejar com a IA.</td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.upcomingPosts.map(p => `
            <tr>
                <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">${p.title}</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0; color: #64748b;">${p.focus}</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0;">
                    <span style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 11px; color: #64748b;">${p.status}</span>
                </td>
                <td style="padding: 10px; border: 1px solid #e2e8f0; display: flex; gap: 5px;">
                    <button onclick="window.seoEngine.writePost('${p.title}', '${p.focus}')" class="btn btn-primary" style="font-size: 10px; padding: 4px 8px; background: #6366f1;">📝 Escrever</button>
                    <button onclick="window.seoEngine.removeUpcomingPost(${p.id})" class="btn" style="font-size: 10px; padding: 4px 8px; background: #fee2e2; color: #ef4444;">🗑️</button>
                </td>
            </tr>
        `).join('');
    },

    writePost(title, focus) {
        // Navega para o AI Studio
        const navBtn = document.querySelector('[data-target="ai-studio"]');
        if (navBtn) navBtn.click();
        
        // Preenche campos no AI Studio (Novos IDs do Stepper V5)
        const themeInput = document.getElementById('ai-studio-theme');
        const contextInput = document.getElementById('ai-studio-context');
        
        if (themeInput) themeInput.value = title;
        if (contextInput) contextInput.value = focus;

        // Feedback visual ou log
        console.log(`📝 [PAUTA] Direcionando "${title}" para o AI Studio.`);
        
        // Sugestão de Blueprint Automático no Chat (Opcional)
        if(window.chatApp && window.chatApp.addMessage) {
            window.chatApp.addMessage(`📅 **Vindo da Pauta:** Vamos trabalhar em **"${title}"** focado em **${focus}**. Defina o objetivo e siga para a próxima etapa.`);
        }
    }
};
