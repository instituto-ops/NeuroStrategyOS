window.seoEngine = {
    upcomingPosts: JSON.parse(localStorage.getItem('abidos_upcoming_posts') || '[]'),
    fullData: null,
    expandedHubs: new Set(),

    async init() {
        this.analyze();
        await this.syncAbidosReportFromServer(); // Recuperar última estratégia do servidor
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
                <tr class="hub-row ${isExpanded ? 'active' : ''}" onclick="window.seoEngine.toggleSilo('${silo.id}')">
                    <td style="width: 40px; text-align: center; color: var(--color-text-dim); font-size: 10px; border-bottom: 1px solid rgba(255,255,255,0.03);">
                        <i data-lucide="${isExpanded ? 'chevron-down' : 'chevron-right'}" style="width: 14px; height: 14px;"></i>
                    </td>
                    <td style="padding: 18px 15px; border-bottom: 1px solid rgba(255,255,255,0.03);">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="inline-edit" contenteditable="true" style="font-size: 14px; font-weight:800; color:#fff;" onblur="window.seoEngine.updateSiloField('${silo.id}', 'hub', this.innerText)" onclick="event.stopPropagation()">${silo.hub}</span>
                            ${this.renderStatusIcon(silo.id, 'title', hAudit?.title)}
                        </div>
                        
                        <div style="margin-top: 6px; display: flex; align-items: center; gap: 8px;">
                            <span class="scope-badge scope-${silo.scope || 'national'}" onclick="event.stopPropagation(); window.seoEngine.toggleScope('${silo.id}')" style="height: 20px; font-size: 9px; padding: 0 10px; border-radius: 6px;">
                                <i data-lucide="${(silo.scope === 'local') ? 'map-pin' : 'globe'}" style="width: 10px; height: 10px;"></i>
                                ${silo.scope === 'local' ? 'Estratégia Local' : 'Estratégia Nacional'}
                            </span>
                            ${silo.subtitle ? `<span style="font-size: 8px; color: var(--color-primary); text-transform:uppercase; font-weight:900; background: rgba(99, 102, 241, 0.1); padding: 2px 6px; border-radius: 4px;">✓ DNA ATIVO</span>` : ''}
                        </div>
                        
                        ${silo.kicker ? `
                            <div style="font-size: 10px; color: #94a3b8; font-style: italic; margin-top: 6px; padding-left: 5px; border-left: 2px solid var(--color-primary);">"${silo.kicker}"</div>
                        ` : ''}
                    </td>
                    <td style="font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--color-text-dim); border-bottom: 1px solid rgba(255,255,255,0.03);">
                        <span style="opacity: 0.3;">/</span><span class="inline-edit" contenteditable="true" style="color: #6366f1; font-weight: 700;" onblur="window.seoEngine.updateSiloField('${silo.id}', 'slug', this.innerText)" onclick="event.stopPropagation()">${silo.slug}</span>
                        ${this.renderStatusIcon(silo.id, 'slug', hAudit?.slug)}
                    </td>
                    <td style="padding: 15px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.03);">
                        <div style="font-size: 12px; font-weight: 900; color: ${scoreColor}; margin-bottom: 2px;">${hubScore}%</div>
                        <span style="font-size: 9px; color: #94a3b8; font-weight: 700;">
                            ${spokeCount} Spokes
                        </span>
                    </td>
                    <td style="padding: 15px; text-align: right; border-bottom: 1px solid rgba(255,255,255,0.03);">
                        <div style="display: flex; gap: 8px; justify-content: flex-end; align-items: center;">
                            <button class="btn btn-secondary" title="Subir" style="width: 28px; height: 28px; padding:0; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05);" onclick="event.stopPropagation(); window.seoEngine.moveSilo('${silo.id}', -1)">
                                <i data-lucide="chevron-up" style="width: 14px; height: 14px;"></i>
                            </button>
                            <button class="btn btn-secondary" title="Descer" style="width: 28px; height: 28px; padding:0; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05);" onclick="event.stopPropagation(); window.seoEngine.moveSilo('${silo.id}', 1)">
                                <i data-lucide="chevron-down" style="width: 14px; height: 14px;"></i>
                            </button>
                            <button class="btn btn-danger" title="Excluir" style="width: 28px; height: 28px; padding:0; display: flex; align-items: center; justify-content: center; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: #ef4444;" onclick="event.stopPropagation(); window.seoEngine.deleteSilo('${silo.id}')">
                                <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                            </button>
                        </div>
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
            <tr class="spoke-detail-row" style="background: rgba(0, 0, 0, 0.2); border-left: 3px solid var(--color-primary);">
                <td colspan="5" style="padding: 25px 50px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                        <div>
                            <h4 style="margin:0; font-size: 12px; color: #fff; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Pauta de Sustentação: ${silo.hub}</h4>
                            <p style="font-size: 10px; color: var(--color-text-dim); margin: 4px 0 0 0;">Artigos de apoio (Spokes) para dominação semântica do Hub.</p>
                        </div>
                        <button class="btn btn-primary" onclick="window.seoEngine.addSpokePrompt('${silo.id}')" style="height: 30px; font-size: 9px; padding: 0 15px; background: transparent; border: 1px dashed var(--color-primary); color: var(--color-primary); font-weight: 900;">+ NOVO SPOKE</button>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 15px;">
                        ${spokes.map((spoke, idx) => {
                            const spokeId = `${silo.id}_${idx}`;
                            const sAudit = spokesAudit[spokeId] || null;
                            
                            return `
                                <div class="card spoke-card" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 18px; border-radius: 12px; transition: all 0.3s; position: relative; overflow: hidden;">
                                    ${spoke.kicker ? `<div style="position: absolute; top:0; right:0; font-size: 7px; background: var(--color-primary); color:#fff; padding: 4px 10px; border-bottom-left-radius: 10px; text-transform:uppercase; font-weight:900; letter-spacing:1px; box-shadow: 0 0 10px rgba(99, 102, 241, 0.4);">DNA APLICADO</div>` : ''}
                                    
                                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                                        <div style="flex: 1; padding-right: 15px;">
                                            <div style="display:flex; align-items:center; gap:6px;">
                                                <span class="inline-edit" contenteditable="true" style="font-size: 14px; font-weight: 800; color: #fff; line-height: 1.3;" onblur="window.seoEngine.updateSpokeField('${silo.id}', ${idx}, 'title', this.innerText)">${spoke.title}</span>
                                                ${this.renderStatusIcon(spokeId, 'spoke_title', sAudit?.title || spoke.audit?.title)}
                                            </div>
                                            
                                            ${spoke.kicker ? `
                                                <div style="font-size: 11px; color: #94a3b8; font-style: italic; margin-top:4px;">K: "${spoke.kicker}"</div>
                                            ` : ''}

                                            <div style="font-size: 11px; color: #64748b; font-family: 'JetBrains Mono', monospace; display: flex; align-items: center; gap: 4px; margin-top:8px;">
                                                <span style="opacity:0.3;">/${silo.slug}/</span><span class="inline-edit" contenteditable="true" style="color:#6366f1; font-weight:700;" onblur="window.seoEngine.updateSpokeField('${silo.id}', ${idx}, 'slug', this.innerText)">${spoke.slug}</span>
                                                ${this.renderStatusIcon(spokeId, 'spoke_slug', sAudit?.slug || spoke.audit?.slug)}
                                            </div>
                                        </div>
                                        <button class="btn" style="background:rgba(239, 68, 68, 0.1); border:1px solid rgba(239, 68, 68, 0.2); color:#ef4444; width:24px; height:24px; padding:0; border-radius: 6px; display: flex; align-items: center; justify-content: center;" onclick="window.seoEngine.removeSpoke('${silo.id}', ${idx})">
                                            <i data-lucide="x" style="width: 14px; height: 14px;"></i>
                                        </button>
                                    </div>

                                    ${spoke.subtitle ? `
                                        <div style="font-size: 10px; color: #64748b; margin: 10px 0 15px 0; line-height:1.4; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 8px; border-left: 2px solid var(--color-primary);">S: ${spoke.subtitle}</div>
                                    ` : ''}

                                    <button class="btn btn-primary" style="width: 100%; height: 32px; font-size: 10px; font-weight: 800; letter-spacing: 1px; border-radius: 8px;" onclick="window.seoEngine.writePostPrompt('${spoke.title.replace(/'/g, "\\'")}', 'Hub: ${silo.hub}')">ESCREVER ARTIGO</button>
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

    // [Sincronizado via app.getActiveModel('planning')]

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
            const prompt = `Você é o Auditor Estratégico Abidos v2.0. Sua missão é realizar uma análise de "Caçador de Oceano Azul" para a arquitetura JSON abaixo. 

            ARQUITETURA: ${JSON.stringify(this.fullData.silos)}

            DIRETRIZES TÉCNICAS (JSON UNIVERSAL):
            1. STATUS: GREEN|YELLOW|RED para cada Hub e Spoke.
            2. EEAT CLÍNICO: Marque RED para termos saturados ou sem foco local (se o Hub for local).
            3. SUGESTÕES: Para qualquer item não-GREEN, forneça EXATAMENTE 3 SUGESTÕES de elite (Título ou Slug otimizado).
            
            Responda EXCLUSIVAMENTE em JSON no formato:
            {
              "global_status": "RED|YELLOW|GREEN",
              "global_summary": "Resumo executivo da vulnerabilidade da arquitetura.",
              "score": 0-100,
              "audit_nodes": {
                "ID_HUBS": {
                  "status": "...",
                  "reason": "O Problema...",
                  "suggestions": ["S1", "S2", "S3"]
                },
                "ID_HUB_SPOKE_IDX": {
                  "status": "...",
                  "reason": "O Problema...",
                  "suggestions": ["S1", "S2", "S3"]
                }
              }
            }`;

            const modelId = window.app.getActiveModel('planning');
            const response = await window.gemini.ask(prompt, { section: 'planning', temperature: 0.2, model: modelId });
            
            if (!response) {
                throw new Error("Ocorreu uma falha na comunicação com o motor cerebral (Timeout ou Erro 500).");
            }

            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                console.warn("Resposta da IA sem bloco JSON válido:", response);
                throw new Error("A IA falhou ao estruturar o diagnóstico (Formato Inválido).");
            }
            
            const result = JSON.parse(jsonMatch[0]);
            this.auditData = result;
            
            const colors = { GREEN: '#10b981', YELLOW: '#f59e0b', RED: '#ef4444' };
            if (led) {
                led.style.background = colors[result.global_status] || '#94a3b8';
                led.style.boxShadow = `0 0 10px ${colors[result.global_status]}`;
            }

            // [SINCRONIZAÇÃO DNA UNIVERSAL]
            if (result.audit_nodes) {
                // Atualizar silos com o novo diagnóstico para persistência
                this.fullData.silos.forEach(silo => {
                    const hubAudit = result.audit_nodes[silo.id];
                    if (hubAudit) {
                        silo.audit = hubAudit;
                        silo.audit.timestamp = new Date().toISOString();
                    }
                    
                    silo.spokes.forEach((spoke, idx) => {
                        const spokeId = `${silo.id}_${idx}`;
                        const spokeAudit = result.audit_nodes[spokeId];
                        if (spokeAudit) {
                            if (typeof spoke === 'string') {
                                silo.spokes[idx] = { title: spoke, audit: spokeAudit };
                            } else {
                                spoke.audit = spokeAudit;
                            }
                            silo.audit.timestamp = new Date().toISOString();
                        }
                    });
                });
                this.saveSilos();
            }

            // Gerar Relatório MD a partir do JSON Universal (Frontend Engine)
            const generatedReport = this.buildMarkdownReportFromJson(result);
            localStorage.setItem('abidos_last_report', generatedReport);
            localStorage.setItem('abidos_report_time', new Date().toLocaleString());
            localStorage.setItem('abidos_universal_audit', JSON.stringify(result)); // Base Universal
            
            await this.saveAbidosReportToServer(generatedReport, localStorage.getItem('abidos_report_time'), result);
            this.renderAbidosReport(); 

            // Notificação Inicial (Apenas Status)
            window.notificationSystem.push("Auditoria Abidos v2.0", `Diagnóstico concluído (Score: ${result.score}/100). Verifique os ícones na tabela para refinamento imediato.`, result.global_status.toLowerCase(), {
                isFixed: false,
                actionLabel: "VER RELATÓRIO",
                actionMethod: "window.seoEngine.openAbidosVault()"
            });
            
            this.renderSilos(); // Re-renderizar tabela com os ícones ⚠️
            console.log("✅ Auditoria Abidos v2.0: Base Universal Sincronizada.");

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

        // Persistir contexto atual para ações subsequentes
        this.currentAuditItem = { itemId, field, status, reason };
        
        // 1. Tentar recuperar sugestões da Base Universal JSON
        const universalAudit = JSON.parse(localStorage.getItem('abidos_universal_audit') || '{}');
        const nodeAudit = (universalAudit.audit_nodes && universalAudit.audit_nodes[itemId]) ? universalAudit.audit_nodes[itemId] : null;
        const suggestions = nodeAudit ? nodeAudit.suggestions : [];

        // 2. Renderizar o Card de Refinamento com as sugestões encontradas
        this.renderRefinementCard(suggestions, status, reason);

        // 3. Posicionamento e Exibição do Popover
        popover.style.display = 'block';
        const statusColors = { GREEN: '#10b981', YELLOW: '#f59e0b', RED: '#ef4444' };
        popover.style.boxShadow = `0 20px 60px rgba(0,0,0,0.9), 0 0 20px ${statusColors[status]}33`;
    },

    renderRefinementCard(suggestions, status, reason) {
        const content = document.getElementById('abidos-suggestions-content');
        const statusColors = { GREEN: '#10b981', YELLOW: '#f59e0b', RED: '#ef4444' };
        
        let suggestionsHtml = '';
        if (suggestions && suggestions.length > 0) {
            suggestionsHtml = `
                <div style="margin-top:15px; display:flex; flex-direction:column; gap:8px;">
                    <span style="font-size:9px; font-weight:900; color:#64748b; text-transform:uppercase; letter-spacing:1px; display:flex; align-items:center; gap:5px;">
                        <i data-lucide="zap" style="width:8px; height:8px;"></i> Caminhos de Elite sugeridos:
                    </span>
                    ${suggestions.map(s => `
                        <button class="abidos-suggestion-chip" onclick="window.seoEngine.applyUniversalSuggestion('${s.replace(/'/g, "\\'")}')">
                            <i data-lucide="sparkles"></i>
                            <span>${s}</span>
                        </button>
                    `).join('')}
                </div>
            `;
        } else {
            suggestionsHtml = `
                <div style="margin-top:15px; text-align:center; padding:25px; border:1px dashed rgba(255,255,255,0.1); border-radius:16px; background: rgba(0,0,0,0.1);">
                    <i data-lucide="help-circle" style="width:24px; height:24px; color:#64748b; margin-bottom:10px; opacity:0.3;"></i>
                    <p style="font-size:10px; color:#64748b; font-style:italic; margin:0; line-height:1.4;">Nenhuma sugestão disponível para este ponto na base universal. <br>Tente "Recalcular" abaixo.</p>
                </div>
            `;
        }

        content.innerHTML = `
            <div style="border-left: 3px solid ${statusColors[status]}; padding-left: 14px; margin-bottom: 25px; position:relative;">
                <div style="font-size: 10px; font-weight: 900; color: ${statusColors[status]}; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">Diagnóstico Abidos</div>
                <div style="font-size: 13px; color: #fff; line-height: 1.5; font-weight:500;">${reason}</div>
            </div>
            
            ${suggestionsHtml}

            <div style="margin-top:25px; display:flex; justify-content:space-between; align-items:center; border-top:1px solid rgba(255,255,255,0.08); padding-top:20px;">
                 <button class="btn-refresh-suggestions" title="Regerar 3 Novas Sugestões de Elite" onclick="window.seoEngine.regenerateSpecificSuggestions()">
                    <i data-lucide="refresh-cw"></i> Recalcular
                 </button>
                 <button class="btn-exit-card" onclick="document.getElementById('abidos-analysis-popover').style.display='none';">ENCERRAR</button>
            </div>
        `;
        
        if (window.lucide) window.lucide.createIcons();
    },

    async regenerateSpecificSuggestions() {
        const content = document.getElementById('abidos-suggestions-content');
        if (!content) return;

        const item = this.currentAuditItem;
        const [hubId, spokeIdx] = item.itemId.split('_');
        const silo = this.fullData.silos.find(s => s.id === hubId);
        const currentValue = (item.field === 'title') ? silo.hub : (item.field === 'slug' ? silo.slug : (typeof silo.spokes[spokeIdx] === 'string' ? silo.spokes[spokeIdx] : silo.spokes[spokeIdx].title));

        // Loading state
        content.innerHTML = `
            <div style="text-align:center; padding: 40px 0;">
                <div class="dot" style="width:12px; height:12px; background:#6366f1; border-radius:50%; display:inline-block; animation: bounce 1.4s infinite; margin-bottom:15px;"></div>
                <p style="font-size:11px; font-weight:900; color:var(--color-primary); text-transform:uppercase; letter-spacing:1px;">Recalculando Caminhos...</p>
                <p style="font-size:10px; color:#64748b;">A IA está processando novas alternativas EEAT v2.0</p>
            </div>
        `;

        try {
            const prompt = `Gere 3 Sugestões de Elite (Máximo 10 palavras cada) para o ${item.field.replace('_', ' ')}: "${currentValue}"
            Contexto Hub: ${silo.hub} (Scope: ${silo.scope})
            
            REGRAS OBRIGATÓRIAS:
            1. FOCO: Conversão e Autoridade Clínica.
            2. EEAT: Use termos médicos precisos (whitelist).
            3. LIMITE: Responda APENAS JSON: { "suggestions": ["Opt 1", "Opt 2", "Opt 3"] }`;

            const response = await window.gemini.ask(prompt, { section: 'planning', temperature: 0.8 });
            const json = JSON.parse(response.match(/\{[\s\S]*\}/)[0]);

            // Atualizar base universal local para este node
            const universalAudit = JSON.parse(localStorage.getItem('abidos_universal_audit') || '{}');
            if(!universalAudit.audit_nodes) universalAudit.audit_nodes = {};
            
            if(!universalAudit.audit_nodes[item.itemId]) {
                universalAudit.audit_nodes[item.itemId] = { status: item.status, reason: item.reason, suggestions: [] };
            }
            universalAudit.audit_nodes[item.itemId].suggestions = json.suggestions;
            localStorage.setItem('abidos_universal_audit', JSON.stringify(universalAudit));

            // Re-renderizar com novos dados
            this.renderRefinementCard(json.suggestions, item.status, item.reason);

        } catch (e) {
            console.error("Erro ao regenerar sugestões:", e);
            content.innerHTML = '<div style="color:#ef4444; font-size:10px; text-align:center; padding:20px;">Falha técnica na regeneração. Tente novamente.</div>';
        }
    },

    applyUniversalSuggestion(suggestedText) {
        const item = this.currentAuditItem;
        const [hubId, spokeIdx] = item.itemId.split('_');
        const silo = this.fullData.silos.find(s => s.id === hubId);
        
        console.log(`🚀 Aplicando Refinamento Universal: "${suggestedText}" em ${item.itemId}`);

        if (item.field === 'title') {
            silo.hub = suggestedText;
            if (silo.audit) delete silo.audit;
        } else if (item.field === 'slug') {
            silo.slug = suggestedText;
            if (silo.audit) delete silo.audit;
        } else if (item.field === 'spoke_title' || item.field === 'spoke_slug') {
            if (typeof silo.spokes[spokeIdx] === 'string') {
                silo.spokes[spokeIdx] = { title: silo.spokes[spokeIdx], slug: '' };
            }
            if (item.field === 'spoke_title') {
                silo.spokes[spokeIdx].title = suggestedText;
            } else {
                silo.spokes[spokeIdx].slug = suggestedText;
            }
            if (silo.spokes[spokeIdx].audit) delete silo.spokes[spokeIdx].audit;
        }

        // Limpar node na base universal para remover o ícone de aviso
        const universalAudit = JSON.parse(localStorage.getItem('abidos_universal_audit') || '{}');
        if (universalAudit.audit_nodes && universalAudit.audit_nodes[item.itemId]) {
            delete universalAudit.audit_nodes[item.itemId];
            localStorage.setItem('abidos_universal_audit', JSON.stringify(universalAudit));
        }
        
        this.saveSilos();
        this.renderSilos();
        document.getElementById('abidos-analysis-popover').style.display = 'none';
        
        window.notificationSystem.push("Refinamento Aplicado", `O conteúdo de "${item.field}" foi atualizado com sucesso.`, "success");
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
            // Renderização Markdown Premium
            const html = report
                .replace(/\\/g, '') // Corrigir caracteres de escape (\) do modelo
                .replace(/^### (.*$)/gim, '<h3 style="color:var(--color-primary); font-size: 16px; font-weight: 900; margin: 40px 0 15px 0; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom:10px; display: flex; align-items:center; gap:10px;"><i data-lucide="shield-check" style="width:18px; height:18px;"></i> $1</h3>')
                .replace(/^## (.*$)/gim, '<h2 style="color:var(--color-secondary); font-size: 18px; font-weight: 900; margin: 50px 0 20px 0; letter-spacing:-0.5px;">$1</h2>')
                .replace(/^# (.*$)/gim, '<h1 style="color:#fff; font-size: 24px; font-weight: 900; text-align:center; background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), transparent); border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 16px; padding: 40px; margin-bottom: 50px; letter-spacing: -1px;">$1</h1>')
                .replace(/^\* (.*$)/gim, '<div style="margin: 10px 0 10px 25px; color:rgba(255,255,255,0.85); display: flex; align-items: flex-start; gap: 10px;"><span style="color:var(--color-primary); font-weight:900;">•</span> <span>$1</span></div>')
                .replace(/^\d\. (.*$)/gim, '<div style="margin: 10px 0 10px 25px; color:rgba(255,255,255,0.85); display: flex; align-items: flex-start; gap: 10px;"><span style="color:var(--color-secondary); font-weight:900;">$1.</span> <span>$1</span></div>')
                .replace(/\*\*(.*)\*\*/gim, '<strong style="color:#fff; font-weight: 800;">$1</strong>')
                .replace(/\n/gim, '<br>');

            content.innerHTML = `<div class="vault-rendered-md" style="animation: nnc-slide-in 0.6s ease; line-height:1.7; font-size:15px; padding: 20px;">${html}</div>`;
            if (window.lucide) window.lucide.createIcons();
        }
        modal.style.display = 'flex';
    },

    copyVaultReport() {
        const report = localStorage.getItem('abidos_last_report');
        if (!report) return;
        navigator.clipboard.writeText(report).then(() => {
            window.notificationSystem.push("Vault Copiado", "O relatório estratégico foi enviado para o seu clipboard.", "success");
        });
    },

    // --- RENDERIZAÇÃO DE RELATÓRIO PREMIUM (REUSÁVEL) ---
    renderAbidosReport() {
        const card = document.getElementById('abidos-inline-report-card');
        const content = document.getElementById('abidos-card-content');
        const time = document.getElementById('abidos-card-timestamp');
        if (!card || !content) return;

        const report = localStorage.getItem('abidos_last_report');
        const timestamp = localStorage.getItem('abidos_report_time');

        if (!report) {
            card.style.display = 'none';
            return;
        }

        card.style.display = 'block';
        if (time) time.innerText = `Gerado em: ${timestamp}`;

        // Motor de Renderização Premium (Markdown para HTML High-End)
        const html = report
            .replace(/\\/g, '') // Corrigir escapes
            .replace(/^### (.*$)/gim, '<h3 style="color:var(--color-primary); font-size: 15px; font-weight: 900; margin: 30px 0 12px 0; border-left: 3px solid var(--color-primary); padding-left: 12px; display: flex; align-items:center; gap:8px;">$1</h3>')
            .replace(/^## (.*$)/gim, '<h2 style="color:#fff; font-size: 17px; font-weight: 900; margin: 40px 0 15px 0; letter-spacing:-0.4px; display: flex; align-items:center; gap:10px;"><span style="color:var(--color-secondary); opacity:0.5;">#</span> $1</h2>')
            .replace(/^# (.*$)/gim, '<h1 style="color:#fff; font-size: 20px; font-weight: 900; text-align:center; padding-bottom: 20px; border-bottom: 2px solid rgba(255,255,255,0.05); margin-bottom: 30px;">$1</h1>')
            .replace(/^\* (.*$)/gim, '<div style="margin: 8px 0 8px 15px; color:#cbd5e1; display: flex; align-items: flex-start; gap: 8px;"><span style="color:var(--color-primary); font-weight:900;">•</span> <span>$1</span></div>')
            .replace(/\*\*(.*)\*\*/gim, '<strong style="color:var(--color-secondary); font-weight: 800;">$1</strong>')
            .replace(/\n/gim, '<br>');

        content.innerHTML = `<div class="vault-rendered-md" style="line-height:1.6; font-size:14px; color: #94a3b8;">${html}</div>`;
        
        // Re-inicializa ícones Lucide no card
        if (window.lucide) window.lucide.createIcons({
            attrs: { 'stroke-width': 2 }
        });
    },

    // --- MÉTODOS DE SINCRONIZAÇÃO COM O SERVIDOR ---
    async saveAbidosReportToServer(report, timestamp, universalAudit) {
        try {
            await fetch('/api/seo/abidos-report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ report, timestamp, universalAudit })
            });
            console.log("🛡️ ABIDOS: Relatório e Base Universal persistidos no servidor.");
        } catch (e) {
            console.error("Erro ao salvar relatório no servidor:", e);
        }
    },

    async syncAbidosReportFromServer() {
        try {
            const res = await fetch('/api/seo/abidos-report');
            if (res.ok) {
                const data = await res.json();
                if (data.report) {
                    localStorage.setItem('abidos_last_report', data.report);
                    localStorage.setItem('abidos_report_time', data.timestamp);
                }
                if (data.universalAudit) {
                    localStorage.setItem('abidos_universal_audit', JSON.stringify(data.universalAudit));
                    this.auditData = data.universalAudit; // Sincroniza estado para renderização
                    console.log("🛡️ ABIDOS: Base Universal recuperada do servidor.");
                }
            }
        } catch (e) {
            console.warn("🛡️ ABIDOS: Falha ao sincronizar com o servidor.");
        }
        this.renderAbidosReport(); 
        this.renderSilos(); // Garante ícones se houver dados
    },

    // --- GENERADOR DE RELATÓRIO FRONTEND (UI COHESION) ---
    buildMarkdownReportFromJson(json) {
        if (!json || !json.audit_nodes) return "Nenhum dado de auditoria disponível.";

        let md = `# RELATÓRIO ESTRATÉGICO ABIDOS v2.0\n`;
        md += `**Score de Dominação**: ${json.score}/100 | **Status**: ${json.global_status}\n\n`;
        md += `> ${json.global_summary}\n\n`;
        md += `---\n\n`;

        Object.entries(json.audit_nodes).forEach(([id, audit]) => {
            if (audit.status === 'GREEN') return;

            const emoji = audit.status === 'RED' ? '🚨' : '⚠️';
            md += `### ${emoji} ${id.includes('_spoke') ? 'SPOKE' : 'HUB ID'}: ${id}\n`;
            md += `**Problema**: ${audit.reason}\n\n`;
            md += `**Sugestões de Elite**:\n`;
            audit.suggestions.forEach(s => md += `* **${s}**\n`);
            md += `\n`;
        });

        md += `\n---\n*Relatório gerado automaticamente pelo motor NeuroEngine. Sincronizado com a base universal de governança.*`;
        return md;
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
