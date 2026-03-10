const gemini = {
    // API Key lida do .env (Nota: em um ambiente de produção real, use um backend para não vazar a chave no painel do usuário. Como isto é um Painel Administrativo local/fechado, podemos usar diretamente)
    apiKey: typeof CONFIG_LOCAL !== 'undefined' ? CONFIG_LOCAL.GEMINI_API_KEY : "SUA_GEMINI_API_KEY", 
    apiUrl: "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",

    async callAPI(prompt) {
        showFeedback("Processando com a IA...", "blue");
        try {
            const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 1000,
                    }
                })
            });

            const data = await response.json();
            
            if(data.error) {
                console.error("Gemini Error:", data.error);
                showFeedback("Erro na IA: " + data.error.message, "red");
                return null;
            }

            if(data.candidates && data.candidates.length > 0) {
                showFeedback("Concluído!", "green");
                return data.candidates[0].content.parts[0].text.trim();
            }
        } catch (error) {
            console.error("Fetch Error:", error);
            showFeedback("Erro na comunicação com a API.", "red");
        }
        return null;
    },

    async suggestTitle() {
        const titleInput = document.getElementById("content-title");
        let currentTitle = titleInput.value || "Terapia para Ansiedade Goiânia";
        
        const prompt = `Atue como um Especialista em SEO Local e Copywriter focado em conversão. Melhore este título para uma página de psicologia: "${currentTitle}". 
Regras do Método Abidos:
- Deve ter a palavra-chave principal.
- Deve incluir o geomodificador (ex: "em Goiânia" ou "Setor Sul").
- Deve focar em resultado ou autoridade (ex: Especialista, Diagnóstico, Tratamento).
Retorne APENAS o título sugerido, sem aspas, sem explicações.`;

        const suggestion = await this.callAPI(prompt);
        if(suggestion) {
            titleInput.value = suggestion;
            showFeedback(`Título otimizado: "${suggestion}"`, "green");
        }
    },

    async generateMeta() {
        const titleInput = document.getElementById("content-title").value || "Psicólogo em Goiânia";
        const bodyInput = document.getElementById("content-body").value || "";
        const metaInput = document.getElementById("content-meta");

        const prompt = `Crie uma Meta Description (máximo de 155 caracteres) persuasiva para uma página de psicologia.
Título da Página: "${titleInput}"
Conteúdo/Contexto: "${bodyInput.substring(0, 300)}"
Regras: Foque na dor do cliente, cite a autoridade e termine com uma CTA implícita, incluindo a localização.
Retorne APENAS o texto da meta description.`;

        const suggestion = await this.callAPI(prompt);
        if(suggestion) {
            metaInput.value = suggestion;
            showFeedback("Meta description gerada e pronta para SEO.", "green");
        }
    },

    async draftContent() {
        const bodyInput = document.getElementById("content-body");
        const titleInput = document.getElementById("content-title").value || "Terapia para Ansiedade";
        
        const prompt = `Você é um Copywriter da área de saúde focado na Metodologia Abidos.
Escreva um rascunho de HTML simples para uma Landing Page de Psicologia.
Título: ${titleInput}

Estrutura EXATA a seguir (retorne as tags HTML simples limpas, sem markdown como \`\`\`html):
<h2>Identificando a Dor</h2>
<p>(Parágrafo validando o sofrimento do paciente, ex: exaustão emocional, masking, crises).</p>
<h2>A Solução Especializada</h2>
<p>(Explicação sobre como a sua terapia resolve o problema, com foco na técnica sem prometer curas impossíveis).</p>
<h2>Por que escolher o Dr. Lawrence? (Autoridade)</h2>
<p>(Mencione experiência clínica, registro CRP, ambiente sigiloso).</p>
<h2>Agende sua Avaliação</h2>
<p>(CTA chamando para contato via WhatsApp).</p>`;

        const suggestion = await this.callAPI(prompt);
        if(suggestion) {
            bodyInput.value = suggestion.replace(/```html|```/g, '').trim();
            showFeedback("Rascunho criado com sucesso. Edite conforme a necessidade da clínica.", "green");
        }
    },

    async reviewContent() {
        const bodyInput = document.getElementById("content-body").value;
        if(!bodyInput) {
            showFeedback("Por favor, escreva algum conteúdo primeiro.", "red");
            return;
        }

        const prompt = `Como avaliador do Método Abidos para clínicas locais de Goiânia, faça uma auditoria rápida neste conteúdo:
${bodyInput.substring(0, 500)}...

O formato da sua resposta deve ser em bullets:
- Positivo: ...
- A Melhorar: ...
- Dica de CTA: ...
Seja conciso.`;

        const suggestion = await this.callAPI(prompt);
        if(suggestion) {
            showFeedback("Auditoria Completa:<br>" + suggestion.replace(/\\n/g, "<br>"), "blue");
        }
    }
};

function showFeedback(text, colorClass) {
    const feedbackBox = document.getElementById("ai-feedback");
    const feedbackText = document.getElementById("ai-feedback-text");
    
    if(!feedbackBox) return;

    feedbackBox.style.display = "block";
    feedbackBox.style.borderLeftColor = colorClass === "red" ? "var(--color-error)" : (colorClass === "green" ? "var(--color-success)" : "var(--color-secondary)");
    feedbackText.innerHTML = text;
}
