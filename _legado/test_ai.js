require('dotenv').config({ path: '../.env' }); 
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
    console.log("KEY START:", process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 10) : "MISSING");
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Oi");
        console.log(result.response.text());
    } catch (e) {
        console.error("ERRO TESTE:", e.message);
    }
}
test();
