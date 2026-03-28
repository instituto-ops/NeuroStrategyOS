/**
 * 🛠️ DEVTOLS & SYSTEM BACKUP (FASE 6 - DIAGNÓSTICO)
 * Este arquivo contém ferramentas exclusivas de suporte ao desenvolvimento.
 * Deve ser removido antes do Go-Live.
 */

window.devTools = {
    isCapturing: false,

    /**
     * Captura a seção atual e copia para a área de transferência
     */
    async copyCurrentToClipboard() {
        if (this.isCapturing) return;
        this.isCapturing = true;
        
        // Indicador apenas visual no led (OPCIONAL se houver ID)
        const led = document.querySelector('.pulse-dot');
        if(led) led.style.boxShadow = "0 0 15px #fff"; 

        try {
            // Tenta capturar a seção ativa ou o body inteiro se não houver
            const target = document.querySelector('.content-section.active') || document.body;
            
            const canvas = await this._captureElement(target);

            canvas.toBlob(async (blob) => {
                try {
                    const item = new ClipboardItem({ "image/png": blob });
                    await navigator.clipboard.write([item]);
                    window.notificationSystem.push("Captura de Tela", "A imagem da seção ativa foi copiada para sua área de transferência com sucesso.", "success");
                } catch (err) {
                    console.error("Erro ao copiar para clipboard:", err);
                    window.notificationSystem.push("Sistema", "Falha ao gravar captura no clipboard.", "error");
                }
            });

        } catch (e) {
            console.error("Erro no capture:", e);
            window.notificationSystem.push("Sistema", "Erro crítico durante o processo de renderização visual.", "error");
        } finally {
            if(led) led.style.boxShadow = "0 0 10px #2dd4bf"; 
            this.isCapturing = false;
        }
    },

    /**
     * Realiza o Backup Visual completo de todas as seções do sistema
     */
    async runFullSystemBackup() {
        if (this.isCapturing) return;
        this.isCapturing = true;
        
        const sections = document.querySelectorAll('.content-section');
        const originalSectionId = document.querySelector('.content-section.active')?.id || 'dashboard';
        const now = new Date();
        const folderName = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2,'0')}-${now.getDate().toString().padStart(2,'0')}`;
        const timeName = now.getHours().toString().padStart(2,'0') + '-' + now.getMinutes().toString().padStart(2,'0');

        window.showToast(`🚀 Iniciando Backup Visual (${sections.length} telas)...`, "success");

        try {
            for (let i = 0; i < sections.length; i++) {
                const section = sections[i];
                const sectionId = section.id;
                
                console.log(`📸 [BACKUP] Processando seção: ${sectionId}`);

                // --- TRUQUE TÉCNICO: Tornar visível para html2canvas sem que o usuário veja
                const originalStyle = section.getAttribute('style') || '';
                
                // Forçamos a exibição mas jogamos para fora da viewport
                section.style.setProperty('display', 'block', 'important');
                section.style.setProperty('position', 'fixed', 'important');
                section.style.setProperty('top', '0', 'important');
                section.style.setProperty('left', '0', 'important');
                section.style.setProperty('z-index', '-9999', 'important');
                section.style.setProperty('width', '1400px', 'important'); 

                // --- NOVO: Forçar Reflow e Limpar Cache de Renderização (Sugestão do Usuário)
                document.body.offsetHeight; // Força recálculo de layout
                
                // Pequeno delay para garantir renderização de outros componentes
                await new Promise(r => setTimeout(r, 300));

                const canvas = await this._captureElement(section);
                const base64Image = canvas.toDataURL('image/png');

                // Envia para o Backend
                await fetch('/api/dev/screenshot', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        image: base64Image,
                        filename: `secao_${sectionId}.png`,
                        folder: folderName
                    })
                });

                // Restaura o estilo
                if (originalStyle) {
                    section.setAttribute('style', originalStyle);
                } else {
                    section.removeAttribute('style');
                }
                
                // Se era a ativa, mantém active, senão esconde de novo
                if (sectionId !== originalSectionId) {
                    section.style.setProperty('display', 'none', 'important');
                }
            }

            window.notificationSystem.push("Backup Completo", `O backup visual de todas as ${sections.length} telas foi gerado e armazenado com sucesso no servidor.`, "success", {
                isFixed: true,
                actionLabel: "VER LOGS",
                actionMethod: "console.table(window._neuroLogs)" 
            });

        } catch (e) {
            console.error("Erro no backup completo:", e);
            window.notificationSystem.push("Erro de Backup", "Falha na sincronização visual de múltiplas seções. Alguns arquivos podem estar ausentes.", "error");
        } finally {
            this.isCapturing = false;
            // Garante que voltamos para a seção correta
            window.app.showSection(originalSectionId);
        }
    },
    /**
     * Helper interno para capturar elemento com correções de brilho e CSS
     */
    async _captureElement(target) {
        // Força reflow antes
        document.body.offsetHeight;

        const canvas = await html2canvas(target, {
            backgroundColor: '#070b14', // Força a cor de fundo do tema para evitar transparências escuras
            useCORS: true,
            scale: 1.5,
            logging: false,
            onclone: (clonedDoc) => {
                // Correção de bugs de renderização comuns do html2canvas
                const elements = clonedDoc.querySelectorAll('*');
                elements.forEach(el => {
                    const style = window.getComputedStyle(el);
                    // html2canvas falha miseravelmente com backdrop-filter (escurece tudo)
                    if (style.backdropFilter !== 'none' || style.webkitBackdropFilter !== 'none') {
                        el.style.backdropFilter = 'none';
                        el.style.webkitBackdropFilter = 'none';
                    }
                });
            }
        });

        // --- NOVO: Correção de Brilho via Canvas (Adição 1 Sugerida)
        // Criamos um canvas secundário para aplicar filtros de imagem
        const filteredCanvas = document.createElement('canvas');
        filteredCanvas.width = canvas.width;
        filteredCanvas.height = canvas.height;
        const ctx = filteredCanvas.getContext('2d');
        
        // Aplica leve ganho de brilho e contraste para compensar a perda na reconstrução
        ctx.filter = 'brightness(1.15) contrast(1.05)';
        ctx.drawImage(canvas, 0, 0);
        
        return filteredCanvas;
    }
};
