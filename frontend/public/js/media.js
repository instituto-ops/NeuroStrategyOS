const mediaLibrary = {
    pendingFiles: [],
    currentFile: null,
    usageCache: {}, 
    selectedMedia: null, 

    init() {
        this.bindEvents();
        this.loadLibrary();
    },

    bindEvents() {
        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('media-upload-input');

        if (dropZone) {
            dropZone.onclick = (e) => {
                if (e.target.id === 'drop-zone' || e.target.parentElement?.id === 'drop-zone') {
                    fileInput.click();
                }
            };
            dropZone.ondragover = (e) => { e.preventDefault(); dropZone.style.borderColor = 'var(--color-secondary)'; };
            dropZone.ondragleave = () => { dropZone.style.borderColor = 'var(--color-border)'; };
            dropZone.ondrop = (e) => {
                e.preventDefault();
                dropZone.style.borderColor = 'var(--color-border)';
                this.handleFiles(e.dataTransfer.files);
            };
        }
        if (fileInput) fileInput.onchange = (e) => this.handleFiles(e.target.files);
    },

    async loadLibrary() {
        const container = document.getElementById('media-list-container');
        if (!container) return;

        // Não limpamos tudo para evitar o flash irritante se já houver mídias
        if (container.children.length === 0) {
            container.innerHTML = '<p style="text-align: center; grid-column: 1/-1; opacity: 0.5;">Sincronizando...</p>';
        }
        
        try {
            const [media, pages, posts] = await Promise.all([
                wpAPI.fetchMedia(100),
                wpAPI.fetchContent('pages', true),
                wpAPI.fetchContent('posts', true)
            ]);
            
            this.usageCache = {};
            [...pages, ...posts].forEach(item => {
                const content = item.content ? item.content.rendered : "";
                const featuredId = item.featured_media;
                if (Array.isArray(media)) {
                    media.forEach(m => {
                        if (content.includes(m.source_url) || featuredId === m.id) {
                            if (!this.usageCache[m.source_url]) this.usageCache[m.source_url] = [];
                            const title = item.title.rendered || `Conteúdo #${item.id}`;
                            if (!this.usageCache[m.source_url].includes(title)) this.usageCache[m.source_url].push(title);
                        }
                    });
                }
            });

            container.innerHTML = '';
            
            // Injetar ícones locais primeiro
            this.renderLocalIcons();

            media.forEach(item => {
                const hasAlt = item.alt_text && item.alt_text.trim().length > 0;
                const altMatch = ["Psicólogo", "TEA", "Goiânia", "Lawrence"].some(k => (item.alt_text||"").toLowerCase().includes(k.toLowerCase()));
                const isSelected = this.selectedMedia && item.id === this.selectedMedia.id;
                
                const titleLower = item.title.rendered.toLowerCase();
                const hasBadTitle = titleLower.includes(".jpg") || titleLower.includes(".png") || /^\d+$/.test(titleLower.replace(/\D/g, ''));
                const needsSEO = !hasAlt || hasBadTitle;

                const card = document.createElement('div');
                card.className = `card media-thumb-card ${isSelected ? 'selected' : ''}`;
                card.id = `media-card-${item.id}`;
                card.style.cssText = `
                    padding: 8px; cursor: pointer; 
                    border: 2px solid ${isSelected ? 'var(--color-secondary)' : (altMatch ? '#22c55e' : (hasAlt && !needsSEO ? '#cbd5e1' : '#f43f5e'))};
                    transition: all 0.2s; position: relative; height: 160px;
                    ${isSelected ? 'transform: scale(1.02); box-shadow: 0 0 10px rgba(14, 165, 233, 0.3);' : ''}
                `;
                
                // Allow clicking the card itself to select, but not if clicking the fix button
                card.onclick = (e) => {
                    if(!e.target.closest('button')) this.selectMedia(item);
                }
                
                let bageHtml = `<div style="position: absolute; top: 4px; right: 4px; z-index: 5;">${altMatch ? '✅' : (hasAlt && !needsSEO ? '⚠️' : '<span style="background: #f43f5e; color: white; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: bold;">🚨 Falha SEO</span>')}</div>`;
                
                let fixBtnHtml = '';
                if(needsSEO) {
                    fixBtnHtml = `<div style="position: absolute; bottom: 0; left: 0; right: 0; padding: 4px; background: rgba(0,0,0,0.8); text-align: center;">
                        <button id="btn-fix-${item.id}" onclick="window.mediaLibrary.fixSEO(${item.id}, '${item.source_url}')" class="btn" style="background: #f59e0b; color: white; font-size: 10px; padding: 4px 8px; width: 100%; font-weight: bold;">🪄 Corrigir SEO (IA)</button>
                    </div>`;
                } else {
                    fixBtnHtml = `<div style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.6); color: white; font-size: 9px; padding: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${item.title.rendered}
                    </div>`;
                }

                card.innerHTML = `
                    ${bageHtml}
                    <img src="${item.source_url}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px;">
                    ${fixBtnHtml}
                `;
                container.appendChild(card);
            });

        } catch (error) { 
            console.error(error); 
            // Se falhar o WP, tenta carregar apenas os locais para não ficar vazio
            this.renderLocalIcons();
        }
    },

    renderLocalIcons() {
        const container = document.getElementById('media-list-container');
        if (!container) return;
        
        const localIcons = [
            { id: 'icon-1', source_url: '/img/icon-1.svg', title: { rendered: '🧠 Neuro/Cérebro' }, alt_text: 'Ícone Cérebro' },
            { id: 'icon-2', source_url: '/img/icon-2.svg', title: { rendered: '🧬 Genética/Biologia' }, alt_text: 'Ícone DNA' },
            { id: 'icon-3', source_url: '/img/icon-3.svg', title: { rendered: '🛡️ Proteção/Segurança' }, alt_text: 'Ícone Escudo' },
            { id: 'icon-4', source_url: '/img/icon-4.svg', title: { rendered: '📊 Dados/Análise' }, alt_text: 'Ícone Gráfico' },
            { id: 'icon-5', source_url: '/img/icon-5.svg', title: { rendered: '🤝 Empatia/Apoio' }, alt_text: 'Ícone Mãos' },
            { id: 'icon-6', source_url: '/img/icon-6.svg', title: { rendered: '⏰ Tempo/Pontualidade' }, alt_text: 'Ícone Relógio' },
            { id: 'icon-7', source_url: '/img/icon-7.svg', title: { rendered: '💡 Insight/Ideia' }, alt_text: 'Ícone Lâmpada' },
            { id: 'icon-8', source_url: '/img/icon-8.svg', title: { rendered: '✅ Conclusão/OK' }, alt_text: 'Ícone Check' },
            { id: 'icon-9', source_url: '/img/icon-9.svg', title: { rendered: '🚀 Evolução/Foco' }, alt_text: 'Ícone Foguete' },
            { id: 'icon-10', source_url: '/img/icon-10.svg', title: { rendered: '📍 Localização/Goiânia' }, alt_text: 'Ícone Pin' },
            { id: 'icon-11', source_url: '/img/icon-11.svg', title: { rendered: '📞 Contato/WhatsApp' }, alt_text: 'Ícone Telefone' },
            { id: 'icon-12', source_url: '/img/icon-12.svg', title: { rendered: '🏢 Clínica/Ambiente' }, alt_text: 'Ícone Prédio' },
            { id: 'icon-13', source_url: '/img/icon-13.svg', title: { rendered: '🔍 Pesquisa Clínica' }, alt_text: 'Ícone Lupa' },
            { id: 'icon-14', source_url: '/img/icon-14.svg', title: { rendered: '🧘 Equilíbrio/Paz' }, alt_text: 'Ícone Zen' },
            { id: 'icon-15', source_url: '/img/icon-15.svg', title: { rendered: '🏆 Sucesso' }, alt_text: 'Ícone Troféu' }
        ];

        localIcons.forEach(item => {
            const card = document.createElement('div');
            card.className = `card media-thumb-card`;
            card.style.cssText = `padding: 8px; cursor: pointer; border: 2px solid #3b82f6; border-radius: 8px; height: 120px; text-align: center; background: #f8fafc;`;
            card.onclick = () => this.selectMedia(item);
            card.innerHTML = `
                <div style="background: white; border-radius: 6px; padding: 10px; margin-bottom: 5px;">
                    <img src="${item.source_url}" style="width: 40px; height: 40px;">
                </div>
                <div style="font-size: 10px; color: #1e293b; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${item.title.rendered}
                </div>
                <div style="font-size: 8px; color: #64748b;">📍 Local/Ícone</div>
            `;
            container.appendChild(card);
        });
    },

    async fixSEO(id, url) {
        const btn = document.getElementById(`btn-fix-${id}`);
        if(btn) {
            btn.innerHTML = '⏳ Analisando...';
            btn.disabled = true;
        }

        try {
            // Usa o Gemini para analisar a foto pela URL
            const prompt = `Atue como Especialista SEO para Psicólogos (Método Abidos). Analise esta imagem URL (${url}). Crie um Título curto (max 40) e um Alt Text rico (max 100) focando em TEA, Psicologia, Goiânia ou Victor Lawrence. Retorne APENAS um JSON válido no formato: {"title": "Titulo", "alt_text": "Alt text"}. Não use blocos \`\`\`.`;
            
            const responseTxt = await gemini.callAPI(prompt);
            if (!responseTxt) throw new Error("A IA não retornou uma resposta válida.");
            
            // Tenta parsear o JSON retornado pela LLM
            const cleanJson = responseTxt.replace(/```json/g, '').replace(/```/g, '').trim();
            const newSeo = JSON.parse(cleanJson);

            if(newSeo && newSeo.title && newSeo.alt_text) {
                const result = await wpAPI.updateMediaSEO(id, newSeo.title, newSeo.alt_text);
                
                if(result) {
                    if(btn) {
                        btn.style.background = '#10b981';
                        btn.innerHTML = '✅ Otimizado';
                    }
                    // Atualiza a galeria em background
                    setTimeout(() => { this.loadLibrary(false); }, 1500); 
                } else {
                    throw new Error("Falha ao salvar no WP.");
                }
            } else {
                throw new Error("LLM retornou JSON inválido.");
            }
        } catch(e) {
            console.error("Batch Fix Error:", e);
            if(btn) {
                btn.innerHTML = '⚠️ Erro IA';
                btn.style.background = '#ef4444';
            }
            alert("Não foi possível otimizar esta mídia: " + e.message);
        } finally {
            if(btn) btn.disabled = false;
        }
    },

    async fixGallerySEO() {
        if(!confirm("Deseja iniciar a otimização em lote? O sistema enviará cada mídia sem SEO para a IA uma a uma. Isso pode levar alguns minutos.")) return;
        
        // Localiza todos os botões de correção visíveis na tela
        const fixButtons = document.querySelectorAll('[id^="btn-fix-"]');
        
        if(fixButtons.length === 0) {
            alert("A galeria atual já está 100% otimizada!");
            return;
        }

        const btnStatus = document.querySelector('button[onclick*="fixGallerySEO"]');
        const originalText = btnStatus.innerText;

        for(let i=0; i<fixButtons.length; i++) {
            const btn = fixButtons[i];
            
            // Só processa botões que ainda não foram otimizados/erros gravíssimos
            if (btn.innerText.includes("Corrigir") || btn.innerText.includes("Erro")) {
                const clickRegex = /fixSEO\((\d+),\s*'([^']+)'\)/;
                const match = btn.getAttribute('onclick').match(clickRegex);
                
                if (match) {
                    const mediaId = match[1];
                    const mediaUrl = match[2];
                    
                    btnStatus.innerText = `⏳ Otimizando ${i+1}/${fixButtons.length}...`;
                    btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    
                    // Aguarda a resolução da imagem atual antes de passar pra próxima (Evitar Rate Limit do Gemini)
                    await this.fixSEO(mediaId, mediaUrl);
                    
                    // Pequeno delay entre requisições
                    await new Promise(r => setTimeout(r, 2000));
                }
            }
        }
        
        btnStatus.innerText = originalText;
        alert("Otimização em Lote concluída!");
        this.loadLibrary(true);
    },

    selectMedia(item) {
        this.selectedMedia = item;
        const panel = document.getElementById('media-editor-panel');
        const emptyState = document.getElementById('editor-empty-state');
        const activeState = document.getElementById('editor-active-state');
        
        panel.style.display = 'flex'; // Mudado para flex para manter estrutura
        emptyState.style.display = 'none';
        activeState.style.display = 'block';

        document.getElementById('edit-panel-preview').src = item.source_url;
        document.getElementById('edit-panel-title').value = item.title.rendered;
        document.getElementById('edit-panel-alt').value = item.alt_text || '';
        
        const usage = this.usageCache[item.source_url];
        const usageBox = document.getElementById('edit-panel-usage');
        usageBox.innerHTML = usage ? 
            `<small style="color: #0369a1; font-weight: bold;">🔗 Em uso em: ${usage.join(', ')}</small>` : 
            `<small style="color: #9a3412; font-weight: bold;">⚠️ Mídia Órfã (Sem uso detectado)</small>`;

        // Atualiza a galeria visualmente apenas (para mostrar a borda de seleção)
        this.renderGallerySelection();
    },

    renderGallerySelection() {
        // Em vez de recarregar tudo do servidor, apenas atualizamos as bordas no DOM atual
        const cards = document.querySelectorAll('.media-thumb-card');
        // No entanto, para simplicidade e precisão (metadados podem ter mudado), 
        // chamamos loadLibrary mas SEM o flash de loading
        this.loadLibrary();
    },

    async saveMediaPanel() {
        if (!this.selectedMedia) return;
        const title = document.getElementById('edit-panel-title').value;
        const alt = document.getElementById('edit-panel-alt').value;
        
        // Corrigido: Não usar 'event.currentTarget' que pode ser nulo em chamadas async
        const btn = document.querySelector('#editor-active-state .btn-primary');
        const originalText = btn.innerText;
        btn.innerText = "⏳ Salvando..."; btn.disabled = true;

        const result = await wpAPI.updateMedia(this.selectedMedia.id, { title, alt_text: alt });
        if (result) {
            alert("Otimização Abidos Salva!");
            this.loadLibrary();
        }
        btn.innerText = originalText; btn.disabled = false;
    },

    async suggestTitleIA_Panel() {
        if (!this.selectedMedia) return;
        const alt = document.getElementById('edit-panel-alt').value;
        const btn = document.querySelector('button[onclick*="suggestTitleIA_Panel"]');
        const originalText = btn.innerText;
        
        btn.innerText = "⏳..."; btn.disabled = true;
        try {
            const suggestion = await gemini.callAPI(`Atue como Especialista Abidos. Gere um título curto e estratégico (max 40 chars) para imagem com este Alt Text: "${alt}". Retorne apenas o nome limpo.`);
            if (suggestion) {
                document.getElementById('edit-panel-title').value = suggestion.replace(/^["']|["']$/g, '').trim();
            }
        } catch(e) { console.error(e); }
        btn.innerText = originalText; btn.disabled = false;
    },

    async suggestAltIA_Panel() {
        if (!this.selectedMedia) return;
        const title = document.getElementById('edit-panel-title').value;
        const btn = document.querySelector('button[onclick*="suggestAltIA_Panel"]');
        const originalText = btn.innerText;

        btn.innerText = "⏳..."; btn.disabled = true;
        try {
            const suggestion = await gemini.callAPI(`Atue como Especialista Abidos. Gere um Alt Text estratégico (max 120 chars) para a imagem: "${title}". Use 'Psicólogo Victor Lawrence' ou 'Goiânia' se apropriado. Retorne apenas o texto puro.`);
            if (suggestion) {
                document.getElementById('edit-panel-alt').value = suggestion.replace(/^["']|["']$/g, '').trim();
            }
        } catch(e) { console.error(e); }
        btn.innerText = originalText; btn.disabled = false;
    },

    async deleteMediaPanel() {
        if (!this.selectedMedia) return;
        if (confirm(`Excluir permanentemente "${this.selectedMedia.title.rendered}"?`)) {
            const result = await wpAPI.deleteMedia(this.selectedMedia.id);
            if (result) {
                document.getElementById('editor-active-state').style.display = 'none';
                document.getElementById('editor-empty-state').style.display = 'block';
                this.selectedMedia = null;
                this.loadLibrary();
            }
        }
    },

    copyToClipboardPanel() {
        if (this.selectedMedia) {
            navigator.clipboard.writeText(this.selectedMedia.source_url).then(() => alert("URL Copiada!"));
        }
    },

    handleFiles(files) {
        this.pendingFiles = Array.from(files);
        this.showNextFile();
    },

    async showNextFile() {
        if (this.pendingFiles.length === 0) return;
        this.currentFile = this.pendingFiles.shift();
        const modal = document.getElementById('upload-modal');
        document.getElementById('modal-img-preview').src = URL.createObjectURL(this.currentFile);
        document.getElementById('upload-title').value = this.currentFile.name.split('.')[0];
        modal.style.display = 'flex';
        
        const suggestion = await gemini.callAPI(`Gere Alt SEO para imagem: "${this.currentFile.name}".`);
        document.getElementById('upload-alt').value = suggestion ? suggestion.replace(/^["']|["']$/g, '').trim() : "";
    },

    async processUpload() {
        const title = document.getElementById('upload-title').value;
        const alt = document.getElementById('upload-alt').value;
        const result = await wpAPI.uploadMedia(this.currentFile, alt, title);
        if (result) {
            document.getElementById('upload-modal').style.display = 'none';
            this.loadLibrary();
            if (this.pendingFiles.length > 0) this.showNextFile();
        }
    },

    closeModal() {
        document.getElementById('upload-modal').style.display = 'none';
        this.currentFile = null;
    }
};

window.mediaLibrary = mediaLibrary;
document.addEventListener('DOMContentLoaded', () => mediaLibrary.init());
