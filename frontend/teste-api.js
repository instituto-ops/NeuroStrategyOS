require('dotenv').config({ path: '../.env' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Inicializa a API com a chave do seu .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Lista de variações de nomenclatura para testar
const modelosParaTestar = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash-001"
];

async function executarTesteDeDiagnostico() {
    console.log("🔍 INICIANDO DIAGNÓSTICO DE API E MODELOS...\n");

    if (!process.env.GEMINI_API_KEY) {
        console.error("🚨 ERRO FATAL: Chave GEMINI_API_KEY não encontrada no arquivo .env");
        return;
    }

    for (const nomeDoModelo of modelosParaTestar) {
        console.log(`[TESTE] Tentando conectar ao modelo: '${nomeDoModelo}'...`);
        
        try {
            const model = genAI.getGenerativeModel({ model: nomeDoModelo });
            
            // Um prompt extremamente simples e barato só para testar o "ping"
            const result = await model.generateContent("Responda apenas com a palavra 'CONECTADO'.");
            const resposta = result.response.text();

            console.log(`✅ SUCESSO: O modelo '${nomeDoModelo}' respondeu: ${resposta}\n`);
            
        } catch (error) {
            console.error(`❌ FALHA no modelo '${nomeDoModelo}':`);
            
            // Disseca o erro para entendermos a causa raiz
            if (error.status === 404) {
                console.error("   Motivo: Modelo não encontrado (404). O SDK ou sua conta não reconhecem esta nomenclatura.\n");
            } else if (error.status === 403) {
                console.error("   Motivo: Permissão negada (403). Sua chave de API é inválida ou não tem acesso a este modelo.\n");
            } else {
                console.error(`   Motivo: ${error.message}\n`);
            }
        }
    }
    console.log("🏁 DIAGNÓSTICO CONCLUÍDO.");
}

executarTesteDeDiagnostico();
