/**
 * Agent FAB — Fase 8B
 * Botão flutuante universal do agente. Substitui visualmente o #agent-toggle (agent-ui.js legado)
 * sem modificar aquele arquivo.
 *
 * 5 estados visuais: offline / idle / executing / awaiting_approval / done
 * Badge laranja com contador de HITL pendentes.
 * Click: abre mini-popover com estado FSM + acesso rápido.
 * Long-click (≥500ms): navega para #agent-workspace tab hitl.
 * Context capture: lê vortexStudio.getState() quando seção Vórtex está ativa.
 *
 * Dependências: window.agentAPI, window.agentWorkspace, window.app
 * IDs criados: #agent-fab, #agent-fab-badge, #agent-fab-popover
 * Namespace: window.agentFAB
 */

window.agentFAB = (() => {

    // ─── Estado Interno ────────────────────────────────────────────────
    const _state = {
        fsm:          'offline',   // offline | idle | executing | awaiting_approval | done | ...
        hitlCount:    0,
        lastEvent:    null,        // { type, message, ts }
        pollingId:    null,
        longPressId:  null,
        isLongPress:  false,
        popoverOpen:  false,
    };

    // ─── CSS (isolado neste arquivo) ────────────────────────────────────
    function _injectCSS() {
        if (document.getElementById('agent-fab-styles')) return;
        const s = document.createElement('style');
        s.id = 'agent-fab-styles';
        s.textContent = `
            /* ── FAB base ── */
            #agent-fab {
                position: fixed;
                bottom: 24px;
                right: 24px;
                width: 52px;
                height: 52px;
                border-radius: 50%;
                background: #374151;
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                z-index: 10001;
                box-shadow: 0 4px 20px rgba(0,0,0,0.4);
                transition: background 0.3s, transform 0.15s, box-shadow 0.3s;
                font-size: 20px;
                user-select: none;
                border: 2px solid transparent;
            }
            #agent-fab:hover { transform: scale(1.08); box-shadow: 0 6px 24px rgba(0,0,0,0.5); }
            #agent-fab:active { transform: scale(0.96); }

            /* ── Estados ── */
            #agent-fab.fab-offline        { background: #374151; border-color: #4b5563; }
            #agent-fab.fab-idle           { background: #1d4ed8; border-color: #3b82f6; }
            #agent-fab.fab-executing      { background: #065f46; border-color: #10b981; animation: fab-pulse-green 1.8s ease-in-out infinite; }
            #agent-fab.fab-awaiting       { background: #92400e; border-color: #f59e0b; animation: fab-pulse-orange 1.2s ease-in-out infinite; }
            #agent-fab.fab-done           { background: #065f46; border-color: #34d399; }
            #agent-fab.fab-error          { background: #7f1d1d; border-color: #ef4444; }

            @keyframes fab-pulse-green {
                0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.5); }
                50%       { box-shadow: 0 0 0 10px rgba(16,185,129,0); }
            }
            @keyframes fab-pulse-orange {
                0%, 100% { box-shadow: 0 0 0 0 rgba(245,158,11,0.6); }
                50%       { box-shadow: 0 0 0 12px rgba(245,158,11,0); }
            }

            /* ── Badge HITL ── */
            #agent-fab-badge {
                position: absolute;
                top: -4px;
                right: -4px;
                min-width: 18px;
                height: 18px;
                background: #f59e0b;
                color: #000;
                font-size: 10px;
                font-weight: 900;
                border-radius: 9px;
                display: none;
                align-items: center;
                justify-content: center;
                padding: 0 4px;
                border: 2px solid var(--color-bg, #111827);
                animation: fab-badge-pop 0.2s ease-out;
            }
            #agent-fab-badge.visible { display: flex; }
            @keyframes fab-badge-pop {
                from { transform: scale(0); }
                to   { transform: scale(1); }
            }

            /* ── Popover ── */
            #agent-fab-popover {
                position: fixed;
                bottom: 84px;
                right: 24px;
                width: 280px;
                background: #1f2937;
                border: 1px solid #374151;
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.5);
                z-index: 10002;
                overflow: hidden;
                display: none;
                flex-direction: column;
                animation: fab-pop-in 0.15s ease-out;
            }
            #agent-fab-popover.open { display: flex; }
            @keyframes fab-pop-in {
                from { opacity: 0; transform: translateY(8px) scale(0.97); }
                to   { opacity: 1; transform: translateY(0) scale(1); }
            }

            .fab-pop-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 12px 14px;
                border-bottom: 1px solid #374151;
                font-size: 12px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                color: #9ca3af;
            }
            .fab-pop-header span { display: flex; align-items: center; gap: 6px; }

            .fab-state-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                display: inline-block;
            }
            .fab-state-dot.offline  { background: #6b7280; }
            .fab-state-dot.idle     { background: #3b82f6; }
            .fab-state-dot.active   { background: #10b981; animation: fab-dot-blink 1s infinite; }
            .fab-state-dot.waiting  { background: #f59e0b; animation: fab-dot-blink 0.7s infinite; }
            .fab-state-dot.error    { background: #ef4444; }
            @keyframes fab-dot-blink {
                0%, 100% { opacity: 1; } 50% { opacity: 0.3; }
            }

            .fab-pop-body {
                padding: 12px 14px;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }

            .fab-pop-row {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                font-size: 12px;
                color: #d1d5db;
            }
            .fab-pop-label { color: #6b7280; font-size: 11px; }
            .fab-pop-value { font-weight: 600; text-align: right; max-width: 160px; word-break: break-word; }
            .fab-pop-value.orange { color: #fbbf24; }
            .fab-pop-value.green  { color: #34d399; }
            .fab-pop-value.gray   { color: #6b7280; }

            .fab-pop-context {
                background: #111827;
                border-radius: 6px;
                padding: 8px 10px;
                font-size: 11px;
                color: #9ca3af;
                font-family: monospace;
                max-height: 60px;
                overflow: hidden;
                text-overflow: ellipsis;
                display: -webkit-box;
                -webkit-line-clamp: 3;
                -webkit-box-orient: vertical;
            }

            .fab-pop-footer {
                display: flex;
                gap: 8px;
                padding: 10px 14px;
                border-top: 1px solid #374151;
            }
            .fab-pop-btn {
                flex: 1;
                padding: 7px 10px;
                border-radius: 6px;
                font-size: 11px;
                font-weight: 700;
                cursor: pointer;
                border: none;
                transition: background 0.2s;
                text-align: center;
            }
            .fab-pop-btn-primary { background: #1d4ed8; color: white; }
            .fab-pop-btn-primary:hover { background: #2563eb; }
            .fab-pop-btn-secondary { background: #374151; color: #d1d5db; }
            .fab-pop-btn-secondary:hover { background: #4b5563; }
            .fab-pop-btn-warn { background: #92400e; color: #fbbf24; }
            .fab-pop-btn-warn:hover { background: #b45309; }

            /* ── Long-press ring ── */
            #agent-fab.long-pressing::after {
                content: '';
                position: absolute;
                inset: -4px;
                border-radius: 50%;
                border: 2px solid #f59e0b;
                animation: fab-ring 0.5s linear forwards;
            }
            @keyframes fab-ring {
                from { clip-path: inset(0 100% 0 0); }
                to   { clip-path: inset(0 0% 0 0); }
            }
        `;
        document.head.appendChild(s);
    }

    // ─── Ocultar toggle legado (agent-ui.js) ─────────────────────────────
    // agent-ui.js usa window.load (dispara APÓS DOMContentLoaded onde init() roda)
    // Usamos MutationObserver para garantir que o toggle seja ocultado quando criado.
    function _hideLegacyToggle() {
        const existing = document.getElementById('agent-toggle');
        if (existing) { existing.style.display = 'none'; return; }
        // Observar inserções no body até encontrar #agent-toggle
        const obs = new MutationObserver(() => {
            const el = document.getElementById('agent-toggle');
            if (el) { el.style.display = 'none'; obs.disconnect(); }
        });
        obs.observe(document.body, { childList: true, subtree: true });
    }

    // ─── Renderizar FAB + Badge + Popover ────────────────────────────────
    function _render() {
        // Ocultar toggle legado via MutationObserver (timing-safe)
        _hideLegacyToggle();

        // FAB
        if (!document.getElementById('agent-fab')) {
            const fab = document.createElement('div');
            fab.id = 'agent-fab';
            fab.setAttribute('title', 'Agente — click: status | long-click: Mission Control');
            fab.innerHTML = `<span id="agent-fab-icon">🤖</span><span id="agent-fab-badge"></span>`;
            document.body.appendChild(fab);

            // Eventos de click / long-press
            fab.addEventListener('mousedown', _onPointerDown);
            fab.addEventListener('touchstart', _onPointerDown, { passive: true });
            fab.addEventListener('mouseup',   _onPointerUp);
            fab.addEventListener('touchend',  _onPointerUp);
            fab.addEventListener('mouseleave', _cancelLongPress);
        }

        // Popover
        if (!document.getElementById('agent-fab-popover')) {
            const pop = document.createElement('div');
            pop.id = 'agent-fab-popover';
            document.body.appendChild(pop);
        }

        // Fechar popover ao clicar fora
        document.addEventListener('click', (e) => {
            const fab = document.getElementById('agent-fab');
            const pop = document.getElementById('agent-fab-popover');
            if (fab && pop && !fab.contains(e.target) && !pop.contains(e.target)) {
                _closePopover();
            }
        });
    }

    // ─── Long-press logic ────────────────────────────────────────────────
    function _onPointerDown(e) {
        _state.isLongPress = false;
        const fab = document.getElementById('agent-fab');
        if (fab) fab.classList.add('long-pressing');

        _state.longPressId = setTimeout(() => {
            _state.isLongPress = true;
            _cancelLongPress();
            _goToMissionControl();
        }, 500);
    }

    function _onPointerUp(e) {
        _cancelLongPress();
        if (!_state.isLongPress) {
            _togglePopover();
        }
    }

    function _cancelLongPress() {
        if (_state.longPressId) {
            clearTimeout(_state.longPressId);
            _state.longPressId = null;
        }
        const fab = document.getElementById('agent-fab');
        if (fab) fab.classList.remove('long-pressing');
    }

    // ─── Navegar para Mission Control ────────────────────────────────────
    function _goToMissionControl(tab = 'hitl') {
        _closePopover();
        // Garante que o workspace está habilitado
        if (window.agentWorkspace && !window.agentWorkspace.isEnabled()) {
            window.agentWorkspace.enable();
        }
        if (window.app) window.app.showSection('agent-workspace');
        if (window.agentWorkspace) {
            setTimeout(() => window.agentWorkspace.switchTab(tab), 150);
        }
    }

    // ─── Popover ─────────────────────────────────────────────────────────
    function _togglePopover() {
        if (_state.popoverOpen) {
            _closePopover();
        } else {
            _openPopover();
        }
    }

    function _openPopover() {
        _state.popoverOpen = true;
        const pop = document.getElementById('agent-fab-popover');
        if (!pop) return;
        pop.innerHTML = _buildPopoverHTML();
        pop.classList.add('open');
    }

    function _closePopover() {
        _state.popoverOpen = false;
        const pop = document.getElementById('agent-fab-popover');
        if (pop) pop.classList.remove('open');
    }

    function _buildPopoverHTML() {
        const stateLabel = _stateLabel(_state.fsm);
        const dotClass   = _stateDotClass(_state.fsm);
        const hitlCount  = _state.hitlCount;
        const lastEvent  = _state.lastEvent;

        // Context capture: seção ativa
        let contextHTML = '';
        const activeSection = document.querySelector('.content-section.active');
        if (activeSection && activeSection.id === 'vortex-studio' && window.vortexStudio) {
            try {
                const vs = window.vortexStudio.getState();
                const ctx = vs && (vs.activeFile || vs.template || vs.currentDNA?.tema || null);
                if (ctx) {
                    contextHTML = `
                        <div>
                            <div class="fab-pop-label" style="margin-bottom:4px;">📝 Contexto Vórtex</div>
                            <div class="fab-pop-context">${ctx}</div>
                        </div>
                    `;
                }
            } catch (e) { /* sem contexto */ }
        }

        const lastEventHTML = lastEvent ? `
            <div class="fab-pop-row">
                <span class="fab-pop-label">Último evento</span>
                <span class="fab-pop-value" style="font-size:10px; color:#9ca3af;">${lastEvent.message?.substring(0, 48) || '—'}</span>
            </div>
        ` : '';

        const hitlBtnHTML = hitlCount > 0
            ? `<button class="fab-pop-btn fab-pop-btn-warn" onclick="window.agentFAB._goToMissionControl('hitl')">⚠️ ${hitlCount} HITL pendente${hitlCount > 1 ? 's' : ''}</button>`
            : `<button class="fab-pop-btn fab-pop-btn-secondary" onclick="window.agentFAB._goToMissionControl('status')">📊 Status</button>`;

        return `
            <div class="fab-pop-header">
                <span><span class="fab-state-dot ${dotClass}"></span>Agente Operacional</span>
                <span style="cursor:pointer; font-size:14px; color:#4b5563;" onclick="window.agentFAB._closePopover()">✕</span>
            </div>
            <div class="fab-pop-body">
                <div class="fab-pop-row">
                    <span class="fab-pop-label">Estado FSM</span>
                    <span class="fab-pop-value ${hitlCount > 0 ? 'orange' : ((_state.fsm === 'offline') ? 'gray' : 'green')}">${stateLabel}</span>
                </div>
                ${hitlCount > 0 ? `
                <div class="fab-pop-row">
                    <span class="fab-pop-label">Aprovações pendentes</span>
                    <span class="fab-pop-value orange">${hitlCount}</span>
                </div>` : ''}
                ${lastEventHTML}
                ${contextHTML}
            </div>
            <div class="fab-pop-footer">
                ${hitlBtnHTML}
                <button class="fab-pop-btn fab-pop-btn-primary" onclick="window.agentFAB._goToMissionControl('command')">🤖 Mission Control</button>
            </div>
        `;
    }

    // ─── Mapeamento de estado → UI ────────────────────────────────────────
    function _stateLabel(fsm) {
        const map = {
            offline:            'Offline',
            idle:               'Idle',
            dialogue:           'Diálogo',
            diagnosis:          'Diagnóstico',
            planning:           'Planejando',
            executing:          'Executando',
            testing:            'Testando',
            reporting:          'Relatando',
            awaiting_approval:  'Aguard. Aprovação',
            done:               'Concluído',
            error:              'Erro',
        };
        return map[fsm] || fsm;
    }

    function _stateDotClass(fsm) {
        if (fsm === 'offline')           return 'offline';
        if (fsm === 'idle')              return 'idle';
        if (fsm === 'awaiting_approval') return 'waiting';
        if (fsm === 'error')             return 'error';
        return 'active'; // executing, planning, testing, etc.
    }

    function _fabClass(fsm) {
        if (fsm === 'offline')           return 'fab-offline';
        if (fsm === 'idle')              return 'fab-idle';
        if (fsm === 'awaiting_approval') return 'fab-awaiting';
        if (fsm === 'error')             return 'fab-error';
        if (fsm === 'done')              return 'fab-done';
        // executing, planning, testing, reporting, dialogue, diagnosis
        return 'fab-executing';
    }

    function _fabIcon(fsm) {
        const map = {
            offline:            '🤖',
            idle:               '🤖',
            dialogue:           '💬',
            diagnosis:          '🔍',
            planning:           '📋',
            executing:          '⚡',
            testing:            '🧪',
            reporting:          '📝',
            awaiting_approval:  '⚠️',
            done:               '✓',
            error:              '✗',
        };
        return map[fsm] || '🤖';
    }

    // ─── Atualizar visual do FAB ──────────────────────────────────────────
    function _updateFAB() {
        const fab   = document.getElementById('agent-fab');
        const icon  = document.getElementById('agent-fab-icon');
        const badge = document.getElementById('agent-fab-badge');
        if (!fab) return;

        // Estado → classe
        fab.className = _fabClass(_state.fsm); // reset + apply

        // Ícone
        if (icon) icon.textContent = _fabIcon(_state.fsm);

        // Badge HITL
        if (badge) {
            if (_state.hitlCount > 0) {
                badge.textContent = _state.hitlCount > 9 ? '9+' : String(_state.hitlCount);
                badge.classList.add('visible');
            } else {
                badge.classList.remove('visible');
            }
        }

        // Atualizar popover se aberto
        if (_state.popoverOpen) {
            const pop = document.getElementById('agent-fab-popover');
            if (pop) pop.innerHTML = _buildPopoverHTML();
        }
    }

    // ─── Polling ──────────────────────────────────────────────────────────
    async function _poll() {
        if (!window.agentAPI) return;
        try {
            const data = await window.agentAPI.getStatus();
            if (!data) {
                if (_state.fsm !== 'offline') { _state.fsm = 'offline'; _updateFAB(); }
                return;
            }

            const newFSM = (data.state || data.fsm || 'idle').toLowerCase();

            // Contagem HITL
            let hitlCount = 0;
            if (data.hitl && Array.isArray(data.hitl)) {
                hitlCount = data.hitl.filter(h => h.status === 'pending').length;
            } else if (typeof data.pendingApprovals === 'number') {
                hitlCount = data.pendingApprovals;
            }

            // Último evento
            if (data.lastEvent) {
                _state.lastEvent = data.lastEvent;
            }

            const changed = (newFSM !== _state.fsm) || (hitlCount !== _state.hitlCount);
            _state.fsm       = newFSM;
            _state.hitlCount = hitlCount;

            if (changed) _updateFAB();

        } catch (e) {
            if (_state.fsm !== 'offline') { _state.fsm = 'offline'; _updateFAB(); }
        }
    }

    function _startPolling() {
        _poll(); // imediato
        _state.pollingId = setInterval(_poll, 10000); // 10s (FAB é passivo)
    }

    function _stopPolling() {
        if (_state.pollingId) {
            clearInterval(_state.pollingId);
            _state.pollingId = null;
        }
    }

    // ─── API Pública ──────────────────────────────────────────────────────
    return {
        init() {
            _injectCSS();
            _render();
            _updateFAB();
            _startPolling();
            console.log('🎯 [AgentFAB] Inicializado.');
        },

        destroy() {
            _stopPolling();
            _closePopover();
            ['agent-fab', 'agent-fab-popover', 'agent-fab-styles'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.remove();
            });
            // Restaurar toggle legado
            const legacy = document.getElementById('agent-toggle');
            if (legacy) legacy.style.display = '';
        },

        // Expostos para onclick inline no popover
        _goToMissionControl,
        _closePopover,

        getState: () => ({ ..._state }),
    };
})();
