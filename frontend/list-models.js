require('dotenv').config({ path: '../.env' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
    console.log("🔍 LISTANDO MODELOS DISPONÍVEIS...\n");
    console.log("Chave carregada?", !!process.env.GEMINI_API_KEY);
    
    try {
        // Unfortunately, the GenAI SDK doesn't have an easy "listModels" like the REST API
        // So we'll try a generic ping to gemini-pro to see if the key is alive
        const models = ["gemini-pro", "gemini-1.5-flash", "gemini-1.5-pro"];
        for(let m of models) {
            console.log(`Testando ${m}...`);
            try {
                const model = genAI.getGenerativeModel({ model: m });
                const result = await model.generateContent("Ping");
                console.log(`✅ ${m} SUCESSO!`);
            } catch(e) {
                console.log(`❌ ${m} FALHA: ${e.status} - ${e.message}`);
                if (e.status === 404 && m === "gemini-1.5-flash") {
                     console.log("   Dica: Se o Pro funciona e o Flash não, o projeto pode não ter acesso Early Access ou a versão do SDK é incompatível.");
                }
            }
        }
    } catch (e) {
        console.error(e);
    }
}
listModels();
