window.seoEngine = {
    async analyze() {
        const siloContainer = document.getElementById('silo-groups-container');
        const suggestContainer = document.getElementById('silo-suggestions-container');

        siloContainer.innerHTML = '<p style="color: #6366f1;">🤖 IA está escaneando seu banco de dados WordPress...</p>';
        suggestContainer.innerHTML = '<p style="color: #6366f1;">🔍 Identificando páginas órfãs e elos semânticos...</p>';

        try {
            const response = await fetch('/api/seo/analyze-silos');
            const data = await response.json();

            // Renderiza Silos
            siloContainer.innerHTML = '';
            data.silos.forEach(silo => {
                const div = document.createElement('div');
                div.style.marginBottom = '15px';
                div.innerHTML = `
                    <strong style="color: #1e40af;">📂 Hub: ${silo.hub}</strong>
                    <ul style="font-size: 13px; margin-top: 5px; color: #64748b;">
                        ${silo.spokes.map(s => `<li>Spoke: ${s}</li>`).join('')}
                    </ul>
                `;
                siloContainer.appendChild(div);
            });

            // Renderiza Sugestões
            suggestContainer.innerHTML = '';
            data.suggestions.forEach(sug => {
                const div = document.createElement('div');
                div.style.padding = '10px';
                div.style.borderBottom = '1px solid #e2e8f0';
                div.style.fontSize = '13px';
                div.innerHTML = `
                    <div style="font-weight: bold; color: #10b981;">Link: "${sug.anchor_text}"</div>
                    <div style="color: #64748b; margin-top: 3px;">
                        De: Page ID #${sug.from_id}<br>
                        Para: Page ID #${sug.to_id}
                    </div>
                    <div style="font-style: italic; font-size: 11px; margin-top: 5px;">Razão: ${sug.reason}</div>
                `;
                suggestContainer.appendChild(div);
            });

            // [NOVO] Renderiza Grafo de Silos
            this.renderGraph(data);

        } catch (e) {
            console.error(e);
            siloContainer.innerHTML = '<p style="color: red;">Erro ao auditar silos.</p>';
            suggestContainer.innerHTML = '<p style="color: red;">' + e.message + '</p>';
        }
    },

    renderGraph(data) {
        const elements = [];
        
        // Adiciona Hubs
        data.silos.forEach(silo => {
            elements.push({ data: { id: silo.hub, label: silo.hub, type: 'hub' } });
            silo.spokes.forEach(spoke => {
                elements.push({ data: { id: spoke, label: spoke, type: 'spoke' } });
                elements.push({ data: { source: spoke, target: silo.hub } });
            });
        });

        // Adiciona Sugestões Extras
        data.suggestions.forEach(sug => {
            elements.push({ 
                data: { 
                    source: `Page #${sug.from_id}`, 
                    target: `Page #${sug.to_id}`,
                    label: sug.anchor_text
                } 
            });
        });

        const cy = cytoscape({
            container: document.getElementById('cy-map'),
            elements: elements,
            style: [
                {
                    selector: 'node',
                    style: {
                        'background-color': '#6366f1',
                        'label': 'data(label)',
                        'color': '#1e293b',
                        'font-size': '10px',
                        'width': '20px',
                        'height': '20px'
                    }
                },
                {
                    selector: 'node[type="hub"]',
                    style: {
                        'background-color': '#10b981',
                        'width': '40px',
                        'height': '40px',
                        'font-weight': 'bold'
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'width': 2,
                        'line-color': '#cbd5e1',
                        'target-arrow-color': '#cbd5e1',
                        'target-arrow-shape': 'triangle',
                        'curve-style': 'bezier'
                    }
                }
            ],
            layout: {
                name: 'cose',
                animate: true
            }
        });
    }
};
