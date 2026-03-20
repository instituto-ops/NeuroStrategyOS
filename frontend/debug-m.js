require('dotenv').config({ path: '../.env' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

const m = "gemini-1.5-flash";
console.log(`MODEL STRING: '${m}', LENGTH: ${m.length}`);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel(m);

async function check() {
    try {
        console.log("SENDING PING...");
        const result = await model.generateContent("Oi");
        console.log("RESULT:", result.response.text());
    } catch(e) {
        console.log(`ERROR: ${e.status} - ${e.message}`);
    }
}
check();
