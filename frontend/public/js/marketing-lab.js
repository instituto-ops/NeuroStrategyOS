window.marketingLab = {
    async loadAnalytics() {
        const summary = document.getElementById('ads-performance-summary');
        const stagDiv = document.getElementById('ads-stag-suggestions');

        summary.innerHTML = '<p style="color: #6366f1;">🤖 Analisando leilões e KPIs de conversão...</p>';
        stagDiv.innerHTML = '<p style="color: #6366f1;">🔍 Buscando oportunidades de novos STAGs...</p>';

        try {
            const response = await fetch('/api/marketing/audit');
            const data = await response.json();

            summary.innerHTML = `
                <div style="font-size: 13px; color: #1e40af;">
                    Uso de Orçamento: <strong>${data.budget_utilization}</strong><br>
                    Estrela do Mês: <strong>${data.top_performing_stag}</strong><br>
                    Alerta de Perda: <span style="color: #ef4444;">${data.critica_loss}</span>
                </div>
                <div style="margin-top: 15px; background: white; padding: 10px; border-radius: 4px; font-size: 12px; border: 1px solid #e2e8f0;">
                    <strong>IA Insight:</strong> ${data.insights}
                </div>
            `;

            stagDiv.innerHTML = '';
            data.recommendations.forEach(rec => {
                const div = document.createElement('div');
                div.style.padding = '10px';
                div.style.marginBottom = '10px';
                div.style.background = '#f8fafc';
                div.style.borderLeft = '4px solid #3b82f6';
                div.style.borderRadius = '4px';
                div.innerHTML = `
                    <div style="font-weight: bold; font-size: 13px;">${rec.type}: ${rec.theme || rec.action}</div>
                    <div style="font-size: 11px; color: #64748b; margin-top: 3px;">${rec.reason}</div>
                    <button class="btn btn-secondary" style="margin-top: 8px; font-size: 10px; padding: 2px 8px;">Aplicar Estratégia</button>
                `;
                stagDiv.appendChild(div);
            });

        } catch (e) {
            summary.innerHTML = '<p style="color: red;">Erro ao carregar Ads.</p>';
        }
    }
};
