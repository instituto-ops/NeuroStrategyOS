const mediaLibrary = {
    init() {
        this.bindEvents();
        // Não carrega auto para não pesar, carrega quando clicar na aba (app.js cuida ou via botao recarregar)
    },

    bindEvents() {
        const input = document.getElementById('media-upload-input');
        if (input) {
            input.addEventListener('change', (e) => this.handleUpload(e));
        }

        // Intercepta clique na aba para carregar
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.getAttribute('data-target') === 'media-library') {
                    this.loadLibrary();
                }
            });
        });
    },

    async loadLibrary() {
        const container = document.getElementById('media-list-container');
        container.innerHTML = `<p style="text-align: center; grid-column: span 3;">Conectando ao acervo do WordPress...</p>`;
        
        const media = await wpAPI.fetchMedia();
        if (!media || media.length === 0) {
            container.innerHTML = `<p style="text-align: center; grid-column: span 3;">Nenhuma mídia encontrada.</p>`;
            return;
        }

        let html = '';
        media.forEach(item => {
            html += `
                <div class="media-item" style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 5px; cursor: pointer; background: white;" onclick="window.mediaLibrary.showDetail(${JSON.stringify(item).replace(/"/g, '&quot;')})">
                    <img src="${item.source_url}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 4px;">
                    <p style="font-size: 10px; margin: 5px 0 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.title.rendered}</p>
                </div>
            `;
        });
        container.innerHTML = html;
    },

    showDetail(item) {
        const detail = document.getElementById('media-item-detail');
        detail.innerHTML = `
            <div style="display: flex; gap: 10px; align-items: flex-start;">
                <img src="${item.source_url}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd;">
                <div style="flex: 1;">
                    <p><strong>URL:</strong> <input type="text" value="${item.source_url}" readonly style="width: 100%; font-size: 10px;"></p>
                    <p><strong>Alt Abidos:</strong> ${item.alt_text || '<span style="color:red">Sem Alt Text!</span>'}</p>
                    <button class="btn" style="padding: 2px 8px; font-size: 10px; margin-top: 5px;" onclick="navigator.clipboard.writeText('${item.source_url}'); alert('URL copiada!')">📋 Copiar Link</button>
                </div>
            </div>
        `;
    },

    async handleUpload(e) {
        const files = e.target.files;
        if (!files.length) return;

        for (let file of files) {
            this.addMessage(`⚙️ Processando IA p/ <strong>${file.name}</strong>...`);
            
            // 1. Gerar Alt Text via IA (Gemini Vision)
            const altText = await this.generateAltWithIA(file);
            
            this.addMessage(`✅ Alt Text Gerado: "${altText}". Fazendo upload p/ WP...`);
            
            // 2. Upload para o WP
            const result = await wpAPI.uploadMedia(file, altText);
            
            if (result && result.id) {
                this.addMessage(`✔️ <strong>${file.name}</strong> disponível na nuvem!`);
            } else {
                this.addMessage(`❌ Erro no upload de <strong>${file.name}</strong>.`);
            }
        }
        this.loadLibrary();
    },

    async generateAltWithIA(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const base64 = event.target.result.split(',')[1];
                const prompt = `Atue como um Especialista em SEO (Abidos Method). 
Analise esta imagem e escreva um Alt Text (Texto Alternativo) perfeito.
REGRAS:
1. Deve ser descritivo e incluir a keyword do contexto ou localização (Goiânia/Psicologia/TEA) se fizer sentido.
2. Seja natural, mas otimizado para acessibilidade e buscador Google.
3. Máximo 125 caracteres.
4. RETORNE APENAS O TEXTO DO ALT TEXT, sem aspas ou meta-comentários.`;

                // Usamos o backend para processar a visão
                try {
                    const response = await fetch('http://localhost:3001/api/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            message: prompt, 
                            screenshotBase64: base64 // Opcional: ajustar server.js para aceitar screenshot direto ou via multipart
                        })
                    });
                    // Como o server.js espera multipart 'screenshot', vamos simplificar ou ajustar server.js
                    // Alternativa: Usar gemini.js direto se configurado, mas vamos via server.js que é mais seguro
                    
                    // RE-ESCRITA: Vamos usar o server.js existente que já lida com imagem multipart
                    const formData = new FormData();
                    formData.append('message', prompt);
                    formData.append('screenshot', file);
                    
                    const res = await fetch('http://localhost:3001/api/chat', {
                        method: 'POST',
                        body: formData
                    });
                    const data = await res.json();
                    resolve(data.reply ? data.reply.trim() : "Imagem clínica otimizada Goiânia");
                } catch (e) {
                    resolve("Imagem otimizada Dr. Victor Lawrence Goiânia");
                }
            };
            reader.readAsDataURL(file);
        });
    },

    addMessage(msg) {
        // Usa o histórico do chat principal para feedback ou um console na aba
        const detail = document.getElementById('media-item-detail');
        const p = document.createElement('p');
        p.style.fontSize = '11px';
        p.style.margin = '2px 0';
        p.innerHTML = msg;
        detail.prepend(p);
    },

    async generateDemand() {
        const tbody = document.getElementById('media-planning-tbody');
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center">Planejando demanda estratégica...</td></tr>`;

        const prompt = `Crie uma lista de demanda de imagens (5 itens) para um planejamento de postagens sobre Autismo Adulto, Hipnose e Neurodivergência.
Para cada item, retorne EXATAMENTE UM JSON no formato de array:
[
  {"need": "Descrição Curta", "prompt": "Prompt Detalhado IA", "status": "Pendente"}
]
NUNCA mencione Abidos no texto.`;
        
        const response = await gemini.callAPI(prompt);
        if (response) {
            try {
                const jsonStr = response.replace(/```json|```/g, '').trim();
                const demands = JSON.parse(jsonStr);
                let html = '';
                demands.forEach(d => {
                    html += `
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                            <td style="padding: 8px;">${d.need}</td>
                            <td style="padding: 8px; font-size: 10px; color: #64748b;">${d.prompt}</td>
                            <td style="padding: 8px;"><span class="badge" style="background:#fef3c7; color:#b45309;">${d.status}</span></td>
                        </tr>
                    `;
                });
                tbody.innerHTML = html;
                this.addMessage("📅 Planejamento de Demanda atualizado via IA.");
            } catch (e) {
                console.error("Erro ao parsear demanda", e);
                tbody.innerHTML = `<tr><td colspan="3" style="color:red">Falha ao parsear planejamento. Tente novamente.</td></tr>`;
            }
        }
    }
};

window.mediaLibrary = mediaLibrary;
document.addEventListener('DOMContentLoaded', () => mediaLibrary.init());
