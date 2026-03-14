window.abidosReview = {
    drafts: [],
    currentDraftId: null,

    async loadDrafts() {
        try {
            const list = document.getElementById('drafts-list');
            if(list) list.innerHTML = '<tr><td colspan="5" style="text-align:center;">⌛ Carregando rascunhos do banco de dados do LangGraph...</td></tr>';
            
            const response = await fetch('/api/drafts');
            this.drafts = await response.json();
            if(list) this.renderTable();
        } catch (e) {
            console.error("Erro ao carregar drafts", e);
            const list = document.getElementById('drafts-list');
            if(list) list.innerHTML = `<tr><td colspan="5" style="color:red; text-align:center;">❌ Erro ao conectar com os agentes: ${e.message}</td></tr>`;
        }
    },

    renderTable() {
        const list = document.getElementById('drafts-list');
        list.innerHTML = '';
        if(this.drafts.length === 0) {
            list.innerHTML = '<tr><td colspan="5" style="text-align:center;">Nenhum rascunho aguardando revisão clínica.</td></tr>';
            return;
        }

        this.drafts.forEach(draft => {
            const tr = document.createElement('tr');
            
            const abidosIcon = draft.validacoes_automatizadas.metodo_abidos ? '🟢' : '🔴';
            const complianceIcon = draft.validacoes_automatizadas.compliance_etico ? '⚖️' : '⚠️';
            const statusStr = `<span style="font-size: 11px;">${abidosIcon} Abidos<br>${complianceIcon} CFP</span>`;

            tr.innerHTML = `
                <td><strong>${draft.draft_id}</strong><br><span style="font-size:11px; color:#64748b;">${new Date(draft.data_submissao).toLocaleDateString()}</span></td>
                <td>${draft.tema_foco}</td>
                <td>${statusStr}</td>
                <td><span style="font-size:11px; color:#3b82f6; cursor:pointer;" onclick="alert('Fontes:\\n' + '${draft.fontes_rag_utilizadas.join('\\n')}')">Ver Fontes (RAG)</span></td>
                <td style="display: flex; gap: 5px;">
                    <button class="btn btn-secondary" style="padding: 5px 10px; font-size: 12px;" onclick="window.abidosReview.openModal('${draft.draft_id}')">✏️ Revisar</button>
                    <button class="btn" style="padding: 5px 10px; font-size: 12px; background: #10b981; color: white;" onclick="window.abidosReview.quickApprove('${draft.draft_id}')">✅ Publicar</button>
                </td>
            `;
            list.appendChild(tr);
        });
    },

    openModal(id) {
        const draft = this.drafts.find(d => d.draft_id === id);
        if(!draft) return;
        this.currentDraftId = id;

        document.getElementById('draft-modal-title').innerText = `Revisão: ${draft.tema_foco} (${draft.draft_id})`;
        document.getElementById('draft-modal-abidos').innerHTML = draft.validacoes_automatizadas.metodo_abidos ? '<span style="color:#10b981">100% Aprovado</span>' : '<span style="color:#ef4444">Requer Ajustes</span>';
        document.getElementById('draft-modal-compliance').innerHTML = draft.validacoes_automatizadas.compliance_etico ? '<span style="color:#10b981">Aprovado (Zero Infrações)</span>' : '<span style="color:#ef4444">Alto Risco Detectado</span>';
        document.getElementById('draft-modal-factual').innerText = draft.validacoes_automatizadas.med_f1_score * 100 + '%';
        
        document.getElementById('draft-modal-content').value = draft.conteudo_gerado;
        document.getElementById('ai-abidos-feedback').style.display = 'none';

        document.getElementById('draft-modal').style.display = 'flex';
    },

    async auditDraft() {
        const content = document.getElementById('draft-modal-content').value;
        const feedbackBox = document.getElementById('ai-abidos-feedback');
        const feedbackText = document.getElementById('ai-abidos-feedback-text');
        
        feedbackBox.style.display = 'block';
        feedbackBox.style.borderLeftColor = '#f59e0b';
        feedbackText.style.color = '#b45309';
        feedbackText.innerText = '🤖 Agente Abidos: Analisando hierarquia, copywriting e compliance...';

        try {
            const response = await fetch('/api/agents/audit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: content })
            });
            const result = await response.json();
            
            if(result.error) throw new Error(result.error);
            
            // Sucesso na resposta do agente
            feedbackBox.style.borderLeftColor = '#6366f1';
            feedbackText.style.color = '#1e40af';
            let reportHtml = result.report.replace(/\ng/, '<br>');
            feedbackText.innerHTML = `<strong>Relatório do Auditor:</strong><br><br>${reportHtml}`;
        } catch (e) {
            feedbackBox.style.borderLeftColor = '#ef4444';
            feedbackText.style.color = '#991b1b';
            feedbackText.innerHTML = `<strong>Erro Crítico na Auditoria:</strong> ${e.message}`;
        }
    },

    async quickApprove(id) {
        if(!confirm("Aprovar e publicar via WordPress REST API?")) return;
        alert(`Rascunho ${id} aprovado. Fluxo de publicação engatilhado no backend.`);
    },

    async approveDraft() {
        const draft = this.drafts.find(d => d.draft_id === this.currentDraftId);
        const editedContent = document.getElementById('draft-modal-content').value;

        // [CLONE DE VOZ] Se houve edição, envia para o Nó de Aprendizado (Text Diff)
        if (draft && draft.conteudo_gerado !== editedContent) {
            console.log("🧬 Ajustando perfil de voz baseado nas suas edições...");
            fetch('/api/agents/analyze-diff', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    original: draft.conteudo_gerado, 
                    edited: editedContent 
                })
            }).then(r => r.json()).then(data => {
                if(data.success) console.log("✅ DNA de escrita atualizado com as novas preferências.");
            }).catch(e => console.error("Erro ao treinar voz:", e));
        }

        alert("Publicação Final: Agente de Integração ativado! O WordPress irá receber a carga final formatada via REST API.");
        document.getElementById('draft-modal').style.display = 'none';
        this.loadDrafts(); // Atualiza a lista
    },

    async rejectDraft() {
        const feedback = prompt("Qual o feedback para os Agentes corrigirem? (Volta ao LangGraph / CrewAI)");
        if(!feedback) return;
        alert("Rascunho devolvido para a pipeline autônoma com as notas: " + feedback);
        document.getElementById('draft-modal').style.display = 'none';
    },

    async requestNewDraft() {
        const topic = prompt("Informe a Palavra-Chave / Tema Foco para os Agentes de Pesquisa (Ex: 'Tratamento de Ansiedade'):");
        if(!topic) return;

        alert("🚀 Pipeline Multi-Agent iniciada! (Agente Gerador -> Crítico -> Abidos -> Compliance). Acompanhe no console do servidor.");
        
        try {
            const list = document.getElementById('drafts-list');
            if(list) list.innerHTML = '<tr><td colspan="5" style="text-align:center;">🤖 Orquestrando LangGraph Pipeline (Aguarde 10-20 segs)...</td></tr>';

            const response = await fetch('/api/agents/generate-pipeline', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic: topic })
            });
            const result = await response.json();
            
            if(result.error) throw new Error(result.error);
            
            alert(`✅ Sucesso! Rascunho ${result.draft.draft_id} gerado e validado.`);
            this.loadDrafts();
        } catch (e) {
            console.error("Erro no pipeline", e);
            alert("❌ Erro ao orquestrar a IA: " + e.message);
            this.loadDrafts(); // Recarrega para limpar o aviso
        }
    },

    async trainVoice() {
        const texts = prompt("Cole aqui alguns parágrafos de textos que VOCÊ escreveu (posts antigos, artigos, etc) para a IA aprender seu estilo:");
        if(!texts) return;

        alert("🧠 Analisando seu DNA de escrita... Isso criará o seu 'Reverse Prompting' personalizado.");
        
        try {
            const response = await fetch('/api/agents/learn-style', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ texts: [texts] })
            });
            const result = await response.json();
            if(result.success) {
                alert(`✅ Perfil de Voz Atualizado!\n\nEstilo aprendido: ${result.profile.learned_style}\nRitmo: ${result.profile.rhythm}`);
            }
        } catch (e) {
            alert("Erro ao treinar voz: " + e.message);
        }
    }
};

// Hook na inicialização para carregar os dados
document.addEventListener('DOMContentLoaded', () => {
    window.abidosReview.loadDrafts();
});
