window.taskSystem = {
    tasks: [],
    currentSearch: "",

    init() {
        this.loadTasks();
    },

    loadTasks() {
        const stored = localStorage.getItem('neuro_tasks_v5');
        if (stored) {
            this.tasks = JSON.parse(stored);
        } else {
            this.tasks = [
                { id: 1, text: 'Revisar rascunhos validados no [AI Studio].', completed: false, priority: 'alta', deadline: '2026-03-24' },
                { id: 2, text: 'Otimizar metadados das fotos em [Mídia].', completed: false, priority: 'media', deadline: '2026-03-25' },
                { id: 3, text: 'Validar novo Hub de "Hipnose" no [Planejamento].', completed: false, priority: 'baixa', deadline: '2026-03-28' }
            ];
            this.save();
        }
        this.render();
    },

    save() {
        localStorage.setItem('neuro_tasks_v5', JSON.stringify(this.tasks));
    },

    addNewTaskPrompt() {
        const text = prompt("Digite a nova tarefa estratégica:");
        if (!text) return;

        const prio = prompt("Prioridade (alta, media, baixa):", "media").toLowerCase();
        const deadline = prompt("Prazo (AAAA-MM-DD):", new Date().toISOString().split('T')[0]);

        this.tasks.push({ 
            id: Date.now(),
            text: text.trim(), 
            completed: false, 
            priority: ['alta', 'media', 'baixa'].includes(prio) ? prio : 'media',
            deadline: deadline || null
        });
        
        this.save();
        this.render();
    },

    toggle(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            this.save();
            this.render();
        }
    },

    remove(id) {
        if (confirm("Remover esta tarefa do plano de ação?")) {
            this.tasks = this.tasks.filter(t => t.id !== id);
            this.save();
            this.render();
        }
    },

    search(query) {
        this.currentSearch = query.toLowerCase();
        this.render();
    },

    getPriorityColor(p) {
        switch(p) {
            case 'alta': return '#ef4444'; 
            case 'media': return '#f59e0b';
            case 'baixa': return '#10b981';
            default: return '#94a3b8';
        }
    },

    render() {
        const container = document.getElementById('daily-tasks-list');
        if (!container) return;

        let filtered = [...this.tasks];

        if (this.currentSearch) {
            filtered = filtered.filter(t => 
                t.text.toLowerCase().includes(this.currentSearch) ||
                t.priority.toLowerCase().includes(this.currentSearch)
            );
        }

        // Ordenação: Pendentes Primeiro -> Prioridade -> Prazo
        const prioOrder = { 'alta': 1, 'media': 2, 'baixa': 3 };
        filtered.sort((a, b) => {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            return prioOrder[a.priority] - prioOrder[b.priority];
        });

        if (filtered.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:40px; color:#94a3b8; font-size:12px; font-style:italic;">
                ${this.currentSearch ? '🔍 Nenhuma tarefa encontrada.' : '📭 Plano de ação vazio.'}
            </div>`;
            return;
        }

        container.innerHTML = filtered.map(task => {
            const color = this.getPriorityColor(task.priority);
            // Process links [Módulo]
            const processedText = task.text.replace(/\[(.*?)\]/g, (match, p1) => {
                const map = { 'ai studio': 'ai-studio', 'mídia': 'media-library', 'planejamento': 'planning', 'revisão': 'abidos-review' };
                const target = map[p1.toLowerCase()];
                return target ? `<a href="#" onclick="showSection('${target}'); return false;" style="color: #6366f1; text-decoration: underline; font-weight: 700;">${p1}</a>` : match;
            });

            return `
                <div class="task-item" style="display: flex; align-items: flex-start; gap: 12px; padding: 12px; background: white; border-radius: 12px; border: 1px solid #e2e8f0; border-left: 4px solid ${color}; transition: all 0.2s;">
                    <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="window.taskSystem.toggle(${task.id})" style="margin-top: 4px; border-radius: 4px; cursor: pointer;">
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-size: 13px; font-weight: 600; color: #1e293b; ${task.completed ? 'text-decoration: line-through; opacity: 0.5;' : ''}">${processedText}</div>
                        <div style="display: flex; align-items: center; gap: 10px; margin-top: 5px;">
                            <span style="font-size: 9px; font-weight: 900; color: white; background: ${color}; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;">${task.priority}</span>
                            ${task.deadline ? `<span style="font-size: 10px; color: #64748b;">📅 ${task.deadline}</span>` : ''}
                        </div>
                    </div>
                    <button onclick="window.taskSystem.remove(${task.id})" style="background: none; border: none; color: #94a3b8; cursor: pointer; padding: 4px; font-size: 14px;" title="Remover">✕</button>
                </div>
            `;
        }).join('');
    }
};

window.taskSystem.init();
