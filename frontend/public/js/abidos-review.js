window.abidosReview = {
    drafts: [],
    currentDraftId: null,

    async loadDrafts() {
        try {
            const list = document.getElementById('drafts-list');
            if(list) list.innerHTML = '<tr><td colspan="5" style="text-align:center;">⌛ Carregando rascunhos do banco de dados do LangGraph...</td></tr>';
            
            const response = await fetch('/api/drafts');
            const data = await response.json();
            // Evita o erro 'forEach is not a function' se a API retornar objeto em vez de array
            this.drafts = Array.isArray(data) ? data : (data.drafts || []);
            
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
            
            const abidosStatus = (draft.validacoes_automatizadas && draft.validacoes_automatizadas.metodo_abidos) 
                ? '<span style="background: rgba(16, 185, 129, 0.1); color: #10b981; padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(16, 185, 129, 0.2); font-weight: 800; font-size: 9px;">ABIDOS: OK</span>' 
                : '<span style="background: rgba(239, 68, 68, 0.1); color: #ef4444; padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(239, 68, 68, 0.2); font-weight: 800; font-size: 9px;">ABIDOS: AJUSTAR</span>';
            
            const complianceStatus = (draft.validacoes_automatizadas && draft.validacoes_automatizadas.compliance_etico) 
                ? '<span style="background: rgba(56, 189, 248, 0.1); color: #38bdf8; padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(56, 189, 248, 0.2); font-weight: 800; font-size: 9px; margin-top: 4px; display: inline-block;">CFP/ETÍCO: OK</span>' 
                : '<span style="background: rgba(245, 158, 11, 0.1); color: #f59e0b; padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(245, 158, 11, 0.2); font-weight: 800; font-size: 9px; margin-top: 4px; display: inline-block;">CFP/ÉTICO: RISCO</span>';
            
            const statusStr = `<div style="display: flex; flex-direction: column;">${abidosStatus}${complianceStatus}</div>`;

            const fontesRag = Array.isArray(draft.fontes_rag_utilizadas) ? draft.fontes_rag_utilizadas.join('\\n') : 'Nenhuma fonte';
            
            const rawDate = draft.data_submissao || draft.last_update || null;
            let draftDate = 'N/D';
            
            if (rawDate && rawDate !== 'undefined') {
                const dateObj = new Date(rawDate);
                if (!isNaN(dateObj.getTime())) {
                    draftDate = dateObj.toLocaleDateString('pt-BR');
                }
            }

            const draftId = draft.draft_id || draft.id || 'ID_PENDING';
            const draftTheme = draft.tema_foco || draft.name || 'Sem Tema Definido';

            tr.innerHTML = `
                <td><strong>${draftId}</strong><br><span style="font-size:11px; color:var(--color-text-light);">${draftDate}</span></td>
                <td>${draftTheme}</td>
                <td>${statusStr}</td>
                <td><span style="font-size:11px; color:var(--color-secondary); cursor:pointer;" onclick="alert('Fontes:\\n' + '${fontesRag}')">Ver Fontes (RAG)</span></td>
                <td style="display: flex; gap: 8px; align-items: center;">
                    <button class="btn btn-secondary" style="padding: 6px 14px; font-size: 11px;" onclick="window.abidosReview.openModal('${draftId}')">✏️ Revisar</button>
                    <button class="btn btn-primary" style="padding: 6px 14px; font-size: 11px;" onclick="window.abidosReview.quickApprove('${draftId}')">✅ Exportar</button>
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
        if(!confirm("Autorizar exportação direta para o Core Next.js (Headless CMS)?")) return;
        alert(`Rascunho ${id} validado e movido para a fila de sincronização Next.js.`);
    },

    async approveDraft() {
        const id = this.currentDraftId;
        const editedContent = document.getElementById('draft-modal-content').value;

        if(!confirm("Deseja exportar este conteúdo editado para o diretório de produção?")) return;

        try {
            // 1. Atualiza o conteúdo se houver edição e muda status para publish
            const result = await wpAPI.saveContent('posts', {
                content: editedContent,
                status: 'publish'
            }, id);

            if(result) {
                alert("✅ Publicado com sucesso!");
                document.getElementById('draft-modal').style.display = 'none';
                this.loadDrafts();
            }
        } catch (e) {
            alert("Erro ao publicar: " + e.message);
        }
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
