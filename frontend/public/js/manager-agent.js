/**
 * NEUROENGINE - MANAGER AGENT (ABIDOS V4 MANAGER)
 * -----------------------------------------------
 * O "Cérebro Central" do ecossistema. Este agente tem visão macro de todos
 * os outros módulos e atua como um assessor estratégico para o Dr. Victor.
 * 
 * Estética: Antigravity Premium (Glassmorphism, Neon Accents, Smooth Transitions)
 */

window.managerAgent = {
    messages: [],
    
    init() {
        console.log("👑 [MANAGER AGENT] Inicializando Orquestrador Central...");
        this.renderContainer();
        this.addEventListeners();
        this.loadInitialStatus();
    },

    renderContainer() {
        const section = document.getElementById('manager-agent');
        if (!section) return;

        section.innerHTML = `
            <div class="manager-layout">
                <!-- Sidebar Lateral do Gerente (Insights Rápidos) -->
                <div class="manager-aside glass-panel shadow-2xl">
                    <div class="manager-aside-header">
                        <div class="pulse-icon"></div>
                        <h3 class="tracking-widest uppercase text-[10px] font-black text-cyan-400">Status do Ecossistema</h3>
                    </div>
                    <div id="manager-system-status" class="manager-status-grid">
                        <div class="status-item shimmer">Analisando...</div>
                    </div>
                </div>

                <!-- Área Principal do Chat -->
                <div class="manager-chat-container glass-panel shadow-2xl">
                    <div class="manager-chat-header">
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <div class="manager-avatar">
                                <span class="crown-icon">👑</span>
                            </div>
                            <div>
                                 <h2 class="text-white font-black text-lg m-0 tracking-tight">NeuroEngineAI</h2>
                                <p class="text-cyan-400 text-[10px] font-bold uppercase m-0 tracking-widest">Orquestrador de Estratégia Central</p>
                            </div>
                        </div>
                        <div class="model-badge">
                            <span class="text-[9px] font-black text-slate-400">STATUS: ON-CONTEXT</span>
                        </div>
                    </div>

                    <div id="manager-chat-messages" class="manager-messages">
                        <div class="msg ai greeting glass-panel">
                            <h4 class="text-white">Olá, Dr. Victor Lawrence. I'm NeuroEngineAI.</h4>
                            <p>Eu sou o seu **Orquestrador de Metacognição**. Minha visão está conectada a todos os seus silos, rascunhos, bases de conhecimento e métricas de conversão em tempo real.</p>
                            <p>Como posso otimizar a coerência do seu ecossistema agora?</p>
                            <div class="suggested-actions">
                                <button onclick="window.managerAgent.quickAction('Analise a saúde geral do meu SEO e Silos.')">🔍 Analisar Saúde SEO</button>
                                <button onclick="window.managerAgent.quickAction('Quais são as melhores oportunidades de conteúdo para esta semana?')">📅 Oportunidades da Semana</button>
                                <button onclick="window.managerAgent.quickAction('Revise meus rascunhos pendentes sob a ótica da Conversão Abidos.')">⚖️ Revisão de Rascunhos</button>
                            </div>
                        </div>
                    </div>

                    <div class="manager-input-area border-t border-white/5">
                        <div class="input-wrapper">
                            <button id="manager-voice-btn" class="voice-btn" title="Falar com NeuroEngineAI">🎙️</button>
                            <input type="text" id="manager-input" placeholder="Comando Estratégico para o NeuroEngineAI..." autocomplete="off">
                            <button id="manager-send-btn" class="send-btn" onclick="window.managerAgent.sendMessage()">
                                <span class="send-icon">✦</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    addEventListeners() {
        const input = document.getElementById('manager-input');
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.sendMessage();
            });
        }
    },

    async quickAction(text) {
        const input = document.getElementById('manager-input');
        if (input) {
            input.value = text;
            this.sendMessage();
        }
    },

    async sendMessage() {
        const input = document.getElementById('manager-input');
        const text = input.value.trim();
        if (!text) return;

        input.value = '';
        this.renderMessage('user', text);
        
        const loaderId = this.renderLoader();

        try {
            const response = await fetch('/api/manager/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    message: text,
                    history: this.messages
                })
            });

            const data = await response.json();
            this.removeLoader(loaderId);

            if (data.error) throw new Error(data.error);

            this.renderMessage('ai', data.reply);
            this.messages.push({ role: 'user', content: text });
            this.messages.push({ role: 'ai', content: data.reply });
            
            // 🔥 [TOOL CALLING INTERPRETER]
            if (data.reply.includes("AÇÃO IMPLEMENTADA:") || data.uiAction) {
               const actionName = data.uiAction || data.reply.split("AÇÃO IMPLEMENTADA:")[1]?.trim().split("\n")[0];
               this.executeFrontendTool(actionName);
            }
        } catch (error) {
            this.removeLoader(loaderId);
            this.renderMessage('ai', `⚠️ Desculpe, Dr. Victor. Encontrei uma falha na minha conexão central: ${error.message}`);
        }
    },

    renderMessage(role, content) {
        const container = document.getElementById('manager-chat-messages');
        const div = document.createElement('div');
        div.className = `msg ${role}`;
        
        // Markdown básico e formatação de código
        // Markdown Robusto e Estilizado
        let formattedContent = content
            .replace(/^# (.*)/gm, '<h3 style="color:#2dd4bf; font-weight:900; margin-top:15px; border-bottom:1px solid rgba(45,212,191,0.2); padding-bottom:5px;">$1</h3>')
            .replace(/^## (.*)/gm, '<h4 style="color:#6366f1; font-weight:800; margin-top:10px;">$1</h4>')
            .replace(/\*\*(.*?)\*\*/g, '<strong style="color:white; font-weight:900;">$1</strong>')
            .replace(/\*(.*?)\*/g, '<em style="color:#94a3b8;">$1</em>')
            .replace(/`(.*?)`/g, '<code style="background:rgba(0,0,0,0.3); padding:2px 6px; border-radius:4px; border:1px solid rgba(255,255,255,0.1); font-family:monospace; font-size:12px;">$1</code>')
            .replace(/^\s*[-*]\s+(.*)/gm, '<li style="margin-left:20px; margin-bottom:5px; color:#cbd5e1;">$1</li>')
            .replace(/(<li>.*<\/li>)/gs, '<ul style="margin: 15px 0; padding:0;">$1</ul>')
            .replace(/\n\n/g, '<div style="margin-bottom:15px;"></div>')
            .replace(/\n/g, '<br>');

        div.innerHTML = `
            <div class="msg-content">
                ${formattedContent}
            </div>
        `;
        
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    },

    renderLoader() {
        const container = document.getElementById('manager-chat-messages');
        const id = 'loader-' + Date.now();
        const div = document.createElement('div');
        div.id = id;
        div.className = 'msg ai loader-msg';
        div.innerHTML = `
            <div class="manager-loader">
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
                <span style="font-size: 10px; font-weight: 900; color: #6366f1; margin-left: 10px; text-transform: uppercase; letter-spacing: 1px;">Sincronizando Hemisférios...</span>
            </div>
        `;
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
        return id;
    },

    removeLoader(id) {
        const loader = document.getElementById(id);
        if (loader) loader.remove();
    },

    executeFrontendTool(action) {
        console.log("🛠️ [NeuroEngineAI] Executando Ação:", action);
        const a = action.toLowerCase();
        
        if (a.includes('silo')) {
            const btn = document.querySelector('[data-target="planning"]');
            if(btn) btn.click();
        } else if (a.includes('rascunho') || a.includes('review')) {
            const btn = document.querySelector('[data-target="abidos-review"]');
            if(btn) btn.click();
        } else if (a.includes('marketing') || a.includes('stag') || a.includes('analytics')) {
            const btn = document.querySelector('[data-target="analytics"]');
            if(btn) btn.click();
        } else if (a.includes('studio')) {
            const btn = document.querySelector('[data-target="ai-studio"]');
            if(btn) btn.click();
        }
    },

    async loadInitialStatus() {
        const statusGrid = document.getElementById('manager-system-status');
        try {
            const resp = await fetch('/api/marketing/audit');
            const data = await resp.json();
            
            const stats = [
                { label: 'Conversões (Leads)', value: data.leads || '0', icon: '🚀', color: 'text-emerald-400' },
                { label: 'Sessões (30d)', value: data.sessions || '0', icon: '📁', color: 'text-cyan-400' },
                { label: 'Engajamento', value: data.engagement_rate || '--', icon: '🔗', color: 'text-indigo-400' },
                { label: 'Ativos Agora', value: data.active_now || '0', icon: '🔴', color: 'text-rose-500' }
            ];

            statusGrid.innerHTML = stats.map(s => `
                <div class="status-card-manager">
                    <span class="status-icon">${s.icon}</span>
                    <div style="flex: 1;">
                        <span class="status-label">${s.label}</span>
                        <div class="status-value ${s.color}">${s.value}</div>
                    </div>
                </div>
            `).join('');
        } catch (e) {
            statusGrid.innerHTML = '<p class="text-xs text-slate-500">Erro ao sincronizar status reais.</p>';
        }
    },
};

// CSS específico para o Antigravity Manager (Injetado dinamicamente ou adicionado no dashboard.css)
const managerStyles = `
    .glass-panel {
        background: rgba(15, 23, 42, 0.6);
        backdrop-filter: blur(30px) saturate(180%);
        border: 1px solid rgba(99, 102, 241, 0.2);
        border-radius: 28px;
        box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
    }

    .manager-layout {
        display: flex;
        gap: 25px;
        height: 85vh;
        animation: slide-up 0.6s cubic-bezier(0.23, 1, 0.32, 1);
        padding: 10px;
    }

    .manager-aside {
        width: 280px;
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 20px;
    }

    .manager-aside-header {
        display: flex;
        align-items: center;
        gap: 10px;
        padding-bottom: 15px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .pulse-icon {
        width: 8px;
        height: 8px;
        background: #2dd4bf;
        border-radius: 50%;
        box-shadow: 0 0 15px #2dd4bf;
        animation: pulse 2s infinite;
    }

    .status-card-manager {
        background: rgba(15, 23, 42, 0.9);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 20px;
        padding: 18px 20px;
        display: flex;
        align-items: center;
        gap: 15px;
        transition: all 0.4s ease;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5), inset 0 0 10px rgba(99, 102, 241, 0.1);
    }

    .status-card-manager:hover {
        background: rgba(99, 102, 241, 0.05);
        border-color: rgba(99, 102, 241, 0.2);
        transform: translateY(-2px);
    }

    .status-icon { font-size: 24px; filter: drop-shadow(0 0 8px rgba(255,255,255,0.2)); }
    .status-label { font-size: 11px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 2px; display: block; margin-bottom: 4px; opacity: 0.8; }
    .status-value { font-size: 24px; font-weight: 950; color: #ffffff !important; text-shadow: 0 0 15px rgba(255,255,255,0.1); }

    .manager-chat-container {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border: 1px solid rgba(99, 102, 241, 0.1);
    }

    .manager-chat-header {
        padding: 20px 30px;
        background: rgba(255, 255, 255, 0.02);
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .manager-avatar {
        width: 45px;
        height: 45px;
        background: linear-gradient(135deg, #6366f1, #2dd4bf);
        border-radius: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        box-shadow: 0 10px 20px rgba(99, 102, 241, 0.2);
    }

    .manager-messages {
        flex: 1;
        overflow-y: auto;
        padding: 30px;
        display: flex;
        flex-direction: column;
        gap: 20px;
        scroll-behavior: smooth;
    }

    .msg {
        max-width: 80%;
        padding: 15px 20px;
        border-radius: 20px;
        font-size: 14px;
        line-height: 1.6;
        animation: msg-slide 0.3s ease-out;
    }

    .msg.ai {
        align-self: flex-start;
        background: rgba(30, 41, 59, 0.7);
        color: #f1f5f9;
        border-bottom-left-radius: 4px;
        border: 1px solid rgba(99, 102, 241, 0.2);
        box-shadow: 0 10px 25px rgba(0,0,0,0.1);
    }

    .msg.user {
        align-self: flex-end;
        background: linear-gradient(135deg, #6366f1, #4f46e5);
        color: white;
        border-bottom-right-radius: 4px;
        box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.3);
    }

    .suggested-actions {
        margin-top: 20px;
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
    }

    .suggested-actions button {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #94a3b8;
        padding: 8px 15px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s;
    }

    .suggested-actions button:hover {
        background: rgba(99, 102, 241, 0.1);
        border-color: #6366f1;
        color: white;
    }

    .manager-input-area {
        padding: 24px 30px;
        background: rgba(255, 255, 255, 0.01);
    }

    .input-wrapper {
        display: flex;
        align-items: center;
        gap: 15px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 18px;
        padding: 8px 10px 8px 20px;
        transition: all 0.3s;
    }

    .input-wrapper:focus-within {
        border-color: #6366f1;
        background: rgba(255, 255, 255, 0.05);
        box-shadow: 0 0 20px rgba(99, 102, 241, 0.1);
    }

    #manager-input {
        flex: 1;
        background: none;
        border: none;
        color: white;
        font-size: 14px;
        outline: none;
        padding: 10px 0;
    }

    .voice-btn, .send-btn {
        background: none;
        border: none;
        cursor: pointer;
        padding: 8px;
        border-radius: 12px;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .send-btn {
        background: #6366f1;
        color: white;
        width: 40px;
        height: 40px;
    }

    .send-btn:hover { background: #4f46e5; transform: scale(1.05); }
    .voice-btn:hover { background: rgba(255, 255, 255, 0.05); color: #6366f1; }

    .manager-loader {
        display: flex;
        align-items: center;
        gap: 5px;
    }

    .dot {
        width: 6px;
        height: 6px;
        background: #6366f1;
        border-radius: 50%;
        animation: bounce 1.4s infinite ease-in-out both;
    }

    .dot:nth-child(1) { animation-delay: -0.32s; }
    .dot:nth-child(2) { animation-delay: -0.16s; }

    @keyframes pulse {
        0% { opacity: 0.6; box-shadow: 0 0 0 0 rgba(45, 212, 191, 0.4); }
        70% { opacity: 1; box-shadow: 0 0 0 10px rgba(45, 212, 191, 0); }
        100% { opacity: 0.6; box-shadow: 0 0 0 0 rgba(45, 212, 191, 0); }
    }

    @keyframes bounce {
        0%, 80%, 100% { transform: scale(0); }
        40% { transform: scale(1.0); }
    }

    @keyframes msg-slide {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }

    @keyframes slide-up {
        from { opacity: 0; transform: translateY(30px) scale(0.98); }
        to { opacity: 1; transform: translateY(0) scale(1); }
    }

    @keyframes fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
    }
`;

// Injeta os estilos
const styleSheet = document.createElement("style");
styleSheet.innerText = managerStyles;
document.head.appendChild(styleSheet);
