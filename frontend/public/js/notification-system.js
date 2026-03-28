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

    push(title, message, type = 'success') {
        const id = Date.now();
        const notification = {
            id,
            title,
            message,
            type, // success, warning, error, audit
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            read: false
        };

        this.notifications.unshift(notification);
        this.save();
        this.render();
        this.updateBadge();
        
        // Se estiver fechado, faça um pulso extra (Shake ou algo sutil)
        if (!this.isOpen) {
            const trigger = document.getElementById('nnc-trigger');
            if (trigger) {
                trigger.classList.add('nnc-shake');
                setTimeout(() => trigger.classList.remove('nnc-shake'), 1000);
            }
        }

        console.log(`🔔 NNC: Nova Notificação - ${title}`);
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
            <div class="nnc-card ${n.type} ${n.read ? '' : 'unread'}" id="nnc-node-${n.id}">
                <span class="nnc-card-close" onclick="window.notificationSystem.remove(${n.id})">&times;</span>
                <div class="nnc-card-title">${n.title}</div>
                <div class="nnc-card-body">${n.message}</div>
                <div class="nnc-card-time">${n.time}</div>
            </div>
        `).join('');
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
