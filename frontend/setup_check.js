/**
 * NeuroStrategy OS - Setup Verification Script (SNAPSHOT)
 * Use este script para validar o ambiente do Módulo de Publicação.
 */
const axios = require('axios');
require('dotenv').config({ path: '../.env' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function runSetupCheck() {
    console.log('--- 🛡️ NEUROENGINE SETUP CHECK ---');

    // 1. Verificação de Variáveis
    const required = ['GEMINI_API_KEY', 'GOOGLE_CLOUD_PROJECT', 'WP_URL', 'WP_USERNAME', 'WP_APP_PASSWORD'];
    let missing = false;
    required.forEach(key => {
        if (!process.env[key]) {
            console.error(`❌ ERRO: Variável [${key}] não encontrada no .env`);
            missing = true;
        } else {
            console.log(`✅ Variável [${key}] detectada.`);
        }
    });

    if (missing) return;

    // 2. Teste WordPress API (Proxy Logic)
    console.log('\n--- 🌐 TESTANDO CONEXÃO WORDPRESS ---');
    const wpUrl = process.env.WP_URL.replace(/\/$/, '');
    const auth = Buffer.from(`${process.env.WP_USERNAME}:${process.env.WP_APP_PASSWORD}`).toString('base64');
    
    try {
        const resp = await axios.get(`${wpUrl}/wp-json/wp/v2/users/me`, {
            headers: { 'Authorization': `Basic ${auth}` }
        });
        console.log(`✅ Conectado ao WP como: ${resp.data.name} (@${resp.data.slug})`);
    } catch (e) {
        console.error(`❌ FALHA WP: ${e.message}`);
        if (e.response?.status === 403) console.log('💡 DICA: ModSecurity pode estar bloqueando. Verifique as regras do Hostinger.');
    }

    // 3. Teste Gemini
    console.log('\n--- 🧠 TESTANDO CONEXÃO GEMINI ---');
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent("Diga 'OK' para testar a conexão.");
        console.log(`✅ Gemini respondeu: ${result.response.text().trim()}`);
    } catch (e) {
        console.error(`❌ FALHA GEMINI: ${e.message}`);
    }

    console.log('\n--- 🏁 VERIFICAÇÃO CONCLUÍDA ---');
}

runSetupCheck();
