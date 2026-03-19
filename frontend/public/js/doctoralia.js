window.doctoraliaApp = {
    async generateReply() {
        const question = document.getElementById('doctoralia-question').value;
        const btn = document.getElementById('btn-generate-doctoralia');
        const container = document.getElementById('doctoralia-reply-container');

        if (!question.trim()) return alert("Por favor, cole a pergunta do paciente.");

        btn.innerHTML = '⚙️ Orquestrando Resposta Clínica...';
        btn.disabled = true;
        container.innerHTML = '<p style="color: #94a3b8; text-align: center; margin-top: 150px;">🤖 Processando Protocolo V4...</p>';

        try {
            const response = await fetch('/api/doctoralia/generate-reply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question })
            });

            const data = await response.json().catch(() => ({ success: false, error: "Resposta inválida do servidor." }));
            if (data.success && data.reply) {
                container.innerText = data.reply;
            } else {
                alert("Erro: " + (data.error || "A IA não conseguiu gerar uma resposta."));
                container.innerHTML = '<p style="color: #ef4444; text-align: center; margin-top: 150px;">Falha na geração (Mission Control V4).</p>';
            }
        } catch (e) {
            console.error(e);
            alert("Erro de conexão ao Mission Control: " + e.message);
        } finally {
            btn.innerHTML = '✨ GERAR RESPOSTA HUMANIZADA';
            btn.disabled = false;
        }
    },

    copyReply() {
        const text = document.getElementById('doctoralia-reply-container').innerText;
        if (text.includes('A resposta gerada')) return;
        
        navigator.clipboard.writeText(text).then(() => {
            alert("✅ Resposta copiada para a área de transferência!");
        });
    }
};
