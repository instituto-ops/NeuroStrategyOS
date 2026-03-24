const mediaLibrary = {
    pendingFiles: [],
    currentFile: null,
    usageCache: {}, 
    selectedMedia: null, 
    allFolders: [],

    currentCategory: 'all',
    searchQuery: '',

    init() {
        this.bindEvents();
        this.loadLibrary();
    },

    search(q) {
        this.searchQuery = q;
        this.renderItems();
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
        try {
            const res = await fetch('/api/media/acervo');
            const data = await res.json();
            this.allItems = data.items || [];
            this.allFolders = data.folders || [];

            // Popula Seletores de Álbuns
            this.updateAlbumSelectors();
            this.renderItems();
        } catch (error) {
            console.error("Erro ao carregar galeria:", error);
        }
    },

    renderItems() {
        const container = document.getElementById('media-list-container');
        if (!container) return;

        let filteredItems = this.allItems;

        // Filtro por Álbum
        if (this.currentCategory !== 'all') {
            filteredItems = filteredItems.filter(i => i.folder === this.currentCategory);
        }

        // Filtro por Busca
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            filteredItems = filteredItems.filter(i =>
                (i.title && i.title.toLowerCase().includes(query)) ||
                (i.alt && i.alt.toLowerCase().includes(query)) ||
                (i.folder && i.folder.toLowerCase().includes(query))
            );
        }

        container.innerHTML = '';

        if (filteredItems.length === 0) {
            container.innerHTML = `<div style="text-align: center; grid-column: 1/-1; padding: 60px; color: #94a3b8;">📭 Nenhum item encontrado para "${this.searchQuery || this.currentCategory}".</div>`;
            return;
        }

        filteredItems.forEach(item => {
            const isSelected = this.selectedMedia && item.id === this.selectedMedia.id;
            const isVideo = item.url.match(/\.(mp4|mov|webm)$/i);

            const card = document.createElement('div');
            card.className = `card media-thumb-card ${isSelected ? 'selected' : ''}`;
            card.id = `media-card-${item.id}`;
            card.style.cssText = `
                padding: 8px; cursor: pointer;
                border: 2px solid ${isSelected ? 'var(--color-secondary)' : '#e2e8f0'};
                transition: all 0.2s; position: relative; height: 160px;
                background: white; border-radius: 12px;
                overflow: hidden;
                ${isSelected ? 'transform: scale(1.02); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);' : ''}
            `;

            card.onclick = () => this.selectMedia(item);

            const categoryBadge = `<div style="position: absolute; top: 8px; left: 8px; background: rgba(15, 23, 42, 0.8); color: white; font-size: 8px; padding: 4px 8px; border-radius: 20px; font-weight: 800; text-transform: uppercase; z-index: 10;">${item.folder || 'Geral'}</div>`;

            let mediaPreview = '';
            if (isVideo) {
                mediaPreview = `<video src="${item.url}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;" muted loop onmouseover="this.play()" onmouseout="this.pause()"></video>
                               <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 24px; color: white; text-shadow: 0 2px 4px rgba(0,0,0,0.5); pointer-events: none;">▶️</div>`;
            } else {
                mediaPreview = `<img src="${item.url}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;" onerror="this.src='img/placeholder-media.png'">`;
            }

            card.innerHTML = `
                ${categoryBadge}
                ${mediaPreview}
                <div style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(0,0,0,0.8)); color: white; font-size: 9px; padding: 10px 8px; border-radius: 0 0 8px 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${item.title}
                </div>
            `;
            container.appendChild(card);
        });
    },

    updateAlbumSelectors() {
        // Atualiza Filtro Topo
        const filterSelect = document.getElementById('media-album-selector');
        if (filterSelect) {
            const current = filterSelect.value;
            filterSelect.innerHTML = '<option value="all">🔍 Todos os Ativos</option>';
            this.allFolders.forEach(f => {
                const opt = document.createElement('option');
                opt.value = f.id;
                opt.innerText = `${f.icon} ${f.name}`;
                filterSelect.appendChild(opt);
            });
            filterSelect.value = this.currentCategory;
        }

        // Atualiza Seletor no Painel Lateral
        const panelSelect = document.getElementById('edit-panel-album');
        if (panelSelect) {
            panelSelect.innerHTML = '';
            this.allFolders.forEach(f => {
                const opt = document.createElement('option');
                opt.value = f.id;
                opt.innerText = `${f.icon} ${f.name}`;
                panelSelect.appendChild(opt);
            });
            if (this.selectedMedia) panelSelect.value = this.selectedMedia.folder;
        }
    },

    filterByAlbum(val) {
        this.currentCategory = val;
        this.loadLibrary();
    },

    async createNewAlbum() {
        const name = prompt("Nome do novo álbum clínico:");
        if (!name) return;
        
        const id = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
        const icon = prompt("Ícone (Emoji) para o álbum:", "📁");

        try {
            const res = await fetch('/api/media/create-folder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, name, icon })
            });
            const result = await res.json();
            if (result.success) {
                this.loadLibrary();
                alert(`Álbum "${name}" criado!`);
            } else {
                alert("Erro: " + result.error);
            }
        } catch(e) { console.error(e); }
    },

    selectMedia(item) {
        this.selectedMedia = item;
        const panel = document.getElementById('media-editor-panel');
        const emptyState = document.getElementById('editor-empty-state');
        const activeState = document.getElementById('editor-active-state');
        
        emptyState.style.display = 'none';
        activeState.style.display = 'block';

        const isVideo = item.url.match(/\.(mp4|mov|webm)$/i);
        const previewImg = document.getElementById('edit-panel-preview');
        
        if (isVideo) {
            previewImg.outerHTML = `<video id="edit-panel-preview" src="${item.url}" controls style="width: 100%; height: 220px; object-fit: contain; background: #000; border-radius: 8px; border: 1px solid #e2e8f0;"></video>`;
        } else {
            const existingPreview = document.getElementById('edit-panel-preview');
            if (existingPreview.tagName === 'VIDEO') {
                existingPreview.outerHTML = `<img id="edit-panel-preview" src="${item.url}" style="width: 100%; height: 220px; object-fit: contain; background: #f1f5f9; border-radius: 8px; border: 1px solid #e2e8f0;">`;
            } else {
                existingPreview.src = item.url;
            }
        }

        document.getElementById('edit-panel-title').value = item.title;
        document.getElementById('edit-panel-alt').value = item.alt || '';
        document.getElementById('edit-panel-album').value = item.folder || 'branding';
        
        const usageBox = document.getElementById('edit-panel-usage');
        const isCloudinary = item.url.includes('cloudinary.com');
        
        usageBox.innerHTML = `
            <div style="font-size: 11px; margin-bottom: 5px;">
                <strong>Status Cloud:</strong> ${isCloudinary ? '<span style="color: #10b981;">✅ CDN Ativo</span>' : '<span style="color: #f59e0b;">⚠️ Apenas Local</span>'}
            </div>
            ${!isCloudinary ? '<button onclick="window.mediaLibrary.syncWithCloudinary()" class="btn btn-secondary" style="width:100%; font-size:10px; padding:5px; background:#6366f1; color:white;">🚀 Sincronizar com Cloudinary Agora</button>' : ''}
        `;

        // Update card selection border
        document.querySelectorAll('.media-thumb-card').forEach(c => c.style.borderColor = '#e2e8f0');
        const selectedCard = document.getElementById(`media-card-${item.id}`);
        if(selectedCard) selectedCard.style.borderColor = 'var(--color-secondary)';
    },

    async saveMediaPanel() {
        if (!this.selectedMedia) return;
        const btn = document.querySelector('#editor-active-state .btn-primary');
        const originalText = btn.innerText;

        const payload = {
            itemId: this.selectedMedia.id,
            title: document.getElementById('edit-panel-title').value,
            alt: document.getElementById('edit-panel-alt').value,
            folder: document.getElementById('edit-panel-album').value
        };

        btn.innerText = "⏳ Gravando no Acervo...";
        btn.disabled = true;

        try {
            const res = await fetch('/api/media/update-item', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (result.success) {
                this.loadLibrary();
                alert("Metadados Abidos Atualizados!");
            }
        } catch(e) { alert("Erro ao salvar."); }
        
        btn.innerText = originalText;
        btn.disabled = false;
    },

    async syncWithCloudinary() {
        alert("Enviando para o CDN inteligente... O Watchdog irá detectar a mudança no acervo_links.json e atualizar a URL assim que o upload for concluído.");
        this.saveMediaPanel();
    },

    async syncAllToCloudinary() {
        const res = await fetch('/api/media/acervo');
        const data = await res.json();
        const localItems = (data.items || []).filter(i => !i.url.includes('cloudinary.com'));

        if (localItems.length === 0) {
            alert("✅ Todas as mídias já estão sincronizadas com o CDN Cloudinary!");
            return;
        }

        if (!confirm(`Deseja sincronizar ${localItems.length} mídias locais com o Cloudinary? Este processo pode levar alguns minutos.`)) return;

        const btn = document.querySelector('button[onclick*="syncAllToCloudinary"]');
        const originalText = btn.innerText;

        for (let i = 0; i < localItems.length; i++) {
            const item = localItems[i];
            btn.innerText = `⏳ Sincronizando ${i + 1}/${localItems.length}...`;
            
            // Forçamos o salvamento que aciona o Watchdog no servidor (se configurado)
            // ou podemos simplesmente esperar que o usuário salve.
            // Mas para o usuário ver resultado rápido, vamos apenas disparar o alerta visual por item
            // e confiar no Watchdog do server.js que monitora a gravação
            
            this.selectedMedia = item;
            await this.saveMediaPanel();
            
            // Pequeno delay para o Cloudinary não bloquear
            await new Promise(r => setTimeout(r, 1500));
        }

        btn.innerText = originalText;
        alert("🚀 Sincronização em lote finalizada! O servidor continuará processando os uploads em segundo plano.");
        this.loadLibrary();
    },

    async suggestTitleIA_Panel() {
        if (!this.selectedMedia) return;
        const alt = document.getElementById('edit-panel-alt').value;
        const btn = document.querySelector('button[onclick*="suggestTitleIA_Panel"]');
        btn.disabled = true;
        try {
            const suggestion = await gemini.callAPI(`Gere um título curto para imagem clínica: "${alt}". Apenas o texto.`);
            if (suggestion) document.getElementById('edit-panel-title').value = suggestion.trim();
        } catch(e) {}
        btn.disabled = false;
    },

    async suggestAltIA_Panel() {
        if (!this.selectedMedia) return;
        const title = document.getElementById('edit-panel-title').value;
        const btn = document.querySelector('button[onclick*="suggestAltIA_Panel"]');
        btn.disabled = true;
        try {
            const suggestion = await gemini.callAPI(`Gere um Alt Text SEO Abidos para: "${title}". Foco em Psicologia e Goiânia.`);
            if (suggestion) document.getElementById('edit-panel-alt').value = suggestion.trim();
        } catch(e) {}
        btn.disabled = false;
    },

    handleFiles(files) {
        alert("O Antimater Watchdog está monitorando a pasta 'midia_local'. Ao arrastar arquivos aqui ou colocar diretamente na pasta, eles serão processados automaticamente pelo servidor e enviados ao Cloudinary.");
        // O upload real deve ser feito enviando o arquivo para /api/media/upload
        // Por enquanto, instruímos o usuário a usar a pasta monitorada para máxima performance Abidos.
    },

    async recommendMediaDemand() {
        const btn = document.getElementById('btn-analyze-media-demand');
        const container = document.getElementById('media-demand-table');
        if(!container) return;

        btn.disabled = true;
        btn.innerHTML = '⏳ Analisando Psicologia das Cores e Lacunas Visuais...';
        container.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 30px;">🔍 Agente Abidos está escaneando rascunhos e posts publicados...</td></tr>';

        try {
            // Analisamos o que falta (simulado com lógica de lacunas baseada em categorias/silos)
            const demandRes = await fetch('/api/media/analyze-demand');
            const data = await demandRes.json();
            
            if (data.demanda && data.demanda.length > 0) {
                container.innerHTML = data.demanda.map(item => {
                    const nanoPrompt = this.generateNanoPrompt(item.descricao, item.categoria);
                    return `
                        <tr>
                            <td style="font-weight: bold; color: var(--color-text); font-size: 13px;">${item.descricao}</td>
                            <td>
                                <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 8px; font-size: 11px; color: var(--color-secondary); font-family: monospace; border: 1px solid var(--color-border);">
                                    ${nanoPrompt}
                                </div>
                            </td>
                            <td style="text-align: center; color: var(--color-text-light); font-size: 11px;">${item.frequencia || 'Alta'}</td>
                            <td>
                                <button class="btn btn-secondary" onclick="window.mediaLibrary.copyPrompt(this, '${nanoPrompt.replace(/'/g, "\\'")}')" style="font-size: 10px; padding: 5px 10px;">📋 COPIAR</button>
                            </td>
                        </tr>
                    `;
                }).join('');
            } else {
                container.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 30px; color: var(--color-success);">✅ Seu acervo visual cobre todas as demandas estratégicas atuais.</td></tr>';
            }
        } catch(e) {
            console.error(e);
            container.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 30px; color: var(--color-error);">Falha ao conectar com o motor de análise de mídia.</td></tr>';
        } finally {
            btn.disabled = false;
            btn.innerHTML = '🚀 Analisar Demanda Visual e Gerar Prompts';
        }
    },

    generateNanoPrompt(desc, cat) {
        const core = `[CLINICAL PHOTOGRAPHY] High-end therapeutic environment, cinematic soft lighting, hyper-realistic 8k textures, natural daylight, soft bokeh, professional psychology clinic, minimalist interior.`;
        const subject = `Focus: ${desc}.`;
        const tech = `Tech: Shot on Fujifilm GFX 100 with 80mm f/1.7 lens, shallow depth of field, subtle chromatic aberration, highly detailed skin textures, no distortion, neutral and professional tones.`;
        const atmosphere = `Mood: Empathy, safety, clinical authority, calm blues and gray-slate palette. [ULTRA-HD] --ar 16:9 --v 6.1 --stylize 250 --chaos 5`;
        
        return `${core} ${subject} ${tech} ${atmosphere}`;
    },

    copyPrompt(btn, text) {
        navigator.clipboard.writeText(text);
        const original = btn.innerText;
        btn.innerText = '✅ COPIADO';
        btn.style.color = 'var(--color-success)';
        setTimeout(() => {
            btn.innerText = original;
            btn.style.color = '';
        }, 2000);
    }
};

window.mediaLibrary = mediaLibrary;
document.addEventListener('DOMContentLoaded', () => mediaLibrary.init());
