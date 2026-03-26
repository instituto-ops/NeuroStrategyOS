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
    },

    // ── FASE 3: SISTEMA DE DIAGNÓSTICO E AUTOMONITORAMENTO ──────────────────
    
    async runSystemCheck() {
        const resultsEl = document.getElementById('functional-report-results');
        if(!resultsEl) return;
        
        resultsEl.innerHTML = `
            <div style="padding: 20px; text-align: center;">
                <div class="loading-shimmer" style="height: 20px; width: 60%; margin: 10px auto; border-radius: 4px;"></div>
                <p style="font-size: 11px; color: #64748b; font-weight: 800; text-transform: uppercase;">🚀 Iniciando Diagnóstico Profundo Abidos V5...</p>
            </div>
        `;

        const report = {
            timestamp: new Date().toLocaleString('pt-BR'),
            version: "5.30 Alpha",
            modules: [],
            apis: [],
            logs: []
        };

        // 1. Verificação de Funcionalidades (DOM & Objetos) com PROTOCOLO SELF-HEALING (V5.1)
        const checkList = [
            { name: "Estúdio de Conteúdo", obj: "aiStudioTemplate", element: "ai-studio" },
            { name: "Execução e Metas", obj: "taskSystem", element: "action-plan" },
            { name: "Inteligência de Tráfego", obj: "marketingLab", element: "analytics" },
            { name: "Assistente de Apoio", obj: "sparkEngine", element: "spark-panel" },
            { name: "Arquitetura de Conteúdo", obj: "menuSystem", element: "menu-manager" },
            { name: "Curadoria e Aprovação", obj: "abidosReview", element: "abidos-review" }
        ];

        report.modules = checkList.map(item => {
            const exists = !!document.getElementById(item.element);
            let initialized = !!window[item.obj];
            let selfHealed = false;

            // Tentativa de Auto-Recuperação (Self-Healing)
            if (exists && !initialized && window[item.obj]?.init) {
                try {
                    console.log(`🛡️ [SELF-HEALING] Tentando re-inicializar ${item.name}...`);
                    window[item.obj].init();
                    initialized = !!window[item.obj];
                    selfHealed = true;
                } catch(e) {
                    console.error(`❌ [SELF-HEALING] Falha crítica ao recuperar ${item.name}`);
                }
            }

            return { 
                name: item.name, 
                status: (exists && initialized) ? (selfHealed ? "🩹 RECUPERADO" : "✅ ONLINE") : "❌ FALHA", 
                details: `DOM: ${exists} | Init: ${initialized}${selfHealed ? " (Repair Active)" : ""}` 
            };
        });

        // 2. Verificação de Conectividade de APIs (Tokens Otimizados)
        const apiList = [
            { name: "Gemini Hub", route: "/api/ai/health" },
            { name: "Media Assets", route: "/api/media/health" },
            { name: "Strategic Analytics", route: "/api/marketing/audit" },
            { name: "Drafts Storage", route: "/api/drafts" }
        ];

        for (const api of apiList) {
            try {
                const start = performance.now();
                const res = await fetch(api.route);
                const end = performance.now();
                
                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    throw new Error(errData.error || `HTTP ${res.status}`);
                }
                
                report.apis.push({ 
                    name: api.name, 
                    status: "✅ CONECTADO", 
                    latency: `${Math.round(end-start)}ms` 
                });
            } catch(e) {
                console.error(`Falha na API ${api.name}:`, e.message || e);
                report.apis.push({ 
                    name: api.name, 
                    status: "❌ OFFLINE", 
                    details: e.message 
                });
            }
        }

        // 3. Captura de Logs do Navegador (Pega os últimos 20)
        if (window._neuroLogs) {
            report.logs = window._neuroLogs.slice(-20);
        }

        this.renderFunctionalReport(report);
        await this.persistReport(report);
        
        if (window.showToast) window.showToast("🛡️ Diagnóstico Abidos Concluído!");
        if (window.showSection) window.showSection('health-reputation');
    },

    renderFunctionalReport(report) {
        const container = document.getElementById('functional-report-results');
        if (!container) return;

        let html = `
            <div style="font-family: 'Inter', sans-serif; font-size: 13px; color: #1e293b;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h4 style="margin:0; font-weight:900; color:#1e293b;">📋 RELATÓRIO DE FUNCIONALIDADE</h4>
                    <span style="font-size: 10px; color:#64748b;">${report.timestamp}</span>
                </div>

                <div style="margin-bottom: 15px;">
                    <div style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 5px;">Módulos Core</div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        ${report.modules.map(m => `
                            <div style="padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; background: #ffffff !important; font-size: 11px; box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);">
                                <div style="font-weight: 900 !important; color: #000000 !important; font-size: 12px; margin-bottom: 2px;">${m.name}</div>
                                <div style="color: ${m.status.includes('✅') ? '#059669' : '#dc2626'} !important; font-weight: 950 !important; letter-spacing: 0.5px;">${m.status}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div style="margin-bottom: 15px;">
                    <div style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 8px;">Integridade de API & Latência</div>
                    <div style="display: flex; flex-direction: column; gap: 5px;">
                        ${report.apis.map(a => {
                            const lat = parseInt(a.latency) || 0;
                            const color = lat < 100 ? '#10b981' : (lat < 300 ? '#f59e0b' : '#ef4444');
                            const width = Math.min(lat / 5, 100);
                            return `
                            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                    <span style="font-weight: 800; color: #1e293b;">${a.name}</span>
                                    <span style="color: ${a.status.includes('✅') ? '#059669' : '#dc2626'}; font-weight: 900; font-size: 10px;">${a.status}</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <div style="flex: 1; height: 4px; background: #e2e8f0; border-radius: 10px; overflow: hidden;">
                                        <div style="width: ${a.status.includes('✅') ? width : 0}%; height: 100%; background: ${color}; transition: width 0.5s ease;"></div>
                                    </div>
                                    <span style="font-size: 10px; color: #64748b; font-weight: 700; width: 40px; text-align: right;">${a.latency || '--'}</span>
                                </div>
                            </div>
                            `;
                        }).join('')}
                    </div>
                </div>

                <div style="padding: 10px; background: #0f172a; border-radius: 8px; margin-top: 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="font-size: 10px; font-weight: 800; color: #2dd4bf; text-transform: uppercase;">Logs Recentes (Console)</span>
                        <button class="btn" style="font-size: 9px; padding: 2px 6px; background: rgba(255,255,255,0.1); color: white;" onclick="window.healthSystem.copyFullReport()">📋 Copiar Tudo</button>
                    </div>
                    <div id="log-display-area" style="max-height: 120px; overflow-y: auto; font-family: monospace; font-size: 10px; color: #94a3b8; line-height: 1.4;">
                        ${report.logs.length > 0 ? report.logs.map(l => `<div>[${l.type.toUpperCase()}] ${l.msg}</div>`).join('') : '<div style="font-style:italic;">Nenhum erro detectado no console.</div>'}
                    </div>
                </div>
                
                <button class="btn btn-primary" style="width: 100%; margin-top: 15px; font-weight: 800;" onclick="window.healthSystem.askAiForDiagnosis()">🤖 CONSULTAR NEUROENGINEAI (AUDITORIA)</button>
            </div>
        `;

        container.innerHTML = html;
        this.currentFullReport = report; // Cache para cópia
    },

    async askAiForDiagnosis() {
        if(!this.currentFullReport) return alert("Execute o diagnóstico funcional primeiro.");
        const btn = document.querySelector('button[onclick*="askAiForDiagnosis"]');
        const originalText = btn.innerText;
        btn.innerText = "⏳IA ANALISANDO LOGS...";
        btn.disabled = true;

        try {
            const prompt = `[DR VICTOR LAWRENCE]: Analise o relatório de saúde do sistema abaixo e forneça um diagnóstico objetivo.
            [DADOS DO SISTEMA]: ${JSON.stringify(this.currentFullReport.modules)}
            [STATUS APIs]: ${JSON.stringify(this.currentFullReport.apis)}
            [LOGS DE CONSOLE]: ${JSON.stringify(this.currentFullReport.logs)}
            
            [MISSÃO]: Liste apenas os problemas críticos identificados, breaking changes e sugira 3 melhoras de infraestrutura imediata. Seja cirúrgico e direto.`;

            const modelType = window.app ? window.app.getActiveModel('health-reputation') : 'gemini-2.5-flash';
            const response = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, modelType })
            });
            const data = await response.json();
            
            // Exibe a análise da IA no lugar dos logs ou em um modal
            const logDisplay = document.getElementById('log-display-area');
            if (logDisplay) {
                logDisplay.innerHTML = `<div style="color: #6366f1; border-left: 2px solid #6366f1; padding-left: 10px; white-space: pre-wrap;">${data.text}</div>`;
                logDisplay.scrollTop = 0;
            }
            if(window.showToast) window.showToast("🛡️ Auditoria IA Concluída!");
            
        } catch (e) {
            alert("Erro na auditoria IA: " + e.message);
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    },

    async persistReport(report) {
        try {
            await fetch('/api/system/report/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(report)
            });
            console.log("💾 [HEALTH] Relatório Longitudinal Salvo com Sucesso.");
        } catch(e) { console.error("Falha ao persistir relatório", e); }
    },

    copyFullReport() {
        if(!this.currentFullReport) return;
        const text = JSON.stringify(this.currentFullReport, null, 2);
        navigator.clipboard.writeText(text).then(() => {
            if(window.showToast) window.showToast("✅ Relatório copiado para a área de transferência!");
        });
    // ── PULSO DO SISTEMA (V5.1) ─────────────────────────────────────────────
    
    startHeartbeat() {
        console.log("💓 [PULSO] Monitor de Latência Ativado.");
        this.updatePulse();
        setInterval(() => this.updatePulse(), 15000); // Check every 15s
    },

    async updatePulse() {
        const startTime = Date.now();
        const latencyEl = document.getElementById('system-latency');
        const pulseEl = document.getElementById('system-pulse');
        
        try {
            const response = await fetch('/api/health/ping');
            const endTime = Date.now();
            const latency = endTime - startTime;
            
            if (latencyEl) latencyEl.innerText = `Ping: ${latency} ms`;
            
            if (pulseEl) {
                if (response.ok) {
                    pulseEl.style.color = '#10b981';
                    pulseEl.style.borderColor = 'rgba(16, 185, 129, 0.1)';
                    pulseEl.querySelector('.dot').classList.add('green');
                    pulseEl.querySelector('.dot').classList.remove('red');
                    pulseEl.querySelector('span:first-of-type').innerText = 'Ativo';
                } else {
                    throw new Error("API Offline");
                }
            }
        } catch (e) {
            console.warn("⚠️ [PULSO] Falha de conexão:", e.message);
            if (latencyEl) latencyEl.innerText = 'Ping: ERR';
            if (pulseEl) {
                pulseEl.style.color = '#ef4444';
                pulseEl.style.borderColor = 'rgba(239, 68, 68, 0.1)';
                pulseEl.querySelector('.dot').classList.add('red');
                pulseEl.querySelector('.dot').classList.remove('green');
                pulseEl.querySelector('span:first-of-type').innerText = 'Instável';
            }
        }
    }
};
