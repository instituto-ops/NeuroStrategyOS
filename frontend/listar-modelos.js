require('dotenv').config({ path: '../.env' });

async function descobrirNomesReais() {
    console.log("📡 Consultando o Google AI Studio para sua chave...\n");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return console.error("Sem chave API configurada no .env (procurando em ../.env)");

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.models) {
            console.log("✅ MODELOS DISPONÍVEIS PARA A SUA CHAVE:\n");
            
            data.models.forEach(m => {
                const nomeExato = m.name.replace('models/', '');
                const suportaConteudo = m.supportedGenerationMethods.includes('generateContent');
                
                if (nomeExato.includes("1.5") || nomeExato.includes("pro") || nomeExato.includes("flash")) {
                    console.log(`👉 String exata: "${nomeExato}"`);
                    console.log(`   - Título: ${m.displayName}`);
                    console.log(`   - Suporta generateContent? ${suportaConteudo ? 'SIM' : 'NÃO'}\n`);
                }
            });
        } else {
            console.log("Resposta de erro da API:", data);
        }
    } catch (error) {
        console.error("Erro na requisição:", error);
    }
}

descobrirNomesReais();
