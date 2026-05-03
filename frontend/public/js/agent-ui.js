/**
 * frontend/public/js/agent-ui.js
 * 
 * Interface de Controle do Agente Operacional no Studio.
 */

const AgentUI = {
    panel: null,
    statusIndicator: null,
    
    init() {
        console.log("🤖 [AgentUI] Inicializando...");
        this.createStyles();
        this.renderPanel();
        this.startStatusPolling();
        this.renderToggle();
    },

    createStyles() {
        const style = document.createElement('style');
        style.innerHTML = `
            #agent-control-panel {
                position: fixed;
                right: -400px;
                top: 0;
                width: 380px;
                height: 100vh;
                background: rgba(13, 17, 23, 0.95);
                backdrop-filter: blur(10px);
                border-left: 1px solid rgba(255,255,255,0.1);
                z-index: 9999;
                transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                color: #e6edf3;
                display: flex;
                flex-direction: column;
                font-family: 'Inter', sans-serif;
                box-shadow: -10px 0 30px rgba(0,0,0,0.5);
            }

            #agent-control-panel.open {
                right: 0;
            }

            .agent-header {
                padding: 20px;
                background: rgba(255,255,255,0.05);
                border-bottom: 1px solid rgba(255,255,255,0.1);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .agent-status-badge {
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 11px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .status-idle { background: #23863622; color: #3fb950; border: 1px solid #3fb95044; }
            .status-executing { background: #1f6feb22; color: #58a6ff; border: 1px solid #58a6ff44; animation: pulse 2s infinite; }
            .status-error { background: #da363322; color: #f85149; border: 1px solid #f8514944; }

            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.7; }
                100% { opacity: 1; }
            }

            .agent-body {
                flex: 1;
                overflow-y: auto;
                padding: 20px;
            }

            .agent-section {
                margin-bottom: 25px;
            }

            .agent-section h3 {
                font-size: 13px;
                color: #8b949e;
                margin-bottom: 15px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }

            .hitl-card {
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 10px;
            }

            .hitl-card code {
                display: block;
                background: #000;
                padding: 10px;
                border-radius: 4px;
                font-size: 12px;
                margin: 10px 0;
                color: #7ee787;
            }

            .agent-btn {
                padding: 8px 16px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 13px;
                font-weight: 500;
                border: none;
                transition: all 0.2s;
            }

            .btn-primary { background: #1f6feb; color: white; }
            .btn-primary:hover { background: #388bfd; }
            .btn-danger { background: transparent; color: #f85149; border: 1px solid #f8514944; }
            .btn-danger:hover { background: #da3633; color: white; }

            #agent-toggle {
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 50px;
                height: 50px;
                border-radius: 25px;
                background: #1f6feb;
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                z-index: 10000;
                box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                transition: transform 0.2s;
            }

            #agent-toggle:hover { transform: scale(1.1); }
        `;
        document.head.appendChild(style);
    },

    renderPanel() {
        this.panel = document.createElement('div');
        this.panel.id = 'agent-control-panel';
        this.panel.innerHTML = `
            <div class="agent-header">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 20px;">🤖</span>
                    <strong style="font-size: 16px;">Vórtex Agent</strong>
                </div>
                <div id="agent-status-badge" class="agent-status-badge status-idle">Offline</div>
            </div>
            <div class="agent-body">
                <div class="agent-section">
                    <h3>FSM State</h3>
                    <div id="agent-fsm-info" style="font-size: 14px; color: #c9d1d9;">Aguardando conexão...</div>
                </div>
                
                <div id="hitl-section" class="agent-section" style="display: none;">
                    <h3>Requisições Pendentes (HITL)</h3>
                    <div id="hitl-list"></div>
                </div>

                <div class="agent-section">
                    <h3>Memória Semântica</h3>
                    <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                        <input type="text" id="memory-search-input" placeholder="Pesquisar fatos..." 
                               style="flex: 1; background: #0d1117; border: 1px solid #30363d; border-radius: 6px; padding: 8px; color: white;">
                        <button onclick="AgentUI.searchMemory()" class="agent-btn btn-primary">🔍</button>
                    </div>
                    <div id="memory-results" style="font-size: 12px; color: #8b949e;"></div>
                </div>

                <div class="agent-section">
                    <h3>Ações</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <button onclick="AgentUI.bootAgent()" class="agent-btn btn-primary">Boot</button>
                        <button onclick="AgentUI.indexRepo()" class="agent-btn btn-primary">Index Repo</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(this.panel);
    },

    renderToggle() {
        const toggle = document.createElement('div');
        toggle.id = 'agent-toggle';
        toggle.innerHTML = '🤖';
        toggle.onclick = () => this.panel.classList.toggle('open');
        document.body.appendChild(toggle);
    },

    async startStatusPolling() {
        setInterval(async () => {
            const data = await window.agentAPI.getStatus();
            const badge = document.getElementById('agent-status-badge');
            const fsmInfo = document.getElementById('agent-fsm-info');

            if (data.connected === false) {
                badge.className = 'agent-status-badge status-error';
                badge.innerText = 'Offline';
                fsmInfo.innerText = 'Daemon (agentd) não detectado.';
            } else {
                const state = data.status.state;
                badge.className = `agent-status-badge status-${state.toLowerCase() === 'idle' ? 'idle' : 'executing'}`;
                badge.innerText = state;
                fsmInfo.innerHTML = `
                    <div style="display: flex; flex-direction: column; gap: 5px;">
                        <span><strong>Sessão:</strong> ${data.status.sessionId}</span>
                        <span><strong>Atividade:</strong> ${data.status.history.length} eventos</span>
                    </div>
                `;
                this.refreshHITL();
            }
        }, 3000);
    },

    async refreshHITL() {
        try {
            const pending = await window.agentAPI.call('hitl.list');
            const section = document.getElementById('hitl-section');
            const list = document.getElementById('hitl-list');

            if (pending.length > 0) {
                section.style.display = 'block';
                list.innerHTML = pending.map(item => `
                    <div class="hitl-card">
                        <div style="font-size: 12px; font-weight: 600;">Permissão solicitada:</div>
                        <code>${item.toolCall.toolId}(${JSON.stringify(item.toolCall.args).slice(0, 50)}...)</code>
                        <div style="font-size: 11px; color: #8b949e; margin-bottom: 10px;">Motivo: ${item.decision.reason}</div>
                        <div style="display: flex; gap: 10px;">
                            <button onclick="AgentUI.resolveHITL('${item.id}', true)" class="agent-btn btn-primary" style="flex: 1;">Aprovar</button>
                            <button onclick="AgentUI.resolveHITL('${item.id}', false)" class="agent-btn btn-danger">Negar</button>
                        </div>
                    </div>
                `).join('');
            } else {
                section.style.display = 'none';
            }
        } catch (e) {}
    },

    async resolveHITL(id, approved) {
        await window.agentAPI.call('hitl.resolve', { id, approved });
        this.refreshHITL();
    },

    async searchMemory() {
        const query = document.getElementById('memory-search-input').value;
        const results = await window.agentAPI.call('memory.search', { query, k: 3 });
        const container = document.getElementById('memory-results');
        
        container.innerHTML = results.factual.map(r => `
            <div style="border-bottom: 1px solid rgba(255,255,255,0.05); padding: 8px 0;">
                <div style="color: #58a6ff; font-weight: 600;">${Math.round(r.score * 100)}% Match</div>
                <div style="color: #c9d1d9;">${r.content.slice(0, 100)}...</div>
            </div>
        `).join('');
    },

    async indexRepo() {
        alert('Indexação iniciada em segundo plano...');
        await window.agentAPI.call('memory.index_repo');
        alert('Indexação concluída!');
    }
};

window.addEventListener('load', () => AgentUI.init());
