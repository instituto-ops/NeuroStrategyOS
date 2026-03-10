const wpAPI = {
    // Configurações do WordPress a partir do .env
    url: "https://hipnolawrence.com/wp-json/wp/v2",
    username: typeof CONFIG_LOCAL !== 'undefined' ? CONFIG_LOCAL.WP_USERNAME : "SEU_USUARIO",
    appPassword: typeof CONFIG_LOCAL !== 'undefined' ? CONFIG_LOCAL.WP_APP_PASSWORD : "SUA_APPLICATION_PASSWORD",

    getAuthHeader() {
        return "Basic " + btoa(this.username + ":" + this.appPassword);
    },

    async fetchContent(type = 'pages') {
        app.showLoadingTable();
        try {
            const response = await fetch(`${this.url}/${type}?_fields=id,title,status,type&per_page=100`, {
                headers: {
                    "Authorization": this.getAuthHeader()
                }
            });
            if(!response.ok) throw new Error("Erro na autenticação WP");
            return await response.json();
        } catch (error) {
            console.error("WP API Fetch Error:", error);
            alert("Não foi possível carregar o conteúdo. Verifique as chaves de Application Password no WP.");
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
    }
};
