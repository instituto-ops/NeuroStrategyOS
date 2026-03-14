window.healthSystem = {
    async checkLighthouse() {
        const container = document.getElementById('lighthouse-metrics');
        container.innerHTML = '<p style="color: #6366f1;">🤖 Analisando Core Web Vitals (FCP, LCP, CLS)...</p>';

        try {
            const response = await fetch('/api/health/lighthouse');
            const data = await response.json();

            container.innerHTML = `
                <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                    <div style="flex: 1; text-align: center; background: #ecfdf5; padding: 10px; border-radius: 8px;">
                        <div style="font-size: 20px; font-weight: bold; color: #059669;">${data.performance}</div>
                        <div style="font-size: 10px;">Performance</div>
                    </div>
                    <div style="flex: 1; text-align: center; background: #f0f9ff; padding: 10px; border-radius: 8px;">
                        <div style="font-size: 20px; font-weight: bold; color: #0284c7;">${data.seo}</div>
                        <div style="font-size: 10px;">SEO</div>
                    </div>
                </div>
                <div style="font-size: 11px; color: #64748b;">
                    LCP: <strong>${data.core_web_vitals.lcp}</strong><br>
                    FID: <strong>${data.core_web_vitals.fid}</strong><br>
                    CLS: <strong>${data.core_web_vitals.cls}</strong>
                </div>
                <button class="btn btn-secondary" style="width: 100%; margin-top: 15px; font-size: 11px;" onclick="window.healthSystem.checkLighthouse()">🔄 Re-auditar</button>
            `;
        } catch (e) {
            container.innerHTML = '<p style="color: red;">Erro na auditoria.</p>';
        }
    },

    async analyzeReputation() {
        const input = document.getElementById('reputation-input').value;
        const resultDiv = document.getElementById('reputation-result');
        if(!input) return alert("Cole um texto para analisar.");

        resultDiv.innerHTML = '🤖 Analisando risco reputacional e conformidade ética...';

        try {
            const response = await fetch('/api/reputation/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ platform: 'Manual/Doctoralia', content: input })
            });
            const data = await response.json();

            resultDiv.innerHTML = `
                <div style="background: #fffbeb; padding: 10px; border-radius: 4px; border-left: 4px solid #f59e0b;">
                    <strong>Sentimento:</strong> ${data.sentimento || data.sentiment}<br>
                    <strong>Risco Ético:</strong> ${data.risco_etico || data.ethical_risk}
                </div>
                <div style="margin-top: 10px;">
                    <strong>Sugestão de Resposta:</strong><br>
                    <p style="background: #f8fafc; padding: 8px; border: 1px solid #e2e8f0; border-radius: 4px;">${data.resposta_sugerida || data.suggested_response}</p>
                </div>
                <div style="margin-top: 5px; font-size: 11px; color: #64748b;">
                    💡 <strong>Insight Interno:</strong> ${data.melhoria_interna || data.internal_improvement}
                </div>
            `;
        } catch (e) {
            resultDiv.innerHTML = '<span style="color: red;">Erro na análise.</span>';
        }
    },

    async simulateScraping() {
        const input = document.getElementById('reputation-input');
        const platforms = ['Doctoralia', 'Instagram', 'Google Maps'];
        const selected = platforms[Math.floor(Math.random() * platforms.length)];
        
        input.value = `[SIMULAÇÃO SCRAPING ${selected}] Localizando novas avaliações...`;
        
        setTimeout(() => {
            const mocks = {
                'Doctoralia': "O Dr. Victor é excelente, mas a recepção demorou 15 minutos para me atender hoje.",
                'Instagram': "Quero saber o preço da sessão de hipnose para TEA em Goiânia.",
                'Google Maps': "A clínica é muito limpa e o atendimento foi nota 10."
            };
            input.value = mocks[selected];
            this.analyzeReputation();
        }, 1500);
    }
};
