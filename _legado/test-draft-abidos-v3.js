require('dotenv').config({ path: '../.env' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testDraft() {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `Você é Jules, o Mission Control da Equipe NeuroEngine. 
        Sua missão é gerar um rascunho de postagem WordPress seguindo a METODOLOGIA ABIDOS para o título: "Terapia dura a vida inteira?".
        
        REGRAS DE OURO (ERRO ZERO):
        1. PROIBIDO O USO DE TAG H1. O título já é fornecido pelo tema.
        2. Use H2 para o título principal da seção Hero.
        3. ESTRUTURA:
           - Seção 1: Identificação da Dor (O medo da dependência emocional).
           - Seção 2: O Método Abidos de Terapia Estratégica (Foco em autonomia e alta).
           - Seção 3: E-E-A-T (Autoridade do Dr. Victor Lawrence).
           - Seção 4: CTA para WhatsApp.
        4. DESIGN: Estética premium, clean, sem classes globais pesadas.
        5. Retorne APENAS o HTML (sem tags html/head/body).`;

        const result = await model.generateContent(prompt);
        const fs2 = require('fs'); fs2.writeFileSync('generated_draft.html', result.response.text());
    } catch (e) {
        console.error("ERRO:", e.message);
    }
}

testDraft();
