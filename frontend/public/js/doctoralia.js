window.doctoraliaApp = {
    async generateReply() {
        const inputField = document.getElementById('doctoralia-input');
        const question = inputField ? inputField.value : "";
        const btn = document.getElementById('btn-generate-doctoralia') || event.target;
        const container = document.getElementById('doctoralia-reply-container');

        const modelType = document.getElementById('doctoralia-model')?.value || 'pro';

        if (!question.trim()) return alert("Por favor, cole a pergunta do paciente.");

        if (btn) {
            btn.innerHTML = '⚙️ Orquestrando Resposta Clínica...';
            btn.disabled = true;
        }
        if (container) container.innerHTML = '<p style="color: #94a3b8; text-align: center; margin-top: 150px;">🤖 Processando Protocolo V5...</p>';

        try {
            const response = await fetch('/api/doctoralia/generate-reply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question, modelType })
            });

            const data = await response.json();
            if (data.reply) {
                container.innerText = data.reply;
            } else {
                throw new Error(data.error || "A IA não retornou um texto válido.");
            }
        } catch (e) {
            console.error(e);
            alert("Erro de conexão ao Mission Control: " + e.message);
            if (container) container.innerHTML = '<p style="color: #ef4444; text-align: center; margin-top: 150px;">Falha na geração (Mission Control V5).</p>';
        } finally {
            if (btn) {
                btn.innerHTML = '✨ GERAR RESPOSTA HUMANIZADA';
            btn.disabled = false;
        }
    },

    copyReply() {
        const textArea = document.getElementById('doctoralia-reply-container');
        const text = textArea ? textArea.innerText : "";
        if (text.includes('Aguardando entrada')) return;
        
        navigator.clipboard.writeText(text).then(() => {
            alert("✅ Resposta copiada para a área de transferência!");
        });
    },

    async auditReply() {
        const originalMessage = document.getElementById('doctoralia-input').value; 
        const container = document.getElementById('doctoralia-reply-container');
        const generatedReply = container ? container.innerText : "";
        
        const auditPanel = document.getElementById('doctoralia-audit-panel');
        const statusBadge = document.getElementById('audit-status-badge');
        const feedbackText = document.getElementById('audit-feedback-text');

        if (!generatedReply || generatedReply.includes('Aguardando entrada')) {
            return alert("Gere uma resposta antes de auditar.");
        }

        auditPanel.style.display = 'block';
        auditPanel.style.background = '#f8fafc';
        auditPanel.style.borderColor = '#cbd5e1';
        statusBadge.style.color = '#475569';
        statusBadge.innerText = '⏳ AUDITANDO...';
        feedbackText.innerText = 'Consultando Compliance Clínico (V4 Ethical Engine)...';

        const modelType = document.getElementById('doctoralia-model')?.value || 'pro';
        try {
            const response = await fetch('/api/doctoralia/audit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    original_message: originalMessage, 
                    generated_reply: generatedReply,
                    modelType: modelType
                })
            });

            const data = await response.json();
            const fixBtn = document.getElementById('btn-fix-doctoralia');

            if (data.status === 'APROVADO') {
                auditPanel.style.background = '#ecfdf5'; 
                auditPanel.style.borderColor = '#10b981';
                statusBadge.style.color = '#047857';
                statusBadge.innerText = '✅ SEGURO:';
                if (fixBtn) fixBtn.style.display = 'none';
            } else if (data.status === 'REPROVADO') {
                auditPanel.style.background = '#fef2f2'; 
                auditPanel.style.borderColor = '#ef4444';
                statusBadge.style.color = '#b91c1c';
                statusBadge.innerText = '❌ ALERTA ÉTICO:';
                if (fixBtn) fixBtn.style.display = 'block';
            } else {
                auditPanel.style.background = '#fffbeb'; 
                auditPanel.style.borderColor = '#f59e0b';
                statusBadge.style.color = '#b45309';
                statusBadge.innerText = '⚠️ ATENÇÃO:';
                if (fixBtn) fixBtn.style.display = 'block';
            }
            
            feedbackText.innerText = data.feedback_auditoria || "Análise concluída.";

        } catch (err) {
            console.error(err);
            statusBadge.innerText = '❌ ERRO DE CONEXÃO';
            feedbackText.innerText = 'O Auditor cerebral está offline.';
        }
    },

    async fixWithAI() {
        const container = document.getElementById('doctoralia-reply-container');
        const feedback = document.getElementById('audit-feedback-text').innerText;
        const fixBtn = document.getElementById('btn-fix-doctoralia');
        const modelType = document.getElementById('doctoralia-model')?.value || 'pro';

        if (!container.innerText || container.innerText.includes('Aguardando')) return;

        if (fixBtn) {
            fixBtn.innerText = '⏳ Refinando...';
            fixBtn.disabled = true;
        }

        try {
            const response = await fetch('/api/doctoralia/refine-reply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    original_reply: container.innerText, 
                    auditor_feedback: feedback,
                    modelType: modelType
                })
            });

            const data = await response.json();
            if (data.success && data.reply) {
                container.innerText = data.reply;
                // Esconde o botão de erro após corrigir
                if (fixBtn) fixBtn.style.display = 'none';
                document.getElementById('doctoralia-audit-panel').style.display = 'none';
            }
        } catch (e) {
            console.error(e);
            alert("Erro ao refinar resposta.");
        } finally {
            if (fixBtn) {
                fixBtn.innerText = '🪄 CORRIGIR COM IA';
                fixBtn.disabled = false;
            }
        }
    }
};
