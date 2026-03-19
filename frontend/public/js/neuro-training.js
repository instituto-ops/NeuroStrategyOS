window.neuroTraining = {
    async init() {
        console.log("🧠 Neuro-Training Studio Inicializado.");
        await this.loadMemory();
    },

    async loadMemory() {
        try {
            const response = await fetch('/api/neuro-training/memory');
            if (!response.ok) throw new Error(`Status ${response.status}`);
            const data = await response.json();
            this.renderMemory(data);
        } catch (e) {
            console.error("Erro ao carregar memória:", e);
            const list = document.getElementById('neuro-style-memory-list');
            if (list) {
                list.innerHTML = `
                    <div style="padding: 20px; text-align: center; color: #f87171;">
                        <p style="font-weight: bold; margin-bottom: 5px;">⚠️ Erro de Conexão (Mission Control)</p>
                        <p style="font-size: 11px; opacity: 0.7;">Não foi possível recuperar a Memória Dr. Victor. Tente recarregar.</p>
                    </div>
                `;
            }
        }
    },

    renderMemory(data) {
        const rules = data.style_rules || [];
        const lastUpdate = data.last_update || '--';
        const lastInsight = data.last_insight || '';
        const history = data.insights_history || [];
        
        const list = document.getElementById('neuro-style-memory-list');
        const timestamp = document.getElementById('memory-last-update');
        const insightBox = document.getElementById('neuro-training-insight-box');
        const libraryBox = document.getElementById('neuro-insights-library');

        if (timestamp) timestamp.innerText = lastUpdate !== '--' ? new Date(lastUpdate).toLocaleString() : '--';
        
        if (insightBox) {
            if (lastInsight) {
                insightBox.innerHTML = `
                    <div style="background: #0c4a6e; border: 1px solid #0ea5e9; padding: 15px; border-radius: 8px; margin-bottom: 20px; animation: slideIn 0.5s ease; position: relative;">
                        <div style="display: flex; align-items: center; gap: 8px; color: #38bdf8; font-weight: bold; font-size: 11px; margin-bottom: 8px;">
                            <span>💡 ÚLTIMO INSIGHT ESTRATÉGICO</span>
                        </div>
                        <p style="color: #e0f2fe; font-size: 13px; line-height: 1.6; margin: 0;">${lastInsight}</p>
                    </div>
                `;
            } else {
                insightBox.innerHTML = '';
            }
        }

        // Renderiza biblioteca de histórico
        if (libraryBox && history.length > 0) {
            libraryBox.style.display = 'block';
            this.renderHistory(history);
        }

        if (!list) return;

        if (rules.length === 0) {
            list.innerHTML = '<p style="color: #64748b; font-size: 13px; text-align: center; margin-top: 40px;">Nenhuma regra extraída ainda.</p>';
            return;
        }

        list.innerHTML = rules.map((rule, index) => this.renderRule(rule, index)).join('');
    },

    renderHistory(history) {
        const histList = document.getElementById('neuro-insights-history-list');
        if (!histList) return;

        histList.innerHTML = history.map((h, i) => `
            <div style="padding: 10px; border-bottom: 1px solid #1e293b; last-child { border: none };">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                    <span style="color: #64748b; font-size: 10px; font-weight: bold;">${new Date(h.date).toLocaleDateString()}</span>
                    <span style="background: #334155; color: #94a3b8; padding: 2px 6px; border-radius: 4px; font-size: 9px;">INSIGHT #${history.length - i}</span>
                </div>
                <p style="color: #94a3b8; font-size: 12px; line-height: 1.4; margin: 0;">${h.text}</p>
            </div>
        `).join('');
    },

    toggleHistory() {
        const histList = document.getElementById('neuro-insights-history-list');
        const btn = document.getElementById('btn-toggle-history');
        if (histList.style.maxHeight === 'none') {
            histList.style.maxHeight = '250px';
            btn.innerText = 'Ver Tudo';
        } else {
            histList.style.maxHeight = 'none';
            btn.innerText = 'Recolher';
        }
    },

    renderRule(rule, index) {
        const isObject = typeof rule === 'object' && rule !== null;
        const name = isObject ? (rule.name || `Regra #${index + 1}`) : `Regra #${index + 1}`;
        const content = isObject ? rule.description : rule;
        const examples = isObject && rule.example_from_transcript ? rule.example_from_transcript : [];

        return `
            <div style="background: #1e293b; padding: 15px; border-radius: 8px; border-left: 3px solid #38bdf8; font-size: 13px; line-height: 1.5; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                <div style="color: #38bdf8; font-weight: bold; font-size: 10px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px;">${name}</div>
                <div style="color: #e2e8f0; font-weight: 500;">${content}</div>
                ${examples.length > 0 ? `
                    <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #334155;">
                        <div style="color: #94a3b8; font-size: 10px; font-weight: bold; margin-bottom: 5px;">EXEMPLO REAL:</div>
                        ${examples.map(ex => `<div style="color: #94a3b8; font-style: italic; font-size: 11px; margin-bottom: 4px;">"${ex}"</div>`).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    },

    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const status = document.getElementById('upload-status');
        status.innerHTML = `<span style="color: #6366f1;">⏳ Processando: ${file.name}...</span>`;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/neuro-training/parse', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (data.success) {
                document.getElementById('neuro-training-sample').value = data.text;
                status.innerHTML = `<span style="color: #10b981;">✅ ${file.name} processado com sucesso!</span>`;
                
                // Auto-trigger analysis if large content
                if (data.text.length > 500) {
                    console.log("Auto-trigger extraction for document...");
                }
            } else {
                status.innerHTML = `<span style="color: #ef4444;">❌ Erro: ${data.error}</span>`;
            }
        } catch (e) {
            console.error(e);
            status.innerHTML = `<span style="color: #ef4444;">❌ Erro de conexão ao processar documento.</span>`;
        }
    },

    async extractStyle() {
        const sample = document.getElementById('neuro-training-sample').value;
        const baseline = document.getElementById('neuro-training-ai-baseline').value;
        const btn = document.getElementById('btn-extract-style');

        if (!sample.trim()) return alert("Por favor, insira uma amostra de voz ou correção.");

        btn.innerHTML = '⚙️ Analisando Padrões...';
        btn.disabled = true;

        try {
            const response = await fetch('/api/neuro-training/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sample, currentAiOutput: baseline })
            });

            const data = await response.json();
            if (data.success) {
                alert("🚀 Estilo Victor Lawrence atualizado com sucesso!");
                this.renderMemory({
                    style_rules: data.updated_rules,
                    last_update: new Date().toISOString(),
                    last_insight: data.insight
                });
                document.getElementById('neuro-training-sample').value = '';
                document.getElementById('neuro-training-ai-baseline').value = '';
            } else {
                alert("Erro: " + data.error);
            }
        } catch (e) {
            console.error(e);
            alert("Erro na extração.");
        } finally {
            btn.innerHTML = '⚡ EXTRAIR E SALVAR PADRÕES DE ESTILO';
            btn.disabled = false;
        }
    }
};

// Auto-init
document.addEventListener('DOMContentLoaded', () => {
    // Check if we are in a context where dashboard logic is loaded
    if (window.app) {
        window.neuroTraining.init();
    }
});
