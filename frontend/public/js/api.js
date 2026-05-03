// frontend/public/js/api.js - Versão 100% Headless (Protocolo V5 Vercel)
const neuroAPI = {
    baseUrl: "/api",
    
    // Lista as páginas diretamente do sistema de arquivos ou rascunhos locais
    async fetchAcervo() {
        try {
            console.log("📂 [neuroAPI] Sincronizando Acervo...");
            const res = await fetch(`${this.baseUrl}/acervo/listar`);
            if (!res.ok) throw new Error(`Status ${res.status}`);
            const data = await res.json();
            return data.paginas || [];
        } catch (e) {
            console.error("❌ Erro no Acervo:", e);
            return [];
        }
    },

    // Salva a página no repositório Next.js e dispara o deploy no Vercel (Simulado via Node)
    async saveToVercel(payload) {
        try {
            const res = await fetch(`${this.baseUrl}/acervo/salvar-pagina`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error(`Status ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error("❌ Erro ao publicar no Vercel:", e);
            return { success: false, error: e.message };
        }
    },

    // Carrega o DNA (neuroEngineData) de uma página específica
    async loadPageDNA(caminhoFisico) {
        try {
            const res = await fetch(`${this.baseUrl}/acervo/ler-pagina`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ caminhoFisico })
            });
            if (!res.ok) throw new Error(`Status ${res.status}`);
            return await res.json();
        } catch (e) {
            return { success: false, error: e.message };
        }
    },

    // Métodos Legados (Stubs para compatibilidade total)
    async request(endpoint, options = {}) {
        return this.fetchAcervo();
    },
    async fetchContent() { return []; },
    async saveContent(topic, theme, content) {
         return this.saveToVercel({ topic, theme, content });
    },
    async fetchMedia() {
        try {
            const res = await fetch('/api/acervo/list-media');
            return await res.json();
        } catch(e) { return []; }
    }
};

/**
 * Interface com o Agente Operacional (agentd)
 */
const agentAPI = {
    async call(method, params = {}) {
        try {
            const res = await fetch('/api/agent/rpc', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ method, params })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            return data.result;
        } catch (e) {
            console.error(`❌ [agentAPI] Erro em ${method}:`, e);
            throw e;
        }
    },

    async getStatus() {
        try {
            const res = await fetch('/api/agent/status');
            return await res.json();
        } catch (e) {
            return { success: false, connected: false };
        }
    }
};

// Alias para manter compatibilidade com códigos legados
const wpAPI = neuroAPI; 
window.wpAPI = wpAPI;
window.neuroAPI = neuroAPI;
window.agentAPI = agentAPI;

