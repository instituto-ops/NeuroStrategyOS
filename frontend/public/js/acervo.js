window.acervoManager = {
    init: function() {
        // Observer for tab switch in app.js
    },

    loadAcervo: async function() {
        const tbody = document.getElementById('acervo-list-body');
        if (!tbody) return;
        
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: var(--color-text-light);">⌛ Escaneando repositório Next.js...</td></tr>';
        
        try {
            const res = await fetch('/api/acervo/listar');
            const data = await res.json();
            
            if (data.success && data.paginas) {
                tbody.innerHTML = '';
                
                // Sort by last modification
                data.paginas.sort((a, b) => new Date(b.ultimaAtualizacao) - new Date(a.ultimaAtualizacao));

                data.paginas.forEach((page, index) => {
                    const dateObj = new Date(page.ultimaAtualizacao);
                    const formattedDate = dateObj.toLocaleDateString('pt-BR', { hour:'2-digit', minute:'2-digit' });
                    
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td style="font-weight: 800; color: var(--color-text); font-size: 13px;">${page.title}</td>
                        <td>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <input type="text" value="${page.slug}" 
                                    onblur="window.acervoManager.updateSlug(this, '${page.caminhoFisico.replace(/\\/g, '\\\\')}', '${page.slug}')"
                                    onkeydown="if(event.key === 'Enter') this.blur()"
                                    style="background: rgba(0,0,0,0.2); border: 1px solid var(--color-border); color: var(--color-secondary); font-family: monospace; font-size: 11px; padding: 4px 8px; border-radius: 4px; width: 140px;">
                            </div>
                        </td>
                        <td style="color: var(--color-text-light); font-size: 11px;">${formattedDate}</td>
                        <td>
                            <select onchange="window.acervoManager.updateStatus('${page.caminhoFisico.replace(/\\/g, '\\\\')}', this.value)"
                                style="font-size: 10px; font-weight: 900; background: ${page.status === 'DRAFT' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)'}; color: ${page.status === 'DRAFT' ? '#f59e0b' : '#10b981'}; border: 1px solid currentColor; border-radius: 4px; padding: 2px 4px; cursor: pointer;">
                                <option value="PUBLICADO" ${page.status === 'PUBLICADO' ? 'selected' : ''}>🟢 PUBLICADO</option>
                                <option value="DRAFT" ${page.status === 'DRAFT' ? 'selected' : ''}>🟠 RASCUNHO</option>
                                <option value="ARQUIVADO" ${page.status === 'ARQUIVADO' ? 'selected' : ''}>⚪ ARQUIVADO</option>
                            </select>
                        </td>
                        <td style="display: flex; gap: 5px;">
                            <button class="btn btn-secondary" onclick="acervoManager.editarPagina('${page.caminhoFisico.replace(/\\/g, '\\\\')}')" style="font-size: 10px; padding: 4px 8px;">📝 EDITAR</button>
                            <a href="https://hipnolawrence.com${page.slug}" target="_blank" class="btn btn-secondary" style="font-size: 10px; padding: 4px 8px; text-decoration: none; color: var(--color-secondary); border-color: var(--color-secondary);" title="Ver Online">🌍 VER</a>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            } else {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--color-error);">Erro ao listar páginas do site.</td></tr>';
            }
        } catch(e) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--color-error);">Falha de conexão com o painel central.</td></tr>';
        }
    },

    updateSlug: async function(input, caminhoFisico, oldSlug) {
        const novoSlug = input.value.trim();
        if (novoSlug === oldSlug) return;

        input.disabled = true;
        input.style.opacity = '0.5';

        try {
            const res = await fetch('/api/acervo/alterar-slug', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ caminhoFisico, novoSlug })
            });
            const data = await res.json();
            if (data.success) {
                // Recarrega para atualizar os caminhos físicos de toda a tabela
                this.loadAcervo();
            } else {
                alert("Erro ao mudar URL: " + data.error);
                input.value = oldSlug;
            }
        } catch (e) {
            alert("Erro de conexão.");
            input.value = oldSlug;
        } finally {
            input.disabled = false;
            input.style.opacity = '1';
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
                this.loadAcervo();
            }
        } catch (e) { console.error(e); }
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
                const dados = result.data;
                
                // Redireciona para o AI Studio no Modo de Edição
                if (window.aiStudioTemplate) {
                    window.aiStudioTemplate.values = dados;
                    
                    const selectEl = document.getElementById('ai-studio-template');
                    if (dados.template && selectEl) {
                        Array.from(selectEl.options).forEach(opt => {
                            if (opt.text.includes(dados.template) || opt.value === dados.template) {
                                opt.selected = true;
                                window.aiStudioTemplate.selectedId = opt.value;
                            }
                        });
                    }

                    window.aiStudioTemplate.menuId = dados.menuId || null;
                    if (window.aiStudioTemplate.selectedId) {
                        window.aiStudioTemplate.loadTemplateDetails(window.aiStudioTemplate.selectedId);
                    }
                    
                    const statusLabel = document.getElementById('ai-studio-status-label');
                    if (statusLabel) {
                        statusLabel.textContent = "STATUS: MODO DE EDIÇÃO ATIVO";
                        statusLabel.style.color = "#ea580c";
                    }

                    window.aiStudioTemplate.caminhoFisico = caminhoFisico;
                    const studioBtn = document.querySelector('.nav-btn[data-target="ai-studio"]');
                    if (studioBtn) studioBtn.click();
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
