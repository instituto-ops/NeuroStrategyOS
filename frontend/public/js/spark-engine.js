/**
 * ✨ NEUROENGINE SPARK (CENTELHA)
 * Orquestrador Onipresente V5.30 ALPHA
 * Fornece telemetria de tokens, saúde do sistema e suporte cruzado por IA.
 */

window.sparkEngine = {
    isOpen: false,
    currentTab: 'copilot',
    telemetry: null,
    health: null,
    
    init() {
        console.log("✨ [SPARK] Motor de Orquestração Inicializado.");
        this.checkSystemHealth();
        if(window.lucide) lucide.createIcons();
        
        // Auto-refresh logic
        setInterval(() => {
            this.checkSystemHealth();
            if (this.isOpen && this.currentTab === 'telemetry') this.loadTelemetry();
        }, 60000); // 1 min sync
    },

    togglePanel() {
        const panel = document.getElementById('spark-panel');
        this.isOpen = !this.isOpen;
        panel.style.display = this.isOpen ? 'flex' : 'none';
        
        if (this.isOpen) {
            this.switchTab(this.currentTab);
            // Ao abrir, removemos o badge (notificação lida)
            document.getElementById('spark-badge').style.display = 'none';
        }
    },

    async checkSystemHealth() {
        try {
            const response = await fetch('/api/health/check');
            const data = await response.json();
            this.health = data;
            
            // Se houver degradação, mostra o badge
            if (data.status !== 'online') {
                document.getElementById('spark-badge').style.display = 'block';
            }
        } catch (e) {
            console.warn("⚠️ [SPARK] Falha ao checar saúde.");
        }
    },

    switchTab(tab) {
        this.currentTab = tab;
        
        document.querySelectorAll('.spark-tab').forEach(t => t.classList.remove('active'));
        const activeTabBtn = document.getElementById(`tab-${tab}`);
        if (activeTabBtn) activeTabBtn.classList.add('active');
        
        const content = document.getElementById('spark-content');
        content.innerHTML = '<div class="loading-spark">⌛ Sincronizando...</div>';

        switch(tab) {
            case 'copilot':
                this.renderCopilot();
                break;
            case 'telemetry':
                this.loadTelemetry();
                break;
            case 'health':
                this.renderHealth();
                break;
        }
    },

    async loadTelemetry() {
        try {
            const response = await fetch('/api/system/telemetry');
            this.telemetry = await response.json();
            this.renderTelemetry();
        } catch (e) {
            document.getElementById('spark-content').innerHTML = `<div style="color: #ef4444; padding: 20px; text-align: center;">Hub Offline.</div>`;
        }
    },

    getCurrentContext() {
        // Detecta qual seção está visível no dashboard
        const sections = ['dashboard', 'action-plan', 'ai-studio', 'planning', 'abidos-review', 'doctoralia', 'neuro-training', 'media-library'];
        let activeSection = 'dashboard';
        
        sections.forEach(s => {
            const el = document.getElementById(`section-${s}`);
            if (el && el.style.display !== 'none') activeSection = s;
        });

        const contextMap = {
            'dashboard': { tip: "Você está na Visão Geral. Use o Copilot para analisar suas métricas do GA4.", icon: "layout-dashboard" },
            'ai-studio': { tip: "No AI Studio, meu hemisfério PRO está ativo para garantir que seu tom de voz seja autêntico.", icon: "brain" },
            'abidos-review': { tip: "Revisão Clínica: Estou auditando rascunhos em busca de alucinações ou termos proibidos pelo CFP.", icon: "clipboard-check" },
            'planning': { tip: "Planejamento Silo: Crie clusters de conteúdo para dominar a autoridade em Goiânia.", icon: "map" },
            'doctoralia': { tip: "Respondendo Pacientes: Seus reviews da Doctoralia estão sendo usados como prova social.", icon: "message-square" },
            'neuro-training': { tip: "Digital Twin: Treine minha escrita colando textos antigos. Aprenderei seu DNA.", icon: "graduation-cap" }
        };

        return contextMap[activeSection] || contextMap['dashboard'];
    },

    renderCopilot() {
        const context = this.getCurrentContext();
        const content = document.getElementById('spark-content');
        
        content.innerHTML = `
            <div class="spark-context-tip">
                <h6>Dica da Centelha</h6>
                <p>${context.tip}</p>
            </div>
            
            <div id="spark-chat-history" style="height: 320px; overflow-y: auto; margin-bottom: 20px; padding-right: 5px; display: flex; flex-direction: column; gap: 12px;">
                <div class="message-ai" style="background: rgba(45, 212, 191, 0.05); padding: 12px; border-radius: 14px; color: rgba(255,255,255,0.8); font-size: 12px; border: 1px solid rgba(45, 212, 191, 0.1);">
                    Olá Dr. Victor. Alguma dúvida estratégica hoje?
                </div>
            </div>

            <div class="spark-input-container" style="position: absolute; bottom: 40px; left: 0; width: 100%; box-sizing: border-box; background: rgba(5,8,15,0.9);">
                <input type="text" id="spark-chat-input" class="spark-input" placeholder="Perguntar à Centelha..." onkeypress="if(event.key==='Enter') window.sparkEngine.sendMessage()">
                <button class="btn-send-spark" onclick="window.sparkEngine.sendMessage()">
                    <i data-lucide="send" style="width: 18px; height: 18px;"></i>
                </button>
            </div>
        `;
        if(window.lucide) lucide.createIcons();
    },

    async sendMessage() {
        const input = document.getElementById('spark-chat-input');
        const history = document.getElementById('spark-chat-history');
        const msg = input.value.trim();
        if(!msg) return;

        const userDiv = document.createElement('div');
        userDiv.style = "align-self: flex-end; background: rgba(255,255,255,0.05); padding: 10px 14px; border-radius: 14px 14px 2px 14px; color: white; font-size: 12px; max-width: 85%; border: 1px solid rgba(255,255,255,0.05);";
        userDiv.innerText = msg;
        history.appendChild(userDiv);
        
        input.value = '';
        history.scrollTop = history.scrollHeight;

        const aiDiv = document.createElement('div');
        aiDiv.style = "background: rgba(45, 212, 191, 0.05); padding: 12px; border-radius: 2px 14px 14px 14px; color: rgba(255,255,255,0.8); font-size: 12px; border: 1px solid rgba(45, 212, 191, 0.1);";
        aiDiv.innerText = "Pensando...";
        history.appendChild(aiDiv);
        history.scrollTop = history.scrollHeight;

        try {
            const response = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: `Você é a Centelha (Spark), o orquestrador do sistema NeuroEngine OS. Sua tarefa é guiar o Dr. Victor Lawrence. Responda de forma curta e clínica.\nPergunta: ${msg}`,
                    modelType: 'flash'
                })
            });
            const data = await response.json();
            aiDiv.innerText = data.text || "Sem resposta do núcleo.";
        } catch (e) { aiDiv.innerText = "Falha de conexão."; }
        history.scrollTop = history.scrollHeight;
    },

    renderTelemetry() {
        const content = document.getElementById('spark-content');
        if (!this.telemetry) return;
        const t = this.telemetry;
        const lastSync = new Date(t.last_sync).toLocaleTimeString('pt-BR');

        content.innerHTML = `
            <div class="telemetry-card">
                <div class="telemetry-row">
                    <span class="telemetry-label">Calls no Hub</span>
                    <span class="telemetry-value" style="color: #2dd4bf;">${t.calls}</span>
                </div>
            </div>

            <div class="telemetry-card">
                <h5 style="color: white; font-size: 10px; margin-bottom: 15px; text-transform: uppercase;">Consumo de Tokens</h5>
                <div class="telemetry-row"><span class="telemetry-label">Prompt</span><span class="telemetry-value">${t.tokens.prompt.toLocaleString()}</span></div>
                <div class="telemetry-row"><span class="telemetry-label">Resposta</span><span class="telemetry-value">${t.tokens.candidates.toLocaleString()}</span></div>
                <div class="telemetry-row" style="margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.05);">
                    <span class="telemetry-label">Total Sessão</span>
                    <span class="telemetry-value" style="font-size: 18px; color: #6366f1;">${t.tokens.total.toLocaleString()}</span>
                </div>
            </div>
            <div style="text-align: center; font-size: 10px; color: rgba(255,255,255,0.2);">Síncronia: ${lastSync}</div>
        `;
    },

    renderHealth() {
        const content = document.getElementById('spark-content');
        if (!this.health) {
             content.innerHTML = '<div class="loading-spark">⌛ Buscando integridade...</div>';
             this.checkSystemHealth().then(() => this.renderHealth());
             return;
        }

        const s = this.health.services;

        content.innerHTML = `
            <div class="health-container">
                <div class="telemetry-card">
                    <h5 style="color: white; font-size: 10px; margin-bottom: 15px; text-transform: uppercase;">Endpoints Vitais</h5>
                    <div class="telemetry-row">
                        <span class="telemetry-label">DB Local</span>
                        <span class="telemetry-value" style="color: ${s.database.status==='active'?'#10b981':'#ef4444'}">${s.database.status.toUpperCase()}</span>
                    </div>
                    <div class="telemetry-row">
                        <span class="telemetry-label">Gemini AI Hub</span>
                        <span class="telemetry-value" style="color: ${s.gemini.status==='ready'?'#10b981':'#ef4444'}">${s.gemini.status.toUpperCase()}</span>
                    </div>
                </div>

                </div>

                <div class="telemetry-card" style="background: rgba(99, 102, 241, 0.1); border-color: rgba(99, 102, 241, 0.2);">
                   <h5 style="color: white; font-size: 10px; margin-bottom: 10px; text-transform: uppercase;">Diagnóstico Onipresente</h5>
                   <button id="btn-spark-health-check" class="btn-spark-action" onclick="window.sparkEngine.runFullCheck(this)" style="width: 100%; padding: 10px; border-radius: 8px; border: none; background: #6366f1; color: white; font-weight: 800; font-size: 11px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                       <i data-lucide="activity" style="width: 14px; height: 14px;"></i> CHECAR SEÇÃO ATUAL
                   </button>
                </div>
            </div>
        `;
    },

    async runFullCheck(btn) {
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '⏳ EXECUTANDO...';
        btn.disabled = true;
        
        try {
            await window.healthSystem.runSystemCheck();
            btn.innerHTML = '✅ CONCLUÍDO';
            setTimeout(() => {
                btn.innerHTML = originalHtml;
                btn.disabled = false;
            }, 3000);
        } catch (e) {
            btn.innerHTML = '❌ ERRO';
            setTimeout(() => {
                btn.innerHTML = originalHtml;
                btn.disabled = false;
            }, 3000);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => { window.sparkEngine.init(); });
