window.acervoManager = {
    paginas: [],
    
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
            const res = await fetch('/api/acervo/listar');
            const data = await res.json();
            
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
            } else {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--color-error); padding: 40px;">⚠️ Erro ao listar páginas do site. Verifique a conexão com o repositório.</td></tr>';
            }
        } catch(e) {
            console.error(e);
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--color-error); padding: 40px;">❌ Falha de conexão Crítica com o Vercel Engine.</td></tr>';
        }
    },

    savePageChanges: async function(index, caminhoFisico) {
        const titleInput = document.getElementById(`title-${index}`);
        const slugInput = document.getElementById(`slug-${index}`);
        const nuevoTitle = titleInput.value.trim();
        const nuevoSlug = slugInput.value.trim();
        const oldPage = this.paginas[index];

        try {
            // 1. Atualiza Título se mudou
            if (nuevoTitle !== oldPage.title) {
                await fetch('/api/acervo/alterar-titulo', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ caminhoFisico, novoTitulo: nuevoTitle })
                });
            }

            // 2. Atualiza Slug se mudou
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
                    // Clica no botão do menu "Estúdio de Conteúdo" para mudar de tela
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
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.acervoManager.init();
});
