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
            timestamp: new Date().toISOString(), // ISO para persistência correta e análise longitudinal robusta
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
                status: (exists && initialized) ? (selfHealed ? "🩹 RECUPERADO" : "✅ OPERACIONAL") : "❌ FALHA", 
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
                    status: res.ok ? "✅ OPERACIONAL" : "❌ FALHA", 
                    latency: `${latency}ms` 
                });
            } catch(e) {
                console.error(`Falha na API ${api.name}:`, e.message || e);
                report.apis.push({ 
                    name: api.name, 
                    status: "❌ FALHA", 
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

                    <div id="log-display-area" style="max-height: 250px; overflow-y: auto; background: #0f172a; padding: 15px; border-radius: 8px; margin-top: 10px;">
                        ${report.logs.length > 0 ? report.logs.map(l => this.formatLog(l)).join('') : '<div style="font-style:italic; color: #64748b; padding: 20px; text-align:center;">Nenhum evento capturado.</div>'}
                    </div>
                </div>
                
                <button class="btn btn-primary" style="width: 100%; margin-top: 20px; font-weight: 800; padding: 12px; font-size: 11px;" onclick="window.healthSystem.askAiForDiagnosis()">🤖 CONSULTAR NEUROENGINEAI (AUDITORIA)</button>
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
            
            // Exibe a análise da IA no lugar dos logs com formatação visual cognitivamente correta
            const logDisplay = document.getElementById('log-display-area');
            if (logDisplay) {
                // 🤖 Melhora na extração de insights (V5.31 - Fallback robusto)
                let cleanText = data.text;
                let parsedVisual = false;

                if (cleanText.includes('{') && cleanText.includes(':')) {
                    try {
                        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            const parsed = JSON.parse(jsonMatch[0]);
                            const criticos = parsed.problemas_criticos || parsed.problema_critico || [];
                            const melhorias = parsed.melhorias_infraestrutura_imediata || parsed.melhoria_infraestrutura_imediata || [];
                            
                            // Só formata se houver pelo menos um item, senão mostra o original
                            if ((Array.isArray(criticos) && criticos.length > 0) || (Array.isArray(melhorias) && melhorias.length > 0)) {
                                cleanText = `
                                    <div style="background: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; padding: 10px; border-radius: 4px; margin-bottom: 15px;">
                                        <h4 style="color: #ef4444; margin: 0 0 8px 0; font-size: 13px; font-weight: 800;">🚨 DIAGNÓSTICO CRÍTICO</h4>
                                        <div style="color: #f8fafc; font-size: 12px; line-height: 1.5;">${Array.isArray(criticos) ? criticos.map(p => `• ${p}`).join('<br>') : criticos}</div>
                                    </div>
                                    <div style="background: rgba(45, 212, 191, 0.1); border-left: 4px solid #2dd4bf; padding: 10px; border-radius: 4px;">
                                        <h4 style="color: #2dd4bf; margin: 0 0 8px 0; font-size: 13px; font-weight: 800;">⚡ SUGESTÕES DE INFRA</h4>
                                        <div style="color: #f8fafc; font-size: 12px; line-height: 1.5;">${Array.isArray(melhorias) ? melhorias.map(m => `• ${m}`).join('<br>') : melhorias}</div>
                                    </div>
                                `;
                                parsedVisual = true;
                            }
                        }
                    } catch(e) { console.warn("Erro ao extrair JSON do diagnóstico:", e); }
                }

                // Se não foi processado como JSON bonito, formata como texto simples mas limpo
                if (!parsedVisual) {
                    cleanText = `<div style="color: #f8fafc; line-height: 1.6; white-space: pre-wrap;">${cleanText.replace(/###/g, '■').replace(/\*/g, '•')}</div>`;
                }

                logDisplay.innerHTML = `
                    <div style="padding: 15px; background: rgba(0,0,0,0.2); border-left: 3px solid #6366f1; border-radius: 4px; font-family: 'Inter', sans-serif;">
                        <span style="font-size: 10px; color: #6366f1; font-weight: 800; text-transform: uppercase;">Análise NeuroEngine AI — Insights Diagnósticos</span>
                        <div style="margin-top: 15px;">${cleanText}</div>
                        <div style="margin-top: 20px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 15px; display: flex; gap: 10px;">
                            <button class="btn btn-primary" style="padding: 8px 16px; font-size: 11px; background: #6366f1; color: white; display: flex; align-items: center; gap: 5px;" onclick="window.healthSystem.copyToClipboard('${(parsedVisual ? 'Relatório IA Processado' : cleanText).replace(/'/g, "\\'").replace(/\n/g, "\\n")}')">📋 COPIAR RELATÓRIO</button>
                            <button class="btn btn-secondary" style="padding: 8px 16px; font-size: 11px;" onclick="window.healthSystem.clearLogs()">🗑️ LIMPAR CONSOLE</button>
                        </div>
                    </div>
                `;
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

    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            if(window.showToast) window.showToast("✅ Texto copiado!");
        });
    },

    copyFullReport() {
        if(!this.currentFullReport) return;
        // Formata o JSON de forma legível para o usuário se solicitado
        const r = this.currentFullReport;
        const text = `RELATÓRIO DE SAÚDE - NEUROENGINE ${r.version}\nData: ${r.timestamp}\n\n` + 
                     `MÓDULOS:\n${r.modules.map(m => `- ${m.name}: ${m.status}`).join('\n')}\n\n` +
                     `APIs:\n${r.apis.map(a => `- ${a.name}: ${a.latency}`).join('\n')}`;

        this.copyToClipboard(text);
    },

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
    },

    async runDesignAudit(currentOnly = false) {
        const container = document.getElementById('design-audit-container');
        const reportEl = document.getElementById('design-audit-report');
        const screenshotEl = document.getElementById('design-audit-screenshot');
        const btn = document.getElementById('btn-run-design-audit');

        if (!container || !reportEl) return;
        container.style.display = 'block';
        if (window.showSection) window.showSection('health-reputation');

        reportEl.innerHTML = `<div class="loading-shimmer" style="height: 100px; margin-top: 20px;"></div><p style="text-align:center; font-size:11px; font-weight:700;">🤖 ${currentOnly ? 'Analisando Seção Atual...' : 'Analisando Hub Completo...'}</p>`;
        if (btn) {
            btn.disabled = true;
            btn.innerText = "⏳ AUDITANDO...";
        }

        try {
            let finalCanvas = null;

            if (currentOnly) {
                const target = document.querySelector('section.content-section.active') || document.body;
                finalCanvas = await html2canvas(target, { scale: 1, logging: false, useCORS: true });
            } else {
                console.log("🌐 [DESIGN AUDIT] Iniciando Captura Global com Identificadores de Seção...");
                const sections = [
                    { id: 'dashboard', name: 'DASHBOARD OPERACIONAL' },
                    { id: 'action-plan', name: 'PLANO DE AÇÃO ESTRATÉGICO' },
                    { id: 'ai-studio', name: 'ESTÚDIO DE CONTEÚDO (AI)' },
                    { id: 'planning', name: 'PLANEJAMENTO (SILOS & STAGS)' },
                    { id: 'abidos-review', name: 'CURADORIA E APROVAÇÃO' },
                    { id: 'media-library', name: 'ACERVO DE MÍDIA' },
                    { id: 'health-reputation', name: 'MONITOR TÉCNICO E SAÚDE' }
                ];
                const canvasses = [];
                const originalSection = document.querySelector('section.content-section.active')?.id;

                for (const section of sections) {
                    if (window.showSection) window.showSection(section.id);
                    await new Promise(r => setTimeout(r, 700)); // Mais tempo para estabilidade global
                    const target = document.getElementById(section.id) || document.body;
                    const canvas = await html2canvas(target, { scale: 0.8, logging: false, useCORS: true });
                    canvasses.push({ canvas, name: section.name });
                }

                if (originalSection) window.showSection(originalSection);

                const headerHeight = 50;
                const totalHeight = canvasses.reduce((sum, c) => sum + c.canvas.height + headerHeight, 0);
                const maxWidth = Math.max(...canvasses.map(c => c.canvas.width));
                
                const mergedCanvas = document.createElement('canvas');
                mergedCanvas.width = maxWidth;
                mergedCanvas.height = totalHeight;
                mergedCanvas.style.backgroundColor = '#1e293b';
                const ctx = mergedCanvas.getContext('2d');
                
                let yOffset = 0;
                canvasses.forEach(c => {
                    // Draw Header Background
                    ctx.fillStyle = '#6366f1';
                    ctx.fillRect(0, yOffset, maxWidth, headerHeight);
                    
                    // Draw Header Text
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 20px Inter, sans-serif';
                    ctx.fillText(`MÓDULO: ${c.name}`, 20, yOffset + 32);
                    
                    yOffset += headerHeight;
                    
                    // Draw Section Screenshot
                    ctx.drawImage(c.canvas, 0, yOffset);
                    yOffset += c.canvas.height;
                    
                    // Separator
                    ctx.fillStyle = '#0f172a';
                    ctx.fillRect(0, yOffset - 5, maxWidth, 5); 
                });
                finalCanvas = mergedCanvas;
            }

            const imageData = finalCanvas.toDataURL('image/webp', 0.8);
            screenshotEl.innerHTML = `<img src="${imageData}" style="width: 100%; height: 100%; object-fit: contain;">`;

            const prompt = `[DR VICTOR LAWRENCE]: Realize uma auditoria estética e de UX ${currentOnly ? 'desta seção' : 'de todo o Hub'} do NeuroEngine OS.
            [CONTEXTO]: A imagem contém uma sequência de capturas identificadas por cabeçalhos azuis ("MÓDULO: ...").
            Analise cada módulo separadamente e depois forneça uma conclusão global sobre a consistência do ecossistema.
            [CRITÉRIOS]: Heurísticas de Nielsen, Contraste WCAG, Legibilidade e Identidade Verbal Abidos.`;

            const response = await fetch('/api/health/design-audit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    prompt, 
                    image: imageData.split(',')[1],
                    context: currentOnly ? "Specific Section UX Audit" : "NeuroEngine Hub Global Audit"
                })
            });

            if (!response.ok) throw new Error("Erro na comunicação com o cérebro visual.");
            const data = await response.json();
            
            reportEl.innerHTML = `
                <div style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #e2e8f0;">
                    <button class="btn btn-primary" style="font-size: 11px; padding: 12px 20px; width: 100%; background: #6366f1 !important; box-shadow: 0 4px 12px rgba(99,102,241,0.2);" onclick="window.healthSystem.copyToClipboard(document.getElementById('design-audit-report-content').innerText)">📋 COPIAR RELATÓRIO DE AUDITORIA</button>
                </div>
                <div style="font-weight: 800; color: #6366f1; margin-bottom: 12px; font-size: 11px; letter-spacing: 1px;">✅ AUDITORIA ${currentOnly ? 'DA SEÇÃO' : 'GLOBAL'} CONCLUÍDA</div>
                <div id="design-audit-report-content" style="line-height:1.6; color:#1e293b;">${data.text.replace(/\n/g, '<br>')}</div>
            `;

            if(window.showToast) window.showToast("🛡️ Auditoria Design Concluída!");

        } catch (e) {
            console.error("❌ [DESIGN AUDIT] Falha:", e);
            reportEl.innerHTML = `<p style="color:#ef4444; font-weight:800; text-align:center;">FALHA NA AUDITORIA: ${e.message}</p>`;
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerText = currentOnly ? "🖌️ AUDITAR SEÇÃO" : "🖌️ AUDITAR HUB COMPLETO";
            }
        }
    },

    clearLogs() {
        window._neuroLogs = [];
        const logDisplay = document.getElementById('log-display-area');
        if (logDisplay) logDisplay.innerHTML = '<div style="color: #64748b; font-style: italic; padding: 20px; text-align:center;">Console limpo e pronto para nova captura.</div>';
        if (window.showToast) window.showToast("Console Limpo.");
    },

    formatLog(log) {
        let msg = log.msg;
        let isJson = false;
        if (typeof msg === 'string' && (msg.startsWith('{') || msg.startsWith('['))) {
            try {
                const parsed = JSON.parse(msg);
                msg = `<pre style="font-size:10px; color:#2dd4bf; background:rgba(0,0,0,0.3); padding:10px; border-radius:6px; margin-top:8px; border: 1px solid rgba(45,212,191,0.1); overflow-x:auto;">${JSON.stringify(parsed, null, 2)}</pre>`;
                isJson = true;
            } catch(e) {}
        }
        
        const typeColors = { log: '#94a3b8', error: '#ef4444', warn: '#f59e0b', info: '#6366f1' };
        const typeLabels = { log: 'LOG', error: 'FAIL', warn: 'WARN', info: 'INFO' };

        return `
            <div style="margin-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 10px; font-family: 'Inter', sans-serif;">
                <div style="display:flex; justify-content:space-between; font-size:9px; font-weight:800; margin-bottom:6px; opacity:0.7;">
                    <span style="color: ${typeColors[log.type] || '#fff'}; background: ${typeColors[log.type]}22; padding: 2px 6px; border-radius: 4px;">${typeLabels[log.type] || 'LOG'}</span>
                    <span style="color: #64748b;">${log.time || ''}</span>
                </div>
                <div style="color: ${isJson ? '#fff' : '#e2e8f0'}; line-height:1.5; font-size: 11px;">${msg}</div>
            </div>
        `;
    },

    async loadLongitudinalReport() {
        const container = document.getElementById('longitudinal-report-results');
        if (!container) return;

        container.innerHTML = '<div class="loading-shimmer" style="height: 60px;"></div>';

        try {
            const response = await fetch('/api/system/report/history');
            const data = await response.json();

            if (!data.length) {
                container.innerHTML = '<p style="font-size: 11px; text-align: center; padding: 20px; color: #64748b;">Nenhum histórico longitudinal detectado.</p>';
                return;
            }

            container.innerHTML = `
                <table style="width: 100%; font-size: 10px; border-collapse: collapse;">
                    <thead>
                        <tr style="border-bottom: 1px solid #e2e8f0; text-align: left; color: #94a3b8; font-weight: 800; text-transform: uppercase;">
                            <th style="padding: 12px 8px;">DATA / HORA</th>
                            <th style="padding: 12px 8px; text-align: center;">INCIDENTES</th>
                            <th style="padding: 12px 8px;">DIAGNÓSTICO RESUMIDO</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(r => {
                            const dateObj = new Date(r.date);
                            const dateStr = dateObj.toLocaleDateString('pt-BR');
                            const timeStr = dateObj.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
                            const alertsCount = (r.modules?.filter(m => m.status.includes('❌')).length || 0) + (r.apis?.filter(a => a.status.includes('❌')).length || 0);
                            const summaryText = r.modules?.filter(m => m.status.includes('❌')).map(m => m.name).concat(r.apis?.filter(a => a.status.includes('❌')).map(a => a.name)).join(', ') || "Integridade Confirmada";
                            return `
                                <tr style="border-bottom: 1px solid #f8fafc; transition: background 0.2s;">
                                    <td style="padding: 12px 8px; font-weight: 600; color: #1e293b;">${dateStr} <span style="font-weight:400; color:#94a3b8;">${timeStr}</span></td>
                                    <td style="padding: 12px 8px; text-align: center;">
                                        <span style="background: ${r.alerts > 0 ? '#fee2e2' : '#dcfce7'}; color: ${r.alerts > 0 ? '#dc2626' : '#059669'}; padding: 4px 10px; border-radius: 12px; font-weight: 900; border: 1px solid ${r.alerts > 0 ? '#fecaca' : '#bbf7d0'};">
                                            ${r.alerts}
                                        </span>
                                    </td>
                                    <td style="padding: 12px 8px; color: #64748b; font-style: italic; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px;" title="${r.summary || 'Tudo OK'}">${r.summary || 'Integridade Confirmada'}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `;
        } catch (e) {
            container.innerHTML = '<p style="color:red; font-size:10px;">Erro ao carregar histórico.</p>';
        }
    }
};
