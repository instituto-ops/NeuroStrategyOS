/**
 * AI Studio Template Engine - NeuroEngine OS
 * Controla a nova interface de templates baseada em blocos e variáveis dinâmicas.
 */

window.aiStudioTemplate = {
    selectedId: "01",
    modules: [],
    values: {},
    caminhoFisico: null,
    menuId: null,

    init: async function() {
        console.log("🎨 Inicializando AI Studio Template Engine...");
        await this.loadTemplates();
        this.setupTemplateSwitcher();
    },

    loadTemplates: async function() {
        try {
            const res = await fetch('/api/templates');
            const data = await res.json();
            const select = document.getElementById('ai-studio-template');
            if (select && data.templates) {
                select.innerHTML = data.templates.map(t => 
                    `<option value="${t.id}">${t.name}</option>`
                ).join('');
                this.selectedId = data.templates[0].id;
                this.loadTemplateDetails(this.selectedId);
            }
        } catch (e) { console.error("Erro ao carregar templates:", e); }
    },

    setupTemplateSwitcher: function() {
        const select = document.getElementById('ai-studio-template');
        if (select) {
            select.addEventListener('change', (e) => {
                this.selectedId = e.target.value;
                this.values = {}; // Reseta variáveis ao trocar de design
                this.loadTemplateDetails(this.selectedId);
            });
        }
    },

    loadTemplateDetails: async function(id) {
        const container = document.getElementById('template-variables-container');
        if (!container) return;

        container.innerHTML = '<div class="loading-spinner">Carregando variáveis...</div>';

        try {
            const res = await fetch(`/api/templates/${id}`);
            const data = await res.json();
            this.modules = data.modules;
            this.renderModules();
            
            // Update Design Summary info
            const infoBox = document.getElementById('template-design-info');
            if (infoBox && data.template) {
                infoBox.innerHTML = `
                    <strong>Design:</strong> ${data.template.designSummary}<br>
                    <strong>Tipografia:</strong> ${data.template.fonts} | <strong>Cores:</strong> ${data.template.palette}
                `;
            }

            // [NOVO] Sync Global Theme & Context inputs with this.values
            const themeInput = document.getElementById('ai-studio-theme');
            const contextInput = document.getElementById('ai-studio-context');
            if (themeInput) themeInput.value = this.values.tema || "";
            if (contextInput) contextInput.value = this.values.contexto || "";
        } catch (e) {
            container.innerHTML = `<div class="error">Erro ao carregar detalhes: ${e.message}</div>`;
        }
    },

    renderModules: function() {
        const container = document.getElementById('template-variables-container');
        if (!container) return;

        // E: Diferenciar visualmente os módulos
        const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6', '#14b8a6', '#f43f5e'];

        container.innerHTML = this.modules.map((mod, idx) => {
            const modColor = colors[idx % colors.length];
            return `
            <div class="studio-module-card" id="mod-${idx}" style="border-left: 4px solid ${modColor}; width: 100%;">
                <div class="module-header" onclick="window.aiStudioTemplate.toggleModule(${idx})">
                    <div class="module-title">
                        <span class="module-number" style="background: ${modColor}22; color: ${modColor}; min-width: 40px; display: flex; justify-content: center; align-items: center;">${idx + 1}</span>
                        <div>
                            <h4>${mod.title}</h4>
                            <p>${mod.variables.length} variáveis mapeadas</p>
                        </div>
                    </div>
                    <span class="chevron">▼</span>
                </div>
                <div class="module-body" id="body-${idx}" style="display: block;">
                    <div class="module-actions">
                        <button id="btn-ai-${idx}" class="btn btn-ask-ai" onclick="window.aiStudioTemplate.generateWithIA('${mod.title}', ${idx})">
                            🪄 Preencher este módulo com IA
                        </button>
                    </div>
                    <div class="variable-grid" style="display: flex; flex-direction: column; gap: 20px;">
                        ${mod.variables.map(v => this.renderField(v)).join('')}
                    </div>
                </div>
            </div>
            `;
        }).join('');
    },

    toggleModule: function(idx) {
        const body = document.getElementById(`body-${idx}`);
        if (body) {
            body.style.display = body.style.display === 'none' ? 'block' : 'none';
        }
    },

    renderField: function(key) {
        const labelText = key.replace(/_/g, ' ').toUpperCase();
        const label = `<strong>${labelText}</strong> <code>{{${key}}}</code>`;
        
        let val = this.values[key] || "";
        
        // Auto-fill WhatsApp se vazio
        if(key.toLowerCase().includes('whatsapp') && !val) {
            val = "62991545295";
            this.values[key] = val;
        }

        const isImage = key.toLowerCase().includes('img') || key.toLowerCase().includes('imagem') || key.toLowerCase().includes('foto') || key.toLowerCase().includes('icon');
        const isTextArea = !isImage && (key.includes('texto') || key.includes('bio') || key.includes('desc') || key.includes('p1') || key.includes('p2') || key.includes('artigo'));
        const placeholder = `Ex: Valor para ${labelText}`;

        if (isImage) {
            return `
                <div class="var-field-group">
                    <label style="display:flex; justify-content:space-between;">${label}</label>
                    <div style="display: flex; gap: 10px; align-items: center; margin-top: 5px;">
                        <input type="file" id="file-${key}" accept="image/*" onchange="window.aiStudioTemplate.handleImageUpload('${key}', this)" style="display: none;">
                        <button class="btn btn-secondary" onclick="document.getElementById('file-${key}').click()" style="padding: 10px; font-size: 11px;">📸 Escolher Imagem</button>
                        <div id="preview-${key}" style="flex: 1; min-height: 40px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; display: flex; align-items: center; padding: 0 10px; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            ${val ? `<img src="${val}" style="height: 30px; object-fit: contain; margin-right: 10px;"> Imagem carregada` : 'Nenhuma imagem selecionada'}
                        </div>
                    </div>
                </div>
            `;
        }

        return `
            <div class="var-field-group">
                <label style="display:flex; justify-content:space-between;">${label}</label>
                ${isTextArea ? 
                    `<textarea id="input-${key}" oninput="window.aiStudioTemplate.updateVal('${key}', this.value)" rows="3" placeholder="${placeholder}">${val}</textarea>` :
                    `<input type="text" id="input-${key}" oninput="window.aiStudioTemplate.updateVal('${key}', this.value)" value="${val}" placeholder="${placeholder}">`
                }
            </div>
        `;
    },

    handleImageUpload: function(key, inputElement) {
        if(inputElement.files && inputElement.files[0]) {
            const file = inputElement.files[0];
            const reader = new FileReader();
            reader.onload = (e) => {
                const b64 = e.target.result;
                this.updateVal(key, b64);
                const prev = document.getElementById(`preview-${key}`);
                if(prev) {
                    prev.innerHTML = `<img src="${b64}" style="height: 30px; object-fit: contain; margin-right: 10px;"> ${file.name}`;
                }
            };
            reader.readAsDataURL(file);
        }
    },

    updateVal: function(key, val) {
        this.values[key] = val;
    },

    generateWithIA: async function(moduleTitle, idx) {
        console.log(`🪄 Gerando conteúdo para ${moduleTitle}...`);
        
        const mod = this.modules[idx];
        if(!mod) return;

        const btn = document.getElementById(`btn-ai-${idx}`);
        if(btn) { btn.innerText = "⏳ Gerando (Gemini)..."; btn.disabled = true; }

        try {
            const globalTheme = document.getElementById('ai-studio-theme')?.value || "";
            const extraContext = document.getElementById('ai-studio-context')?.value || "";

            let prompt = `Atue como um Especialista em Copywriting Clínico (Método Abidos). O usuário está construindo uma página e precisa preencher um bloco/módulo focado em "${moduleTitle}". Gere conteúdo persuasivo explorando dor, autoridade e CTA. `;
            
            if (globalTheme) {
                prompt += `O TEMA CENTRAL desta página é: "${globalTheme}". Respeite este tema rigorosamente no vocabulário. `;
            }
            if (extraContext) {
                prompt += `O autor forneceu o seguinte CONTEXTO ADICIONAL / RASCUNHO que deve servir de base para os detalhes: "${extraContext}". `;
            }

            prompt += `As variáveis que você deve preencher são: ${mod.variables.join(', ')}. Retorne APENAS um JSON válido (sem \`\`\`json) no formato exato: { "chave_da_variavel": "valor gerado" }`;

            const res = await fetch('/api/ai/generate', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: prompt, config: { temperature: 0.7 } })
            });
            
            if(!res.ok) throw new Error("Erro no servidor AI");

            const data = await res.json();
            let jsonString = data.text.replace(/```json|```/gi, '').trim();
            const result = JSON.parse(jsonString);

            for (const key of Object.keys(result)) {
                if(mod.variables.includes(key)) {
                    this.updateVal(key, result[key]);
                    const input = document.getElementById(`input-${key}`);
                    if (input) input.value = result[key];
                }
            }
            
            alert(`Módulo "${moduleTitle}" preenchido com IA com sucesso!`);
        } catch (e) {
            console.error("Erro na integração Gemini:", e);
            alert(`Erro ao gerar conteúdo para ${moduleTitle}. Verifique o log do console.`);
        } finally {
            if(btn) { btn.innerText = "🪄 Gerar Novamente (IA)"; btn.disabled = false; }
        }
    },

    previewLive: async function() {
        console.log("👀 Abrindo Preview Visual...");
        try {
            const res = await fetch('/api/templates/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    templateId: this.selectedId,
                    values: this.values
                })
            });
            const html = await res.text();
            
            // Criar um Iframe Modal para o Preview
            this.showPreviewModal(html);
        } catch (e) { alert("Erro ao gerar preview: " + e.message); }
    },

    showPreviewModal: function(html) {
        let modal = document.getElementById('preview-template-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'preview-template-modal';
            modal.className = 'studio-full-modal';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div class="modal-content-full">
                <div class="modal-header">
                    <h3>Visualização Real da Página</h3>
                    <div class="modal-actions">
                        <button class="btn btn-secondary" onclick="document.getElementById('preview-template-modal').style.display='none'">Fechar X</button>
                    </div>
                </div>
                <iframe id="preview-frame" style="width:100%; height: calc(100vh - 60px); border:none;"></iframe>
            </div>
        `;
        modal.style.display = 'flex';
        
        const frame = modal.querySelector('iframe');
        const doc = frame.contentWindow.document;
        doc.open();
        doc.write(html);
        doc.close();
    },

    saveDraft: function() {
        if (!this.selectedId) return;
        const draftName = prompt("De um nome para este rascunho (ex: Página Autismo Adulto):");
        if (!draftName) return;

        const draft = {
            id: Date.now(),
            name: draftName,
            templateId: this.selectedId,
            values: this.values,
            date: new Date().toISOString()
        };

        let drafts = JSON.parse(localStorage.getItem('ai_studio_drafts') || '[]');
        drafts.push(draft);
        localStorage.setItem('ai_studio_drafts', JSON.stringify(drafts));
        alert(`Rascunho "${draftName}" salvo com sucesso!`);
    },

    loadDraft: function() {
        let drafts = JSON.parse(localStorage.getItem('ai_studio_drafts') || '[]');
        if (drafts.length === 0) {
            alert("Nenhum rascunho salvo encontrado.");
            return;
        }

        const draftList = drafts.map((d, i) => `${i + 1}. ${d.name} (${new Date(d.date).toLocaleDateString()})`).join('\n');
        const choice = prompt(`Qual rascunho deseja carregar?\n\n${draftList}\n\nDigite o número desejado:`);
        
        const idx = parseInt(choice) - 1;
        if (!isNaN(idx) && drafts[idx]) {
            const draft = drafts[idx];
            this.selectedId = draft.templateId;
            const selectEl = document.getElementById('ai-studio-template');
            if (selectEl) selectEl.value = this.selectedId;
            
            this.values = draft.values;
            // Recarrega os detalhes da tela
            this.loadTemplateDetails(this.selectedId);
            alert(`Rascunho "${draft.name}" carregado!`);
        }
    },

    publishPage: async function() {
        if (!this.caminhoFisico) {
            alert("Erro: Nenhuma página carregada para publicação. Use o Acervo primeiro.");
            return;
        }

        if (!confirm("Deseja realmente LANÇAR estas alterações diretamente no site oficial? (Isso executará o Git Push automatizado)")) {
            return;
        }

        const btn = document.querySelector('button[onclick*="publishPage"]');
        if (btn) { btn.innerText = "🚀 PUBLICANDO..."; btn.disabled = true; }

        try {
            const res = await fetch('/api/acervo/salvar-pagina', {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    caminhoFisico: this.caminhoFisico,
                    values: this.values,
                    templateId: this.selectedId,
                    menuId: this.menuId
                })
            });

            const result = await res.json();
            if (result.success) {
                alert("SUCESSO! " + result.message);
            } else {
                throw new Error(result.error);
            }
        } catch (e) {
            console.error("Erro na publicação:", e);
            alert("Falha no Lançamento: " + e.message);
        } finally {
            if (btn) { btn.innerText = "🚀 LANÇAR PÁGINA (NEXT.JS)"; btn.disabled = false; }
        }
    }
};
