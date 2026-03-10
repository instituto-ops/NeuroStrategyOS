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

app.listen(port, () => {
    console.log(`🧠 NeuroEngine AI Chatbot rodando na porta ${port}`);
});
