/**
 * agent-workspace.js
 * Agent Workspace — Mission Control Shell
 * NeuroEngine OS · Fase 8A
 *
 * Responsabilidades: Mission Control, FSM, HITL, Artifacts, Live Log, Memory, Command Chat.
 * NÃO chama LLM diretamente — toda cognição vai via agentAPI → agentd.
 * NÃO duplica polling com agent-ui.js — poll centralizado aqui quando Workspace está ativo.
 *
 * IDs prefixados com #aw- para evitar colisão com agent-ui.js (legado, ainda ativo).
 * Flag: localStorage 'neuroengine_flags' → agentWorkspace (bool)
 */

window.agentWorkspace = {
    _pollingInterval: null,
    _eventSource: null,
    _chatHistory: [],
    _activeTab: 'status',

    // ─── FEATURE FLAG ─────────────────���──────────────────────────────────────

    isEnabled() {
        try {
            const flags = JSON.parse(localStorage.getItem('neuroengine_flags') || '{}');
            return flags.agentWorkspace === true;
        } catch { return false; }
    },

    enable() {
        const flags = JSON.parse(localStorage.getItem('neuroengine_flags') || '{}');
        flags.agentWorkspace = true;
        localStorage.setItem('neuroengine_flags', JSON.stringify(flags));
        // Mostra item de menu
        document.querySelectorAll('.aw-nav-gate').forEach(el => el.classList.remove('aw-nav-item-hidden'));
        console.log('✅ [AgentWorkspace] AGENT_WORKSPACE_UI ativado.');
    },

    disable() {
        const flags = JSON.parse(localStorage.getItem('neuroengine_flags') || '{}');
        flags.agentWorkspace = false;
        localStorage.setItem('neuroengine_flags', JSON.stringify(flags));
        document.querySelectorAll('.aw-nav-gate').forEach(el => el.classList.add('aw-nav-item-hidden'));
        console.log('⛔ [AgentWorkspace] AGENT_WORKSPACE_UI desativado.');
    },

    // ─── INICIALIZAÇÃO ────────────────────────────────────────────────────────

    init() {
        console.log('🤖 [AgentWorkspace] Inicializando Mission Control...');
        this._applyFeatureFlag();
        this._renderSection();
        console.log('🤖 [AgentWorkspace] Pronto.');
    },

    _applyFeatureFlag() {
        const enabled = this.isEnabled();
        document.querySelectorAll('.aw-nav-gate').forEach(el => {
            enabled ? el.classList.remove('aw-nav-item-hidden') : el.classList.add('aw-nav-item-hidden');
        });
    },

    // Chamado por app.showSection('agent-workspace')
    onActivate() {
        this._startPolling();
        this._startLiveLog();
        this.switchTab(this._activeTab);
    },

    // Chamado quando o usuário sai da seção
    onDeactivate() {
        this._stopPolling();
        this._stopLiveLog();
    },

    // ─── RENDER ─────────────────────────────────���─────────────────────────────

    _renderSection() {
        const section = document.getElementById('agent-workspace');
        if (!section) return;

        section.innerHTML = `
            <!-- TOPBAR -->
            <div class="aw-topbar">
                <div class="aw-topbar-brand">
                    <div id="aw-brand-dot" class="aw-brand-dot offline"></div>
                    NEUROENGINE AGENT
                </div>
                <div class="aw-topbar-fsm">
                    <span class="aw-fsm-label">FSM:</span>
                    <span id="aw-topbar-state" class="aw-fsm-state">—</span>
                </div>
                <div id="aw-topbar-hitl" class="aw-topbar-hitl-badge" onclick="agentWorkspace.switchTab('hitl')">
                    ⚠ <span id="aw-hitl-count">0</span> HITL pendente(s)
                </div>
                <div class="aw-topbar-session" id="aw-topbar-session">—</div>
            </div>

            <!-- BODY: Activity Bar | Central | Context Panel -->
            <div class="aw-body">

                <!-- ACTIVITY BAR -->
                <div class="aw-activity-bar">
                    <div class="aw-activity-btn active" data-tab="status"   data-tooltip="Mission Control"
                         onclick="agentWorkspace.switchTab('status')">🎯</div>
                    <div class="aw-activity-btn" data-tab="hitl"      data-tooltip="HITL / Aprovações"
                         onclick="agentWorkspace.switchTab('hitl')">
                        ⚠️
                        <span id="aw-ab-hitl-badge" class="aw-activity-badge"></span>
                    </div>
                    <div class="aw-activity-btn" data-tab="artifacts" data-tooltip="Artifacts"
                         onclick="agentWorkspace.switchTab('artifacts')">📄</div>
                    <div class="aw-activity-btn" data-tab="logs"      data-tooltip="Live Log"
                         onclick="agentWorkspace.switchTab('logs')">📡</div>
                    <div class="aw-activity-btn" data-tab="memory"    data-tooltip="Memória Semântica"
                         onclick="agentWorkspace.switchTab('memory')">🧠</div>
                    <div class="aw-activity-btn" data-tab="command"   data-tooltip="Command Chat"
                         onclick="agentWorkspace.switchTab('command')">💬</div>
                </div>

                <!-- CENTRAL -->
                <div class="aw-central">
                    <div class="aw-tab-panels">

                        <!-- ABA: MISSION CONTROL (STATUS) -->
                        <div id="aw-panel-status" class="aw-panel active">
                            <div class="aw-stats-row">
                                <div class="aw-stat">
                                    <span class="aw-stat-label">Estado</span>
                                    <span class="aw-stat-value" id="aw-stat-state">—</span>
                                </div>
                                <div class="aw-stat">
                                    <span class="aw-stat-label">Uptime</span>
                                    <span class="aw-stat-value" id="aw-stat-uptime">—</span>
                                </div>
                                <div class="aw-stat">
                                    <span class="aw-stat-label">Eventos</span>
                                    <span class="aw-stat-value" id="aw-stat-events">—</span>
                                </div>
                                <div class="aw-stat">
                                    <span class="aw-stat-label">Sessão</span>
                                    <span class="aw-stat-value" id="aw-stat-session" style="font-size:11px;">—</span>
                                </div>
                            </div>

                            <div class="aw-card">
                                <div class="aw-card-title">Estado da FSM</div>
                                <div id="aw-fsm-display">
                                    <span class="aw-fsm-pill aw-state-offline">OFFLINE</span>
                                </div>
                                <div style="margin-top: 12px; font-size: 12px; color: var(--color-text-dim);" id="aw-fsm-detail">
                                    Aguardando conexão com agentd...
                                </div>
                            </div>

                            <div class="aw-card">
                                <div class="aw-card-title">Controles</div>
                                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                                    <button class="aw-btn aw-btn-primary" onclick="agentWorkspace.bootAgent()">🔥 Boot Agente</button>
                                    <button class="aw-btn aw-btn-ghost"   onclick="agentWorkspace.indexRepo()">🧠 Indexar Repo</button>
                                    <button class="aw-btn aw-btn-ghost"   onclick="agentWorkspace.refreshAll()">🔄 Atualizar</button>
                                    <button class="aw-btn aw-btn-danger aw-btn-sm" onclick="agentWorkspace.stopAgent()">⏹ Stop</button>
                                </div>
                            </div>

                            <div class="aw-card" id="aw-tool-registry-card">
                                <div class="aw-card-title">Tool Registry (Visíveis)</div>
                                <div id="aw-tool-list" style="font-size: 11px; color: var(--color-text-dim);">
                                    <div class="aw-empty"><span class="aw-empty-icon">🔧</span>Aguardando daemon...</div>
                                </div>
                            </div>
                        </div>

                        <!-- ABA: HITL -->
                        <div id="aw-panel-hitl" class="aw-panel">
                            <div class="aw-card-title" style="font-size:14px; font-weight:900; color: var(--color-warning); margin-bottom: 4px;">
                                ⚠ Aprovações Pendentes (Human-in-the-Loop)
                            </div>
                            <div style="font-size: 12px; color: var(--color-text-dim); margin-bottom: 20px;">
                                Estas ações requerem sua aprovação antes de serem executadas pelo agente.
                            </div>
                            <div id="aw-hitl-list">
                                <div class="aw-empty">
                                    <span class="aw-empty-icon">✅</span>
                                    Nenhuma aprovação pendente.
                                </div>
                            </div>
                        </div>

                        <!-- ABA: ARTIFACTS -->
                        <div id="aw-panel-artifacts" class="aw-panel">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                <div class="aw-card-title" style="font-size:14px; margin: 0;">📄 Artifacts</div>
                                <button class="aw-btn aw-btn-ghost aw-btn-sm" onclick="agentWorkspace.loadArtifacts()">🔄 Atualizar</button>
                            </div>
                            <div id="aw-artifacts-list">
                                <div class="aw-empty"><span class="aw-empty-icon">📂</span>Carregando artifacts...</div>
                            </div>
                            <div id="aw-artifact-viewer" class="aw-artifact-viewer">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                                    <span style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.8px; color: var(--color-text-dim);" id="aw-artifact-name">—</span>
                                    <button class="aw-btn aw-btn-ghost aw-btn-sm" onclick="agentWorkspace.closeArtifactViewer()">Fechar</button>
                                </div>
                                <div id="aw-artifact-content" class="markdown-body" style="color: var(--color-text-light); font-size: 13px; line-height: 1.7;"></div>
                            </div>
                        </div>

                        <!-- ABA: LIVE LOG -->
                        <div id="aw-panel-logs" class="aw-panel" style="padding: 16px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                                <div class="aw-card-title" style="font-size:14px; margin: 0;">📡 Live Log — Eventos do agentd</div>
                                <button class="aw-btn aw-btn-ghost aw-btn-sm" onclick="agentWorkspace.clearLog()">🗑 Limpar</button>
                            </div>
                            <div id="aw-log-container" class="aw-log-container">
                                <div class="aw-log-line aw-log-info">[aguardando conexão SSE...]</div>
                            </div>
                        </div>

                        <!-- ABA: MEMÓRIA -->
                        <div id="aw-panel-memory" class="aw-panel">
                            <div class="aw-card-title" style="font-size:14px;">🧠 Memória Semântica</div>
                            <div class="aw-search-row">
                                <input type="text" id="aw-memory-input" class="aw-search-input"
                                       placeholder="Buscar fatos, decisões, padrões..."
                                       onkeydown="if(event.key==='Enter') agentWorkspace.searchMemory()">
                                <button class="aw-btn aw-btn-primary" onclick="agentWorkspace.searchMemory()">🔍 Buscar</button>
                            </div>
                            <div id="aw-memory-results">
                                <div class="aw-empty"><span class="aw-empty-icon">🧠</span>Digite uma query para buscar na memória.</div>
                            </div>

                            <div class="aw-card" style="margin-top: 16px;">
                                <div class="aw-card-title">Manutenção</div>
                                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                                    <button class="aw-btn aw-btn-ghost" onclick="agentWorkspace.indexRepo()">
                                        📥 Reindexar Repositório
                                    </button>
                                </div>
                                <div id="aw-index-status" style="margin-top: 10px; font-size: 11px; color: var(--color-text-dim);"></div>
                            </div>
                        </div>

                        <!-- ABA: COMMAND CHAT -->
                        <div id="aw-panel-command" class="aw-panel" style="padding: 0; flex-direction: column; height: 100%;">
                            <div style="padding: 16px 20px; border-bottom: 1px solid var(--glass-border); flex-shrink: 0;">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <span style="font-size: 20px;">👑</span>
                                    <div>
                                        <div style="font-size: 14px; font-weight: 900; color: var(--color-text);">NeuroEngineAI</div>
                                        <div style="font-size: 10px; color: var(--color-accent); font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Orquestrador Estratégico</div>
                                    </div>
                                </div>
                            </div>
                            <div id="aw-chat-messages" class="aw-chat-messages">
                                <div class="aw-chat-msg ai">
                                    Olá, Dr. Victor. Estou conectado ao ecossistema NeuroEngine.
                                    Como posso ajudar com estratégia, diagnóstico ou coordenação agora?
                                    <div style="margin-top: 12px; display: flex; flex-wrap: wrap; gap: 6px;">
                                        <button class="aw-btn aw-btn-ghost aw-btn-sm"
                                            onclick="agentWorkspace.quickCommand('Analise a saúde geral do meu SEO e Silos.')">
                                            🔍 Saúde SEO
                                        </button>
                                        <button class="aw-btn aw-btn-ghost aw-btn-sm"
                                            onclick="agentWorkspace.quickCommand('Quais são as melhores oportunidades de conteúdo para esta semana?')">
                                            📅 Oportunidades
                                        </button>
                                        <button class="aw-btn aw-btn-ghost aw-btn-sm"
                                            onclick="agentWorkspace.quickCommand('Revise os rascunhos pendentes sob a ótica da Conversão Abidos.')">
                                            ⚖️ Rascunhos
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div class="aw-chat-input-area">
                                <input type="text" id="aw-chat-input" class="aw-chat-input"
                                       placeholder="Comando estratégico para o NeuroEngineAI..."
                                       onkeydown="if(event.key==='Enter') agentWorkspace.sendCommand()">
                                <button class="aw-btn aw-btn-primary" onclick="agentWorkspace.sendCommand()">✦</button>
                            </div>
                        </div>

                    </div><!-- /aw-tab-panels -->
                </div><!-- /aw-central -->

                <!-- CONTEXT PANEL (direita) -->
                <div class="aw-context-panel">
                    <div class="aw-context-panel-header">Contexto</div>

                    <div class="aw-context-section">
                        <h4>Restrições Ativas</h4>
                        <div id="aw-ctx-restrictions" style="font-size: 11px; color: var(--color-text-dim); line-height: 1.6;">
                            Carregando estado...
                        </div>
                    </div>

                    <div class="aw-context-section">
                        <h4>Fila Ativa</h4>
                        <div id="aw-ctx-queue" style="font-size: 11px; color: var(--color-text-dim); line-height: 1.6;">—</div>
                    </div>

                    <div class="aw-context-section">
                        <h4>Próximo Passo</h4>
                        <div id="aw-ctx-next" style="font-size: 11px; color: var(--color-accent); line-height: 1.6; font-weight: 600;">—</div>
                    </div>

                    <div class="aw-context-section" style="margin-top: auto; border-top: 1px solid var(--glass-border);">
                        <h4>Seção Atual</h4>
                        <div id="aw-ctx-section" style="font-size: 11px; color: var(--color-text-dim);">—</div>
                    </div>
                </div><!-- /aw-context-panel -->

            </div><!-- /aw-body -->
        `;
    },

    // ─── NAVEGAÇÃO DE ABAS ─────────────────────────────────��──────────────────

    switchTab(tabId) {
        this._activeTab = tabId;

        // Activity bar
        document.querySelectorAll('.aw-activity-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });

        // Panels
        document.querySelectorAll('.aw-panel').forEach(p => p.classList.remove('active'));
        const target = document.getElementById(`aw-panel-${tabId}`);
        if (target) target.classList.add('active');

        // Lazy loads
        if (tabId === 'artifacts') this.loadArtifacts();
        if (tabId === 'hitl')      this.refreshHITL();
    },

    // ─── POLLING DE STATUS ───────────────────────────���────────────────────────

    _startPolling() {
        if (this._pollingInterval) return; // já rodando
        this._poll();
        this._pollingInterval = setInterval(() => this._poll(), 4000);
    },

    _stopPolling() {
        if (this._pollingInterval) {
            clearInterval(this._pollingInterval);
            this._pollingInterval = null;
        }
    },

    async _poll() {
        const data = await window.agentAPI.getStatus();
        this._updateStatusUI(data);
        this._updateContextPanel(data);
    },

    _updateStatusUI(data) {
        const brandDot    = document.getElementById('aw-brand-dot');
        const topbarState = document.getElementById('aw-topbar-state');
        const statState   = document.getElementById('aw-stat-state');
        const statUptime  = document.getElementById('aw-stat-uptime');
        const statEvents  = document.getElementById('aw-stat-events');
        const statSession = document.getElementById('aw-stat-session');
        const fsmDisplay  = document.getElementById('aw-fsm-display');
        const fsmDetail   = document.getElementById('aw-fsm-detail');

        if (!brandDot) return;

        if (!data || data.connected === false) {
            brandDot.className    = 'aw-brand-dot offline';
            topbarState.textContent = 'OFFLINE';
            statState.textContent   = '—';
            fsmDisplay.innerHTML    = '<span class="aw-fsm-pill aw-state-offline">OFFLINE</span>';
            fsmDetail.textContent   = 'Daemon (agentd) não detectado. Clique em Boot Agente.';
            this._updateHITLBadge(0);
            return;
        }

        const s = data.status;
        const rawState = (s?.state || 'IDLE').toUpperCase();
        const stateClass = this._stateToClass(rawState);

        brandDot.className    = 'aw-brand-dot ' + this._stateToDotClass(rawState);
        topbarState.textContent = rawState;
        statState.textContent   = rawState;
        statUptime.textContent  = s?.uptime ? this._formatUptime(s.uptime) : '—';
        statEvents.textContent  = s?.history?.length ?? '—';
        statSession.textContent = s?.sessionId ? s.sessionId.slice(0, 8) + '…' : '—';
        fsmDisplay.innerHTML    = `<span class="aw-fsm-pill ${stateClass}">${rawState}</span>`;
        fsmDetail.textContent   = this._stateDescription(rawState);

        // Atualiza topbar session
        const topbarSession = document.getElementById('aw-topbar-session');
        if (topbarSession && s?.sessionId) {
            topbarSession.textContent = 'Sessão ' + s.sessionId.slice(0, 8) + '…';
        }

        // HITL: se awaiting_approval, sinaliza
        if (rawState === 'AWAITING_APPROVAL') {
            this.refreshHITL();
        }
    },

    _stateToClass(state) {
        const map = {
            'IDLE':               'aw-state-idle',
            'DIALOGUE':           'aw-state-dialogue',
            'DIAGNOSIS':          'aw-state-diagnosis',
            'PLANNING':           'aw-state-planning',
            'EXECUTING':          'aw-state-executing',
            'TESTING':            'aw-state-testing',
            'REPORTING':          'aw-state-reporting',
            'AWAITING_APPROVAL':  'aw-state-awaiting',
        };
        return map[state] || 'aw-state-offline';
    },

    _stateToDotClass(state) {
        if (state === 'IDLE')              return 'idle';
        if (state === 'AWAITING_APPROVAL') return 'awaiting';
        if (['EXECUTING','TESTING'].includes(state)) return 'executing';
        if (state === 'OFFLINE')           return 'offline';
        return 'idle';
    },

    _stateDescription(state) {
        const desc = {
            'IDLE':               'Agente em repouso. Pronto para receber comandos.',
            'DIALOGUE':           'Em diálogo — analisando contexto com o operador.',
            'DIAGNOSIS':          'Diagnosticando — investigando causa raiz.',
            'PLANNING':           'Planejando — aguardando aprovação do plano.',
            'EXECUTING':          'Executando — processando microetapas ativas.',
            'TESTING':            'Testando — validando resultados da execução.',
            'REPORTING':          'Reportando — consolidando resultados do ciclo.',
            'AWAITING_APPROVAL':  '⚠ Aguardando aprovação HITL — ação irreversível pausada.',
        };
        return desc[state] || 'Estado desconhecido.';
    },

    _formatUptime(ms) {
        if (ms < 60000)    return Math.floor(ms / 1000) + 's';
        if (ms < 3600000)  return Math.floor(ms / 60000) + 'm';
        return Math.floor(ms / 3600000) + 'h';
    },

    _updateContextPanel(data) {
        const s = data?.status;
        const state = s?.agentState || s?.state;
        if (!state) return;

        // Restricoes, fila, próximo passo vêm do estado_atual.md via agentd
        const restrictions = document.getElementById('aw-ctx-restrictions');
        const queue        = document.getElementById('aw-ctx-queue');
        const nextStep     = document.getElementById('aw-ctx-next');

        if (s?.estadoAtual) {
            if (restrictions) restrictions.textContent = s.estadoAtual.restricoes?.join('\n') || '—';
            if (queue)        queue.textContent        = s.estadoAtual.fila || '—';
            if (nextStep)     nextStep.textContent     = s.estadoAtual.proximoPasso || '—';
        }

        // Seção ativa no app
        const ctxSection = document.getElementById('aw-ctx-section');
        if (ctxSection) {
            const activeSection = document.querySelector('.content-section.active')?.id || '—';
            ctxSection.textContent = activeSection;
        }
    },

    // ─── HITL ──────────────────────────────────────────────��───────────────────

    _updateHITLBadge(count) {
        const topbarHITL   = document.getElementById('aw-topbar-hitl');
        const topbarCount  = document.getElementById('aw-hitl-count');
        const abBadge      = document.getElementById('aw-ab-hitl-badge');

        if (topbarHITL)  topbarHITL.classList.toggle('visible', count > 0);
        if (topbarCount) topbarCount.textContent = count;
        if (abBadge) {
            abBadge.textContent = count > 0 ? count : '';
            abBadge.classList.toggle('visible', count > 0);
        }
    },

    async refreshHITL() {
        try {
            const pending = await window.agentAPI.call('hitl.list');
            const list    = document.getElementById('aw-hitl-list');
            if (!list) return;

            this._updateHITLBadge(pending.length);

            if (!pending || pending.length === 0) {
                list.innerHTML = `
                    <div class="aw-empty">
                        <span class="aw-empty-icon">✅</span>
                        Nenhuma aprovação pendente.
                    </div>`;
                return;
            }

            list.innerHTML = pending.map(item => `
                <div class="aw-hitl-card">
                    <div class="aw-hitl-card-title">⚠ Aprovação Necessária</div>
                    <code class="aw-hitl-tool-call">${item.toolCall?.toolId || '?'}(${JSON.stringify(item.toolCall?.args || {}).slice(0, 80)}…)</code>
                    <div class="aw-hitl-reason">Motivo: ${item.decision?.reason || '—'}</div>
                    <div class="aw-hitl-actions">
                        <button class="aw-btn aw-btn-success aw-btn-full"
                            onclick="agentWorkspace.resolveHITL('${item.id}', true)">
                            ✅ Aprovar
                        </button>
                        <button class="aw-btn aw-btn-danger"
                            onclick="agentWorkspace.resolveHITL('${item.id}', false)">
                            ✗ Negar
                        </button>
                    </div>
                </div>
            `).join('');
        } catch (e) {
            console.error('[AgentWorkspace] Erro ao carregar HITL:', e);
        }
    },

    async resolveHITL(id, approved) {
        try {
            await window.agentAPI.call('hitl.resolve', { id, approved });
            this.refreshHITL();
            this._appendLog({ type: approved ? 'info' : 'info', message: `HITL ${id} ${approved ? 'aprovado' : 'negado'}` });
        } catch (e) {
            console.error('[AgentWorkspace] Erro ao resolver HITL:', e);
        }
    },

    // ─── ARTIFACTS ────────────────────────────────────────────────────────────

    async loadArtifacts() {
        const list = document.getElementById('aw-artifacts-list');
        if (!list) return;
        try {
            const res  = await fetch('/api/agent/artifacts');
            const data = await res.json();
            const files = data.artifacts || [];

            if (files.length === 0) {
                list.innerHTML = `<div class="aw-empty"><span class="aw-empty-icon">📂</span>Nenhum artifact encontrado.</div>`;
                return;
            }

            list.innerHTML = files.map(f => `
                <div class="aw-artifact-item" onclick="agentWorkspace.viewArtifact('${f.name}')">
                    <span>📄</span>
                    <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${f.name}</span>
                    <span style="color: var(--color-text-dim); font-size: 10px;">${f.size ? (f.size / 1024).toFixed(1) + 'kb' : ''}</span>
                </div>
            `).join('');
        } catch (e) {
            list.innerHTML = `<div class="aw-empty"><span class="aw-empty-icon">❌</span>Erro ao carregar artifacts.</div>`;
        }
    },

    async viewArtifact(name) {
        const viewer  = document.getElementById('aw-artifact-viewer');
        const content = document.getElementById('aw-artifact-content');
        const nameEl  = document.getElementById('aw-artifact-name');
        if (!viewer) return;

        try {
            const res  = await fetch(`/api/agent/artifacts/${name}`);
            const data = await res.json();

            if (nameEl)  nameEl.textContent = name;
            if (content) content.innerHTML  = window.marked ? window.marked.parse(data.content) : `<pre>${data.content}</pre>`;
            viewer.classList.add('visible');
            viewer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (e) {
            console.error('[AgentWorkspace] Erro ao visualizar artifact:', e);
        }
    },

    closeArtifactViewer() {
        const viewer = document.getElementById('aw-artifact-viewer');
        if (viewer) viewer.classList.remove('visible');
    },

    // ─── LIVE LOG ─────────────────────────���───────────────────────────────���───

    _startLiveLog() {
        if (this._eventSource) return;
        const container = document.getElementById('aw-log-container');

        this._eventSource = new EventSource('/api/agent/events');

        this._eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this._appendLog(data);
            } catch (e) {
                this._appendLog({ type: 'raw', message: event.data });
            }
        };

        this._eventSource.onerror = () => {
            if (container) {
                this._appendLog({ type: 'error', message: 'SSE desconectado — tentando reconectar...' });
            }
        };
    },

    _stopLiveLog() {
        if (this._eventSource) {
            this._eventSource.close();
            this._eventSource = null;
        }
    },

    _appendLog(data) {
        const container = document.getElementById('aw-log-container');
        if (!container) return;

        const time = new Date().toLocaleTimeString('pt-BR', { hour12: false });
        const type = data.type || 'info';

        // Classificar tipo para cor
        let cssClass = 'aw-log-info';
        let prefix   = '';
        if (type === 'fsm'   || data.event === 'fsm_transition') { cssClass = 'aw-log-fsm';   prefix = '[FSM]  '; }
        if (type === 'tool'  || data.event === 'tool_call')      { cssClass = 'aw-log-tool';   prefix = '[TOOL] '; }
        if (type === 'hitl'  || data.event === 'hitl_checkpoint'){ cssClass = 'aw-log-hitl';   prefix = '[HITL] '; }
        if (type === 'error' || data.level === 'error')          { cssClass = 'aw-log-error';  prefix = '[ERR]  '; }

        const message = data.message || data.filename || JSON.stringify(data).slice(0, 120);

        const line = document.createElement('div');
        line.className = `aw-log-line`;
        line.innerHTML = `
            <span class="aw-log-time">[${time}]</span>
            <span class="${cssClass}">${prefix}${message}</span>
        `;

        container.appendChild(line);

        // Auto-scroll se próximo do fundo
        if (container.scrollTop + container.clientHeight >= container.scrollHeight - 40) {
            container.scrollTop = container.scrollHeight;
        }

        // Limitar a 500 linhas para não vazar memória
        while (container.children.length > 500) {
            container.removeChild(container.firstChild);
        }
    },

    clearLog() {
        const container = document.getElementById('aw-log-container');
        if (container) container.innerHTML = '';
    },

    // ─── MEMÓRIA ─────────────────────────────────��────────────────────────────

    async searchMemory() {
        const input   = document.getElementById('aw-memory-input');
        const results = document.getElementById('aw-memory-results');
        const query   = input?.value?.trim();
        if (!query || !results) return;

        results.innerHTML = `<div class="aw-empty"><span>⏳</span> Buscando...</div>`;

        try {
            const data = await window.agentAPI.call('memory.search', { query, k: 5 });
            const items = data?.factual || [];

            if (items.length === 0) {
                results.innerHTML = `<div class="aw-empty"><span class="aw-empty-icon">🔍</span>Nenhum resultado encontrado.</div>`;
                return;
            }

            results.innerHTML = items.map(r => `
                <div class="aw-memory-result">
                    <div class="aw-memory-score">${Math.round((r.score || 0) * 100)}% relevante</div>
                    <div class="aw-memory-content">${(r.content || '').slice(0, 200)}…</div>
                </div>
            `).join('');
        } catch (e) {
            results.innerHTML = `<div class="aw-empty"><span class="aw-empty-icon">❌</span>Erro na busca: ${e.message}</div>`;
        }
    },

    async indexRepo() {
        const statusEl = document.getElementById('aw-index-status');
        if (statusEl) statusEl.textContent = '⏳ Indexação iniciada em segundo plano...';
        try {
            await window.agentAPI.call('memory.index_repo');
            if (statusEl) statusEl.textContent = '✅ Indexação concluída.';
        } catch (e) {
            if (statusEl) statusEl.textContent = '❌ Erro na indexação: ' + e.message;
        }
    },

    // ─── CONTROLES DO DAEMON ───────────────────────���─────────────────────────

    async bootAgent() {
        this._appendLog({ type: 'info', message: 'Enviando comando de boot ao agentd...' });
        try {
            await window.agentAPI.call('agent.boot');
            this._appendLog({ type: 'info', message: 'Boot confirmado pelo daemon.' });
            setTimeout(() => this._poll(), 1000);
        } catch (e) {
            // Se o daemon não estiver rodando, agent.boot vai falhar — informar
            this._appendLog({ type: 'error', message: 'Falha no boot: ' + e.message + ' — inicie o daemon via CLI: agent boot' });
        }
    },

    async stopAgent() {
        if (!confirm('Parar o agentd? Tarefas em execução serão interrompidas.')) return;
        try {
            await window.agentAPI.call('agent.shutdown');
            this._appendLog({ type: 'info', message: 'Daemon encerrado.' });
            setTimeout(() => this._poll(), 1500);
        } catch (e) {
            this._appendLog({ type: 'error', message: 'Erro ao parar daemon: ' + e.message });
        }
    },

    async refreshAll() {
        await this._poll();
        if (this._activeTab === 'hitl')      this.refreshHITL();
        if (this._activeTab === 'artifacts') this.loadArtifacts();
    },

    // ─── COMMAND CHAT ───────────────���──────────────────────────────��──────────

    quickCommand(text) {
        const input = document.getElementById('aw-chat-input');
        if (input) {
            input.value = text;
            this.sendCommand();
        }
    },

    async sendCommand() {
        const input = document.getElementById('aw-chat-input');
        const messages = document.getElementById('aw-chat-messages');
        const text = input?.value?.trim();
        if (!text || !messages) return;

        input.value = '';

        // Renderiza msg do usuário
        const userEl = document.createElement('div');
        userEl.className = 'aw-chat-msg user';
        userEl.textContent = text;
        messages.appendChild(userEl);
        messages.scrollTop = messages.scrollHeight;

        // Loader
        const loaderId = 'aw-loader-' + Date.now();
        const loaderEl = document.createElement('div');
        loaderEl.id = loaderId;
        loaderEl.className = 'aw-chat-msg ai';
        loaderEl.innerHTML = '<span style="opacity:0.5; font-size:11px;">Pensando…</span>';
        messages.appendChild(loaderEl);
        messages.scrollTop = messages.scrollHeight;

        this._chatHistory.push({ role: 'user', content: text });

        try {
            const modelType = window.app ? window.app.getActiveModel('manager-agent') : 'gemini-2.5-pro';
            const res  = await fetch('/api/manager/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text, history: this._chatHistory, modelType })
            });
            const data = await res.json();

            loaderEl.remove();

            if (data.error) throw new Error(data.error);

            const aiEl = document.createElement('div');
            aiEl.className = 'aw-chat-msg ai';
            aiEl.innerHTML = this._formatMarkdown(data.reply);
            messages.appendChild(aiEl);
            messages.scrollTop = messages.scrollHeight;

            this._chatHistory.push({ role: 'ai', content: data.reply });
        } catch (err) {
            loaderEl.remove();
            const errEl = document.createElement('div');
            errEl.className = 'aw-chat-msg ai';
            errEl.innerHTML = `<span style="color: var(--color-error);">⚠ ${err.message}</span>`;
            messages.appendChild(errEl);
        }
    },

    _formatMarkdown(text) {
        // Markdown mínimo: bold, código, quebras
        return (text || '')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/`(.*?)`/g, '<code style="background:rgba(0,0,0,0.3);padding:2px 5px;border-radius:4px;font-size:11px;">$1</code>')
            .replace(/\n\n/g, '<br><br>')
            .replace(/\n/g, '<br>');
    },

};

// Auto-init após DOM pronto — app.js vai chamar agentWorkspace.init() via app.init()
// Este listener é um fallback para carregamento direto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.agentWorkspace && !window._awInitialized) {
            window._awInitialized = true;
        }
    });
}
