window.gemini = {
    // Alias para compatibilidade
    async ask(prompt, options = {}) {
        return this.callAPI(prompt, options.model || null);
    },
    // Configurações do Proxy Seguro (NeuroEngine Backend)
    // Nenhuma API Key do Google é exposta ao navegador.
    proxyUrl: "/api/ai/generate",

    async callAPI(prompt, forceModel = null) {
        if (typeof showFeedback === 'function') showFeedback("IA está processando sua solicitação...", "blue");
        
        // Resolve o modelo a ser usado (Prioridade: Forçado > Seção Ativa > Global)
        const selectedModel = forceModel || (window.app ? window.app.getActiveModel() : 'gemini-2.5-flash');
        console.log(`🤖 [GEMINI] Solicitando processamento via: ${selectedModel}`);

        try {
            const response = await fetch(this.proxyUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt: prompt,
                    modelType: selectedModel, // Passamos o ID exato do modelo
                    config: {
                        temperature: 0.7,
                        maxOutputTokens: 1000
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Erro no Servidor de IA Proxy");
            }

            const data = await response.json();
            
            if (typeof showFeedback === 'function') showFeedback("Concluído!", "green");
            return data.text.trim();

        } catch (error) {
            console.error("AI Fetch Error:", error);
            if (typeof showFeedback === 'function') showFeedback("Erro na comunicação com a IA: " + error.message, "red");
            return null;
        }
    },

    async suggestTitle() {
        const titleInput = document.getElementById("content-title");
        let currentTitle = (titleInput && titleInput.value) ? titleInput.value : "Psicólogo em Goiânia";
        
        const prompt = `Melhore este título para uma página de psicologia focado em conversão e SEO (Método Abidos): "${currentTitle}". 
Foco: Keyword estratégica + Benefício + Goiânia.
Retorne APENAS o novo título, sem aspas.`;

        const suggestion = await this.callAPI(prompt);
        if(suggestion && titleInput) {
            titleInput.value = suggestion;
        }
    },

    async generateMeta() {
        const titleVal = document.getElementById("content-title")?.value || "";
        const bodyVal = document.getElementById("content-body")?.value || "";
        const metaInput = document.getElementById("content-meta");

        const prompt = `Crie uma Meta Description (máximo 155 caracteres) persuasiva para:
Título: "${titleVal}"
Conteúdo: "${bodyVal.substring(0, 300)}"
REGRAS: Foque na dor emocional, cite que é em Goiânia e uma CTA direta.`;

        const suggestion = await this.callAPI(prompt);
        if(suggestion && metaInput) {
            metaInput.value = suggestion;
        }
    },

    async draftContent() {
        const bodyInput = document.getElementById("content-body");
        const titleVal = document.getElementById("content-title")?.value || "Nova Página";
        
        const prompt = `Crie um rascunho de HTML simples (tags <h2> e <p>) para a Landing Page: "${titleVal}". 
Foque na estrutura Abidos: 
1. Reconhecimento da dor.
2. Solução Clínica.
3. Autoridade Victor Lawrence (CRP 09/012681) em Goiânia.
4. CTA WhatsApp.
REGRAS: Retorne APENAS o HTML cru, sem markdown.`;

        const suggestion = await this.callAPI(prompt);
        if(suggestion && bodyInput) {
            bodyInput.value = suggestion.replace(/```html|```/g, '').trim();
        }
    }
};

function showFeedback(text, colorClass) {
    // Tenta primeiro o feedback específico de mídia se estiver na seção de mídia
    const isMediaSection = document.getElementById('media-library').classList.contains('active');
    const mediaBox = document.getElementById("ai-media-feedback");
    const mediaText = document.getElementById("ai-media-feedback-text");

    const feedbackBox = isMediaSection && mediaBox ? mediaBox : document.getElementById("ai-feedback");
    const feedbackText = isMediaSection && mediaText ? mediaText : document.getElementById("ai-feedback-text");
    
    if(!feedbackBox) return;

    feedbackBox.style.display = "block";
    feedbackBox.style.borderLeftColor = colorClass === "red" ? "#ef4444" : (colorClass === "green" ? "#10b981" : "#6366f1");
    
    // Fallback se o elemento de texto específico não existir
    const targetText = feedbackText || feedbackBox;
    if (targetText) {
        targetText.innerHTML = text;
    }
}
