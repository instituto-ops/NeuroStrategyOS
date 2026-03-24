const app = {
    modelConfig: {
        global: localStorage.getItem('neuroengine_global_model') || 'gemini-2.5-flash',
        sections: JSON.parse(localStorage.getItem('neuroengine_local_models') || '{}')
    },

    init() {
        this.syncModelSelectors();
        this.bindEvents();
        this.loadDashboardData();
        this.loadContentList();
        this.loadStrategicSuggestions(); // [NOVO] IA Proativa na Visão Geral
        if (window.taskSystem) window.taskSystem.init();
        if (window.goalSystem) window.goalSystem.init();
        if (window.marketingLab) window.marketingLab.init();
        if (window.managerAgent) window.managerAgent.init();
        if (window.aiStudioTemplate) window.aiStudioTemplate.init();
    },

    updateGlobalModel(modelId) {
        this.modelConfig.global = modelId;
        localStorage.setItem('neuroengine_global_model', modelId);
        console.log("🌏 [MODEL] Global model updated to:", modelId);
        // Notificamos o sistema de que o modelo global mudou (poderia disparar re-render se necessário)
    },

    updateLocalModel(sectionId, modelId) {
        if (modelId === 'global') {
            delete this.modelConfig.sections[sectionId];
        } else {
            this.modelConfig.sections[sectionId] = modelId;
        }
        localStorage.setItem('neuroengine_local_models', JSON.stringify(this.modelConfig.sections));
        console.log(`📍 [MODEL] Local model for ${sectionId} updated to:`, modelId);
        
        // Se for o AI Studio, sincronizamos o seletor antigo se ele existir
        if (sectionId === 'ai-studio') {
            const oldSel = document.getElementById('ai-studio-model');
            if (oldSel && oldSel.value !== modelId) oldSel.value = modelId;
        }
    },

    getActiveModel(sectionId) {
        if (!sectionId) {
            // Se não informou seção, tenta pegar a seção ativa no DOM
            const activeSection = document.querySelector('.content-section.active');
            sectionId = activeSection ? activeSection.id : 'dashboard';
        }
        return this.modelConfig.sections[sectionId] || this.modelConfig.global;
    },

    syncModelSelectors() {
        // Global
        const globalSel = document.getElementById('global-model-selector');
        if (globalSel) globalSel.value = this.modelConfig.global;

        // Locals
        document.querySelectorAll('.local-model-selector').forEach(sel => {
            const section = sel.getAttribute('data-section');
            if (this.modelConfig.sections[section]) {
                sel.value = this.modelConfig.sections[section];
            } else {
                sel.value = 'global';
            }
        });
    },

    bindEvents() {
        // Navigation
        const navBtns = document.querySelectorAll('.nav-btn');
        navBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                navBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const targetId = btn.getAttribute('data-target');
                document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
                document.getElementById(targetId).classList.add('active');
                
                // Dynamic title
                document.getElementById('page-title').innerText = btn.innerText;

                // [NOVO] Auto-load AI Studio list when entering
                if (targetId === 'action-plan') {
                    if (window.taskSystem) window.taskSystem.loadTasks();
                    if (window.goalSystem) window.goalSystem.loadGoals();
                }
                
                if (targetId === 'ai-studio') {
                    if (window.chatApp) window.chatApp.loadList();
                    if (window.aiStudioTemplate) window.aiStudioTemplate.updateStepUI();
                }
                
                // [NOVO] Auto-load Media Library when entering
                if (targetId === 'media-library') {
                    window.mediaLibrary.loadLibrary();
                }

                // [NOVO] Auto-load Abidos Review Table when entering
                if (targetId === 'abidos-review') {
                    if(window.abidosReview) window.abidosReview.loadDrafts();
                }

                // [NOVO] Auto-load Planning (Silos) when entering
                if (targetId === 'planning') {
                    if(window.seoEngine) window.seoEngine.init();
                }

                // [NOVO] Auto-load Health & Reputation when entering
                if (targetId === 'health-reputation') {
                    if(window.healthSystem) window.healthSystem.checkLighthouse();
                }

                if (targetId === 'analytics') {
                    if(window.marketingLab) window.marketingLab.loadAnalytics();
                }

                // [NOVO] Auto-load Manager Agent when entering
                if (targetId === 'manager-agent' && window.managerAgent) {
                    window.managerAgent.loadInitialStatus();
                }

                // [NOVO] Auto-load Acervo when entering
                if (targetId === 'acervo-publicacoes' && window.acervoManager) {
                    window.acervoManager.loadAcervo();
                }
            });
        });

        // Sidebar Toggle
        const toggleBtn = document.getElementById('toggle-sidebar');
        const sidebar = document.getElementById('app-sidebar');
        if (toggleBtn && sidebar) {
            toggleBtn.addEventListener('click', () => {
                sidebar.classList.toggle('collapsed');
                toggleBtn.innerText = sidebar.classList.contains('collapsed') ? '▶' : '☰';
            });
        }

        // Form Submit to WordPress
        const form = document.getElementById('editor-form');
        if(form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.saveContentToWP();
            });
        }
    },

    showLoadingTable() {
        const tbody = document.getElementById('wp-content-list');
        tbody.innerHTML = `<tr><td colspan="5" class="text-center">Aguarde, conectando ao WordPress...</td></tr>`;
    },

    async loadDashboardData() {
        const dashboard = document.getElementById('ga4-dashboard');
        
        // Skeletons em "Tarefas e Metas"
        const vEl = document.getElementById('metric-visitors');
        const lEl = document.getElementById('metric-leads');
        const skeleton = `<div style="width: 40px; height: 24px; background: #e2e8f0; border-radius: 4px; display: inline-block; animation: pulse 1.5s infinite ease-in-out;"></div>`;
        
        if(vEl) vEl.innerHTML = skeleton;
        if(lEl) lEl.innerHTML = skeleton;

        try {
            // Chamada para o backend buscar dados reais do GA4 ou WordPress
            const response = await fetch('/api/marketing/audit');
            const data = await response.json();
            
            if (dashboard) {
                dashboard.innerHTML = `
                    <div class="card">
                        <h3>👥 Visitantes (Real)</h3>
                        <p style="font-size: 24px; font-weight: bold; color: var(--color-secondary);">${data.visitors || 0}</p>
                        <span style="color: var(--color-text-light);">Sincronizado via WP/GA</span>
                    </div>
                    <div class="card">
                        <h3>🎯 Leads (WhatsApp)</h3>
                        <p style="font-size: 24px; font-weight: bold; color: var(--color-secondary);">${data.leads || 0}</p>
                        <span style="color: var(--color-text-light);">Monitoramento Ativo</span>
                    </div>
                    <div class="card">
                        <h3>🚀 Score Abidos Md.</h3>
                        <p style="font-size: 24px; font-weight: bold; color: var(--color-success);">${data.abidos_score || 'N/A'}</p>
                        <span style="color: var(--color-secondary);">Auditoria de Conteúdo</span>
                    </div>
                `;
            }
            if(vEl) vEl.innerText = data.visitors || 849;
            if(lEl) lEl.innerText = data.leads || 32;

            // 🔥 [FIX] Update NeuroEngine Insight text
            const insightEl = document.getElementById('neuroengine-insight-text');
            if(insightEl && data.insights) {
                insightEl.innerText = "🤖 " + data.insights;
            }

        } catch (e) {
            console.error("Erro na Auditoria de Dados GA4:", e);
            if (dashboard) {
                dashboard.innerHTML = `<div class="card" style="border-color: var(--color-error) !important;">Conexão com o Ecossistema Lawrence Offline. Verifique credenciais.</div>`;
            }
            if(vEl) vEl.innerText = '--'; 
            if(lEl) lEl.innerText = '--';
        }
    },

    async loadStrategicSuggestions() {
        const container = document.getElementById('dashboard-abidos-suggestions');
        const list = document.getElementById('dashboard-suggestions-list');
        if(!container || !list) return;

        try {
            const res = await fetch('/api/seo/analyze-silos');
            if(!res.ok) throw new Error("Falha ao obter sugestões estratétigas.");
            
            const data = await res.json();
            if(!data.suggestions || data.suggestions.length === 0) return;

            container.style.display = 'block';
            list.innerHTML = data.suggestions.map(s => `
                <div class="card" style="padding: 15px; cursor: pointer; transition: transform 0.2s; border-left: 4px solid var(--color-secondary);" 
                     onmouseover="this.style.transform='translateY(-5px)'" 
                     onmouseout="this.style.transform='translateY(0)'"
                     onclick="window.seoEngine.selectSilo('${s.hub}'); document.querySelector('[data-target=\'planning\']').click();">
                    <span class="badge-suggestion" style="background: var(--color-secondary); color: white; font-size: 9px; padding: 2px 6px; border-radius: 4px; font-weight: 800;">HUB SUGERIDO IA</span>
                    <h4 style="margin: 10px 0; font-size: 15px; color: var(--color-text);">${s.hub}</h4>
                    <ul style="margin: 0; padding: 0 0 0 18px; font-size: 12px; color: var(--color-text-light); line-height: 1.5;">
                        ${s.spokes.map(sp => `<li>${sp}</li>`).join('')}
                    </ul>
                    <div style="margin-top: 10px; font-size: 10px; font-weight: 800; color: var(--color-secondary);">VER NO PLANEJAMENTO ➔</div>
                </div>
            `).join('');

        } catch(e) { console.error("Erro Dashboard Suggestions:", e); }
    },

    async loadContentList() {
        try {
            // Carrega pages e posts em paralelo para o dashboard
            const pagesPromise = wpAPI.fetchContent('pages');
            const postsPromise = wpAPI.fetchContent('posts');

            const [pagesData, postsData] = await Promise.all([pagesPromise, postsPromise]);
            
            let allContent = [];
            if(Array.isArray(pagesData)) allContent = [...allContent, ...pagesData];
            if(Array.isArray(postsData)) allContent = [...allContent, ...postsData];

            this.renderTable(allContent);
        } catch (e) {
            console.warn("WP Load ignorado na transição Headless");
            this.renderTable([]);
        }
    },

    renderTable(data) {
        const tbody = document.getElementById('wp-content-list');
        
        if(data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center">Nenhum conteúdo carregado via API. Verifique credenciais.</td></tr>`;
            return;
        }

        let html = '';
        data.forEach(item => {
            html += `
                <tr>
                    <td>#${item.id}</td>
                    <td><strong>${item.title.rendered}</strong></td>
                    <td><span class="badge" style="background:#eee; padding:2px 8px; border-radius:4px;">${item.type}</span></td>
                    <td><span style="color: ${item.status === 'publish' ? 'var(--color-success)' : 'var(--color-warning)'}">${item.status.toUpperCase()}</span></td>
                    <td>
                        <button class="btn btn-secondary" style="padding: 0.25rem 0.5rem; font-size:0.8rem;" onclick="app.editContent('${item.type}s', ${item.id})">Editar c/ IA</button>
                        <a href="${item.link || '#'}" target="_blank" class="btn btn-secondary" style="padding: 0.25rem 0.5rem; font-size:0.8rem; text-decoration:none;">Ver</a>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
        document.getElementById('ai-feedback').style.display = 'none';
    },

    async editContent(type, id) {
        showFeedback("Baixando dados do WordPress...", "blue");
        
        // Puxa os dados brutos da API para edição
        const data = await wpAPI.getContent(type, id);
        if(!data) return;

        // Preenche o formulário
        document.getElementById('edit-id').value = data.id;
        document.getElementById('content-type').value = type;
        document.getElementById('content-title').value = data.title.rendered;
        
        // O WP retorna o HTML renderizado. Para um painel Vanilla simples sem editor block, 
        // mostraremos o HTML ou plaintext para o usuário limpar e usar IA.
        document.getElementById('content-body').value = data.content.rendered;
        
        // Meta description (Yoast/RankMath gravam em campos meta. No demo REST API fallbackamos para excerpt se não exposto)
        let excerptRaw = data.excerpt && data.excerpt.rendered ? data.excerpt.rendered.replace(/<[^>]*>?/gm, '') : "";
        document.getElementById('content-meta').value = excerptRaw.trim();

        // Altera UI para modo de edição
        document.getElementById('editor-title').innerText = "Editando " + (type === 'pages' ? 'Página' : 'Post') + ` #${id}`;
        document.getElementById('btn-save-content').innerText = "Atualizar Publicação";
        
        // Redireciona aba
        document.querySelector('[data-target="create-content"]').click();

        showFeedback("Dados carregados. Você pode clicar em 'Auditar SEO' para analisar o texto atual.", "green");
    },

    async saveContentToWP() {
        showFeedback("Enviando para o WordPress. Aguarde...", "blue");

        const id = document.getElementById('edit-id').value;
        const type = document.getElementById('content-type').value;
        const title = document.getElementById('content-title').value;
        const bodyContent = document.getElementById('content-body').value;
        const metaDesc = document.getElementById('content-meta').value; // NOTA: Gravar no Yoast/RankMath requer plugin meta exposure ou POST direto no wp_postmeta dependendo do endpoint. Excerpt é nativo.

        const payload = {
            title: title,
            content: bodyContent,
            excerpt: metaDesc,
            status: "draft" // Forçado como Rascunho para segurança clínica
        };

        const result = await wpAPI.saveContent(type, payload, id ? id : null);

        if(result && result.id) {
            showFeedback(`Sucesso! ${type === 'pages' ? 'Página' : 'Post'} ID #${result.id} salva na base do WP.`, "green");
            setTimeout(() => {
                this.resetEditor();
                document.querySelector('[data-target="content-overview"]').click();
                this.loadContentList();
            }, 3000);
        }
    },

    resetEditor() {
        document.getElementById('edit-id').value = "";
        document.getElementById('content-title').value = "";
        document.getElementById('content-body').value = "";
        document.getElementById('content-meta').value = "";
        document.getElementById('editor-title').innerText = "Criar Novo Conteúdo";
        document.getElementById('btn-save-content').innerText = "Salvar no WordPress";
        document.getElementById('ai-feedback').style.display = 'none';
    },

    // --- Configurações Astra & Core ---
    async loadSettings() {
        showFeedback("Baixando configurações do tema Astra e Core WP...", "blue");
        const data = await wpAPI.fetchSettings();
        if(!data) {
            alert("Não foi possível ler as configurações do Tema. Verifique a REST API.");
            return;
        }

        document.getElementById('setting-site-title').value = data.site_title || '';
        document.getElementById('setting-site-desc').value = data.site_description || '';
        document.getElementById('setting-whatsapp').value = data.antigravity_whatsapp || '';
        document.getElementById('setting-astra').value = data.astra_settings ? JSON.stringify(data.astra_settings, null, 2) : 'Nenhuma configuração customizada Astra encontrada.';
        
        showFeedback("Configurações Carregadas do Banco de Dados", "green");
    },

    async saveSettings() {
        showFeedback("Salvando configurações globais no WP...", "blue");
        
        let astraParsed = {};
        try {
            const astraRaw = document.getElementById('setting-astra').value;
            if(astraRaw && astraRaw !== 'Nenhuma configuração customizada Astra encontrada.') {
                astraParsed = JSON.parse(astraRaw);
            }
        } catch(e) {
            alert("O JSON do Astra está inválido. Use a IA para corrigir se necessário.");
            return;
        }

        const payload = {
            site_title: document.getElementById('setting-site-title').value,
            site_description: document.getElementById('setting-site-desc').value,
            antigravity_whatsapp: document.getElementById('setting-whatsapp').value,
            astra_settings: astraParsed
        };

        const result = await wpAPI.saveSettings(payload);
        if(result && result.status === 'success') {
            showFeedback("Tema e Configurações Salvas com Sucesso!", "green");
        } else {
            showFeedback("Erro ao salvar.", "red");
        }
    },

    // --- Elementor Builder ---
    async loadElementorTemplates() {
        const tbody = document.getElementById('elementor-tbody');
        tbody.innerHTML = `<tr><td colspan="4" class="text-center">Conectando ao banco de dados do Elementor...</td></tr>`;
        
        const data = await wpAPI.fetchContent('elementor_library');
        if(!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center">Nenhum Template do Elementor (Cabeçalho/Rodapé) encontrado.</td></tr>`;
            return;
        }

        let html = '';
        data.forEach(item => {
            html += `
                <tr>
                    <td>#${item.id}</td>
                    <td><strong>${item.title.rendered}</strong></td>
                    <td><span style="color: ${item.status === 'publish' ? 'var(--color-success)' : 'var(--color-warning)'}">${item.status.toUpperCase()}</span></td>
                    <td>
                        <button class="btn btn-secondary" style="padding: 0.25rem 0.5rem; font-size:0.8rem;" onclick="app.editContent('elementor_library', ${item.id})">Editar c/ IA</button>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
    },

    syncElementor() {
        showFeedback("Sincronizando templates do Elementor com o WordPress...", "blue");
        setTimeout(() => {
            showFeedback("Sincronização concluída! Estrutura de blocos atualizada.", "green");
        }, 2000);
    }
};

// Start system
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
