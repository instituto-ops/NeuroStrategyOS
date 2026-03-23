const wpAPI = {
    // Versão neutra pós-WordPress (Vercel)
    baseUrl: "/api",
    
    async request(endpoint, options = {}) {
        console.warn(`[Proxy Disabled] Endpoint legado desativado: ${endpoint}`);
        return null; // Retorna null em vez de lançar erro para não quebrar UI
    },

    async fetchContent(type = 'pages', full = false) {
        if (type !== 'media' && window.app) {
            try { app.showLoadingTable(); } catch(e){}
        }
        console.warn(`[Proxy Disabled] fetchContent disparado. Retornando fallback vazio.`);
        return [];
    },

    async saveContent(type, data, id = null) {
        console.warn(`[Proxy Disabled] saveContent disparado.`);
        return null;
    },
    
    async getContent(type, id) {
        console.warn(`[Proxy Disabled] getContent disparado.`);
        return { content: { rendered: 'Conteúdo Indisponível (Sem WP)' }, title: { rendered: 'Sem WP' } };
    },

    async fetchSettings() {
        return null;
    },

    async saveSettings(data) {
        return null;
    },

    async fetchMedia(limit = 100) {
        console.warn(`[Proxy Disabled] fetchMedia disparado. Retornando lista vazia.`);
        return [];
    },

    async uploadMedia(file, altText, title = "") {
        console.warn(`[Proxy Disabled] uploadMedia disparado.`);
        return null;
    },

    async updateMedia(id, data) {
        return null;
    },

    async deleteMedia(id) {
        return null;
    },

    async updateMediaSEO(id, title, altText) {
        return null;
    }
};
