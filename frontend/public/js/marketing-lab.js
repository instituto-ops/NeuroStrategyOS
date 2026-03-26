/**
 * 📊 MARKETING LAB & ANALYTICS MANAGER
 * Orquestra a integração real com GA4 e o Agente Analytics.
 */
window.marketingLab = {
    init() {
        console.log("📊 Marketing Lab Inicializado. Carregando estado persistente...");
        this.loadAnalytics(false);
        this.runPSI(false);
    },

    async loadAnalytics(force = false) {
        const totalVisitorsEl = document.getElementById('analytics-total-visitors');
        const sessionsEl = document.getElementById('analytics-sessions');
        const conversionsEl = document.getElementById('analytics-conversions');
        const activeNowEl = document.getElementById('analytics-active-now');
        const suggestionsEl = document.getElementById('analytics-ai-suggestions');

        // Skeletons apenas se for force (coleta real)
        const skeleton = `<div class="loading-shimmer" style="height: 30px; border-radius: 4px;"></div>`;
        if (force) {
            if (totalVisitorsEl) totalVisitorsEl.innerHTML = skeleton;
            if (sessionsEl) sessionsEl.innerHTML = skeleton;
        }

        try {
            const response = await fetch(`/api/marketing/audit?force=${force}`);
            const data = await response.json();

            if (totalVisitorsEl) totalVisitorsEl.innerText = (data.visitors || 0).toLocaleString();
            if (sessionsEl) sessionsEl.innerHTML = `${(data.sessions || 0).toLocaleString()} <span style="font-size: 11px; color:#10b981; margin-left:5px;">(${data.engagement_rate || '0%'})</span>`;
            if (conversionsEl) conversionsEl.innerText = (data.leads || 0).toLocaleString();
            if (activeNowEl) activeNowEl.innerText = (data.active_now || 0).toLocaleString();

            const organicEl = document.getElementById('analytics-organic-clicks');
            const eventsEl = document.getElementById('analytics-events');
            if (organicEl) organicEl.innerText = (data.organic_clicks || 0).toLocaleString();
            if (eventsEl) eventsEl.innerText = (data.total_events || 0).toLocaleString();

            // Sincronizando com o Agente Analytics (Passa force para a IA também)
            this.generateAiSuggestions(data, force);
            this.loadDevicePerformance();

        } catch (e) {
            console.error("Erro ao carregar Analytics:", e.message || e);
        }
    },

    async generateAiSuggestions(analyticsData, force = false) {
        const container = document.getElementById('analytics-ai-suggestions');
        if (!container) return;

        // Se já temos sugestões no data (vindas do cache), renderiza direto
        if (!force && analyticsData.suggestions) {
            this.renderSuggestions(analyticsData.suggestions);
            return;
        }

        try {
            const response = await fetch('/api/analytics/suggestions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ analyticsData, force })
            });
            const data = await response.json();
            this.renderSuggestions(data.suggestions);
        } catch (e) {
            container.innerHTML = `<div style="color: #ef4444; font-size: 12px;">Falha ao conectar com o Agente Analytics.</div>`;
        }
    },

    renderSuggestions(suggestions) {
        const container = document.getElementById('analytics-ai-suggestions');
        if (!container) return;

        if (suggestions && suggestions.length > 0) {
            container.innerHTML = suggestions.map(s => `
                <div class="card" style="background: white; border: 1px solid #eef2ff; padding: 20px; border-radius: 12px; transition: all 0.3s ease; border-left: 4px solid #6366f1;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                        <h4 style="margin: 0; color: #1e293b; font-size: 15px; font-weight: 800;">${s.title}</h4>
                        <span style="font-size: 9px; font-weight: 900; color: #6366f1; text-transform: uppercase;">Impacto ${s.impact}</span>
                    </div>
                    <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">${s.description}</p>
                </div>
            `).join('');
        } else {
            container.innerHTML = `<div style="text-align: center; color: #64748b;">Nenhuma sugestão disponível no momento.</div>`;
        }
    },

    loadDevicePerformance() {
        const container = document.getElementById('device-performance-list');
        if (!container) return;

        const devices = [
            { type: "Mobile", users: "82%", icon: "📱", color: "#10b981" },
            { type: "Desktop", users: "15%", icon: "🖥️", color: "#6366f1" },
            { type: "Tablet", users: "3%", icon: "📟", color: "#f59e0b" }
        ];

        container.innerHTML = devices.map(d => `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 16px;">${d.icon}</span>
                    <span style="font-size: 13px; font-weight: 600; color: #cbd5e1;">${d.type}</span>
                </div>
                <div style="width: 100px; height: 6px; background: #334155; border-radius: 10px; margin: 0 10px; flex: 1; overflow: hidden;">
                    <div style="width: ${d.users}; height: 100%; background: ${d.color}; border-radius: 10px;"></div>
                </div>
                <span style="font-size: 13px; font-weight: 800; color: white;">${d.users}</span>
            </div>
        `).join('');
    },

    async runPSI(force = false) {
        const perfEl = document.getElementById('psi-score-performance');
        const accEl = document.getElementById('psi-score-accessibility');
        const lcpEl = document.getElementById('psi-value-lcp');

        if (force) {
            if (perfEl) perfEl.innerText = "⏳";
            if (accEl) accEl.innerText = "⏳";
        }
        
        try {
            const response = await fetch(`/api/marketing/psi?force=${force}`);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
            }

            const data = await response.json();

            if (perfEl) {
                perfEl.innerText = data.performance;
                perfEl.style.color = data.performance > 89 ? "#10b981" : data.performance > 49 ? "#f59e0b" : "#ef4444";
            }
            if (accEl) {
                accEl.innerText = data.accessibility;
                accEl.style.color = data.accessibility > 89 ? "#10b981" : "#f59e0b";
            }
            if (lcpEl) lcpEl.innerText = data.lcp;

            // Renderiza Oportunidades se houver
            const oppList = document.getElementById('psi-opportunities-list');
            if (oppList && data.opportunities) {
                oppList.innerHTML = data.opportunities.map(o => `
                    <li style="margin-bottom: 5px;">
                        <span style="color: #ef4444; font-weight: 800;">[+${o.savings}]</span> 
                        <strong style="color: #1e293b;">${o.title}</strong>
                    </li>
                `).join('') || '<li>Nenhuma otimização crítica pendente.</li>';
            }

            // Field Data Badges
            document.getElementById('psi-field-fcp').innerText = `FCP: ${data.field?.fcp || '--'}`;
            document.getElementById('psi-field-inp').innerText = `INP: ${data.field?.inp || '--'}`;
            document.getElementById('psi-field-overall').innerText = `CrUX: ${data.field?.overall || '--'}`;

        } catch (e) {
            console.error(`Erro PSI (${force ? 'Real' : 'Cache'}):`, e.message || e);
        }
    },

    refreshData() {
        console.log("🔄 Coleta Manual Iniciada: Forçando atualização de todos os nós...");
        this.loadAnalytics(true);
        this.runPSI(true);
    }
};
