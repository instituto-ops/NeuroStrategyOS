/* 💎 NEURO-NOTIFICATION CENTER (NNC) - Motor de Log de Eventos v1.0 */
window.notificationSystem = {
    notifications: JSON.parse(localStorage.getItem('neuro_notifications') || '[]'),
    isOpen: false,

    init() {
        this.render();
        this.updateBadge();
        if (window.lucide) window.lucide.createIcons();
        // Escutar cliques fora para fechar o drawer
        document.addEventListener('click', (e) => {
            if (this.isOpen && !e.target.closest('#nnc-drawer') && !e.target.closest('#nnc-trigger')) {
                this.toggle();
            }
        });
    },

    push(title, message, type = 'success', options = {}) {
        const id = Date.now();
        const { isFixed = false, actionLabel = null, actionMethod = null, suggestions = [], onSuggestionClick = null } = options;

        // Se for fixa, remove outras fixas do mesmo tipo para não poluir
        if (isFixed) {
            this.notifications = this.notifications.filter(n => !n.isFixed);
        }

        const notification = {
            id,
            title,
            message,
            type, // success, warning, error, audit
            isFixed,
            actionLabel,
            actionMethod,
            suggestions, // Array de { label: '...', value: '...' } ou apenas strings
            onSuggestionClick, // Nome do método global para clique
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            read: false
        };

        this.notifications.unshift(notification);
        this.save();
        this.render();
        this.updateBadge();
        
        // Se estiver fechado, faça um pulso extra
        if (!this.isOpen) {
            const trigger = document.getElementById('nnc-trigger');
            if (trigger) {
                trigger.classList.add('nnc-shake');
                setTimeout(() => trigger.classList.remove('nnc-shake'), 1000);
            }
        }

        console.log(`🔔 NNC: Nova Notificação [${type}${isFixed ? ':FIXED' : ''}] - ${title}`);
    },

    toggle() {
        const drawer = document.getElementById('nnc-drawer');
        if (!drawer) return;

        this.isOpen = !this.isOpen;
        if (this.isOpen) {
            drawer.classList.add('active');
            this.markAsRead();
        } else {
            drawer.classList.remove('active');
        }
    },

    markAsRead() {
        this.notifications.forEach(n => n.read = true);
        this.save();
        this.updateBadge();
    },

    remove(id) {
        this.notifications = this.notifications.filter(n => n.id !== id);
        this.save();
        this.render();
        this.updateBadge();
    },

    removeByTitle(title) {
        this.notifications = this.notifications.filter(n => n.title !== title);
        this.save();
        this.render();
        this.updateBadge();
    },

    clearAll() {
        if (this.notifications.length === 0) return;
        if (!confirm("Limpar todo o histórico de notificações?")) return;
        this.notifications = [];
        this.save();
        this.render();
        this.updateBadge();
    },

    save() {
        localStorage.setItem('neuro_notifications', JSON.stringify(this.notifications.slice(0, 50))); // Limitar a 50 itens
    },

    updateBadge() {
        const unreadCount = this.notifications.filter(n => !n.read).length;
        const badge = document.getElementById('nnc-badge');
        if (badge) {
            if (unreadCount > 0) {
                badge.classList.add('active');
            } else {
                badge.classList.remove('active');
            }
        }
    },

    render() {
        const list = document.getElementById('nnc-list');
        if (!list) return;

        if (this.notifications.length === 0) {
            list.innerHTML = `
                <div class="nnc-empty">
                    <i data-lucide="bell-off"></i>
                    <p>Nenhuma notificação por aqui.</p>
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        list.innerHTML = this.notifications.map(n => `
            <div class="nnc-card ${n.type} ${n.read ? '' : 'unread'} ${n.isFixed ? 'fixed' : ''}" id="nnc-node-${n.id}">
                ${n.isFixed ? '<span style="position:absolute; top:12px; left:12px; color:var(--nnc-primary);"><i data-lucide="pin" style="width:10px; height:10px;"></i></span>' : ''}
                <div style="position:absolute; top:12px; right:12px; display:flex; gap:10px; align-items:center;">
                    ${n.onSuggestionClick ? `<i data-lucide="refresh-cw" title="Recalcular" onclick="window.seoEngine.runAbidosAudit();" style="width:12px; height:12px; cursor:pointer; color:var(--nnc-primary); opacity:0.6;"></i>` : ''}
                    <span class="nnc-card-close" onclick="window.notificationSystem.remove(${n.id})">&times;</span>
                </div>
                
                <div class="nnc-card-title" style="${n.isFixed ? 'padding-left:18px;' : ''}">${n.title}</div>
                <div class="nnc-card-body">${n.message}</div>

                ${n.suggestions && n.suggestions.length > 0 ? `
                    <div class="nnc-suggestions" style="margin-top:12px; display:flex; flex-direction:column; gap:8px;">
                        <span style="font-size:8px; font-weight:900; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:2px;">Sugestões de Elite:</span>
                        <div style="display:flex; flex-wrap:wrap; gap:6px;">
                            ${n.suggestions.map(s => `
                                <button class="nnc-chip" onclick="${n.onSuggestionClick}('${s.value || s}'); window.notificationSystem.remove(${n.id});">
                                    <i data-lucide="sparkles" style="width:10px; height:10px;"></i>
                                    ${s.label || s}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                ${n.actionLabel ? `
                    <button class="nnc-btn-action" style="margin-top:15px;" onclick="${n.actionMethod}; window.notificationSystem.toggle();">
                        ${n.actionLabel}
                    </button>
                ` : ''}
                <div class="nnc-card-time" style="margin-top: 15px;">
                    <span>${n.time}</span>
                    ${n.isFixed ? '<span style="color:var(--nnc-primary); font-weight:900; font-size:7px; letter-spacing:1px;">FIXADO</span>' : ''}
                </div>
            </div>
        `).join('');
        if (window.lucide) window.lucide.createIcons();
    }
};

// Auto-Init e Sobrescrita Global (Neural-Override)
document.addEventListener('DOMContentLoaded', () => {
    window.notificationSystem.init();
    
    // Captura global de alertas para evitar "notificações feias"
    const originalAlert = window.alert;
    window.alert = function(msg) {
        if (typeof msg !== 'string') msg = JSON.stringify(msg);
        
        let type = 'success';
        if (msg.toLowerCase().includes('erro') || msg.toLowerCase().includes('falha') || msg.toLowerCase().includes('❌')) {
            type = 'error';
        } else if (msg.toLowerCase().includes('atenção') || msg.toLowerCase().includes('aviso') || msg.toLowerCase().includes('⚠️')) {
            type = 'warning';
        }
        
        window.notificationSystem.push("Sistema", msg, type);
    };
});
