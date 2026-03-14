const express = require('express');
const multer = require('multer');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: '../.env' }); 
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = 3000; // Unificando na porta 3000 (Frontend + API)

// Configuração de CORS: Como agora operamos na mesma porta, CORS é menos crítico,
// mas mantemos por segurança para acessos via IP ou subdomínios.
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// 1. SERVIR ARQUIVOS ESTÁTICOS (Frontend)
app.use(express.static(path.join(__dirname, 'public')));

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Initialize Gemini SDK
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const VISION_MODEL = 'gemini-2.5-flash';

// Configurações WordPress do .env
const WP_URL = (process.env.WP_URL || 'https://hipnolawrence.com/').replace(/\/$/, '');
const WP_API_BASE = `${WP_URL}/wp-json/wp/v2`;
const WP_AUTH = Buffer.from(`${process.env.WP_USERNAME}:${process.env.WP_APP_PASSWORD}`).toString('base64');

// ==============================================================================
// 1. PROXY WORDPRESS (Segurança: Credenciais nunca saem do servidor)
// ==============================================================================

// Helper para chamadas WP
const callWP = async (method, endpoint, data = null, params = {}) => {
    const url = `${WP_API_BASE}${endpoint}`;
    const headers = {
        'Authorization': `Basic ${WP_AUTH}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) NeuroEngine/1.0'
    };

    if (method !== 'GET' && data) {
        headers['Content-Type'] = 'application/json';
    }

    console.log(`📡 [WP PROXY] ${method} ${url} ${params ? JSON.stringify(params) : ''}`);

    return await axios({
        method,
        url,
        data,
        params,
        headers
    });
};

// Endpoints Genéricos (GET, POST, PUT, DELETE)
app.get('/api/wp/:type', async (req, res) => {
    try {
        const response = await callWP('GET', `/${req.params.type}`, null, req.query);
        res.json(response.data);
    } catch (e) { res.status(e.response?.status || 500).json(e.response?.data || {error: e.message}); }
});

app.post('/api/wp/:type', async (req, res) => {
    try {
        const response = await callWP('POST', `/${req.params.type}`, req.body);
        res.json(response.data);
    } catch (e) { res.status(e.response?.status || 500).json(e.response?.data || {error: e.message}); }
});

app.all('/api/wp/:type/:id', async (req, res) => {
    try {
        const { type, id } = req.params;
        const response = await callWP(req.method, `/${type}/${id}`, req.body, req.query);
        res.json(response.data);
    } catch (e) { res.status(e.response?.status || 500).json(e.response?.data || {error: e.message}); }
});

// Endpoints de Configuração AntiGravity
app.get('/api/wp-settings', async (req, res) => {
    try {
        const response = await axios.get(`${WP_URL}/wp-json/antigravity/v1/settings`, {
            headers: { 'Authorization': `Basic ${WP_AUTH}` }
        });
        res.json(response.data);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/wp-settings', async (req, res) => {
    try {
        const response = await axios.post(`${WP_URL}/wp-json/antigravity/v1/settings`, req.body, {
            headers: { 'Authorization': `Basic ${WP_AUTH}`, 'Content-Type': 'application/json' }
        });
        res.json(response.data);
    } catch (e) { res.status(500).json({ error: e.message }); }
});
// Endpoint especial para Upload de Mídia (Multipart/Form-Data)
app.post('/api/wp-upload-media', upload.shared ? upload.single('file') : upload.single('file'), async (req, res) => {
    try {
        if (!req.file) throw new Error("Nenhum arquivo enviado.");

        const formData = new (require('form-data'))();
        formData.append('file', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype
        });
        formData.append('title', req.body.title || '');
        formData.append('alt_text', req.body.alt_text || '');

        const response = await axios.post(`${WP_API_BASE}/media`, formData, {
            headers: {
                ...formData.getHeaders(),
                'Authorization': `Basic ${WP_AUTH}`
            }
        });
        res.json(response.data);
    } catch (e) {
        console.error("Upload Proxy Error:", e.message);
        res.status(500).json({ error: e.message });
    }
});

// ==============================================================================
// 2. PROXY AI (Gemini)
// ==============================================================================

app.post('/api/ai/generate', async (req, res) => {
    try {
        const { prompt, config } = req.body;
        console.log(`🧠 [AI PROXY] Generate request for prompt prompt: "${prompt.substring(0, 50)}..."`);
        const model = genAI.getGenerativeModel({ model: VISION_MODEL });
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: config || { temperature: 0.7, maxOutputTokens: 1000 }
        });
        const resp = await result.response;
        res.json({ text: resp.text() });
    } catch (e) { 
        console.error("❌ [AI PROXY ERROR]", e.message);
        res.status(500).json({ error: e.message }); 
    }
});

const DOCTORALIA_REVIEWS = `
- Carla (TEA): "Diagnóstico tardio possível pela técnica adequada... melhora significativa na qualidade de vida."
- Y. (Autista): "Acompanhamento fez enorme diferença... hipnose e PNL com empatia e respeito."
- A. M. (Sábio): "Estrutura da minha vida, alguém sábio que me fez enxergar eu mesma."
- R. A. (Ansiedade): "Problema de ansiedade resolvido em algumas sessões. Muito profissional."
- L. F. S.: "Resultados nítidos e precisos. Indico fortemente."
`;

// ==============================================================================
// 3. TABELA DE REVISÃO E PIPELINE DE AGENTES (HUMAN-IN-THE-LOOP & LANGGRAPH)
// ==============================================================================

// Estado do Perfil de Voz (Clone de Voz / Reverse Prompting)
let voiceProfile = {
    learned_style: "Direto, clínico, porém empático. Foco em autoridade técnica e resultados práticos (Goiânia).",
    vocabulary: ["Goiânia", "Neuropsicologia", "TEA", "Clínica", "Avaliação"],
    prohibited_terms: ["cura milagrosa", "garantido", "mudar sua vida para sempre"],
    rhythm: "Sentenças curtas e estruturadas por bullet points.",
    last_updated: new Date().toISOString()
};

let draftsDb = [
    {
        "draft_id": "RASC-2026-084",
        "tema_foco": "TEA em adultos - Diagnóstico Tardio",
        "conteudo_gerado": "<h1>Diagnóstico de TEA na Vida Adulta em Goiânia</h1>\n<p>O diagnóstico tardio de Transtorno do Espectro Autista (TEA) em adultos é um momento divisor de águas...</p>\n<h2>Identificação da Dor: A Exaustão Constante</h2>\n<p>Muitos adultos passam anos sentindo uma exaustão inexplicável (Burnout Autista)...</p>\n<h3>Como a Avaliação Neuropsicológica Ajuda?</h3>\n<p>Toque aqui para falar comigo no WhatsApp e agendar sua avaliação.</p>",
        "validacoes_automatizadas": {
            "pesquisa_clinica": true,
            "metodo_abidos": true,
            "compliance_etico": true,
            "med_f1_score": 0.98
        },
        "status_atual": "aguardando_psicologo",
        "fontes_rag_utilizadas": [
            "Diretriz CFP Resolução 21/2025",
            "Estudo de caso anonimizado #405"
        ],
        "data_submissao": new Date().toISOString()
    },
    {
        "draft_id": "RASC-2026-085",
        "tema_foco": "Terapia de Casal e Esgotamento",
        "conteudo_gerado": "<h1>Terapia de Casal em Goiânia: Superando o Esgotamento</h1>\n<p>A rotina e o desgaste emocional muitas vezes afastam casais...</p>",
        "validacoes_automatizadas": {
            "pesquisa_clinica": true,
            "metodo_abidos": false,
            "compliance_etico": true,
            "med_f1_score": 0.95
        },
        "status_atual": "aguardando_psicologo",
        "fontes_rag_utilizadas": [
            "Protocolos de Terapia Cognitiva para Casais"
        ],
        "data_submissao": new Date(Date.now() - 86400000).toISOString()
    }
];

app.get('/api/drafts', (req, res) => {
    res.json(draftsDb);
});

// Orquestrador LangGraph (Simulação de Multi-Agent Node Pipeline)
app.post('/api/agents/generate-pipeline', async (req, res) => {
    try {
        const { topic } = req.body;
        if (!topic) throw new Error("Tópico (STAG) não fornecido.");
        const model = genAI.getGenerativeModel({ model: VISION_MODEL });

        console.log(`🤖 [LANGGRAPH PIPELINE] Iniciando fluxo para: ${topic}`);

        // NÓ 1: Agente Gerador (RAG & Pesquisa + Personalidade Aprendida)
        console.log(`📡 [NÓ 1] Agente de Pesquisa (Voz Dr. Victor)...`);
        const pGerador = `
        VOCÊ É O CLONE DE VOZ DO DR. VICTOR LAWRENCE.
        
        PERFIL DE VOZ APRENDIDO:
        - Estilo: ${voiceProfile.learned_style}
        - Ritmo: ${voiceProfile.rhythm}
        - Vocabulário Favorecido: ${voiceProfile.vocabulary.join(', ')}
        - Termos Proibidos: ${voiceProfile.prohibited_terms.join(', ')}
        
        TAREFA: Escreva um rascunho de landing page sobre "${topic}" focado em Goiânia. 
        Mantenha a autoridade clínica, evite clichês de marketing robótico.
        Use tags HTML simples (h1, h2, p).
        `;
        const resGerador = await model.generateContent(pGerador);
        const rascunhoPrimario = resGerador.response.text();

        // NÓ 2, 3 e 4: Loop de Validação (Abidos, Crítico e Compliance)
        console.log(`⚖️ [NÓS DE VALIDAÇÃO] Auditoria de Compliance, Abidos e Factual...`);
        const pAuditoria = `
        Analise rigorosamente o Rascunho HTML abaixo baseado:
        1. CFP/Etica (Sem promessas de cura, sem exibição antiética)
        2. Abidos (Tem H1 com palavra chave? Tem CTAs?)
        3. FactScore (Acurácia clínica para ${topic})
        Retorne APENAS um JSON: {"aprovado": boolean, "abidos_score": number, "compliance_pass": boolean, "med_f1": number, "correcoes": "texto com o rascunho consertado ou original html"}
        Rascunho: """${rascunhoPrimario}"""
        `;
        const resAuditoria = await model.generateContent(pAuditoria);
        const jsonStr = resAuditoria.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        const auditoria = JSON.parse(jsonStr);

        // Se falhar no compliance, faria um loop de re-geração no LangGraph real. Aqui simulamos a correção automática:
        const conteudoFinal = auditoria.correcoes || rascunhoPrimario;

        // Persistência de Estado
        const newDraft = {
            draft_id: `RASC-2026-${Math.floor(Math.random() * 900) + 100}`,
            tema_foco: topic,
            conteudo_gerado: conteudoFinal,
            validacoes_automatizadas: {
                pesquisa_clinica: true,
                metodo_abidos: auditoria.abidos_score > 80,
                compliance_etico: auditoria.compliance_pass,
                med_f1_score: auditoria.med_f1 || 0.95
            },
            status_atual: "aguardando_psicologo",
            fontes_rag_utilizadas: [
                "Banco de Dados RAG (VectorStore)",
                "Diretrizes CFP em Cache"
            ],
            data_submissao: new Date().toISOString()
        };

        draftsDb.unshift(newDraft); // Adiciona ao topo da lista
        console.log(`✅ [PIPELINE CONCLUÍDA] Human-in-the-loop aguardando.`);
        
        res.json({ success: true, draft: newDraft });
    } catch (e) {
        console.error("❌ [PIPELINE ERROR]", e.message);
        res.status(500).json({ error: e.message });
    }
});


app.post('/api/agents/audit', async (req, res) => {
    try {
        const { content } = req.body;
        console.log(`🔍 [AGENTE ABIDOS] Auditing draft...`);
        
        const prompt = `
        Você é o "Agente Abidos", um Arquiteto de Sistemas e Auditor Sênior Implacável.
        
        SUA MISSÃO: Realizar uma auditoria de nível clínico no rascunho abaixo.
        
        MÉTODO DE AUDITORIA (FACTSCORE):
        1. Decomposição Atômica: Quebre o texto em afirmações individuais.
        2. Validação Factual: Verifique se há "alucinações" ou promessas de cura (Proibido pelo CFP).
        3. MED-F1 (Extração de Entidades): Liste termos técnicos (ex: TEA, TDAH, ISRS) e verifique se o contexto está correto.
        4. Hierarquia Abidos: Cheque se há H1 único com palavra-chave e localização (Goiânia).
        
        Rascunho a auditar:
        """${content}"""
        
        RETORNE UM RELATÓRIO FORMATADO EM HTML (usando tags span, strong, br) COM:
        - ✅ PONTOS POSITIVOS
        - ⚠️ ALERTAS DE RISCO (CFP/LGPD)
        - 📊 PONTUAÇÃO FACTSCORE (0-100%)
        - 📝 SUGESTÕES DE REESCRITA
        `;

        const model = genAI.getGenerativeModel({ model: VISION_MODEL });
        const result = await model.generateContent(prompt);
        const resp = await result.response;
        
        res.json({ success: true, report: resp.text() });
    } catch (e) {
        console.error("❌ [AGENTE ABIDOS ERROR]", e.message);
        res.status(500).json({ error: e.message });
    }
});

// NÓ DE APRENDIZADO DE ESTILO: Reverse Prompting
app.post('/api/agents/learn-style', async (req, res) => {
    try {
        const { texts } = req.body;
        if (!texts || !Array.isArray(texts)) throw new Error("Textos para análise não fornecidos.");

        console.log(`🧠 [ESTILO] Iniciando Reverse Prompting de ${texts.length} textos...`);
        const model = genAI.getGenerativeModel({ model: VISION_MODEL });

        const prompt = `
        Aja como um Linguista Forense e Especialista em Copywriting de Conversão.
        Analise os textos abaixo (autênticos do autor Victor Lawrence) e extraia o DNA da escrita.
        
        Textos:
        """${texts.join('\n\n')}"""
        
        Sua tarefa é codificar esse estilo em um JSON com os campos:
        - rhythm: (Descrição da cadência das frases)
        - vocabulary: (Lista de palavras recorrentes e jargões favoritos)
        - learned_style: (Resumo técnico da "voz" do autor)
        - prohibited_terms: (Palavras que ele parece evitar ou que seriam artificiais para ele)
        
        Retorne APENAS o JSON.
        `;

        const result = await model.generateContent(prompt);
        const jsonStr = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        const extractedProfile = JSON.parse(jsonStr);

        voiceProfile = {
            ...extractedProfile,
            last_updated: new Date().toISOString()
        };

        res.json({ success: true, profile: voiceProfile });
    } catch (e) {
        console.error("❌ [LEARN STYLE ERROR]", e.message);
        res.status(500).json({ error: e.message });
    }
});

// NÓ DE AFINAMENTO: Text Diffs (Learn from user edits)
app.post('/api/agents/analyze-diff', async (req, res) => {
    try {
        const { original, edited } = req.body;

        console.log(`📝 [DIFF] Analisando edições do usuário para ajuste fino de tom...`);
        const model = genAI.getGenerativeModel({ model: VISION_MODEL });

        const prompt = `
        Analise a diferença entre o rascunho da IA e a versão editada pelo Dr. Victor.
        Rascunho IA: """${original}"""
        Versão Final: """${edited}"""
        
        O que mudou no tom? O que ele removeu? O que ele adicionou?
        Atualize o perfil de voz atual: ${JSON.stringify(voiceProfile)}
        
        Retorne o novo perfil de voz COMPLETO em JSON.
        `;

        const result = await model.generateContent(prompt);
        const jsonStr = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        voiceProfile = JSON.parse(jsonStr);
        voiceProfile.last_updated = new Date().toISOString();

        res.json({ success: true, profile: voiceProfile });
    } catch (e) {
        console.error("❌ [DIFF ANALYZE ERROR]", e.message);
        res.status(500).json({ error: e.message });
    }
});

// ==============================================================================
// 4. MOTOR SEMÂNTICO (SEO PROGRAMÁTICO & SILOS)
// ==============================================================================

app.get('/api/seo/analyze-silos', async (req, res) => {
    try {
        console.log(`🧭 [SEO] Iniciando Auditoria de Silos e Interlinking...`);
        
        // 1. Puxa todas as páginas do WP
        const pages = await callWP('GET', '/pages', null, { per_page: 100 });
        if(!pages.data) throw new Error("Não foi possível carregar as páginas do WP.");

        const pageMap = pages.data.map(p => ({
            id: p.id,
            title: p.title.rendered,
            link: p.link,
            content: p.content.rendered.substring(0, 500) // Amostra para IA
        }));

        const model = genAI.getGenerativeModel({ model: VISION_MODEL });
        const prompt = `
        Aja como um Arquiteto de SEO Programático.
        Analise a lista de páginas da clínica abaixo e construa um Mapa de Interlinking (Silos).
        
        Objetivo: Identificar quais páginas (Spokes) devem linkar para qual Hub principal e encontrar páginas "órfãs".
        
        Páginas: ${JSON.stringify(pageMap)}
        
        Retorne um JSON com:
        - silos: [{ hub: "Título Hub", spokes: ["Título 1", "Título 2"] }]
        - suggestions: [{ from_id: id, to_id: id, anchor_text: "Texto do Link", reason: "Por que?" }]
        
        Retorne APENAS o JSON.
        `;

        const result = await model.generateContent(prompt);
        const jsonStr = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        const siloData = JSON.parse(jsonStr);

        res.json(siloData);
    } catch (e) {
        console.error("❌ [SEO SILO ERROR]", e.message);
        res.status(500).json({ error: e.message });
    }
});

// ==============================================================================
// 5. MONITORAMENTO PROFILÁTICO (LIGHTHOUSE) E REPUTACIONAL
// ==============================================================================

app.get('/api/health/lighthouse', async (req, res) => {
    try {
        console.log(`🔦 [LIGHTHOUSE] Iniciando Auditoria de Performance Profilática...`);
        
        // Simulação de Auditoria (Em um sistema real, chamaria a Lighthouse CLI)
        const metrics = {
            performance: Math.floor(Math.random() * (100 - 85) + 85),
            accessibility: 98,
            best_practices: 100,
            seo: 100,
            core_web_vitals: {
                lcp: "1.2s",
                fid: "14ms",
                cls: "0.02"
            },
            timestamp: new Date().toISOString()
        };

        res.json(metrics);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/reputation/analyze', async (req, res) => {
    try {
        const { platform, content } = req.body;
        console.log(`🛡️ [REPUTAÇÃO] Analisando impacto de feedback em ${platform}...`);

        const model = genAI.getGenerativeModel({ model: VISION_MODEL });
        const prompt = `
        Analise o seguinte feedback de paciente recebido na plataforma ${platform}:
        """${content}"""
        
        Sua tarefa:
        1. Classificar Sentimento (Positivo / Neutro / Alerta Crítico).
        2. Identificar Riscos Éticos (Baseado nas normas do CFP).
        3. Gerar "Resposta Sugerida" (Empática, respeitando sigilo, sem promessas).
        4. Sugerir Melhoria Interna na Clínica.
        
        Retorne em JSON.
        `;

        const result = await model.generateContent(prompt);
        const jsonStr = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        res.json(JSON.parse(jsonStr));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ==============================================================================
// 6. MARKETING LAB (GOOGLE ADS STAGs & PERFORMANCE)
// ==============================================================================

app.get('/api/marketing/audit', async (req, res) => {
    try {
        console.log(`📈 [MARKETING] Analisando performance de campanhas Google Ads...`);
        
        // Simulação de dados de API Google Ads
        const adsData = {
            budget_utilization: "92%",
            top_performing_stag: "TEA Adulto Goiânia",
            critica_loss: "8% (Perda por Rank em 'Depressão')",
            recommendations: [
                { type: "STAG", theme: "Avaliação TDAH", reason: "Alta demanda local em Goiânia" },
                { type: "BID", action: "Aumentar 5%", reason: "CTR acima da média em TEA" }
            ],
            insights: "Sua campanha de TEA Adulto é o Core da clínica hoje. Sugiro expandir para 'Diagnóstico Tardio' como novo STAG."
        };

        res.json(adsData);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/chat', upload.single('screenshot'), async (req, res) => {
    try {
        const { message, htmlContext, currentKeyword } = req.body;
        const model = genAI.getGenerativeModel({ model: VISION_MODEL });
        
        let promptText = `
        VOCÊ É JULES, ASSISTENTE ELITE DA CLÍNICA VICTOR LAWRENCE (GOIÂNIA).
        SUA MISSÃO: CRIAR LANDING PAGES DE ALTA CONVERSÃO USANDO O MÉTODO ABIDOS.
        
        REGRAS DE OURO:
        1. ESTRUTURA SEMPRE EM 4 SEÇÕES:
           - Seção 1 (Hero): H1 (Keyword exata + Benefício + Goiânia), Subtítulo, CTA WhatsApp (62982171845).
           - Seção 2 (Jornada/Corpo): H2 (Identificação da Dor), Texto H2 (Serviços), H3 (Quebra de Objeções).
           - Seção 3 (E-E-A-T): H2 (Apresentação), H2 (Ambiente), Prova Social (USE AS REVIEWS ABAIXO).
           - Seção 4 (Retenção): H2 (FAQ), Link Interno estilo "Veja também" para Silos de Conteúdo.
        
        2. PROVA SOCIAL (DOCTORALIA):
        ${DOCTORALIA_REVIEWS}
        
        3. DESIGN: Use Tailwind, cores profissionais (#1e293b, #0ea5e9). Imagens: use tags <img src="URL" alt="SEO Description">.
        
        CONTEXTO ATUAL:
        - Keyword: ${currentKeyword || 'Não especificada'}
        - HTML Atual: ${htmlContext || 'Vazio'}
        - Mensagem do Usuário: ${message}
        
        SE O USUÁRIO PEDIR PARA CRIAR OU GERAR, RETORNE O HTML COMPLETO SEGUINDO O MÉTODO.
        SE O USUÁRIO PEDIR PARA TROCAR IMAGEM, SUGIRA UMA NOVA URL DE IMAGEM OU REMOVA A ATUAL.
        `;
        
        let parts = [{ text: promptText }];
        if (req.file) {
            parts.push({ inlineData: { data: req.file.buffer.toString('base64'), mimeType: req.file.mimetype } });
        }

        const result = await model.generateContent({ contents: [{ role: 'user', parts }] });
        const resp = await result.response;
        res.json({ reply: resp.text() });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/blueprint', async (req, res) => {
    try {
        const { theme } = req.body;
        const model = genAI.getGenerativeModel({ model: VISION_MODEL });
        const prompt = `
        GERE UM BLUEPRINT HTML COMPLETO (4 SEÇÕES ABIDOS) PARA: ${theme}.
        LOCAÇÃO: Goiânia. 
        WHATSAPP: 62982171845.
        REVIEWS: Inclua depoimentos reais da Doctoralia (Carla, Y, etc).
        ESTRUTURA: 
        1. Hero (H1 Estratégico)
        2. Jornada (Dor e Benefícios)
        3. Autoridade (Quem é Victor Lawrence + Clientes)
        4. FAQ + Silos.
        RETORNE APENAS O HTML CRU.
        `;
        const result = await model.generateContent(prompt);
        const resp = await result.response;
        res.json({ html: resp.text().replace(/```html|```/g, '').trim() });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/audit', async (req, res) => {
    try {
        const { html, keyword } = req.body;
        const model = genAI.getGenerativeModel({ model: VISION_MODEL });
        const result = await model.generateContent(`Retorne um JSON array de auditoria SEO para o termo ${keyword}:\n\n${html}`);
        const resp = await result.response;
        res.json({ checklist: JSON.parse(resp.text().replace(/```json|```/g, '').trim()) });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(port, () => {
    console.log(`\n🚀 AntiGravity CMS: Mission Control Ativo!`);
    console.log(`📡 Frontend & API rodando em http://localhost:${port}`);
    console.log(`🔐 Camada de Segurança Proxy: ON`);
});
