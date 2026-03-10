const express = require('express');
const multer = require('multer');
const cors = require('cors');
require('dotenv').config({ path: '../.env' }); 
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Initialize the SDK correctly
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const VISION_MODEL = 'gemini-2.5-flash';

app.post('/api/chat', upload.single('screenshot'), async (req, res) => {
    try {
        const { message, htmlContext } = req.body;
        
        const model = genAI.getGenerativeModel({ model: VISION_MODEL });
        
        let promptText = `
Você é Jules, o Assistente de Engenharia Headless (AntiGravity CMS).
Sua função é auxiliar o Dr. Victor Lawrence a criar e otimizar páginas no WordPress usando a Metodologia de Conversão Lawrence (E-E-A-T, Cópias orientadas à Dor/Solução, Velocidade e Alta Conversão para Psicoterapia e TEA em Adultos).

O usuário enviou a seguinte mensagem/pedido:
"${message}"

Aqui está o código HTML atual da página que ele está editando:
${htmlContext ? htmlContext.substring(0, 15000) : "Nenhum código atual fornecido."}

REGRAS DE RESPOSTA CRÍTICAS (NÃO NEGOCIÁVEIS):
1. NUNCA use as palavras "Abidos" ou "Método Abidos" no texto final da página, títulos ou mensagens do chat. Este é um nome de metodologia INTERNA. Use termos como "Abordagem Especializada" ou "Protocolo Clínico".
2. LINK INTERNO OBRIGATÓRIO: Toda página ou seção gerada DEVE ter pelo menos um link ou botão chamando a página inicial (www.hipnolawrence.com) de forma orgânica e contextualizada.
3. ARQUITETURA OBRIGATÓRIA PARA GERAÇÃO COMPLETA:
   - Seção Hero: H1 Único (Keyword + Promessa + Goiânia), Subtítulo acolhedor, Botão CTA WhatsApp.
   - Jornada do Paciente: H2 Identificação da Dor (Empatia), H2 Benefícios e Categorias, H3 Detalhes/Objeções.
   - Autoridade (E-E-A-T): H2 Sobre o Especialista (Bio, CRP, Foto space), H2 Ambiente/Galeria.
   - Retenção: H2 FAQ Accordion, Linkagem Interna "Veja Também".
   - Links: SEMPRE use links para a home www.hipnolawrence.com.
4. Se o usuário pedir para criar/gerar código, retorne o HTML/CSS organizado dentro de blocos \`\`\`html.
5. Tom Clínico e Empático: Foco na dor (TEA Adulto, Mascaramento, Burnout ou Suspeita).
6. Localização Prioritária: Goiânia.
`;

        let parts = [{ text: promptText }];

        if (req.file) {
             const base64Image = req.file.buffer.toString('base64');
             const mimeType = req.file.mimetype;
             
             parts.push({
                 inlineData: {
                     data: base64Image,
                     mimeType: mimeType
                 }
             });
             
             parts[0].text += `\n[O usuário anexou uma imagem do layout atual. Analise-a para dar feedback visual de design.]`;
        }

        const result = await model.generateContent({
            contents: [{ role: 'user', parts }]
        });
        
        const response = await result.response;
        const text = response.text();

        res.json({ reply: text });

    } catch (error) {
        console.error("Erro no servidor IA:", error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/blueprint', upload.none(), async (req, res) => {
    try {
        const { theme } = req.body;
        console.log(`🧠 Gerando Blueprint para o tema: ${theme}`);
        
        const model = genAI.getGenerativeModel({ model: VISION_MODEL });
        
        let promptText = `
Você é Jules, o Arquiteto Headless do NeuroEngine.
O usuário solicitou a geração completa de um Blueprint (Página 90% pronta) para o tema: "${theme}".

Sua tarefa: Retornar APENAS o código HTML final da página montada. NÃO retorne a tag \`\`\`html. Não dê explicações. Apenas o HTML cru.

O HTML deve seguir esta estrutura pré-validada de blocos:
1. Um Header (<header class="hero-section" style="padding: 60px 20px; background:#f8fafc; text-align:center;">) com um <h1> persuasivo, um <p> acolhedor focando na dor, e um <button class="btn btn-primary">Agendar Avaliação</button>.
2. Uma seção de Benefícios (<section style="padding:40px 20px;">) com um <h2> e 3 colunas ou tópicos abordando a solução.
3. Uma seção de Autoridade (<section style="background:#eef2ff; padding:40px 20px;">) focada no "Psicólogo Victor Lawrence", CRP 09/012681, citando a "Abordagem Especializada".
4. Uma seção de FAQ (<section style="padding:40px 20px;">).

Regras de Copywriting para o tema "${theme}":
- Foque na empatia e na dor específica do ${theme}.
- Se for TEA Adulto, cite "Diagnóstico Tardio", "Mascaramento (Masking)" e "Exaustão".
- Se for Hipnose Clínica, explique que não é perda de consciência, mas foco.
- A comunicação é clínica, direta e de alta conversão.
`;

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: promptText }] }]
        });
        
        const response = await result.response;
        const htmlContent = response.text().replace(/```html|```/g, '').trim();

        res.json({ html: htmlContent });

    } catch (error) {
        console.error("Erro no Blueprint:", error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/audit', upload.none(), async (req, res) => {
    try {
        const { html, keyword } = req.body;
        console.log(`🧠 Auditando página para a keyword: ${keyword}`);
        
        const model = genAI.getGenerativeModel({ model: VISION_MODEL });
        
        let promptText = `
Você é Jules, o Auditor de Qualidade do NeuroEngine.
Analise rigorosamente o seguinte HTML de uma Landing Page Clínica sob os critérios do "Método Abidos".
A palavra-chave foco é: "${keyword || 'Psicólogo em Goiânia'}".

HTML DA PÁGINA:
${html.substring(0, 15000)}

Você deve devolver APENAS um JSON válido. Não inclua a tag \`\`\`json. Não adicione nenhum texto antes ou depois.

Formato OBRIGATÓRIO de saída:
[
  { "passou": true, "criterio": "O H1 contém a palavra-chave.", "acao": null },
  { "passou": false, "criterio": "Falta Prova Social (Depoimentos).", "acao": "inserir_prova_social" },
  { "passou": false, "criterio": "Não há botão de WhatsApp na primeira dobra.", "acao": "inserir_cta" }
]

Verifique no mínimo:
1. Presença de CTA (botão/link WhatsApp).
2. H1 focado na dor/palavra-chave.
3. Seção ou traços de Autoridade/E-E-A-T (CRP, nome do especialista).
4. Prova Social (Depoimentos ou Avaliações).
`;

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: promptText }] }]
        });
        
        const response = await result.response;
        let responseText = response.text().replace(/```json|```/g, '').trim();

        // Faz o parse do JSON
        const checklist = JSON.parse(responseText);

        res.json({ checklist });

    } catch (error) {
        console.error("Erro no Auditor:", error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`🧠 NeuroEngine AI Chatbot rodando na porta ${port}`);
});
