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
        this.loadStrategicSuggestions(); 
        if (window.taskSystem) window.taskSystem.init();
        if (window.goalSystem) window.goalSystem.init();
        if (window.marketingLab) window.marketingLab.init();
        if (window.managerAgent) window.managerAgent.init();
        if (window.aiStudioTemplate) window.aiStudioTemplate.init();
        console.log("🚀 [NeuroEngine] App Core Initialized.");
    },

    updateGlobalModel(modelId) {
        this.modelConfig.global = modelId;
        localStorage.setItem('neuroengine_global_model', modelId);
        console.log("🌏 [MODEL] Global model updated to:", modelId);
        this.syncModelSelectors();
    },

    updateLocalModel(sectionId, modelId) {
        if (modelId === 'global') {
            delete this.modelConfig.sections[sectionId];
        } else {
            this.modelConfig.sections[sectionId] = modelId;
        }
        localStorage.setItem('neuroengine_local_models', JSON.stringify(this.modelConfig.sections));
        console.log(`📍 [MODEL] Local model for ${sectionId} updated to:`, modelId);
        this.syncModelSelectors();
    },

    getActiveModel(sectionId) {
        if (!sectionId) {
            const activeSection = document.querySelector('.content-section.active');
            sectionId = activeSection ? activeSection.id : 'dashboard';
        }
        return this.modelConfig.sections[sectionId] || this.modelConfig.global;
    },

    syncModelSelectors() {
        // Global Selector
        const globalSel = document.getElementById('global-model-selector');
        if (globalSel) globalSel.value = this.modelConfig.global;

        // Section Selectors
        document.querySelectorAll('.local-model-selector').forEach(sel => {
            const section = sel.getAttribute('data-section');
            if (section) {
                sel.value = this.modelConfig.sections[section] || 'global';
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
                
                const targetSec = document.getElementById(targetId);
                if (targetSec) targetSec.classList.add('active');
                
                // Dynamic title
                const pageTitle = document.getElementById('page-title');
                if (pageTitle) pageTitle.innerText = btn.innerText;

                // Load section data
                this.loadSectionData(targetId);
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
    },

    loadSectionData(targetId) {
        if (targetId === 'action-plan') {
            if (window.taskSystem) window.taskSystem.loadTasks();
            if (window.goalSystem) window.goalSystem.loadGoals();
        }
        if (targetId === 'ai-studio') {
            if (window.chatApp) window.chatApp.loadList();
            if (window.aiStudioTemplate) window.aiStudioTemplate.updateStepUI();
        }
        if (targetId === 'media-library' && window.mediaLibrary) {
            window.mediaLibrary.loadLibrary();
        }
        if (targetId === 'abidos-review' && window.abidosReview) {
            window.abidosReview.loadDrafts();
        }
        if (targetId === 'planning' && window.seoEngine) {
            window.seoEngine.init();
        }
        if (targetId === 'analytics' && window.marketingLab) {
            window.marketingLab.loadAnalytics();
        }
    },

    async loadDashboardData() {
        const dashboard = document.getElementById('ga4-dashboard');
        const vEl = document.getElementById('metric-visitors');
        const lEl = document.getElementById('metric-leads');
        
        try {
            const response = await fetch('/api/marketing/audit');
            const data = await response.json();
            
            if (dashboard) {
                dashboard.innerHTML = `
                    <div class="card">
                        <h3>👥 Visitantes (Real)</h3>
                        <p style="font-size: 24px; font-weight: bold; color: var(--color-secondary);">${data.visitors || 0}</p>
                        <span style="color: var(--color-text-light);">Sincronizado GA4</span>
                    </div>
                    <div class="card">
                        <h3>🎯 Leads (Conversão)</h3>
                        <p style="font-size: 24px; font-weight: bold; color: var(--color-secondary);">${data.leads || 0}</p>
                        <span style="color: var(--color-text-light);">Funil Abidos Ativo</span>
                    </div>
                    <div class="card">
                        <h3>🚀 Score de Autoridade</h3>
                        <p style="font-size: 24px; font-weight: bold; color: var(--color-success);">${data.abidos_score || '92'}</p>
                        <span style="color: var(--color-secondary);">Compliance CFP OK</span>
                    </div>
                `;
            }
            if(vEl) vEl.innerText = data.visitors || '--';
            if(lEl) lEl.innerText = data.leads || '--';

            const insightEl = document.getElementById('neuroengine-insight-text');
            if(insightEl && data.insights) {
                insightEl.innerText = "🤖 " + data.insights;
            }

        } catch (e) {
            console.error("Dashboard Data Error:", e);
        }
    },

    async loadStrategicSuggestions() {
        const container = document.getElementById('dashboard-abidos-suggestions');
        const list = document.getElementById('dashboard-suggestions-list');
        if(!container || !list) return;

        try {
            const res = await fetch('/api/seo/analyze-silos');
            const data = await res.json();
            if(!data.suggestions || data.suggestions.length === 0) return;

            container.style.display = 'block';
            list.innerHTML = data.suggestions.map(s => `
                <div class="card" style="padding: 15px; cursor: pointer; transition: transform 0.2s; border-left: 4px solid var(--color-secondary);" 
                     onclick="window.seoEngine.selectSilo('${s.hub}'); document.querySelector('[data-target=\'planning\']').click();">
                    <span class="badge" style="background: var(--color-secondary); color: white; font-size: 9px;">HUB IA</span>
                    <h4 style="margin: 10px 0; font-size: 14px;">${s.hub}</h4>
                    <ul style="font-size: 11px; color: var(--color-text-light); padding-left: 15px;">
                        ${s.spokes.slice(0,3).map(sp => `<li>${sp}</li>`).join('')}
                    </ul>
                </div>
            `).join('');
        } catch(e) {}
    },

    async loadContentList() {
        const tbody = document.getElementById('wp-content-list');
        if (!tbody) return;
        try {
            const data = await wpAPI.fetchAcervo();
            if (!data || data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" class="text-center">Nenhum conteúdo no acervo local.</td></tr>`;
                return;
            }
            tbody.innerHTML = data.map(item => `
                <tr>
                    <td>#${item.id || '---'}</td>
                    <td><strong>${item.title || item.tema}</strong></td>
                    <td><span class="badge">${item.type || 'page'}</span></td>
                    <td><span style="color: var(--color-success)">V5 SYNC</span></td>
                    <td>
                        <button class="btn btn-secondary" style="padding: 5px 10px; font-size: 11px;" onclick="app.editAcervo('${item.caminhoFisico}')">Abrir no Studio</button>
                    </td>
                </tr>
            `).join('');
        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center">Erro ao conectar ao acervo.</td></tr>`;
        }
    },

    async editAcervo(path) {
        document.querySelector('[data-target="ai-studio"]').click();
        // Lógica para carregar o DNA no Studio virá via chatApp ou aiStudioTemplate
        if (window.aiStudioTemplate) window.aiStudioTemplate.loadByPath(path);
    }
};

// Start system
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
window.app = app;
