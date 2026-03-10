const wpAPI = {
    // Configurações do Proxy Seguro (NeuroEngine Backend)
    // Nenhuma credencial (senha/chave) é armazenada no frontend.
    baseUrl: "/api",
    
    /**
     * Helper para fazer requisições ao Proxy
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        
        // Merging headers
        options.headers = {
            "Content-Type": "application/json",
            ...(options.headers || {})
        };

        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Proxy Request Error (${endpoint}):`, error);
            throw error;
        }
    },

    async fetchContent(type = 'pages', full = false) {
        if (type !== 'media' && window.app) app.showLoadingTable();
        try {
            const fields = full ? 'id,title,status,type,content,featured_media' : 'id,title,status,type';
            // O proxy repassa os query params
            return await this.request(`/wp/${type}?_fields=${fields}&per_page=100&status=publish,draft,future,private`);
        } catch (error) {
            return [];
        }
    },

    async saveContent(type, data, id = null) {
        const method = id ? "PUT" : "POST";
        const endpoint = id ? `/wp/${type}/${id}` : `/wp/${type}`;
        
        try {
            return await this.request(endpoint, {
                method: method,
                body: JSON.stringify(data)
            });
        } catch (error) {
            alert("Erro ao salvar no WP: " + error.message);
            return null;
        }
    },
    
    async getContent(type, id) {
        try {
            return await this.request(`/wp/${type}/${id}?_fields=id,title,content,excerpt,status`);
        } catch (error) {
            alert("Erro ao puxar dados: " + error.message);
            return null;
        }
    },

    async fetchSettings() {
        try {
            return await this.request(`/wp-settings`);
        } catch (error) { 
            console.error(error);
            return null; 
        }
    },

    async saveSettings(data) {
        try {
            return await this.request(`/wp-settings`, {
                method: "POST",
                body: JSON.stringify(data)
            });
        } catch (error) { 
            console.error(error);
            return null; 
        }
    },

    async fetchMedia(limit = 100) {
        try {
            return await this.request(`/wp/media?per_page=${limit}&_fields=id,source_url,alt_text,title`);
        } catch (error) {
            return [];
        }
    },

    // O upload de mídia é especial pois usa FormData. No momento o proxy /wp/:type 
    // lida com JSON. Para simplificar, vou manter o upload direto se o usuário permitir,
    // mas o ideal é que o proxy suporte multipart/form-data também.
    // Como segurança é a prioridade, vamos desativar o upload direto e avisar.
    async uploadMedia(file, altText, title = "") {
        alert("Upload de mídia via Proxy em desenvolvimento. Use a biblioteca do WordPress diretamente por enquanto.");
        return null;
    },

    async updateMedia(id, data) {
        try {
            return await this.request(`/wp/media/${id}`, {
                method: "POST", // WP REST API usa POST para updates de mídia
                body: JSON.stringify(data)
            });
        } catch (error) {
            return null;
        }
    },

    async deleteMedia(id) {
        try {
            return await this.request(`/wp/media/${id}?force=true`, {
                method: "DELETE"
            });
        } catch (error) {
            return null;
        }
    },

    async updateMediaSEO(id, title, altText) {
        try {
            return await this.request(`/wp/media/${id}`, {
                method: "POST",
                body: JSON.stringify({ title: title, alt_text: altText })
            });
        } catch (error) {
            alert("Erro na Otimização SEO: " + error.message);
            return null;
        }
    }
}
