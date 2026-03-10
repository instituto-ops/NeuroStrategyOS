const wpAPI = {
    // Configurações do WordPress a partir do .env
    url: "https://hipnolawrence.com/wp-json/wp/v2",
    username: typeof CONFIG_LOCAL !== 'undefined' ? CONFIG_LOCAL.WP_USERNAME : "SEU_USUARIO",
    appPassword: typeof CONFIG_LOCAL !== 'undefined' ? CONFIG_LOCAL.WP_APP_PASSWORD : "SUA_APPLICATION_PASSWORD",

    getAuthHeader() {
        return "Basic " + btoa(this.username + ":" + this.appPassword);
    },

    async fetchContent(type = 'pages', full = false) {
        if (type !== 'media') app.showLoadingTable();
        try {
            const fields = full ? 'id,title,status,type,content,featured_media' : 'id,title,status,type';
            const response = await fetch(`${this.url}/${type}?_fields=${fields}&per_page=100&status=publish,draft,future,private`, {
                headers: {
                    "Authorization": this.getAuthHeader()
                }
            });
            if(!response.ok) throw new Error("Erro na autenticação WP");
            return await response.json();
        } catch (error) {
            console.error("WP API Fetch Error:", error);
            return [];
        }
    },

    async saveContent(type, data, id = null) {
        // Se id existir, faz PUT para editar. Se não, POST para criar.
        const method = id ? "PUT" : "POST";
        const endpoint = id ? `${this.url}/${type}/${id}` : `${this.url}/${type}`;

        try {
            const response = await fetch(endpoint, {
                method: method,
                headers: {
                    "Authorization": this.getAuthHeader(),
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(data)
            });
            
            if(!response.ok) {
                const errorData = await response.json();
                console.error("WP API Save Error:", errorData);
                throw new Error(errorData.message || "Erro ao salvar no WP.");
            }
            
            return await response.json();
        } catch (error) {
            console.error("Save Error:", error);
            alert("Erro ao salvar: " + error.message);
            return null;
        }
    },
    
    async getContent(type, id) {
        try {
            const response = await fetch(`${this.url}/${type}/${id}?_fields=id,title,content,excerpt,status`, {
                headers: {
                    "Authorization": this.getAuthHeader()
                }
            });
            if(!response.ok) throw new Error("Post/Página não encontrada.");
            return await response.json();
        } catch (error) {
            console.error("Get Single Error:", error);
            alert("Erro ao puxar dados: " + error.message);
            return null;
        }
    },

    async fetchSettings() {
        try {
            const response = await fetch(`${this.url.replace('/wp/v2', '/antigravity/v1')}/settings`, {
                headers: { "Authorization": this.getAuthHeader() }
            });
            if(!response.ok) throw new Error("Erro buscar configurações");
            return await response.json();
        } catch (error) { 
            console.error(error);
            return null; 
        }
    },

    async saveSettings(data) {
        try {
            const response = await fetch(`${this.url.replace('/wp/v2', '/antigravity/v1')}/settings`, {
                method: "POST",
                headers: { 
                    "Authorization": this.getAuthHeader(), 
                    "Content-Type": "application/json" 
                },
                body: JSON.stringify(data)
            });
            return await response.json();
        } catch (error) { 
            console.error(error);
            return null; 
        }
    },

    async fetchMedia(limit = 100) {
        try {
            const response = await fetch(`${this.url}/media?per_page=${limit}&_fields=id,source_url,alt_text,title`, {
                headers: { "Authorization": this.getAuthHeader() }
            });
            return await response.json();
        } catch (error) {
            console.error("Media fetch error:", error);
            return [];
        }
    },

    async uploadMedia(file, altText, title = "") {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('alt_text', altText);
        formData.append('title', title || file.name);

        try {
            const response = await fetch(`${this.url}/media`, {
                method: "POST",
                headers: { "Authorization": this.getAuthHeader() },
                body: formData
            });
            return await response.json();
        } catch (error) {
            console.error("Upload error:", error);
            return null;
        }
    },

    async updateMedia(id, data) {
        try {
            const response = await fetch(`${this.url}/media/${id}`, {
                method: "POST",
                headers: { 
                    "Authorization": this.getAuthHeader(),
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(data)
            });
            return await response.json();
        } catch (error) {
            console.error("Update media error:", error);
            return null;
        }
    },

    async deleteMedia(id) {
        try {
            const response = await fetch(`${this.url}/media/${id}?force=true`, {
                method: "DELETE",
                headers: { 
                    "Authorization": this.getAuthHeader()
                }
            });
            return await response.json();
        } catch (error) {
            console.error("Delete media error:", error);
            return null;
        }
    },

    async updateMediaSEO(id, title, altText) {
        try {
            const response = await fetch(`${this.url}/media/${id}`, {
                method: "POST",
                headers: { 
                    "Authorization": this.getAuthHeader(),
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ title: title, alt_text: altText })
            });
            
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    throw new Error("Permissão negada. Você não tem autorização para editar esta mídia.");
                }
                const errorData = await response.json();
                throw new Error(errorData.message || `Erro ${response.status} ao atualizar mídia.`);
            }
            
            return await response.json();
        } catch (error) {
            console.error("SEO Batch Optimizer Error:", error);
            alert("Erro na Otimização SEO: " + error.message);
            return null;
        }
    }
}
