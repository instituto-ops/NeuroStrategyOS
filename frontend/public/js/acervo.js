window.acervoManager = {
    init: function() {
        // Only load on tab switch
        const navBtns = document.querySelectorAll('.nav-btn');
        navBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const trg = e.currentTarget.getAttribute('data-target');
                if(trg === 'acervo-publicacoes') {
                    this.loadAcervo();
                }
            });
        });
    },

    loadAcervo: async function() {
        const tbody = document.getElementById('acervo-list-body');
        if (!tbody) return;
        
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Carregando publicações do site...</td></tr>';
        
        try {
            const res = await fetch('/api/acervo/listar');
            const data = await res.json();
            
            if (data.success && data.paginas) {
                tbody.innerHTML = '';
                
                // Sort array by latest Date
                data.paginas.sort((a, b) => new Date(b.ultimaAtualizacao) - new Date(a.ultimaAtualizacao));

                data.paginas.forEach(page => {
                    const dateObj = new Date(page.ultimaAtualizacao);
                    const formattedDate = dateObj.toLocaleDateString('pt-BR');
                    
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td style="font-weight: bold; color: #1e293b;">${page.slug}</td>
                        <td style="color: #64748b;">${formattedDate}</td>
                        <td>
                            <span style="background: #e0f2fe; color: #0369a1; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">PUBLICADO</span>
                        </td>
                        <td style="display: flex; gap: 5px;">
                            <button class="btn btn-primary" onclick="acervoManager.editarPagina('${page.caminhoFisico.replace(/\\/g, '\\\\')}')" style="font-size: 11px; padding: 5px 10px;">📝 EDITAR</button>
                            <a href="http://localhost:3001${page.slug}" target="_blank" class="btn btn-secondary" style="font-size: 11px; padding: 5px 10px; text-decoration: none; color: #475569; border-color: #cbd5e1;" title="Testar Vercel Local">👁️ LOCAL</a>
                            <a href="https://hipnolawrence.com${page.slug}" target="_blank" class="btn btn-secondary" style="font-size: 11px; padding: 5px 10px; text-decoration: none; color: #0284c7; border-color: #bae6fd; background: #f0f9ff;" title="Ver Site em Produção">🌍 PROD</a>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            } else {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: red;">Erro ao listar acervo.</td></tr>';
            }
        } catch(e) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: red;">Falha de comunicação com o servidor local.</td></tr>';
        }
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
                
                if (result.warning) {
                    alert(result.warning);
                } else {
                    alert("Página carregada com sucesso! Você será redirecionado para o AI Studio no Modo de Edição.");
                }
                
                // Populate AI Studio
                if (window.aiStudioTemplate) {
                    window.aiStudioTemplate.values = dados;
                    
                    const selectEl = document.getElementById('ai-studio-template');
                    // Try to guess template if saved
                    if (dados.template && selectEl) {
                        // Find the option text that matches the template name partially
                        Array.from(selectEl.options).forEach(opt => {
                            if (opt.text.includes(dados.template) || opt.value === dados.template) {
                                opt.selected = true;
                                window.aiStudioTemplate.selectedId = opt.value;
                            }
                        });
                    }

                    // Se continua sem template (fallback/páginas antigas), atribui o primeiro do dropdown
                    if (!window.aiStudioTemplate.selectedId && selectEl && selectEl.options.length > 0) {
                        selectEl.selectedIndex = 0;
                        window.aiStudioTemplate.selectedId = selectEl.options[0].value;
                    }

                    // Força a recriação da interface do Studio (que preenche os campos do form internamente)
                    if (window.aiStudioTemplate.selectedId) {
                        window.aiStudioTemplate.loadTemplateDetails(window.aiStudioTemplate.selectedId);
                    }
                    
                    // Muda status label 
                    const statusLabel = document.getElementById('ai-studio-status-label');
                    if (statusLabel) {
                        statusLabel.textContent = "STATUS: MODO DE EDIÇÃO ATIVO";
                        statusLabel.style.color = "#ea580c";
                    }

                    // Trigger the UI navigation switch
                    const studioBtn = document.querySelector('.nav-btn[data-target="ai-studio"]');
                    if (studioBtn) {
                        studioBtn.click();
                    }
                }
            } else {
                alert("Erro: " + result.error);
            }
        } catch (e) {
            alert("Falha ao comunicar com o servidor: " + e.message);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.acervoManager.init();
});
