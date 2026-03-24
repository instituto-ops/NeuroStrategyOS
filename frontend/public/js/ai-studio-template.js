/**
 * NeuroEngine AI Studio - Mission Control (V4.8)
 * Orquestrador de Conteúdo Abidos V4 - High Integrity + Rate Limit Protection
 */

window.aiStudioTemplate = {
    selectedId: null,
    menuId: null,
    values: {},
    modules: [],
    caminhoFisico: null,
    currentStep: 1,
    currentDraftId: null,
    currentDraftName: null,
    previewSize: 'mobile',

    init: async function() {
        console.log("🧠 [STUDIO] Missão Step-by-Step Iniciada...");
        await this.loadTemplates();
        await this.loadSilos(); // Carrega silos do CMS
        await this.loadMenus(); // Carrega menus do sistema
        
        // Dados Padrão (Victor Lawrence - CRP 09/012681)
        this.values.nome_completo = "Dr. Victor Lawrence";
        this.values.crp = "09/012681";
        this.values.whatsapp = "62991545295";
        this.values.email = "instituto@hipnolawrence.com";
        this.values.instagram = "https://www.instagram.com/hipnolawrence";
        this.values.link_agendamento = "www.hipnolawrence.com/agendamento";

        // Preenche o passo 1 se ja existirem
        this.updateStepUI();

        // Setup Event Listeners
        const ethicalCheck = document.getElementById('ethical-approval-check');
        if (ethicalCheck) {
            ethicalCheck.addEventListener('change', (e) => {
                const btn = document.getElementById('btn-publish-final');
                if (btn) btn.disabled = !e.target.checked;
            });
        }
    },

    // ── INTERCONECTIVIDADE (MÉTODO CENTRAL DE IMPORTAÇÃO) ─────────────────
    importIntoStudio: async function(data) {
        console.log("📥 [STUDIO] Importando Conteúdo Externo...", data);
        
        // 1. Limpa estado anterior se necessário
        if (data.reset) this.newDraft();

        // 2. Preenche Valores de Configuração (Etapa 1)
        if (data.theme) {
            const el = document.getElementById('ai-studio-theme');
            if (el) el.value = data.theme;
            this.values.tema = data.theme;
        }
        if (data.context) {
            const el = document.getElementById('ai-studio-context');
            if (el) el.value = data.context;
            this.values.contexto_extra = data.context;
        }

        // 3. Seleciona Template
        if (data.templateId) {
            this.selectedId = data.templateId;
            const selectEl = document.getElementById('ai-studio-template');
            if (selectEl) {
                selectEl.value = data.templateId;
                await this.loadTemplateDetails(data.templateId);
            }
        }

        // 4. Mapeia Silo/Menu
        if (data.siloId) {
            const siloEl = document.getElementById('ai-studio-silo');
            if (siloEl) siloEl.value = data.siloId;
            this.values.silo = data.siloId;
        }
        if (data.menuId) {
            const menuEl = document.getElementById('ai-studio-menu');
            if (menuEl) menuEl.value = data.menuId;
            this.menuId = data.menuId;
        }

        // 5. Se houver valores brutos (Edição de Acervo)
        if (data.values) {
            this.values = { ...this.values, ...data.values };
            this.renderVariables();
            
            const statusLabel = document.getElementById('ai-studio-status-label');
            if (statusLabel) {
                statusLabel.textContent = "STATUS: MODO DE EDIÇÃO (ACERVO)";
                statusLabel.style.color = "#ea580c";
            }
        }

        if (data.caminhoFisico) this.caminhoFisico = data.caminhoFisico;

        // 6. Navega para o Studio se não estiver lá
        const studioBtn = document.querySelector('.nav-btn[data-target="ai-studio"]');
        if (studioBtn) studioBtn.click();
        
        // 7. Garante que estamos no Passo 1 para revisão das configs
        this.currentStep = 1;
        this.updateStepUI();

        // Toast de confirmação
        if(window.showToast) window.showToast("🚀 Conteúdo importado para o AI Studio.");
    },

    loadSilos: async function() {
        const select = document.getElementById('ai-studio-silo');
        if (!select) return;
        try {
            const res = await fetch('/api/seo/silos');
            const data = await res.json();
            const silos = data.silos || [];
            select.innerHTML = '<option value="">Sem Silo (Geral)</option>';
            silos.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.id; // Corrigido p/ API
                opt.innerText = s.hub; // Corrigido p/ API
                select.appendChild(opt);
            });
        } catch(e) { console.error("Erro Silos:", e); }
    },

    loadMenus: async function() {
        const select = document.getElementById('ai-studio-menu');
        if (!select) return;
        try {
            const res = await fetch('/api/menus');
            const data = await res.json();
            const menus = data.menus || [];
            select.innerHTML = '<option value="">Sem Menu (Padrão)</option>';
            menus.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m.id;
                opt.innerText = m.name;
                select.appendChild(opt);
            });
        } catch(e) { console.error("Erro Menus:", e); }
    },

    // ── NAVEGAÇÃO ENTRE ETAPAS (STEPPER) ───────────────────────────────────
    nextStep: function() {
        if (this.currentStep === 1) {
            // Salva valores da Etapa 1
            this.values.tema = document.getElementById('ai-studio-theme')?.value || "";
            this.values.contexto_extra = document.getElementById('ai-studio-context')?.value || "";
            this.values.whatsapp = document.getElementById('studio-contact-wa')?.value;
            this.values.email = document.getElementById('studio-contact-email')?.value;
            this.values.instagram = document.getElementById('studio-contact-insta')?.value;
            this.values.link_agendamento = document.getElementById('studio-contact-link')?.value;
            this.values.objective = document.getElementById('ai-studio-objective')?.value;
            this.values.silo = document.getElementById('ai-studio-silo')?.value;
            this.menuId = document.getElementById('ai-studio-menu')?.value;
        }

        if (this.currentStep < 4) {
            this.currentStep++;
            this.updateStepUI();
        }
    },

    prevStep: function() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateStepUI();
        }
    },

    switchTab: function(tabId, el) {
        // Seleciona o card pai para isolar a troca de abas
        const card = el.closest('.card');
        if (!card) return;
        
        // Remove active class de todos os botões de aba dentro deste card
        card.querySelectorAll('.card-tab-btn').forEach(b => b.classList.remove('active'));
        // Adiciona ao botão clicado
        el.classList.add('active');

        // Esconde todos os painéis de aba dentro deste card
        card.querySelectorAll('.tab-pane-content').forEach(p => p.classList.remove('active'));
        // Mostra o painel alvo
        const target = card.querySelector(`#${tabId}`);
        if (target) target.classList.add('active');
    },

    updateStepUI: function() {
        // Esconde todos
        document.querySelectorAll('.studio-step-content').forEach(s => s.classList.remove('active'));
        // Mostra atual
        const nextStepDiv = document.getElementById(`studio-step-${this.currentStep}`);
        if(nextStepDiv) nextStepDiv.classList.add('active');

        // Atualiza Círculos do Stepper
        for (let i = 1; i <= 4; i++) {
            const circle = document.getElementById(`step-${i}-circle`);
            if (circle) {
                circle.classList.remove('active', 'completed');
                if (i < this.currentStep) circle.classList.add('completed');
                if (i === this.currentStep) circle.classList.add('active');
            }
        }

        // Atualiza Título
        const titles = {
            1: "1ª ETAPA: CONFIGURAÇÃO (O CÉREBRO)",
            2: "2ª ETAPA: GERAÇÃO (A CRIAÇÃO)",
            3: "3ª ETAPA: AUDITORIAS (O FILTRO CLÍNICO)",
            4: "4ª ETAPA: LANÇAR (O DEPLOY)"
        };
        const titleEl = document.getElementById('studio-step-title');
        if (titleEl) titleEl.innerText = titles[this.currentStep];

        // Toggle botões navegação
        const btnPrev = document.getElementById('btn-studio-prev');
        const btnNext = document.getElementById('btn-studio-next');
        if (btnPrev) btnPrev.style.display = this.currentStep === 1 ? 'none' : 'block';
        if (btnNext) btnNext.style.display = this.currentStep === 4 ? 'none' : 'flex';
        
        // Reset scroll do conteúdo
        const scrollEl = document.getElementById(`studio-step-${this.currentStep}`);
        if (scrollEl) scrollEl.scrollTop = 0;
    },

    // ── PREVIEW & DISPOSITIVOS ───────────────────────────────────────────────
    setPreviewSize: function(type) {
        this.previewSize = type;
        const frame = document.getElementById('studio-preview-frame');
        if (!frame) return;

        document.querySelectorAll('.device-btn').forEach(b => b.classList.remove('active'));
        const btn = document.querySelector(`.device-btn[title*="${type.charAt(0).toUpperCase() + type.slice(1)}"]`) || document.querySelector(`.device-btn[onclick*="${type}"]`);
        if (btn) btn.classList.add('active');

        if (type === 'mobile') {
            frame.style.width = '375px';
            frame.style.height = '667px';
        } else if (type === 'tablet') {
            frame.style.width = '768px';
            frame.style.height = '900px';
        } else {
            frame.style.width = '100%';
            frame.style.height = '1000px';
        }
    },

    fullPreview: async function() {
        if (!this.selectedId) return alert("Selecione uma estrutura antes.");
        try {
            const resPreview = await fetch('/api/templates/preview', { 
                method:'POST', 
                headers:{'Content-Type':'application/json'}, 
                body:JSON.stringify({templateId:this.selectedId, values:this.values}) 
            });
            const html = await resPreview.text();
            
            // NOVO: Salva no servidor para evitar estouro de cota no navegador
            const resSave = await fetch('/api/previews/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ html, title: this.values.tema || "Rascunho Abidos" })
            });
            const dataSave = await resSave.json();
            
            if (dataSave.previewId) {
                // Abre nova aba dedicada ao preview com o ID do servidor
                window.open(`studio-preview.html?id=${dataSave.previewId}`, '_blank');
            } else {
                throw new Error("Falha ao preparar preview no servidor.");
            }
        } catch(e) { 
            console.error("Preview Amplo Error:", e);
            alert("Erro ao abrir preview amplo: " + e.message); 
        }
    },

    loadTemplates: async function() {
        const select = document.getElementById('ai-studio-template');
        if (!select) return;
        try {
            const res = await fetch('/api/templates');
            const data = await res.json();
            const templates = data.templates || [];
            select.innerHTML = '<option value="">Selecione uma Estrutura...</option>';
            templates.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t.id;
                opt.innerText = `${t.id} — ${t.name}`;
                select.appendChild(opt);
            });
        } catch (e) { console.error("Erro Catálogo:", e); }
    },

    loadTemplateDetails: async function(id) {
        if (!id) return;
        this.selectedId = id;
        try {
            const res = await fetch(`/api/templates/${id}`);
            const data = await res.json();
            this.modules = data.modules || [];
            this.caminhoFisico = data.template?.caminhoFisico;
            const info = document.getElementById('template-design-info');
            if (info) info.innerText = `Design: ${data.template?.name} | Módulos: ${this.modules.length}`;
            this.renderVariables();
        } catch (e) { console.error(e); }
    },

    renderVariables: function() {
        const container = document.getElementById('template-variables-container');
        if (!container || !this.modules.length) {
            if(container) container.innerHTML = '<div style="text-align:center; padding:100px; color:#cbd5e1;">Selecione uma template...</div>';
            return;
        }

        // Filtra as variáveis ANTES de renderizar o módulo
        container.innerHTML = this.modules.map((mod, idx) => {
            const validVars = mod.variables.filter(v => 
                !v.toLowerCase().includes('whatsapp') && 
                !v.toLowerCase().includes('area_dinamica_extra')
            );
            
            // Se o módulo ficar vazio após filtrar as redundantes, não o renderizamos
            if (validVars.length === 0) return '';

            return `
            <div class="studio-module-card" style="border-left: 6px solid ${this.getModuleColor(mod.title)}; margin-bottom: 25px;">
                <div class="module-header" onclick="let b=this.nextElementSibling; b.style.display=b.style.display==='none'?'block':'none'">
                    <div class="module-title">
                        <div class="module-number" style="background:${this.getModuleColor(mod.title)}22; color:${this.getModuleColor(mod.title)}">${idx+1}</div>
                        <div><h4>${mod.title}</h4><p>${validVars.length} variáveis reais</p></div>
                    </div>
                    <div style="color: #64748b; font-size: 11px; font-weight: bold;">ABRIR/FECHAR ▼</div>
                </div>
                <div class="module-body" style="display:block;">
                    <button class="btn btn-secondary" onclick="event.stopPropagation(); window.aiStudioTemplate.generateWithIA('${mod.title}', ${idx})" style="margin-bottom:15px; font-size:11px;">🪄 Refinar com IA</button>
                    <div class="variable-grid">${validVars.map(v => this.renderVariable(v)).join('')}</div>
                </div>
            </div>
        `; }).join('');
    },

    getModuleColor: function(t) {
        t = t.toLowerCase();
        if(t.includes('seo')) return '#6366f1';
        if(t.includes('hero')) return '#10b981';
        if(t.includes('dor')) return '#ef4444';
        if(t.includes('autoridade')) return '#f59e0b';
        if(t.includes('cta')) return '#22c55e';
        return '#94a3b8';
    },

    renderVariable: function(key) {
        const val = this.values[key] || "";
        const lower = key.toLowerCase();
        // Detecção ultra-resiliente de campos de imagem/mídia
        const isImg = (lower.includes('img') || lower.includes('foto') || lower.includes('url') || lower.includes('banner') || lower.includes('asset')) && !lower.includes('alt');
        const isText = key.includes('texto') || key.includes('bio') || key.includes('desc') || key.includes('p1') || key.includes('p2') || key.includes('artigo');

        if (isImg) {
            return `<div class="var-field-group">
                <label>${key.replace(/_/g,' ')} <code>{{${key}}}</code></label>
                <div style="display:flex; flex-direction:column; gap:8px;">
                    <div style="display:flex; gap:8px; align-items:center;">
                        <input type="file" id="f-${key}" style="display:none" onchange="window.aiStudioTemplate.handleImageUpload('${key}', this)">
                        <button class="btn btn-secondary" onclick="document.getElementById('f-${key}').click()" style="font-size:10px;">📸 Upload</button>
                        <button class="btn btn-primary" onclick="window.aiStudioTemplate.openMediaPicker('${key}')" style="font-size:10px; background:#6366f1;">🖼️ Galeria</button>
                        ${val ? `<button class="btn" onclick="window.aiStudioTemplate.removeValue('${key}')" style="color:#ef4444; border:1px solid #fecaca; font-size:10px; background:white;">🗑️</button>` : ''}
                    </div>
                    ${val ? `<div style="padding:10px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; font-size:10px; color:#64748b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">✅ ${val.substring(0, 40)}...</div>` : '<div style="font-size:10px; color:#94a3b8;">Nenhuma imagem vinculada.</div>'}
                </div>
            </div>`;
        }
        return `<div class="var-field-group">
            <label>${key.replace(/_/g,' ')} <code>{{${key}}}</code></label>
            ${isText ? `<textarea id="input-${key}" oninput="window.aiStudioTemplate.updateVal('${key}',this.value)" rows="3">${val}</textarea>` : `<input type="text" id="input-${key}" oninput="window.aiStudioTemplate.updateVal('${key}',this.value)" value="${val}">`}
        </div>`;
    },

    openMediaPicker: async function(key) {
        const modal = document.getElementById('media-picker-modal');
        const grid = document.getElementById('picker-grid-container');
        const label = document.getElementById('picker-target-label');
        if(!modal || !grid) return;

        label.innerText = `{{${key}}}`;
        modal.style.display = 'flex';
        grid.innerHTML = '<div style="text-align:center; grid-column:1/-1; padding:40px;">⌛ Carregando Galeria Abidos...</div>';

        // Tenta garantir que a biblioteca esteja carregada
        if (!window.mediaLibrary?.allItems || window.mediaLibrary.allItems.length === 0) {
            console.log("🔄 [STUDIO] Forçando carregamento da Galeria...");
            if (window.mediaLibrary?.loadLibrary) {
                await window.mediaLibrary.loadLibrary();
            }
        }

        const items = window.mediaLibrary?.allItems || [];
        
        if (items.length === 0) {
            grid.innerHTML = '<div style="text-align:center; grid-column:1/-1; padding:40px;">📭 Nenhuma mídia encontrada no acervo local.<br><br><small>Dica: Coloque fotos na pasta "midia_local" para que o Watchdog as processe.</small></div>';
            return;
        }

        grid.innerHTML = items.map(item => `
            <div class="picker-item" onclick="window.aiStudioTemplate.selectFromPicker('${key}', '${item.url}', this)" 
                 style="cursor:pointer; border:2px solid #e2e8f0; border-radius:12px; overflow:hidden; transition:all 0.2s; background:white;">
                <img src="${item.url}" style="width:100%; height:110px; object-fit:cover;">
                <div style="padding:8px; font-size:9px; font-weight:800; text-align:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.title}</div>
            </div>
        `).join('');
    },

    selectFromPicker: function(key, url, el) {
        // Highlight selection
        document.querySelectorAll('.picker-item').forEach(item => item.style.borderColor = '#e2e8f0');
        el.style.borderColor = '#6366f1';
        el.style.transform = 'scale(0.98)';

        const btn = document.getElementById('btn-confirm-picker');
        btn.disabled = false;
        btn.onclick = () => {
            this.updateVal(key, url);
            this.renderVariables();
            if(this.currentStep === 2) this.refreshPreviewFrame();
            document.getElementById('media-picker-modal').style.display = 'none';
        };
    },

    updateVal: function(k,v) { 
        this.values[k]=v;
        if(this.currentStep === 2) this.debouncedPreview();
    },
    debouncedPreview: function() {
        if(this.previewTimeout) clearTimeout(this.previewTimeout);
        this.previewTimeout = setTimeout(() => this.refreshPreviewFrame(), 1000);
    },
    removeValue: function(k) { 
        delete this.values[k]; 
        this.renderVariables(); 
        if(this.currentStep === 2) this.refreshPreviewFrame();
    },
    handleImageUpload: function(k, i) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            this.updateVal(k, e.target.result);
            this.renderVariables();
            
            // Auto-ALT
            const altKey = k.replace('_url', '_alt').replace('foto', 'foto_alt');
            const targetAlt = this.modules.flatMap(m => m.variables).find(v => v.toLowerCase().includes(altKey.toLowerCase()));
            if (targetAlt) {
                try {
                    const res = await fetch('/api/ai/describe-image', {
                        method: "POST", headers:{"Content-Type":"application/json"},
                        body: JSON.stringify({ image: e.target.result, context: targetAlt })
                    });
                    const d = await res.json();
                    if(d.alt) { this.updateVal(targetAlt, d.alt); const el=document.getElementById(`input-${targetAlt}`); if(el) el.value=d.alt; }
                } catch(err) {} 
            }
        };
        reader.readAsDataURL(i.files[0]);
    },

    generateWithIA: async function(title, idx) {
        const theme = document.getElementById('ai-studio-theme')?.value;
        const extra = document.getElementById('ai-studio-context')?.value;
        if (!theme) return alert("Defina o Tema Central.");
        const modelType = document.getElementById('ai-studio-model')?.value || 'gemini-2.5-pro';
        this.setProductionProgress(true, `Refinando módulo via GEMINI 2.5 ${modelType.toUpperCase()}...`, 40);
        try {
            const prompt = `[DR VICTOR LAWRENCE]: CRP 09/012681 (Psicólogo | Mestre UFU).
            [OBJETIVO]: Gerar conteúdo para o bloco "${title}" da página.
            [TEMA]: "${theme}"
            [CONTEXTO]: "${extra}"
            [REGRA]: Use texto puro (sem markdown). NÃO inclua campos redundantes (whatsapp, area_dinamica_extra).
            RETORNE JSON: { ${this.modules[idx].variables.filter(v => !v.toLowerCase().includes('whatsapp') && !v.toLowerCase().includes('area_dinamica_extra')).join(', ')} }`;

            const res = await fetch('/api/ai/generate', {
                method: "POST", headers: {"Content-Type":"application/json"},
                body: JSON.stringify({ prompt, modelType })
            });
            const data = await res.json();
            if(data.error) throw new Error(data.error);
            if(!data.text) throw new Error("A IA não retornou conteúdo. Tente novamente.");

            // Extração Robusta de JSON (Anti-Markdown)
            const jsonMatch = data.text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("A IA não retornou um formato JSON válido. Tente Refinar novamente.");
            const result = JSON.parse(jsonMatch[0]);

            Object.keys(result).forEach(k => {
                let val = String(result[k]).replace(/\*\*/g, '').replace(/\*/g, '');
                if ((k.includes('cta') || k.includes('secao5')) && !val.includes('hipnolawrence.com')) val += "\n\nSaiba mais: www.hipnolawrence.com";
                this.updateVal(k, val);
                const el = document.getElementById(`input-${k}`);
                if(el) { el.value = val; el.classList.add('glow-highlight'); }
            });
            if(this.currentStep === 2) this.refreshPreviewFrame();
        } catch(e) { console.error(e); alert("Erro na geração: " + e.message); }
        finally { this.setProductionProgress(false, "", 0); }
        
        // Sincroniza mídias inteligentes após a geração do texto
        await this.autoAssignIntelligentImages();
    },

    autoAssignIntelligentImages: async function() {
        console.log("📸 [STUDIO] Iniciando Seleção Inteligente de Mídias Reais...");
        const imageVars = Object.keys(this.values).filter(k => 
            (k.toLowerCase().includes('img') || k.toLowerCase().includes('foto')) && 
            !k.toLowerCase().includes('alt') &&
            (!this.values[k] || this.values[k].startsWith('http') || this.values[k].includes('placeholder'))
        );

        for (const key of imageVars) {
            let category = 'any';
            const k = key.toLowerCase();
            if (k.includes('hero') || k.includes('bg') || k.includes('ambiente')) category = 'ambiente';
            if (k.includes('autor') || k.includes('perfil') || k.includes('psicologo')) category = 'psicologo';
            if (k.includes('logo')) category = 'branding';
            if (k.includes('tea') || k.includes('infantil')) category = 'tea-infantil';

            try {
                const res = await fetch(`/api/media/pick-intelligent?category=${category}`);
                const pick = await res.json();
                if (pick && pick.url) {
                    console.log(`✨ [STUDIO] IA escolheu mística estratégica para ${key}: ${pick.title}`);
                    this.updateVal(key, pick.url);
                    
                    // Tenta preencher o ALT correspondente
                    const altKey = key.replace('_url', '_alt').replace('foto', 'foto_alt').replace('bg', 'alt');
                    const targetAlt = this.modules.flatMap(m => m.variables).find(v => v.toLowerCase().includes(altKey.toLowerCase()));
                    if (targetAlt) this.updateVal(targetAlt, pick.alt || "");
                }
            } catch(e) { console.warn(`Falha ao buscar mídia inteligente para ${key}`); }
        }
        this.renderVariables();
        this.refreshPreviewFrame();
    },

    generateAllWithIA: async function() {
        const theme = document.getElementById('ai-studio-theme')?.value;
        if(!theme) return alert("Tema obrigatório.");
        const btn = document.querySelector('button[onclick*="generateAllWithIA"]');
        if(btn) btn.disabled = true;

        for(let i=0; i<this.modules.length; i++) {
            await this.generateWithIA(this.modules[i].title, i);
            // Delay para evitar Rate Limit (429)
            await new Promise(r => setTimeout(r, 800));
        }
        if(btn) btn.disabled = false;
    },

    runFullAudit: async function() {
        const modelType = document.getElementById('ai-studio-model')?.value || 'gemini-2.5-pro';
        this.setProductionProgress(true, `Executando Auditoria Abidos via GAIA...`, 30);
        const container = document.getElementById('abidos-audit-results');
        if(container) container.innerHTML = '<div style="text-align: center; padding: 60px 0;">🚀 Analizando neuromarketing...</div>';
        try {
            const res = await fetch('/api/ai/audit-abidos', {
                method: "POST", headers: {"Content-Type":"application/json"},
                body: JSON.stringify({ values: this.values, modelType })
            });
            const data = await res.json();
            if(data.error) throw new Error(data.error);
            const score = data.score ?? data.pontuacao ?? "N/A";
            const feedback = data.feedback ?? data.feedback_abidos ?? data.analise ?? JSON.stringify(data);
            
            if(container) {
                container.innerHTML = `
                    <div style="font-size: 24px; font-weight: 900; color: #6366f1; margin-bottom: 15px;">SCORE: ${score}/100</div>
                    <div style="font-size: 13px; line-height: 1.6; color: #334155;">${feedback.replace(/\n/g, '<br>')}</div>
                `;
            }
            document.getElementById('btn-apply-abidos').style.display = 'block';
        } catch (e) { alert("Falha na auditoria: " + e.message); }
        finally { this.setProductionProgress(false, "", 0); }
    },

    runClinicalAudit: async function() {
        const modelType = document.getElementById('ai-studio-model')?.value || 'gemini-2.5-pro';
        this.setProductionProgress(true, `Auditoria Clínica Ética em curso...`, 30);
        const container = document.getElementById('clinical-audit-results');
        if(container) container.innerHTML = '<div style="text-align: center; padding: 60px 0;">🛡️ Validando ética e CRP...</div>';
        try {
            const res = await fetch('/api/ai/audit-clinical', {
                method: "POST", headers: {"Content-Type":"application/json"},
                body: JSON.stringify({ values: this.values, modelType })
            });
            const data = await res.json();
            if(data.error) throw new Error(data.error);
            const status = data.status ?? data.aprovacao ?? "ALERTA";
            const feedback = data.feedback_clinico ?? data.feedback ?? data.analise ?? JSON.stringify(data);
            
            if(container) {
                container.innerHTML = `
                    <div style="font-size: 18px; font-weight: 900; color: ${status==='APROVADO'?'#10b981':'#ef4444'}; margin-bottom: 15px;">STATUS: ${status}</div>
                    <div style="font-size: 13px; line-height: 1.6; color: #334155;">${feedback.replace(/\n/g, '<br>')}</div>
                `;
            }
            document.getElementById('btn-apply-clinical').style.display = 'block';
        } catch (e) { alert("Falha clínica: " + e.message); }
        finally { this.setProductionProgress(false, "", 0); }
    },

    applyAuditSuggestions: async function(type) {
        const feedback = document.getElementById(`${type}-audit-results`).innerText;
        const modelType = document.getElementById('ai-studio-model')?.value || 'gemini-2.5-pro';
        this.setProductionProgress(true, `Aplicando refinamentos da auditoria ${type.toUpperCase()}...`, 50);
        
        try {
            const prompt = `[DR VICTOR LAWRENCE]: Aplique as sugestões da auditoria abaixo no conteúdo atual do site.
            [AUDITORIA ${type.toUpperCase()}]: ${feedback}
            [CONTEÚDO ATUAL]: ${JSON.stringify(this.values)}
            [REGRA]: Mantenha o tom clínico e profissional. Retorne APENAS o JSON atualizado com as correções aplicadas.`;

            const res = await fetch('/api/ai/generate', {
                method: "POST", headers: {"Content-Type":"application/json"},
                body: JSON.stringify({ prompt, modelType })
            });
            const data = await res.json();
            if(!data.text) throw new Error("A IA retornou um resultado vazio.");
            
            const jsonMatch = data.text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("Falha ao processar correções.");
            const result = JSON.parse(jsonMatch[0]);

            Object.keys(result).forEach(k => {
                if(this.values[k] !== result[k]) {
                    this.updateVal(k, result[k]);
                    const el = document.getElementById(`input-${k}`);
                    if(el) el.value = result[k];
                }
            });
            alert(`✅ Sugestões de ${type.toUpperCase()} aplicadas com sucesso!`);
        } catch(e) { alert("Erro ao aplicar sugestões: " + e.message); }
        finally { this.setProductionProgress(false, "", 0); }
    },

    setProductionProgress: function(s, t, p) {
        const line = document.getElementById('studio-production-line');
        const bar = document.getElementById('production-bar');
        const txt = document.getElementById('production-status-text');
        if(line) line.style.display = s ? 'block' : 'none';
        if(bar) bar.style.width = p + '%';
        if(txt) txt.innerText = t;
    },

    newDraft: function() {
        if(!confirm("Iniciar novo rascunho? Os dados atuais não salvos serão perdidos.")) return;
        this.values = {
            nome_completo: "Dr. Victor Lawrence",
            crp: "09/012681",
            whatsapp: "62991545295",
            email: "instituto@hipnolawrence.com",
            instagram: "https://www.instagram.com/hipnolawrence",
            link_agendamento: "www.hipnolawrence.com/agendamento"
        };
        this.currentDraftId = null;
        this.currentDraftName = null;
        this.selectedId = null;
        document.getElementById('ai-studio-theme').value = "";
        document.getElementById('ai-studio-context').value = "";
        document.getElementById('ai-studio-template').value = "";
        this.renderVariables();
        alert("Novo projeto iniciado!");
    },

    saveDraft: async function(overwrite) {
        let name = this.currentDraftName;
        if(!overwrite || !name) name = prompt("Nome do Projeto:", this.currentDraftName || "");
        if(!name) return;
        const draft = { id: overwrite && this.currentDraftId ? this.currentDraftId : Date.now(), name, values: this.values, templateId: this.selectedId };
        try {
            const res = await fetch('/api/drafts', { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(draft) });
            const d = await res.json();
            if(d.success) { this.currentDraftId = d.draft.id; this.currentDraftName = d.draft.name; alert("Salvo!"); }
        } catch(e) { alert("Erro ao salvar."); }
    },

    saveNewDraft: function() {
        this.saveDraft(false);
    },

    loadDraft: async function() {
        try {
            const res = await fetch('/api/drafts');
            const data = await res.json();
            const list = data.map((d,i) => `${i+1}. ${d.name}`).join('\n');
            const choice = prompt("Escolha o projeto:\n" + list);
            if(!choice) return;
            const d = data[parseInt(choice)-1];
            if(d) {
                this.values = d.values;
                this.selectedId = d.templateId;
                this.currentDraftId = d.id;
                this.currentDraftName = d.name;
                
                // Preenche campos visuais
                if(document.getElementById('ai-studio-theme')) document.getElementById('ai-studio-theme').value = this.values.tema || "";
                if(document.getElementById('ai-studio-context')) document.getElementById('ai-studio-context').value = this.values.contexto_extra || "";
                
                document.getElementById('ai-studio-template').value = this.selectedId;
                await this.loadTemplateDetails(this.selectedId);
            }
        } catch(e) { alert("Erro ao carregar."); }
    },

    refreshPreviewFrame: async function() {
        const frame = document.getElementById('studio-preview-frame');
        if(!frame || !this.selectedId) return;
        try {
            const res = await fetch('/api/templates/preview', { 
                method:'POST', 
                headers:{'Content-Type':'application/json'}, 
                body:JSON.stringify({templateId:this.selectedId, values:this.values}) 
            });
            const html = await res.text();
            
            // Injeta no iframe do frame de preview
            let iframe = frame.querySelector('iframe');
            if(!iframe) {
                frame.innerHTML = '<iframe style="width:100%; height:100%; border:none; background:white;"></iframe>';
                iframe = frame.querySelector('iframe');
            }
            const doc = iframe.contentWindow.document;
            doc.open(); doc.write(html); doc.close();
        } catch(e) { console.error("Erro Refresh Preview:", e); }
    },

    previewLive: async function() {
        if(this.currentStep === 2) {
            this.refreshPreviewFrame();
        } else {
            try {
                const res = await fetch('/api/templates/preview', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({templateId:this.selectedId, values:this.values}) });
                const html = await res.text();
                this.showPreviewModal(html);
            } catch(e) { alert("Erro no preview."); }
        }
    },

    showPreviewModal: function(h) {
        if (!window.previewModal) {
            window.previewModal = document.getElementById('preview-template-modal') || document.createElement('div');
            window.previewModal.id = 'preview-template-modal';
            window.previewModal.className = 'studio-full-modal';
            document.body.appendChild(window.previewModal);
        }
        
        const m = window.previewModal;
        m.style.display = 'flex';
        m.innerHTML = `<div class="modal-content-full">
            <div class="modal-header"><h3>Preview Abidos V5</h3><button class="btn btn-secondary" onclick="window.previewModal.style.display='none'">X Fechar</button></div>
            <iframe style="width:100%; height:100%; border:none; background:white;"></iframe>
        </div>`;
        const iframe = m.querySelector('iframe');
        const doc = iframe.contentWindow.document;
        doc.open(); doc.write(h); doc.close();
    },

    publishPage: async function() {
        if (!confirm("🚀 Confirmar lançamento oficial da página Abidos?")) return;
        this.setProductionProgress(true, "Orquestrando Lançamento Final...", 80);
        try {
            const res = await fetch('/api/acervo/salvar-pagina', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    caminhoFisico: this.caminhoFisico,
                    values: this.values,
                    templateId: this.selectedId,
                    menuId: document.getElementById('ai-studio-menu')?.value
                })
            });
            const resData = await res.json();
            if (resData.success) {
                alert("✨ LANÇADO COM SUCESSO!\nA página foi criada no repositório do site e o Git Push foi realizado.");
            } else {
                throw new Error(resData.error || "Erro desconhecido no servidor.");
            }
        } catch (e) { 
            console.error("Erro Lançamento:", e);
            alert("❌ FALHA NO LANÇAMENTO: " + e.message); 
        } finally {
            this.setProductionProgress(false, "", 0);
        }
    }
};

