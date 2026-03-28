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
                    const sTitle = typeof spoke === 'string' ? spoke : spoke.title;
                    const sSlug = typeof spoke === 'string' ? spoke.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-') : spoke.slug;
                    text += `- SPOKE: ${sTitle} (/${silo.slug}/${sSlug})\n`;
                });
            } else {
                text += `(Nenhum spoke definido)\n`;
            }
            text += `\n`;
        });

        navigator.clipboard.writeText(text).then(() => {
            window.notificationSystem.push("Arquitetura Copiada", "Ideal para enviar a chats externos (ChatGPT/Gemini).", "success");
        }).catch(err => {
            console.error('Erro ao copiar:', err);
            window.notificationSystem.push("Erro de Clipboard", "Não foi possível copiar a arquitetura.", "error");
        });
    },

    renderSilos() {
        const tbody = document.getElementById('silo-table-body');
        if (!tbody || !this.fullData || !this.fullData.silos) return;

        const hubsAudit = this.auditData ? this.auditData.hubs : {};

        let totalPossible = 0;
        let totalCurrent = 0;

        tbody.innerHTML = this.fullData.silos.map(silo => {
            const isExpanded = this.expandedHubs.has(silo.id);
            const spokeCount = silo.spokes ? silo.spokes.length : 0;
            const hAudit = hubsAudit[silo.id] || silo.audit || null;

            // [PHASE 4] CÁLCULO DE SCORE INDIVIDUAL
            let hubPoints = 0;
            let hubPossible = 20; // Hub title + Hub slug (cada um vale 10 se GREEN)
            
            if (hAudit) {
                if (hAudit.title?.status === 'GREEN') hubPoints += 10;
                else if (hAudit.title?.status === 'YELLOW') hubPoints += 5;

                if (hAudit.slug?.status === 'GREEN') hubPoints += 10;
                else if (hAudit.slug?.status === 'YELLOW') hubPoints += 5;
            }

            // Spokes points
            if (silo.spokes) {
                silo.spokes.forEach((spoke, idx) => {
                    const sId = `${silo.id}_${idx}`;
                    const sAudit = (this.auditData?.spokes?.[sId]) || spoke.audit;
                    hubPossible += 20;
                    if (sAudit) {
                        if (sAudit.title?.status === 'GREEN') hubPoints += 10;
                        else if (sAudit.title?.status === 'YELLOW') hubPoints += 5;

                        if (sAudit.slug?.status === 'GREEN') hubPoints += 10;
                        else if (sAudit.slug?.status === 'YELLOW') hubPoints += 5;
                    }
                });
            }

            totalPossible += hubPossible;
            totalCurrent += hubPoints;
            const hubScore = Math.round((hubPoints / hubPossible) * 100);
            const scoreColor = hubScore > 80 ? '#10b981' : (hubScore > 50 ? '#f59e0b' : '#ef4444');

            return `
                <tr class="silo-row ${isExpanded ? 'active' : ''}" onclick="window.seoEngine.toggleSilo('${silo.id}')">
                    <td style="width: 40px; text-align: center; color: var(--color-text-dim); font-size: 10px;">
                        <i data-lucide="${isExpanded ? 'chevron-down' : 'chevron-right'}" style="width: 14px; height: 14px;"></i>
                    </td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="inline-edit" contenteditable="true" style="font-weight:800; color:#fff;" onblur="window.seoEngine.updateSiloField('${silo.id}', 'hub', this.innerText)" onclick="event.stopPropagation()">${silo.hub}</span>
                            ${this.renderStatusIcon(silo.id, 'title', hAudit?.title)}
                        </div>
                        
                        ${silo.kicker ? `
                            <div style="font-size: 9px; color: #94a3b8; font-style: italic; margin-top: 2px;">K: "${silo.kicker}"</div>
                        ` : ''}

                        <div style="margin-top: 6px; display: flex; align-items: center; gap: 8px;">
                            <span class="scope-badge scope-${silo.scope || 'national'}" onclick="event.stopPropagation(); window.seoEngine.toggleScope('${silo.id}')">
                                <i data-lucide="${(silo.scope === 'local') ? 'map-pin' : 'globe'}" style="width: 10px; height: 10px;"></i>
                                ${silo.scope === 'local' ? 'ESTRATÉGIA LOCAL' : 'ESTRATÉGIA NACIONAL'}
                            </span>
                            ${silo.subtitle ? `<span style="font-size: 8px; color: rgba(255,255,255,0.3); text-transform:uppercase; font-weight:700;">+ DNA APLICADO</span>` : ''}
                        </div>
                        
                        ${silo.subtitle ? `
                            <div style="font-size: 9px; color: #64748b; margin-top: 4px; line-height: 1.2; max-width: 400px;">S: ${silo.subtitle}</div>
                        ` : ''}
                    </td>
                    <td style="font-family: monospace; font-size: 11px; color: var(--color-text-dim);">
                        / <span class="inline-edit" contenteditable="true" onblur="window.seoEngine.updateSiloField('${silo.id}', 'slug', this.innerText)" onclick="event.stopPropagation()">${silo.slug}</span>
                        ${this.renderStatusIcon(silo.id, 'slug', hAudit?.slug)}
                    </td>
                    <td style="padding: 15px; text-align: center;">
                        <div style="font-size: 11px; font-weight: 900; color: ${scoreColor}; margin-bottom: 2px;">${hubScore}%</div>
                        <span style="font-size: 8px; background: rgba(99, 102, 241, 0.1); color: #6366f1; padding: 2px 10px; border-radius: 20px; font-weight: 800; letter-spacing: 0.5px;">
                            ${spokeCount} SPOKES
                        </span>
                    </td>
                    <td style="padding: 15px; text-align: right; display: flex; gap: 5px; justify-content: flex-end;">
                        <button class="btn" title="Subir" style="background: transparent; color: #94a3b8; border: none; font-size: 11px;" onclick="event.stopPropagation(); window.seoEngine.moveSilo('${silo.id}', -1)">▲</button>
                        <button class="btn" title="Descer" style="background: transparent; color: #94a3b8; border: none; font-size: 11px;" onclick="event.stopPropagation(); window.seoEngine.moveSilo('${silo.id}', 1)">▼</button>
                        <button class="btn" title="Excluir" style="background: transparent; color: #ef4444; border: none;" onclick="event.stopPropagation(); window.seoEngine.deleteSilo('${silo.id}')">🗑️</button>
                    </td>
                </tr>
                ${isExpanded ? this.renderSpokeDetails(silo) : ''}
            `;
        }).join('');

        // [PHASE 4] ATUALIZAÇÃO DO SCORE GLOBAL NO HEADER
        const globalValue = totalPossible > 0 ? Math.round((totalCurrent / totalPossible) * 100) : 0;
        const scoreEl = document.getElementById('abidos-score-val');
        const scoreBadge = document.getElementById('abidos-global-score');
        if (scoreEl) scoreEl.innerText = `${globalValue}/100`;
        if (scoreBadge) {
            const gColor = globalValue > 80 ? '#10b981' : (globalValue > 50 ? '#f59e0b' : '#ef4444');
            scoreBadge.style.color = gColor;
            scoreBadge.style.borderColor = gColor + '33';
            scoreBadge.style.background = gColor + '11';
        }

        if (window.lucide) window.lucide.createIcons();
    },

    renderStatusIcon(id, field, audit) {
        const liveAudit = (this.auditData && this.auditData.hubs && this.auditData.hubs[id]) ? this.auditData.hubs[id][field] : 
                         ((this.auditData && this.auditData.spokes && this.auditData.spokes[id]) ? this.auditData.spokes[id][field] : null);
        
        const finalAudit = liveAudit || audit;
        
        if (!finalAudit || !finalAudit.status) return '';
        
        const colors = { GREEN: '#10b981', YELLOW: '#f59e0b', RED: '#ef4444' };
        const icons = { GREEN: '✅', YELLOW: '💡', RED: '⚠️' };
        const color = colors[finalAudit.status] || '#94a3b8';
        const icon = icons[finalAudit.status] || '⚪';

        // Timestamp formatado
        const timeStr = finalAudit.timestamp ? ` (Auditado: ${new Date(finalAudit.timestamp).toLocaleTimeString()})` : '';

        return `
            <span class="abidos-indicator" 
                  title="${finalAudit.reason?.replace(/"/g, '&quot;')}${timeStr}"
                  style="cursor: pointer; font-size: 10px; color: ${color}; filter: drop-shadow(0 0 3px ${color}99);" 
                  onclick="event.stopPropagation(); window.seoEngine.openItemAuditCard('${id}', '${field}', '${finalAudit.status}', '${finalAudit.reason.replace(/'/g, "\\'")}')">
                ${icon}
            </span>
        `;
    },

    renderSpokeDetails(silo) {
        // Garantir que spokes sejam objetos {title, slug}
        const spokes = (silo.spokes || []).map(s => {
            if (typeof s === 'string') {
                return { 
                    title: s, 
                    slug: s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-') 
                };
            }
            return s;
        });

        const spokesAudit = this.auditData ? this.auditData.spokes : {};

        return `
            <tr class="spoke-detail-row" style="background: rgba(15, 23, 42, 0.4); border-left: 2px solid var(--color-primary);">
                <td colspan="5" style="padding: 20px 40px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h4 style="margin:0; font-size: 11px; color: #94a3b8; text-transform: uppercase;">📄 Artigos de Apoio para: ${silo.hub}</h4>
                        <button class="btn btn-secondary" onclick="window.seoEngine.addSpokePrompt('${silo.id}')" style="font-size: 9px; padding: 4px 12px; border-style: dashed;">+ NOVO SPOKE</button>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px;">
                        ${spokes.map((spoke, idx) => {
                            const spokeId = `${silo.id}_${idx}`;
                            const sAudit = spokesAudit[spokeId] || null;
                            
                            return `
                                <div class="card" style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.05); padding: 15px; position: relative; overflow: hidden;">
                                    ${spoke.kicker ? `<div style="position: absolute; top:0; right:0; font-size: 7px; background: var(--color-primary); color:#fff; padding: 2px 8px; border-bottom-left-radius: 8px; text-transform:uppercase; font-weight:900; letter-spacing:0.5px;">✓ DNA APLICADO</div>` : ''}
                                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                                        <div style="width: 85%;">
                                            <div style="display:flex; align-items:center; gap:5px;">
                                                <span class="inline-edit" contenteditable="true" style="font-size: 13px; font-weight: 700; color: #fff;" onblur="window.seoEngine.updateSpokeField('${silo.id}', ${idx}, 'title', this.innerText)">${spoke.title}</span>
                                                ${this.renderStatusIcon(spokeId, 'spoke_title', sAudit?.title || spoke.audit?.title)}
                                            </div>
                                            
                                            ${spoke.kicker ? `
                                                <div style="font-size: 9px; color: #94a3b8; font-style: italic; margin-top:2px;">K: "${spoke.kicker}"</div>
                                            ` : ''}

                                            <div style="font-size: 10px; color: #64748b; font-family: monospace; display: flex; align-items: center; gap: 4px; margin-top:5px;">
                                                /${silo.slug}/<span class="inline-edit" contenteditable="true" style="color:#6366f1;" onblur="window.seoEngine.updateSpokeField('${silo.id}', ${idx}, 'slug', this.innerText)">${spoke.slug}</span>
                                                ${this.renderStatusIcon(spokeId, 'spoke_slug', sAudit?.slug || spoke.audit?.slug)}
                                            </div>
                                            
                                            ${spoke.subtitle ? `
                                                <div style="font-size: 9px; color: #64748b; margin-top:4px; line-height:1.2; border-top: 1px solid rgba(255,255,255,0.03); padding-top:4px;">S: ${spoke.subtitle}</div>
                                            ` : ''}
                                        </div>
                                        <button class="btn" style="background:transparent; border:none; color:#ef4444; font-size:12px; padding:0;" onclick="window.seoEngine.removeSpoke('${silo.id}', ${idx})">&times;</button>
                                    </div>
                                    <div style="display: flex; gap: 8px;">
                                        <button class="btn btn-primary" style="font-size: 9px; padding: 4px 10px;" onclick="window.seoEngine.writePostPrompt('${spoke.title.replace(/'/g, "\\'")}', 'Audit Hub: ${silo.hub}')">ESCREVER</button>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </td>
            </tr>
        `;
    },

    toggleSilo(id) {
        if (this.expandedHubs.has(id)) {
            this.expandedHubs.delete(id);
        } else {
            this.expandedHubs.add(id);
        }
        this.renderSilos();
    },

    toggleScope(id) {
        const silo = this.fullData.silos.find(s => s.id === id);
        if (silo) {
            silo.scope = silo.scope === 'national' ? 'local' : 'national';
            this.saveSilos();
            this.renderSilos();
            console.log(`🌍 Alcance de [${silo.hub}] alterado para: ${silo.scope}`);
        }
    },

    async updateSiloField(id, field, value) {
        const silo = this.fullData.silos.find(s => s.id === id);
        if (silo) {
            silo[field] = value;
            
            // [INVALIDAÇÃO DNA]
            if (silo.audit) {
                console.log("⚠️ Auditoria Hub invalidada por edição manual.");
                delete silo.audit;
            }

            await this.saveSilos();
            this.renderUpcomingPosts(); // Update selectors
            if(window.cytoscape && document.getElementById('cy-map')) this.renderGraph(this.fullData);
        }
    },

    async updateSpokeField(siloId, idx, field, value) {
        const silo = this.fullData.silos.find(s => s.id === siloId);
        if (silo) {
            // Migrar se necessário
            if (typeof silo.spokes[idx] === 'string') {
                silo.spokes[idx] = { 
                    title: silo.spokes[idx], 
                    slug: silo.spokes[idx].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-') 
                };
            }
            silo.spokes[idx][field] = value;
            
            // [INVALIDAÇÃO DNA] Limpar auditoria anterior pois o dado mudou
            if (silo.spokes[idx].audit) {
                console.log("⚠️ Auditoria Spoke invalidada por edição manual.");
                delete silo.spokes[idx].audit;
            }

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

    moveSilo(id, direction) {
        const idx = this.fullData.silos.findIndex(s => s.id === id);
        if (idx === -1) return;
        
        const newIdx = idx + direction;
        if (newIdx < 0 || newIdx >= this.fullData.silos.length) return;
        
        // Trocar posições
        const temp = this.fullData.silos[idx];
        this.fullData.silos[idx] = this.fullData.silos[newIdx];
        this.fullData.silos[newIdx] = temp;
        
        this.saveSilos();
        this.renderSilos();
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
        const spokeTitle = prompt(`Qual o novo Spoke para o Silo "${silo.hub}"?`);
        if (!spokeTitle) return;
        
        const newSpoke = {
            title: spokeTitle,
            slug: spokeTitle.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-')
        };

        if (!silo.spokes) silo.spokes = [];
        silo.spokes.push(newSpoke);
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
                    const sTitle = typeof spoke === 'string' ? spoke : spoke.title;
                    const combined = `${hub.hub} > ${sTitle}`;
                    options += `<option value="${combined}" ${currentValue === combined ? 'selected' : ''}>↳ Spoke: ${sTitle}</option>`;
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
            window.notificationSystem.push("Studio Offline", "O módulo de AI Studio não foi carregado corretamente.", "error");
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
                    const sTitle = typeof spoke === 'string' ? spoke : spoke.title;
                    const spPublished = publishedPages.some(p => p.title.toLowerCase() === sTitle.toLowerCase());
                    const spDraft = activeDrafts.some(d => d.theme.toLowerCase() === sTitle.toLowerCase());

                    elements.push({ 
                        data: { 
                            id: sTitle, 
                            label: sTitle, 
                            type: 'spoke',
                            status: spPublished ? 'published' : (spDraft ? 'draft' : 'planned')
                        } 
                    });
                    elements.push({ data: { source: sTitle, target: silo.hub } });
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
    },

    async runAbidosAudit() {
        if (!this.fullData || !this.fullData.silos || this.fullData.silos.length === 0) {
            window.notificationSystem.push("Ação Necessária", "Adicione Hubs e Spokes antes de rodar a análise Abidos.", "warning");
            return;
        }

        const table = document.querySelector('.table-container');
        const led = document.getElementById('abidos-led');
        const btn = document.getElementById('btn-abidos-analysis');
        
        if (table) table.classList.add('abidos-scanning');
        if (led) led.style.background = '#38bdf8'; 
        if (btn) btn.innerHTML = '🕒 AUDITANDO...';

        try {
            const prompt = `Você é o Auditor Estratégico Abidos v2.0. 
            Sua missão é realizar uma análise de "Caçador de Oceano Azul" para a arquitetura JSON abaixo.

            ARQUITETURA: ${JSON.stringify(this.fullData.silos)}

            DIRETRIZES v2.0:
            1. ALCANCE: Hubs 'local' DEVEM ter cidade. Hubs 'national' DEVEM focar em nicho nacional (sem cidade).
            2. COPY FATIADO: Verifique se itens respeitam os limites: Kicker(6w), H1(8w), Subtitle(20w).
            3. CANIBALIZAÇÃO: Marque RED se Spokes repetirem a mesma intenção.
            4. EEAT: Aplique Whitelist(Manejo, Regulação) e Blacklist(Cura, Garantido).
            5. STATUS GREEN: Apenas para termos de nicho/cauda longa. Termos saturados = YELLOW.

            6. ESTRUTURA DO RELATÓRIO (fullReport):
               Para cada Hub ou Spoke com status YELLOW ou RED, você DEVE incluir no markdown:
               - O Problema detectado.
               - 3 Sugestões de Elite (H1/Slug/Kicker/Subtitle).

            Responda APENAS em JSON:
            {
              "global_status": "GREEN|YELLOW|RED",
              "fullReport": "MARKDOWN_RELATORIO",
              "hubs": { "ID": { "title": {"status": "...", "reason": "..."}, "slug": {"status": "...", "reason": "..."} } },
              "spokes": { "HUBID_IDX": { "title": {"status": "...", "reason": "..."}, "slug": {"status": "...", "reason": "..."} } }
            }`;

            const response = await window.gemini.ask(prompt, { section: 'planning', temperature: 0.2 });
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("IA falhou no diagnóstico");
            
            const result = JSON.parse(jsonMatch[0]);
            this.auditData = result;
            
            if (result.fullReport) {
                console.log("📊 RELATÓRIO ESTRATÉGICO v2.0 DISPONÍVEL.");
                if (window.chatManager) {
                    window.chatManager.addMessage('agent', `### 🚨 RELATÓRIO ESTRATÉGICO ABIDOS v2.0\n\n${result.fullReport}`);
                }
            }

            const colors = { GREEN: '#10b981', YELLOW: '#f59e0b', RED: '#ef4444' };
            if (led) {
                led.style.background = colors[result.global_status] || '#94a3b8';
                led.style.boxShadow = `0 0 10px ${colors[result.global_status]}`;
            }

            // [PERSISTÊNCIA DNA] Salvar o resultado da auditoria diretamente no JSON dos Silos
            if (result.hubs) {
                this.fullData.silos.forEach(silo => {
                    if (result.hubs[silo.id]) {
                        silo.audit = result.hubs[silo.id];
                        silo.audit.timestamp = new Date().toISOString();
                    }
                    if (result.spokes) {
                        silo.spokes.forEach((spoke, idx) => {
                            const spokeId = `${silo.id}_${idx}`;
                            if (result.spokes[spokeId]) {
                                spoke.audit = result.spokes[spokeId];
                                spoke.audit.timestamp = new Date().toISOString();
                            }
                        });
                    }
                });
                this.saveSilos(); // Persistir no arquivo
            }

            // Salvar no Vault (localStorage para acesso rápido)
            if (result.fullReport) {
                localStorage.setItem('abidos_last_report', result.fullReport);
                localStorage.setItem('abidos_report_time', new Date().toLocaleString());
            }

            this.renderSilos();
            window.notificationSystem.push("Auditoria Abidos v2.0", "Diagnóstico concluído! Clique em 'VER ÚLTIMO RELATÓRIO' para detalhes.", "audit");

        } catch (e) {
            console.error("Erro na Auditoria Abidos:", e);
        } finally {
            if (table) setTimeout(() => table.classList.remove('abidos-scanning'), 1500);
            if (btn) btn.innerHTML = '🔎 ANÁLISE ABIDOS';
        }
    },

    openItemAuditCard(itemId, field, status, reason) {
        const popover = document.getElementById('abidos-analysis-popover');
        const content = document.getElementById('abidos-suggestions-content');
        if (!popover || !content) return;

        this.currentAuditItem = { itemId, field };
        const statusColors = { GREEN: '#10b981', YELLOW: '#f59e0b', RED: '#ef4444' };
        
        content.innerHTML = `
            <div style="border-left: 3px solid ${statusColors[status]}; padding-left: 10px; margin-bottom: 15px;">
                <div style="font-size: 11px; font-weight: 900; color: ${statusColors[status]};">STATUS: ${status}</div>
                <div style="font-size: 12px; color: #fff; margin-top: 5px; line-height: 1.4;">${reason}</div>
            </div>
            
            <div id="abidos-deep-suggestions" style="display: flex; flex-direction: column; gap: 8px;">
                <button class="btn btn-primary" style="width:100%; font-size: 11px; padding: 10px; background: linear-gradient(135deg, #6366f1, #a855f7); border:none;" onclick="window.seoEngine.generateAbidosSuggestions()">
                    ✨ GERAR SUGESTÕES DE ELITE (V2.0)
                </button>
            </div>
        `;

        popover.style.display = 'block';
        popover.style.boxShadow = `0 10px 40px rgba(0,0,0,0.8), 0 0 10px ${statusColors[status]}33`;
    },

    async generateAbidosSuggestions() {
        const content = document.getElementById('abidos-deep-suggestions');
        if (!content) return;

        content.innerHTML = '<div class="abidos-loading"><span>💎</span> Criando Blocos Hero...</div>';

        const item = this.currentAuditItem;
        const siloId = item.itemId.split('_')[0];
        const silo = this.fullData.silos.find(s => s.id === siloId);
        
        try {
            const prompt = `Gere 3 Alternativas de Elite (Bloco Hero v2.0) para o ${item.field.replace('_', ' ')}: "${silo.hub}"
            Contexto Hub: ${silo.hub} (Scope: ${silo.scope})
            
            REGRAS OBRIGATÓRIAS v2.0:
            1. ESTRUTURA FATIADA: Cada opção deve conter Kicker, H1 e Subtitle.
            2. LIMITES RÍGIDOS: Kicker (5-6 words), H1 (8 words), Subtitle (20 words).
            3. EEAT: Use Whitelist (Manejo, Regulação). Proibido Blacklist (Cura).
            4. ALCANCE: Respeite o Scope: ${silo.scope}.

            Responda APENAS JSON:
            { "options": [ 
               { "title": "H1 Texto", "slug": "slug-texto", "kicker": "...", "subtitle": "...", "strategy": "Conversão" }, 
               ... 
            ] }`;

            const response = await window.gemini.ask(prompt, { section: 'planning', temperature: 0.7 });
            const json = JSON.parse(response.match(/\{[\s\S]*\}/)[0]);

            content.innerHTML = json.options.map((opt, idx) => `
                <div class="abidos-suggestion-item" onclick="window.seoEngine.applyEliteSuggestion('${opt.title.replace(/'/g, "\\'")}', '${opt.slug}', '${opt.kicker.replace(/'/g, "\\'")}', '${opt.subtitle.replace(/'/g, "\\'")}')" style="margin-bottom:12px;">
                    <div style="font-size:9px; color:var(--color-primary); font-weight:900; margin-bottom:4px; display:flex; justify-content:space-between;">
                        <span>ESTRATÉGIA: ${opt.strategy}</span>
                        <span style="color:#10b981;">PERFEITO ✓</span>
                    </div>
                    <div style="font-size:10px; color:#94a3b8; font-style:italic;">"${opt.kicker}"</div>
                    <div style="font-size:13px; font-weight:800; color:#fff; border-left: 2px solid #6366f1; padding-left:8px; margin:4px 0;">${opt.title}</div>
                    <div style="font-size:10px; color:#cbd5e1; line-height:1.3; margin-bottom:6px;">${opt.subtitle}</div>
                    <div style="font-size:9px; color:#6366f1; font-family:monospace; background: rgba(99,102,241,0.1); padding:2px 6px; border-radius:4px; width:fit-content;">/${opt.slug}</div>
                </div>
            `).join('') + `
            <button class="btn btn-secondary" style="width:100%; font-size: 10px; margin-top:5px; border-style:dashed;" onclick="window.seoEngine.generateAbidosSuggestions()">🔄 GERAR NOVAS OPÇÕES</button>
            `;

        } catch (e) {
            content.innerHTML = '<div style="color:#ef4444; font-size:10px;">Erro ao gerar. Tente novamente.</div>';
        }
    },

    applyEliteSuggestion(title, slug, kicker, subtitle) {
        const item = this.currentAuditItem;
        const [hubId, spokeIdx] = item.itemId.split('_');
        const silo = this.fullData.silos.find(s => s.id === hubId);
        
        if (item.field === 'title') {
            silo.hub = title;
            silo.kicker = kicker;
            silo.subtitle = subtitle;
            if (silo.audit) delete silo.audit; // Reiniciar estado
        }
        if (item.field === 'slug') {
            silo.slug = slug;
            if (silo.audit) delete silo.audit;
        }
        
        if (item.field === 'spoke_title' || item.field === 'spoke_slug') {
            if (typeof silo.spokes[spokeIdx] === 'string') {
                silo.spokes[spokeIdx] = { title: silo.spokes[spokeIdx], slug: '' };
            }
            if (item.field === 'spoke_title') {
                silo.spokes[spokeIdx].title = title;
                silo.spokes[spokeIdx].kicker = kicker;
                silo.spokes[spokeIdx].subtitle = subtitle;
            }
            if (item.field === 'spoke_slug' || (item.field === 'spoke_title' && !silo.spokes[spokeIdx].slug)) {
                silo.spokes[spokeIdx].slug = slug;
            }
            if (silo.spokes[spokeIdx].audit) {
                delete silo.spokes[spokeIdx].audit;
            }
        }
        
        this.saveSilos();
        this.renderSilos();
        document.getElementById('abidos-analysis-popover').style.display = 'none';
        console.log(`✅ Bloco Hero v2.0 aplicado: ${title}`);
    },

    async updateAbidosUI(result) {
        // Obsoleto, integrado no runAbidosAudit
    },

    async applyAbidosSuggestion(sg) {
        // Obsoleto, integrado no applyEliteSuggestion
    },

    // --- ABIDOS VAULT (GERENCIAMENTO DE RELATÓRIOS) ---
    openAbidosVault() {
        const modal = document.getElementById('abidos-vault-modal');
        const content = document.getElementById('vault-content');
        const time = document.getElementById('vault-timestamp');
        if (!modal || !content) return;

        const report = localStorage.getItem('abidos_last_report');
        const timestamp = localStorage.getItem('abidos_report_time');

        if (!report) {
            content.innerHTML = `
                <div style="text-align:center; padding-top:100px; opacity:0.5;">
                    <i data-lucide="ghost" style="width:64px; height:64px; margin-bottom:20px;"></i>
                    <p>O Vault está vazio. Rode uma Auditoria Abidos para gerar seu primeiro relatório estratégico.</p>
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();
        } else {
            time.innerText = `Última Auditoria: ${timestamp}`;
            // Renderização Markdown ultra-básica
            const html = report
                .replace(/^### (.*$)/gim, '<h3 style="color:var(--color-primary); margin-top:40px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:10px;">$1</h3>')
                .replace(/^## (.*$)/gim, '<h2 style="color:var(--color-secondary); margin-top:30px;">$1</h2>')
                .replace(/^# (.*$)/gim, '<h1 style="color:#fff; text-align:center; border-bottom:2px solid var(--color-primary); padding-bottom:20px; margin-bottom:40px;">$1</h1>')
                .replace(/^\* (.*$)/gim, '<li style="margin-left:20px; margin-bottom:8px; color:rgba(255,255,255,0.8);">$1</li>')
                .replace(/^\d\. (.*$)/gim, '<li style="margin-left:20px; margin-bottom:8px; color:rgba(255,255,255,0.8);">$1</li>')
                .replace(/\*\*(.*)\*\*/gim, '<strong style="color:#fff;">$1</strong>')
                .replace(/\n/gim, '<br>');

            content.innerHTML = `<div class="vault-rendered-md" style="animation: nnc-slide-in 0.6s ease; line-height:1.6; font-size:14px;">${html}</div>`;
        }
        modal.style.display = 'flex';
    },

    copyVaultReport() {
        const report = localStorage.getItem('abidos_last_report');
        if (!report) return;
        navigator.clipboard.writeText(report).then(() => {
            window.notificationSystem.push("Vault Copiado", "O relatório estratégico foi enviado para o seu clipboard.", "success");
        });
    }
};

const _styleSeo = document.createElement('style');
_styleSeo.textContent = `
    .inline-edit { cursor: pointer; border-radius: 4px; padding: 4px 8px !important; transition: all 0.2s; }
    .inline-edit:hover { background: rgba(255,255,255,0.05) !important; color: #fff !important; }
    .inline-edit:focus { background: rgba(99, 102, 241, 0.15) !important; outline: 1px solid #6366f1 !important; color: #fff !important; }
    .hub-row:hover { background: rgba(99, 102, 241, 0.05) !important; }
    .spoke-detail-row:hover { background: rgba(0,0,0,0.2) !important; }

    /* ABIDOS AUDIT STYLES */
    .abidos-scanning { position: relative; overflow: hidden; }
    .abidos-scanning::after {
        content: "";
        position: absolute;
        top: -100%;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(to bottom, transparent, rgba(99, 102, 241, 0.2), transparent);
        animation: abidos-scan 1.5s ease-in-out infinite;
        pointer-events: none;
        z-index: 100;
    }
    @keyframes abidos-scan {
        0% { top: -100%; }
        100% { top: 100%; }
    }

    .abidos-loading { text-align: center; padding: 20px; font-size: 11px; color: #94a3b8; }
    .abidos-loading span { display: block; font-size: 24px; animation: abidos-pulse 1s infinite alternate; margin-bottom: 10px; }
    @keyframes abidos-pulse { from { opacity: 0.3; transform: scale(0.8); } to { opacity: 1; transform: scale(1.1); } }

    .abidos-suggestion-item { 
        padding: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); 
        border-radius: 10px; cursor: pointer; transition: all 0.2s;
    }
    .abidos-suggestion-item:hover { background: rgba(99, 102, 241, 0.1); border-color: rgba(99, 102, 241, 0.4); transform: translateX(5px); }
    
    .scope-badge { font-size: 8px; font-weight: 900; padding: 3px 8px; border-radius: 4px; display: flex; align-items: center; gap: 4px; cursor: pointer; transition: all 0.2s; }
    .scope-local { background: rgba(245, 158, 11, 0.1); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.2); }
    .scope-local:hover { background: rgba(245, 158, 11, 0.2); }
    .scope-national { background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2); }
    .scope-national:hover { background: rgba(16, 185, 129, 0.2); }
`;
document.head.appendChild(_styleSeo);
