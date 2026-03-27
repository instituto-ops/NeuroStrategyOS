window.acervoManager = {
    paginas: [],
    manualPages: [],
    
    init: function() {
        console.log("🏛️ Acervo de Publicações Inicializado.");
    },

    loadAcervo: async function() {
        const tbody = document.getElementById('acervo-list-body');
        const homeSelect = document.getElementById('acervo-homepage-select');
        const datalist = document.getElementById('planning-slugs-list');

        if (!tbody) return;
        
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: var(--color-text-light);">⌛ Escaneando repositório Next.js...</td></tr>';
        
        try {
            // Carregar páginas do repositório E páginas manuais em paralelo
            const [acervoRes, manualRes] = await Promise.all([
                fetch('/api/acervo/listar'),
                fetch('/api/acervo/manual')
            ]);
            const data = await acervoRes.json();
            const manualData = await manualRes.json();
            
            this.manualPages = manualData.success ? manualData.pages : [];

            if (data.success && data.paginas) {
                this.paginas = data.paginas;
                tbody.innerHTML = '';
                
                // Sort by last modification
                this.paginas.sort((a, b) => new Date(b.ultimaAtualizacao) - new Date(a.ultimaAtualizacao));

                // Populate Homepage Select
                if (homeSelect) {
                    homeSelect.innerHTML = '<option value="">-- Selecione uma Página --</option>';
                    this.paginas.filter(p => p.status === 'PUBLICADO').forEach(p => {
                        const opt = document.createElement('option');
                        opt.value = p.caminhoFisico;
                        opt.innerText = p.title || p.slug;
                        homeSelect.appendChild(opt);
                    });
                }

                // Populate Planning Slugs List
                if (datalist && window.menuSystem && window.menuSystem.silos) {
                    let slugs = new Set();
                    window.menuSystem.silos.forEach(s => {
                        slugs.add('/' + s.slug);
                        s.spokes.forEach(sp => {
                            const spSlug = '/' + sp.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
                            slugs.add(spSlug);
                        });
                    });
                    datalist.innerHTML = Array.from(slugs).map(s => `<option value="${s}">`).join('');
                }

                // Renderizar páginas do repositório
                this.paginas.forEach((page, index) => {
                    const dateObj = new Date(page.ultimaAtualizacao);
                    const formattedDate = dateObj.toLocaleDateString('pt-BR', { hour:'2-digit', minute:'2-digit' });
                    
                    const tr = document.createElement('tr');
                    tr.style.background = 'rgba(255,255,255,0.02)';
                    tr.style.borderRadius = '8px';
                    
                    tr.innerHTML = `
                        <td style="padding: 15px;">
                            <input type="text" id="title-${index}" value="${page.title || ''}" placeholder="Página sem título"
                                style="background: transparent; border: none; border-bottom: 1px solid transparent; color: #fff; font-weight: 800; font-size: 13px; width: 100%; outline: none; transition: border 0.3s;"
                                onfocus="this.style.borderBottomColor='var(--color-primary)'"
                                onblur="this.style.borderBottomColor='transparent'">
                        </td>
                        <td style="padding: 15px;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <input type="text" id="slug-${index}" value="${page.slug}" list="planning-slugs-list"
                                    style="background: rgba(0,0,0,0.3); border: 1px solid var(--color-border); color: var(--color-secondary); font-family: monospace; font-size: 11px; padding: 6px 10px; border-radius: 6px; width: 180px;">
                            </div>
                        </td>
                        <td style="color: var(--color-text-light); font-size: 11px; padding: 15px;">${formattedDate}</td>
                        <td style="padding: 15px;">
                            <select onchange="window.acervoManager.updateStatus('${page.caminhoFisico.replace(/\\/g, '\\\\')}', this.value)"
                                style="font-size: 10px; font-weight: 900; background: ${page.status === 'DRAFT' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)'}; color: ${page.status === 'DRAFT' ? '#f59e0b' : '#10b981'}; border: 1px solid currentColor; border-radius: 4px; padding: 4px 8px; cursor: pointer; text-transform: uppercase;">
                                <option value="PUBLICADO" ${page.status === 'PUBLICADO' ? 'selected' : ''}>🟢 Publicado</option>
                                <option value="DRAFT" ${page.status === 'DRAFT' ? 'selected' : ''}>🟠 Rascunho</option>
                                <option value="ARQUIVADO" ${page.status === 'ARQUIVADO' ? 'selected' : ''}>⚪ Arquivado</option>
                            </select>
                        </td>
                        <td style="padding: 15px; text-align: right;">
                            <div style="display: flex; gap: 8px; justify-content: flex-end;">
                                <button class="btn btn-primary" onclick="acervoManager.savePageChanges(${index}, '${page.caminhoFisico.replace(/\\/g, '\\\\')}')" style="font-size: 10px; padding: 6px 12px; background: #10b981; border: none;" title="Salvar Alterações">💾 SALVAR</button>
                                <button class="btn btn-secondary" onclick="acervoManager.editarPagina('${page.caminhoFisico.replace(/\\/g, '\\\\')}')" style="font-size: 10px; padding: 6px 12px;">📝 EDITAR</button>
                                <a href="https://hipnolawrence.com${page.slug}" target="_blank" class="btn btn-secondary" style="font-size: 10px; padding: 6px 12px; text-decoration: none; color: var(--color-secondary); border-color: var(--color-secondary);" title="Ver Online">🌍 VER</a>
                            </div>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });

                // Renderizar páginas manuais (com badge distinto)
                this.manualPages.forEach((page) => {
                    const dateObj = new Date(page.lastUpdate || page.createdAt);
                    const formattedDate = dateObj.toLocaleDateString('pt-BR', { hour:'2-digit', minute:'2-digit' });
                    const hasHtml = page.htmlContent && page.htmlContent.length > 0;
                    
                    const tr = document.createElement('tr');
                    tr.style.background = 'rgba(99, 102, 241, 0.04)';
                    tr.style.borderRadius = '8px';
                    tr.style.borderLeft = '3px solid var(--color-primary)';
                    
                    tr.innerHTML = `
                        <td style="padding: 15px;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="background: rgba(99, 102, 241, 0.2); color: var(--color-primary); font-size: 8px; font-weight: 900; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px;">🔧 Manual</span>
                                <span style="color: #fff; font-weight: 800; font-size: 13px;">${page.title || 'Sem Título'}</span>
                            </div>
                        </td>
                        <td style="padding: 15px;">
                            <span style="background: rgba(0,0,0,0.3); border: 1px solid var(--color-border); color: var(--color-secondary); font-family: monospace; font-size: 11px; padding: 6px 10px; border-radius: 6px;">${page.slug || '/...'}</span>
                        </td>
                        <td style="color: var(--color-text-light); font-size: 11px; padding: 15px;">${formattedDate}</td>
                        <td style="padding: 15px;">
                            <select onchange="window.acervoManager.updateManualPageStatus('${page.id}', this.value)"
                                style="font-size: 10px; font-weight: 900; background: ${page.status === 'DRAFT' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)'}; color: ${page.status === 'DRAFT' ? '#f59e0b' : '#10b981'}; border: 1px solid currentColor; border-radius: 4px; padding: 4px 8px; cursor: pointer; text-transform: uppercase;">
                                <option value="PUBLICADO" ${page.status === 'PUBLICADO' ? 'selected' : ''}>🟢 Publicado</option>
                                <option value="DRAFT" ${page.status === 'DRAFT' ? 'selected' : ''}>🟠 Rascunho</option>
                            </select>
                        </td>
                        <td style="padding: 15px; text-align: right;">
                            <div style="display: flex; gap: 6px; justify-content: flex-end; flex-wrap: wrap;">
                                <button class="btn btn-primary" onclick="acervoManager.openImportModal('${page.id}')" style="font-size: 9px; padding: 5px 10px; background: var(--color-primary); border: none;" title="Importar HTML">📥 ${hasHtml ? 'EDITAR HTML' : 'IMPORTAR'}</button>
                                ${hasHtml ? `<button class="btn btn-secondary" onclick="acervoManager.previewManualPage('${page.id}')" style="font-size: 9px; padding: 5px 10px;" title="Preview">👁️ VER</button>` : ''}
                                ${hasHtml ? `<button class="btn btn-secondary" onclick="acervoManager.publishManualPage('${page.id}')" style="font-size: 9px; padding: 5px 10px; border-color: var(--color-success); color: var(--color-success);" title="Publicar como Rascunho">🚀 SALVAR</button>` : ''}
                                <button class="btn btn-secondary" onclick="acervoManager.deleteManualPage('${page.id}')" style="font-size: 9px; padding: 5px 10px; border-color: #ef4444; color: #ef4444;" title="Excluir">🗑️</button>
                            </div>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });

            } else {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--color-error); padding: 40px;">⚠️ Erro ao listar páginas do site. Verifique a conexão com o repositório.</td></tr>';
            }
        } catch(e) {
            console.error(e);
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--color-error); padding: 40px;">❌ Falha de conexão Crítica com o Vercel Engine.</td></tr>';
        }
    },

    // ========================
    // CRIAR PÁGINA MANUAL
    // ========================
    openCreateManualModal: function() {
        const modal = document.getElementById('manual-page-modal');
        if (!modal) return;
        
        // Resetar campos
        document.getElementById('manual-title').value = '';
        document.getElementById('manual-slug').value = '';
        
        // Preencher seletores de menu
        const menuSelect = document.getElementById('manual-menu-select');
        if (menuSelect && window.menuSystem && window.menuSystem.menus) {
            menuSelect.innerHTML = '<option value="">-- Sem Menu --</option>';
            window.menuSystem.menus.forEach(m => {
                menuSelect.innerHTML += `<option value="${m.id}">${m.name || m.id}</option>`;
            });
        }
        
        modal.style.display = 'flex';
    },

    saveNewManualPage: async function() {
        const title = document.getElementById('manual-title').value.trim();
        const slug = document.getElementById('manual-slug').value.trim();
        const menuId = document.getElementById('manual-menu-select')?.value || '';

        if (!title) return alert("Título é obrigatório.");

        try {
            const res = await fetch('/api/acervo/manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    title, 
                    slug: slug || '/' + title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'), 
                    menuId 
                })
            });
            const data = await res.json();
            if (data.success) {
                document.getElementById('manual-page-modal').style.display = 'none';
                if (window.showToast) window.showToast("✅ Página manual criada! Agora importe o HTML.", "success");
                this.loadAcervo();
            }
        } catch (e) { alert("Erro: " + e.message); }
    },

    // ========================
    // IMPORTAR HTML
    // ========================
    openImportModal: async function(pageId) {
        const modal = document.getElementById('html-import-modal');
        if (!modal) return;
        
        // Carregar dados da página
        try {
            const res = await fetch('/api/acervo/manual/read-html', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pageId })
            });
            const data = await res.json();
            if (data.success) {
                const page = data.page;
                document.getElementById('import-page-id').value = pageId;
                document.getElementById('import-html-editor').value = page.htmlContent || '';
                document.getElementById('import-use-shell').checked = page.useShell !== false;
                document.getElementById('import-seo-h1').value = page.seoFields?.h1 || '';
                document.getElementById('import-seo-resumo').value = page.seoFields?.resumo || '';
                document.getElementById('import-seo-h2s').value = (page.seoFields?.h2s || []).join('\n');
                document.getElementById('import-modal-title').textContent = page.title || 'Importar HTML';
                
                // Mostrar contagem de versões
                const versionInfo = document.getElementById('import-version-info');
                if (versionInfo) {
                    const versions = page.versions || [];
                    versionInfo.textContent = versions.length > 0 ? `📦 ${versions.length} versão(ões) anterior(es) salva(s)` : '';
                }

                modal.style.display = 'flex';
                
                // Adicionar listener de input para análise automática (DEBOUNCED)
                const editor = document.getElementById('import-html-editor');
                if (editor && !editor.dataset.hasListener) {
                    let timer;
                    editor.addEventListener('input', () => {
                        clearTimeout(timer);
                        timer = setTimeout(() => this.analyzeHtmlForSEO(), 500);
                    });
                    editor.dataset.hasListener = "true";
                }
            }
        } catch (e) { alert("Erro ao carregar página: " + e.message); }
    },

    /**
     * Extrai automaticamente H1, Resumo e H2s do HTML colado para o SEO Invisível
     */
    analyzeHtmlForSEO: function() {
        const html = document.getElementById('import-html-editor').value;
        if (!html || html.length < 20) return;

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // 1. Extrair H1 Técnico
        const h1Input = document.getElementById('import-seo-h1');
        if (h1Input && !h1Input.value.trim()) {
            const h1 = doc.querySelector('h1')?.textContent || doc.querySelector('title')?.textContent || "";
            if (h1) h1Input.value = h1.trim();
        }

        // 2. Extrair Resumo / Meta Description
        const resumoInput = document.getElementById('import-seo-resumo');
        if (resumoInput && !resumoInput.value.trim()) {
            // Tenta meta description primeiro
            let description = doc.querySelector('meta[name="description"]')?.getAttribute('content');
            // Ou o primeiro parágrafo significativo
            if (!description) {
                const firstP = Array.from(doc.querySelectorAll('p')).find(p => p.textContent.length > 30);
                if (firstP) description = firstP.textContent.substring(0, 160);
            }
            if (description) resumoInput.value = description.trim();
        }

        // 3. Extrair H2s Estratégicos
        const h2sInput = document.getElementById('import-seo-h2s');
        if (h2sInput && !h2sInput.value.trim()) {
            const h2s = Array.from(doc.querySelectorAll('h2'))
                .slice(0, 5)
                .map(h => h.textContent.trim())
                .filter(Boolean);
            if (h2s.length > 0) h2sInput.value = h2s.join('\n');
        }
    },

    saveImportedHtml: async function() {
        const pageId = document.getElementById('import-page-id').value;
        const htmlContent = document.getElementById('import-html-editor').value;
        const useShell = document.getElementById('import-use-shell').checked;
        const h1 = document.getElementById('import-seo-h1').value.trim();
        const resumo = document.getElementById('import-seo-resumo').value.trim();
        const h2sRaw = document.getElementById('import-seo-h2s').value.trim();
        const h2s = h2sRaw ? h2sRaw.split('\n').map(s => s.trim()).filter(Boolean) : [];

        try {
            const res = await fetch('/api/acervo/manual/import-html', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pageId, htmlContent, useShell, seoFields: { h1, resumo, h2s } })
            });
            const data = await res.json();
            if (data.success) {
                document.getElementById('html-import-modal').style.display = 'none';
                if (window.showToast) window.showToast(`✅ ${data.message}`, "success");
                this.loadAcervo();
            } else {
                alert("Erro: " + data.error);
            }
        } catch (e) { alert("Erro: " + e.message); }
    },

    // ========================
    // PREVIEW
    // ========================
    previewManualPage: async function(pageId) {
        try {
            const res = await fetch('/api/acervo/manual/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pageId })
            });
            const html = await res.text();
            
            // Salvar no servidor e abrir em nova aba
            const saveRes = await fetch('/api/previews/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ html, title: 'Preview Manual' })
            });
            const saveData = await saveRes.json();
            if (saveData.previewId) {
                window.open(`/studio-preview.html?id=${saveData.previewId}`, '_blank');
            }
        } catch (e) { alert("Erro ao gerar preview: " + e.message); }
    },

    // ========================
    // PUBLICAR
    // ========================
    publishManualPage: async function(pageId) {
        if (!confirm("Salvar esta página como RASCUNHO no repositório Next.js?")) return;
        
        try {
            const res = await fetch('/api/acervo/manual/publicar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pageId })
            });
            const data = await res.json();
            if (data.success) {
                if (window.showToast) window.showToast(`🚀 ${data.message}`, "success");
                this.loadAcervo();
            } else {
                alert("Erro: " + data.error);
            }
        } catch (e) { alert("Erro: " + e.message); }
    },

    // ========================
    // DELETAR
    // ========================
    deleteManualPage: async function(pageId) {
        if (!confirm("Tem certeza que deseja excluir esta página manual?")) return;
        
        try {
            const res = await fetch(`/api/acervo/manual/${pageId}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                if (window.showToast) window.showToast("🗑️ Página manual excluída.", "info");
                this.loadAcervo();
            }
        } catch (e) { alert("Erro: " + e.message); }
    },

    // ========================
    // MÉTODOS ORIGINAIS (MANTIDOS)
    // ========================
    savePageChanges: async function(index, caminhoFisico) {
        const titleInput = document.getElementById(`title-${index}`);
        const slugInput = document.getElementById(`slug-${index}`);
        const nuevoTitle = titleInput.value.trim();
        const nuevoSlug = slugInput.value.trim();
        const oldPage = this.paginas[index];

        try {
            if (nuevoTitle !== oldPage.title) {
                await fetch('/api/acervo/alterar-titulo', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ caminhoFisico, novoTitulo: nuevoTitle })
                });
            }

            if (nuevoSlug !== oldPage.slug) {
                const res = await fetch('/api/acervo/alterar-slug', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ caminhoFisico, novoSlug: nuevoSlug })
                });
                const data = await res.json();
                if (!data.success) throw new Error(data.error);
            }

            if (window.showToast) window.showToast("✅ Alterações salvas com sucesso!", "success");
            else alert("✅ Alterações salvas!");
            this.loadAcervo();
        } catch (e) {
            alert("Erro ao salvar: " + e.message);
        }
    },

    updateStatus: async function(caminhoFisico, novoStatus) {
        try {
            const res = await fetch('/api/acervo/alterar-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ caminhoFisico, novoStatus })
            });
            const data = await res.json();
            if (data.success) {
                if (window.showToast) window.showToast("Status da página atualizado.", "info");
                this.loadAcervo();
            }
        } catch (e) { console.error(e); }
    },

    defineHomepage: async function() {
        const select = document.getElementById('acervo-homepage-select');
        const caminhoFisico = select.value;
        if (!caminhoFisico) return alert("Selecione uma página primeiro.");

        if (!confirm("Tem certeza que deseja definir esta página como a HOME (Página Inicial) do seu site oficial?")) return;

        try {
            const res = await fetch('/api/acervo/definir-home', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ caminhoFisico })
            });
            const data = await res.json();
            if (data.success) {
                alert("🚀 SUCESSO! Página inicial redefinida no Next.js.");
                this.loadAcervo();
            } else {
                alert("Erro: " + data.error);
            }
        } catch (e) { alert("Falha ao processar solicitação."); }
    },

    editarPagina: async function(caminhoFisico) {
        try {
            const res = await fetch('/api/acervo/ler-pagina', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ caminhoFisico })
            });
            const result = await res.json();

            if (result.success) {
                if (window.aiStudioTemplate) {
                    document.querySelector('[data-target="ai-studio"]')?.click();
                    
                    await window.aiStudioTemplate.importIntoStudio({
                        theme: result.data.THEME || result.data.H1 || "Página Importada",
                        values: result.data,
                        templateId: result.data.template || null,
                        caminhoFisico: caminhoFisico,
                        reset: true
                    });
                } else {
                    alert("O motor AI Studio ainda não está carregado.");
                }
            } else {
                alert("Erro: " + result.error);
            }
        } catch (e) {
            alert("Falha ao comunicar com o servidor.");
        }
    },
    
    updateManualPageStatus: async function(pageId, novoStatus) {
        try {
            const res = await fetch('/api/acervo/manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: pageId, status: novoStatus })
            });
            const data = await res.json();
            if (data.success) {
                if (window.showToast) window.showToast(`Status manual atualizado para: ${novoStatus}`, "info");
                this.loadAcervo();
            }
        } catch (e) { console.error("Erro ao atualizar status manual:", e); }
    }
};

// ========================
// GOOGLE TAG MANAGER (GOVERNANÇA)
// ========================
window.googleTagManager = {
    init: async function() {
        try {
            const res = await fetch('/api/config/google-tag');
            const config = await res.json();
            
            const tagInput = document.getElementById('gtag-id-input');
            const tagToggle = document.getElementById('gtag-active-toggle');
            const tagStatus = document.getElementById('gtag-status-badge');
            
            if (tagInput) tagInput.value = config.tagId || '';
            if (tagToggle) tagToggle.checked = config.active !== false;
            if (tagStatus) {
                tagStatus.textContent = config.active ? '✅ ATIVO' : '❌ INATIVO';
                tagStatus.style.color = config.active ? '#10b981' : '#ef4444';
            }
        } catch (e) { console.warn("Google Tag config não disponível:", e); }
    },

    save: async function() {
        const tagId = document.getElementById('gtag-id-input')?.value?.trim() || '';
        const active = document.getElementById('gtag-active-toggle')?.checked !== false;

        try {
            const res = await fetch('/api/config/google-tag', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tagId, active })
            });
            const data = await res.json();
            if (data.success) {
                if (window.showToast) window.showToast("🏷️ Google Tag atualizada com sucesso!", "success");
                this.init(); // Refresh status
            }
        } catch (e) { alert("Erro ao salvar: " + e.message); }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.acervoManager.init();
    window.googleTagManager.init();
});
