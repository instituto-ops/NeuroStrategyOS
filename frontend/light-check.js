require('dotenv').config({ path: '../.env' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

if (!process.env.GEMINI_API_KEY) {
    console.log("ERRO: GEMINI_API_KEY é nula!");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function check() {
    const list = ["gemini-1.5-flash", "gemini-1.5-flash-latest"];
    for(let m of list) {
        console.log(`PING ${m}...`);
        try {
            const model = genAI.getGenerativeModel({ model: m });
            const result = await model.generateContent("Oi");
            console.log(`OK ${m}`);
            console.log("Resposta:", result.response.text());
        } catch(e) {
            console.log(`ERRO ${m}: ${e.status} - ${e.message}`);
        }
    }
}
check();
