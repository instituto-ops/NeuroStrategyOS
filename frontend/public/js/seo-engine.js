window.seoEngine = {
    upcomingPosts: JSON.parse(localStorage.getItem('abidos_upcoming_posts') || '[]'),

    init() {
        this.renderUpcomingPosts();
        this.analyze();
    },
    async analyze() {
        const siloContainer = document.getElementById('silo-groups-container');
        const suggestContainer = document.getElementById('silo-suggestions-container');
        const selector = document.getElementById('planning-silo-selector');

        try {
            // Mock Data for Silos (Since WP is removed)
            const data = {
                silos: [
                    { hub: "Autismo Adulto", spokes: ["Diagnóstico Tardio", "Sinais Sutis em Mulheres", "Alta Funcionalidade e Burnout", "Relacionamentos e TEA"] },
                    { hub: "Ansiedade e Burnout", spokes: ["Sintomas Físicos da Ansiedade", "Terapia Estratégica Breve", "Como Parar Ataques de Pânico"] },
                    { hub: "Hipnose Clínica", spokes: ["O que é Hipnose Clínica", "Hipnose para Fobias", "Mitos e Verdades"] }
                ],
                suggestions: []
            };

            this.fullData = data; // Armazena para filtro

            // Popula Selector
            selector.innerHTML = '<option value="">Selecione um Silo...</option>';
            data.silos.forEach(silo => {
                const opt = document.createElement('option');
                opt.value = silo.hub;
                opt.innerText = silo.hub.replace(/^\/|\/$/g, '');
                selector.appendChild(opt);
            });

            // Mostra o primeiro silo por padrão se existir
            if (data.silos.length > 0) {
                selector.value = data.silos[0].hub;
                this.selectSilo(data.silos[0].hub);
            }

            // Renderiza Grafo (Global) Mockado
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
            <div style="padding: 15px; background: white; border: 1px solid #e2e8f0; border-radius: 8px;">
                <strong style="color: #1e40af; font-size: 16px;">📂 Hub: ${silo.hub}</strong>
                <ul style="font-size: 14px; margin-top: 10px; color: #1e293b; list-style: none; padding: 0;">
                    ${silo.spokes.map(s => `
                        <li style="padding: 5px 0; border-bottom: 1px dashed #f1f5f9; display: flex; align-items: center; gap: 8px;">
                            <span style="color: #10b981;">🟢</span> ${s}
                        </li>
                    `).join('')}
                </ul>
                <div style="margin-top: 15px;">
                    <button class="btn btn-secondary" style="font-size: 11px; width: 100%; border-style: dashed;" onclick="alert('Funcionalidade em desenvolvimento: Adicionar Spoke ao Silo')">+ Adicionar Novo Spoke</button>
                </div>
            </div>
        `;

        // Filtra Sugestões para este Silo
        const relatedSuggestions = this.fullData.suggestions.filter(sug => {
            // Lógica simples: se o destino ou origem tem o hub no nome ou é um dos spokes
            return sug.reason.toLowerCase().includes(hub.toLowerCase()) || 
                   silo.spokes.some(sp => sug.reason.toLowerCase().includes(sp.toLowerCase()));
        });

        if (suggestContainer) suggestContainer.innerHTML = '';
        if (relatedSuggestions.length === 0) {
            if (suggestContainer) suggestContainer.innerHTML = '<p style="font-size: 12px; color: #64748b; padding: 10px;">Nenhuma sugestão de linkagem detectada para este silo específico.</p>';
        } else {
            relatedSuggestions.forEach(sug => {
                const div = document.createElement('div');
                div.style.padding = '12px';
                div.style.background = 'white';
                div.style.borderRadius = '8px';
                div.style.border = '1px solid #e2e8f0';
                div.style.fontSize = '13px';
                div.innerHTML = `
                    <div style="font-weight: bold; color: #6366f1; margin-bottom: 4px;">🎯 Oportunidade: "${sug.anchor_text}"</div>
                    <div style="color: #64748b; font-size: 11px; margin-bottom: 8px;">
                        De: <span style="color: #1e293b; font-weight: bold;">ID #${sug.from_id}</span> ➔ Para: <span style="color: #1e293b; font-weight: bold;">ID #${sug.to_id}</span>
                    </div>
                    <div style="font-style: italic; font-size: 11px; border-left: 2px solid #10b981; padding-left: 8px; color: #334155;">
                        <strong>Razão IA:</strong> ${sug.reason}
                    </div>
                    <button class="btn btn-primary" style="width: 100%; margin-top: 10px; font-size: 10px; height: 28px; background: #10b981;" onclick="alert('Linkagem aplicada via REST API!')">🚀 Aplicar Link agora</button>
                `;
                suggestContainer.appendChild(div);
            });
        }
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

        // Adiciona Sugestões Extras
        data.suggestions.forEach(sug => {
            elements.push({ 
                data: { 
                    source: `Page #${sug.from_id}`, 
                    target: `Page #${sug.to_id}`,
                    label: sug.anchor_text
                } 
            });
        });

        const cy = cytoscape({
            container: document.getElementById('cy-map'),
            elements: elements,
            style: [
                {
                    selector: 'node',
                    style: {
                        'background-color': '#6366f1',
                        'label': 'data(label)',
                        'color': '#1e293b',
                        'font-size': '10px',
                        'width': '20px',
                        'height': '20px'
                    }
                },
                {
                    selector: 'node[type="hub"]',
                    style: {
                        'background-color': '#10b981',
                        'width': '40px',
                        'height': '40px',
                        'font-weight': 'bold'
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'width': 2,
                        'line-color': '#cbd5e1',
                        'target-arrow-color': '#cbd5e1',
                        'target-arrow-shape': 'triangle',
                        'curve-style': 'bezier'
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
        document.querySelector('[data-target="studio"]').click();
        
        // Preenche campos no AI Studio
        const titleInput = document.getElementById('ai-studio-new-title');
        const kwInput = document.getElementById('ai-studio-keyword');
        
        if (titleInput) titleInput.value = title;
        // Tenta achar a keyword no select ou adiciona se necessário
        if (kwInput) {
            // Se for um select, tenta selecionar. Se for input, preenche.
            if (kwInput.tagName === 'SELECT') {
                // Checa se existe, se não, adiciona opção temporária
                let exists = Array.from(kwInput.options).some(opt => opt.value === focus);
                if (!exists) {
                    const opt = document.createElement('option');
                    opt.value = focus;
                    opt.text = focus + " (Pauta)";
                    kwInput.add(opt);
                }
                kwInput.value = focus;
            } else {
                kwInput.value = focus;
            }
        }

        // Sugestão de Blueprint Automático
        window.chatApp.addMessage(`📅 **Vindo da Pauta:** Vamos trabalhar em **"${title}"** focado em **${focus}**. Use o modo Manual ou escolha um Blueprint abaixo.`);
    }
};
