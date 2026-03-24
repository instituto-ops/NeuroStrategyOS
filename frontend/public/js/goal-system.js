window.goalSystem = {
    goals: [],

    init() {
        this.loadGoals();
    },

    loadGoals() {
        const stored = localStorage.getItem('neuroengine_goals');
        if (stored) {
            this.goals = JSON.parse(stored);
        } else {
            this.goals = [];
        }
        this.render();
    },

    saveToStorage() {
        localStorage.setItem('neuroengine_goals', JSON.stringify(this.goals));
    },

    addNewGoalPrompt() {
        const title = prompt("Título da Meta (ex: Dominar 'Terapia para Ansiedade'):");
        if (!title) return;

        const progress = prompt("Progresso atual (0-100):", "0");
        const progressNum = parseInt(progress) || 0;

        const subtitle = prompt("Subtítulo/Info extra (ex: Posição Orgânica #3):", "");

        this.goals.push({
            title: title.trim(),
            progress: Math.min(100, Math.max(0, progressNum)),
            subtitle: subtitle.trim()
        });

        this.saveToStorage();
        this.render();
    },

    removeGoal(index) {
        if (confirm("Deseja remover esta meta?")) {
            this.goals.splice(index, 1);
            this.saveToStorage();
            this.render();
        }
    },

    render() {
        const container = document.getElementById('active-goals-card');
        if (!container) return;

        // Mantém o Header e o Botão
        container.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 style="margin: 0;">🎯 METAS ATIVAS</h3>
                <button class="btn btn-secondary" style="font-size: 10px; padding: 4px 8px;" onclick="window.goalSystem.addNewGoalPrompt()">+ NOVA META</button>
            </div>
            <div id="goals-list-container"></div>
        `;

        const listContainer = document.getElementById('goals-list-container');

        if (this.goals.length === 0) {
            listContainer.innerHTML = '<p style="font-size: 14px; color: #64748b;">Nenhuma meta configurada. Clique em "+ NOVA META" para adicionar.</p>';
            return;
        }

        this.goals.forEach((goal, index) => {
            const goalDiv = document.createElement('div');
            goalDiv.style.marginBottom = '20px';
            goalDiv.style.position = 'relative';

            goalDiv.innerHTML = `
                <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 5px; color: var(--color-text);">
                    <span style="font-weight: 700;">${goal.title}</span>
                    <span style="color: var(--color-secondary); font-weight: 800;">${goal.progress}%</span>
                </div>
                <div style="height: 10px; background: rgba(255,255,255,0.05); border-radius: 5px; overflow: hidden; margin-bottom: 8px; border: 1px solid var(--color-border);">
                    <div style="width: ${goal.progress}%; height: 100%; background: linear-gradient(90deg, var(--color-secondary), var(--color-accent)); shadow: 0 0 10px var(--color-secondary);"></div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <small style="color: var(--color-text-light); font-weight: 600;">${goal.subtitle}</small>
                    <button onclick="window.goalSystem.removeGoal(${index})" style="background: none; border: none; color: #ef4444; font-size: 10px; cursor: pointer; padding: 0; opacity: 0.6; font-weight: 700;">Remover</button>
                </div>
            `;
            listContainer.appendChild(goalDiv);
        });
    }
};
