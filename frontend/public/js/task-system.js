window.taskSystem = {
    tasks: [],

    init() {
        this.loadTasks();
    },

    loadTasks() {
        const stored = localStorage.getItem('neuroengine_tasks');
        if (stored) {
            this.tasks = JSON.parse(stored);
        } else {
            // Default tasks if empty
            this.tasks = [
                { text: 'Revisar 3 rascunhos validados pelos agentes no [AI Studio].', completed: false },
                { text: 'Upload de novas fotos do consultório na [Mídia].', completed: false },
                { text: 'Aprovar STAG de "Hipnose Clínica" no [Planejamento].', completed: false }
            ];
            this.saveToStorage();
        }
        this.render();
    },

    saveToStorage() {
        localStorage.setItem('neuroengine_tasks', JSON.stringify(this.tasks));
    },

    addNewTaskPrompt() {
        const text = prompt("Digite a nova tarefa:");
        if (text && text.trim()) {
            this.tasks.push({ text: text.trim(), completed: false });
            this.saveToStorage();
            this.render();
            if (typeof showFeedback === 'function') showFeedback("Tarefa adicionada!", "green");
        }
    },

    toggleTask(index) {
        this.tasks[index].completed = !this.tasks[index].completed;
        this.saveToStorage();
        this.render();
    },

    removeTask(index) {
        if (confirm("Deseja remover esta tarefa?")) {
            this.tasks.splice(index, 1);
            this.saveToStorage();
            this.render();
        }
    },

    render() {
        const container = document.getElementById('daily-tasks-list');
        if (!container) return;

        if (this.tasks.length === 0) {
            container.innerHTML = '<p style="font-size: 13px; color: #64748b; font-style: italic;">Nenhuma tarefa pendente. <br>Clique em "+ NOVA TAREFA" para adicionar.</p>';
            return;
        }

        container.innerHTML = '';
        this.tasks.forEach((task, index) => {
            const item = document.createElement('div');
            item.style.display = 'flex';
            item.style.alignItems = 'flex-start';
            item.style.justifyContent = 'space-between';
            item.style.gap = '10px';
            item.style.padding = '8px 0';
            item.style.borderBottom = '1px solid #f1f5f9';

            // Process internal links like [AI Studio]
            let processedText = task.text.replace(/\[(.*?)\]/g, (match, p1) => {
                const targets = {
                    'AI Studio': 'ai-studio',
                    'Mídia': 'media-library',
                    'Planejamento': 'planning',
                    'Revisão': 'abidos-review',
                    'Elementor': 'elementor-builder'
                };
                const target = targets[p1];
                if (target) {
                    return `<a href="#" onclick="document.querySelector('[data-target=${target}]').click(); return false;" style="color: #6366f1; text-decoration: none; font-weight: bold;">${p1}</a>`;
                }
                return match;
            });

            item.innerHTML = `
                <label style="display: flex; align-items: flex-start; gap: 10px; font-size: 14px; cursor: pointer; flex: 1; ${task.completed ? 'text-decoration: line-through; opacity: 0.6;' : ''}">
                    <input type="checkbox" style="margin-top: 4px;" ${task.completed ? 'checked' : ''} onchange="window.taskSystem.toggleTask(${index})"> 
                    <span>${processedText}</span>
                </label>
                <button onclick="window.taskSystem.removeTask(${index})" style="background: none; border: none; color: #ef4444; font-size: 12px; cursor: pointer; padding: 2px 5px; border-radius: 4px;" title="Remover">✕</button>
            `;
            container.appendChild(item);
        });
    }
};
