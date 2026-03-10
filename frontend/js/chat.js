/**
 * NeuroEngine Copilot - Core Logic
 * Handles Chat, AI Studio, WP Integration and Method Abidos analysis.
 */

window.chatApp = {
    currentItemId: null,
    currentType: null,
    selectedElement: null,

    init() {
        this.setupEventListeners();
        this.setupInspector();
        console.log("🧠 NeuroEngine Copilot Initialized");
    },

    setupEventListeners() {
        const chatInput = document.getElementById('chat-input');
        const btnSend = document.getElementById('btn-send-chat');
        const btnSnap = document.getElementById('btn-snap-error');

        btnSend.addEventListener('click', () => this.sendMessage(false));
        btnSnap.addEventListener('click', () => {
            if (!chatInput.value.trim()) {
                chatInput.value = "Por favor, olhe como a página está ficando. Pode corrigir a formatação?";
            }
            this.sendMessage(true);
        });

        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage(false);
            }
        });
    },

    setupInspector() {
        const preview = document.getElementById('live-preview');
        preview.addEventListener('click', (e) => {
            // Se clicar em um elemento, seleciona-o para ajuste fino
            e.preventDefault();
            e.stopPropagation();

            // Limpa seleção anterior
            if (this.selectedElement) {
                this.selectedElement.classList.remove('element-selected');
            }

            this.selectedElement = e.target;
            this.selectedElement.classList.add('element-selected');

            const tagName = this.selectedElement.tagName.toLowerCase();
            this.addMessage(`🎯 Elemento **${tagName}** selecionado. Peça no chat para mudar cor, fonte ou texto dele.`);
        });
    },

    addMessage(text, isUser = false) {
        const chatHistory = document.getElementById('chat-history');
        const msgDiv = document.createElement('div');
        msgDiv.style.padding = '10px 15px';
        msgDiv.style.borderRadius = isUser ? '10px 10px 0 10px' : '10px 10px 10px 0';
        msgDiv.style.alignSelf = isUser ? 'flex-end' : 'flex-start';
        msgDiv.style.maxWidth = '85%';
        msgDiv.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
        
        if (isUser) {
            msgDiv.style.background = '#1e293b';
            msgDiv.style.color = 'white';
            msgDiv.innerHTML = `<strong>Você:</strong><br>${text.replace(/\n/g, '<br>')}`;
        } else {
            msgDiv.style.background = '#e0f2fe';
            msgDiv.style.color = '#0369a1';
            
            // Formatando blocos de código HTML
            let formattedText = text.replace(/```html([\s\S]*?)```/g, (match, p1) => {
                return `<br><br><div style="background:#1e293b; color:#fbbf24; padding:10px; border-radius:5px; font-family:monospace; font-size:12px; overflow-x:auto;">${p1.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
                <button onclick="window.injectCode(this)" data-code="${encodeURIComponent(p1)}" style="margin-top:5px; padding:5px; background:#6366f1; color:white; border:none; border-radius:4px; cursor:pointer;">⚡ Injetar no Preview</button><br><br>`;
            });

            // Formatando markdown básico
            formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            msgDiv.innerHTML = `<strong>NeuroEngine:</strong><br>${formattedText}`;
        }
        
        chatHistory.appendChild(msgDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    },

    async sendMessage(hasScreenshot = false) {
        const chatInput = document.getElementById('chat-input');
        const btnSend = document.getElementById('btn-send-chat');
        const btnSnap = document.getElementById('btn-snap-error');
        const livePreview = document.getElementById('live-preview');
        const keyword = document.getElementById('ai-studio-keyword').value;

        const message = chatInput.value.trim();
        if (!message) return;

        chatInput.value = '';
        
        if (hasScreenshot) {
            this.addMessage(message + "<br><em>📸 (Anexou Visualização da Tela)</em>", true);
            btnSnap.innerHTML = '⚙️ Processando...';
            btnSnap.disabled = true;
        } else {
            this.addMessage(message, true);
            btnSend.innerHTML = '⚙️ Processando...';
            btnSend.disabled = true;
        }

        const formData = new FormData();
        
        // CONSTRUÇÃO DO PROMPT COM CONTEXTO
        let promptContext = message;
        
        // 1. Contexto de Keyword SEO
        if (keyword) {
            promptContext += `\n\n[FOCO SEO]: A keyword prioritária é "${keyword}". Use-a estrategicamente conforme o Método Abidos.`;
        }

        // 2. Contexto de Ajuste Fino (Elemento Selecionado)
        if (this.selectedElement) {
            const elHtml = this.selectedElement.outerHTML;
            promptContext += `\n\n[AJUSTE FINO]: O usuário selecionou este elemento: \n${elHtml}\nAltere apenas este elemento ou o bloco sugerido.`;
        }

        formData.append('message', promptContext);
        
        // 3. Contexto da Página Inteira
        const currentHtml = livePreview.innerHTML;
        if(currentHtml.trim().length > 0 && !currentHtml.includes('Crie algo novo')) {
            formData.append('htmlContext', currentHtml);
        }

        try {
            if (hasScreenshot && window.html2canvas) {
                const canvas = await html2canvas(livePreview);
                const blob = await new Promise(resolve => canvas.toBlob(resolve));
                formData.append('screenshot', blob, 'preview.png');
            }
            
            const response = await fetch('http://localhost:3001/api/chat', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            
            if (data.reply) {
                this.addMessage(data.reply, false);
            } else {
                this.addMessage("Desculpe, deu um erro interno na IA.", false);
            }
        } catch (error) {
            console.error(error);
            this.addMessage("Erro de conexão com o terminal IA (Port 3001).", false);
        } finally {
            btnSend.innerHTML = 'Enviar Comando';
            btnSnap.innerHTML = '📸 Enviar Visualização p/ IA';
            btnSend.disabled = false;
            btnSnap.disabled = false;
        }
    },

    // --- WP INTEGRATION ---

    async loadList() {
        const typeSelect = document.getElementById('ai-studio-type');
        const itemSelect = document.getElementById('ai-studio-item');
        const type = typeSelect.value;
        
        itemSelect.innerHTML = '<option>Carregando...</option>';
        itemSelect.style.display = 'block';

        const data = await wpAPI.fetchContent(type);
        
        if(!data || data.length === 0) {
            itemSelect.innerHTML = '<option>Nenhum item encontrado.</option>';
            return;
        }

        itemSelect.innerHTML = '<option value="">-- Selecione para Editar --</option>';
        data.forEach(item => {
            const title = item.title && item.title.rendered ? item.title.rendered : `Sem Título #${item.id}`;
            itemSelect.innerHTML += `<option value="${item.id}">${title}</option>`;
        });
        
        document.getElementById('ai-studio-load-btn')?.remove(); // Not needed if we use onchange or separate btn
        // Let's keep a Load Button for safety
        const existingBtn = document.getElementById('ai-studio-load-btn');
        if(!existingBtn) {
            const btn = document.createElement('button');
            btn.id = 'ai-studio-load-btn';
            btn.className = 'btn btn-primary';
            btn.style.padding = '5px 10px';
            btn.innerText = '📥 Carregar';
            btn.onclick = () => this.loadItem();
            itemSelect.after(btn);
        }
    },

    async loadItem() {
        const type = document.getElementById('ai-studio-type').value;
        const id = document.getElementById('ai-studio-item').value;
        if(!id) return;

        const titleSpan = document.getElementById('ai-studio-title');
        titleSpan.innerText = `Baixando...`;

        const data = await wpAPI.getContent(type, id);
        if(data) {
            this.currentItemId = id;
            this.currentType = type;
            document.getElementById('live-preview').innerHTML = data.content.rendered;
            titleSpan.innerText = `Editando: ${data.title.rendered}`;
            
            document.getElementById('ai-studio-new-title').style.display = 'none';
            document.getElementById('ai-studio-suggest-btn').style.display = 'none';
            document.getElementById('ai-studio-preview-btn').style.display = 'block';
            document.getElementById('ai-studio-item').style.display = 'block';
            
            this.updateAbidusScore();
            this.addMessage(`Carreguei **${data.title.rendered}**. O que deseja ajustar?`);
        }
    },

    createNew() {
        this.currentItemId = null;
        this.currentType = document.getElementById('ai-studio-type').value;
        
        document.getElementById('ai-studio-item').style.display = 'none';
        const titleInput = document.getElementById('ai-studio-new-title');
        titleInput.style.display = 'block';
        titleInput.value = "";
        titleInput.focus();
        
        document.getElementById('ai-studio-suggest-btn').style.display = 'block';
        document.getElementById('live-preview').innerHTML = '<h1 style="color: #1a202c; font-size: 24px; text-align: center; margin-top: 50px; opacity: 0.5;">Comece a escrever seu novo rascunho ou peça para a IA...</h1>';
        document.getElementById('ai-studio-title').innerText = "Novo Rascunho";
        
        this.addMessage(`Pronto! Digite o título e use os botões de prompts rápidos para começar.`);
    },

    async saveToWP() {
        const titleInput = document.getElementById('ai-studio-new-title');
        const isNew = !this.currentItemId;
        const newTitle = titleInput.value.trim();
        const type = document.getElementById('ai-studio-type').value;

        if (isNew && !newTitle) return alert("Digite um título.");

        const htmlContent = document.getElementById('live-preview').innerHTML;
        const result = await wpAPI.saveContent(type, { content: htmlContent, title: isNew ? newTitle : undefined, status: "draft" }, this.currentItemId);
        
        if(result && result.id) {
            this.currentItemId = result.id;
            this.currentType = type;
            titleInput.style.display = 'none';
            document.getElementById('ai-studio-suggest-btn').style.display = 'none';
            document.getElementById('ai-studio-preview-btn').style.display = 'block';
            document.getElementById('ai-studio-title').innerText = `Rascunho: ${result.title.rendered || newTitle}`;
            alert("Rascunho salvo!");
        }
    },

    // --- ANALYTICS & TOOLS ---

    async suggestTitle() {
        const type = document.getElementById('ai-studio-type').value;
        const keyword = document.getElementById('ai-studio-keyword').value || "TEA em Adultos";
        
        const prompt = `Atue como um Especialista em Copywriting de Conversão (Método Abidos).
Sua tarefa é sugerir EXATAMENTE UM (1) título de impacto para um(a) ${type === 'pages' ? 'Página' : 'Post'}.
O foco deve ser a keyword: "${keyword}".
REGRAS CRÍTICAS:
1. NÃO use a palavra "Abidos" no título. Ela é apenas a sua metodologia interna.
2. O título deve focar na DOR do paciente (TEA, Mascaramento, Burnout ou Suspeita).
3. Deve incluir autoridade (especialista, instituto) ou localização (Goiânia) se couber.
4. O resultado deve ser direto, curto e persuasivo.
5. RETORNE APENAS O TEXTO DO TÍTULO, sem comentários, explicações ou listas.`;

        const suggestion = await gemini.callAPI(prompt);
        if(suggestion) {
            // Limpa qualquer aspa ou prefixo que a IA possa ter colocado
            const cleanTitle = suggestion.replace(/^["']|["']$/g, '').trim();
            document.getElementById('ai-studio-new-title').value = cleanTitle;
            this.addMessage(`💡 Sugestão de Título: **"${cleanTitle}"**`);
        }
    },

    toggleChecklist() {
        const panel = document.getElementById('abidus-checklist-panel');
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    },

    updateAbidusScore() {
        const html = document.getElementById('live-preview').innerHTML;
        const text = document.getElementById('live-preview').innerText;
        let score = 0;
        let suggestions = [];

        const checks = {
            'check-seo': text.toLowerCase().includes('goiânia'),
            'check-eat': ['crp', 'crm', 'psicó', 'especialista'].some(k => text.toLowerCase().includes(k)),
            'check-pain': ['tea', 'autismo', 'masking', 'burnout'].some(k => text.toLowerCase().includes(k)),
            'check-cta': html.toLowerCase().includes('href') && (html.toLowerCase().includes('whatsapp') || html.toLowerCase().includes('agende')),
            'check-keyword': html.toLowerCase().includes('hipnolawrence.com')
        };

        // Custom label for checklist items to show what they are
        const labels = {
            'check-seo': 'SEO Local (Goiânia)',
            'check-eat': 'Autoridade (E-E-A-T)',
            'check-pain': 'Foco na Dor (TEA/Adulto)',
            'check-cta': 'Conversão (WhatsApp)',
            'check-keyword': 'Link Interno (Home)'
        };

        Object.keys(checks).forEach(id => {
            const el = document.getElementById(id);
            if(el) {
                if(checks[id]) {
                    score += 20;
                    el.style.color = '#059669';
                    el.innerHTML = `✅ ${labels[id]}`;
                } else {
                    el.style.color = '#dc2626';
                    el.innerHTML = `❌ ${labels[id]}`;
                }
            }
        });

        document.getElementById('abidus-progress').style.width = score + '%';
        document.getElementById('abidus-percentage').innerText = score + '%';
    },

    runQuickPrompt(type) {
        const keyword = document.getElementById('ai-studio-keyword').value || "TEA em Adultos";
        const prompts = {
            hero: `Crie uma dobra Hero (Header) focada em conversão para "${keyword}". Regra: Título de impacto focado na dor do paciente, subtexto de autoridade e um botão de CTA para WhatsApp em Goiânia. NUNCA use a palavra Abidos no texto. OBRIGATÓRIO: Inclua um link orgânico para a home em www.hipnolawrence.com.`,
            social: `Gere uma seção de depoimentos de pacientes adultos com TEA. Use um design limpo e inclua um link sutil para 'Conhecer nossa história' levando a www.hipnolawrence.com. NUNCA cite a palavra Abidos.`,
            faq: `Crie um FAQ quebra-objeções focado em TEA Adulto e Hipnose. As respostas devem ser acolhedoras e citar a página inicial www.hipnolawrence.com para mais detalhes sobre a clínica.`,
            eeat: `Crie uma seção 'Sobre o Especialista' focada no Dr. Victor Lawrence, CRM/CRP e especialidade em Autismo Feminino. Inclua um botão 'Voltar para a Home' para www.hipnolawrence.com.`,
            cta: `Crie um botão flutuante de WhatsApp animado e um link de rodapé contextualizado para www.hipnolawrence.com.`
        };
        const input = document.getElementById('chat-input');
        input.value = prompts[type];
        this.sendMessage();
    },

    async analyzeConversion() {
        this.addMessage("⚙️ Iniciando Auditoria Abidos CRO...", false);
        const html = document.getElementById('live-preview').innerHTML;
        const prompt = `Analise este HTML sob a ótica do Método Abidos (Conversão em Saúde). CRITIQUE: Contraste de botões, clareza da promessa e E-E-A-T. Aponte 3 melhorias código:\n\n${html}`;
        const critique = await gemini.callAPI(prompt);
        if(critique) this.addMessage(`🔍 **Crítica CRO:**\n\n${critique}`);
    },

    previewDraft() {
        if (!this.currentItemId) return alert("Salve primeiro.");
        const baseUrl = wpAPI.url.replace('/wp-json/wp/v2', '');
        window.open(`${baseUrl}/?p=${this.currentItemId}&preview=true`, '_blank');
    }
};

// Global Helpers
window.injectCode = function(btn) {
    const code = decodeURIComponent(btn.getAttribute('data-code'));
    document.getElementById('live-preview').innerHTML = code;
    window.chatApp.updateAbidusScore();
};

document.addEventListener('DOMContentLoaded', () => window.chatApp.init());
