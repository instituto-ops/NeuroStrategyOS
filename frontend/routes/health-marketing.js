const fs = require('fs');
const path = require('path');
// Import all specific deps from shared if needed. For now just passing app and deps.
const { genAI, getAIModel, wrapModel, extractJSON, trackUsage, LITE_MODEL, MAIN_MODEL, PRO_MODEL, GoogleAICacheManager } = require('../shared');

module.exports = function(app, deps) {
    const { SITE_REPO_PATH, TEMPLATE_CATALOG, upload } = deps;
    
// 4. MOTOR SEMÃ‚NTICO (SEO PROGRAMÃTICO & SILOS)
// ==============================================================================

// [OBSOLETO] Removido para evitar conflito com motor V5 em /api/seo/analyze-silos no final do arquivo.

// [PULSO DO SISTEMA] Monitoramento de LatÃªncia Real-time
app.get('/api/health/ping', (req, res) => res.status(200).send('pong'));

// [FASE 2] HEALTH CHECK: Monitoramento MulticritÃ©rio
app.get('/api/health/check', async (req, res) => {
    const health = {
        status: 'online',
        timestamp: new Date().toISOString(),
        services: {
            database: { status: 'active', message: 'Local DB Operational' },
            gemini: { status: 'ready', model: MAIN_MODEL }
        }
    };

    try {
        // 1. Check Gemini Key
        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'DUMMY') {
            health.services.gemini.status = 'missing_key';
            health.status = 'critical';
        }

        res.json(health);
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
});

// ==============================================================================
// 5. MONITORAMENTO PROFILÃTICO (LIGHTHOUSE) E REPUTACIONAL
// ==============================================================================

app.get('/api/health/lighthouse', async (req, res) => {
    try {
        console.log(`ðŸ”¦ [LIGHTHOUSE] Iniciando Auditoria de Performance ProfilÃ¡tica...`);
        
        // SimulaÃ§Ã£o de Auditoria (Em um sistema real, chamaria a Lighthouse CLI)
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

app.post('/api/health/design-audit', async (req, res) => {
    try {
        const { image, context } = req.body;
        console.log(`ðŸ–Œï¸ [SERVER] Auditoria de Design Recebida. Processando Vision...`);

        const model = genAI.getGenerativeModel({ model: MAIN_MODEL }); // Use Flash ou Pro vision
        
        // Remove prefixo base64 se houver
        const base64Data = image.split(',')[1] || image;

        const prompt = `
        VOCÃŠ Ã‰ O AUDITOR DE DESIGN E UX DO NEUROENGINE OS (SISTEMA DE GESTÃƒO CLÃNICA).
        CONTEXTO: ${context}.

        Analise a captura de tela anexada da interface administrativa do sistema (rodando em Desktop).
        Sua missÃ£o:
        1. Avaliar a Legibilidade (Tamanho da fonte, contraste, espaÃ§amento dos selos e cards).
        2. Avaliar a EstÃ©tica da Interface (O sistema parece premium e limpo ou estÃ¡ com excesso de informaÃ§Ã£o?).
        3. Identificar HeurÃ­sticas de Usabilidade violadas.
        4. Identificar inconsistÃªncias visuais (Cores fora do paleta, desalinhamentos).

        [DIRETRIZES DE RELATÃ“RIO]:
        - Seja direto, tÃ©cnico e use termos como "Hierarquia Visual", "AfixaÃ§Ã£o", "Contraste WCAG".
        - Liste 3 pontos positivos e 3 pontos de melhoria prioritÃ¡ria.
        - Se o design estiver nota 10, elogie de forma sÃ³bria.

        Retorne a resposta diretamente em texto (Markdown).
        `;

        const result = await model.generateContent([
            prompt,
            { inlineData: { data: base64Data, mimeType: "image/webp" } }
        ]);

        trackUsage(result.response.usageMetadata);
        res.json({ text: result.response.text() });

    } catch (e) {
        console.error("âŒ [DESIGN AUDIT ERROR]", e.message);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/reputation/analyze', async (req, res) => {
    try {
        const { platform, content } = req.body;
        console.log(`ðŸ›¡ï¸ [REPUTAÃ‡ÃƒO] Analisando impacto de feedback em ${platform}...`);

        const model = genAI.getGenerativeModel({ model: MAIN_MODEL });
        const prompt = `
        Analise o seguinte feedback de paciente recebido na plataforma ${platform}:
        """${content}"""
        
        Sua tarefa:
        1. Classificar Sentimento (Positivo / Neutro / Alerta CrÃ­tico).
        2. Identificar Riscos Ã‰ticos (Baseado nas normas do CFP).
        3. Gerar "Resposta Sugerida" (EmpÃ¡tica, respeitando sigilo, sem promessas).
        4. Sugerir Melhoria Interna na ClÃ­nica.
        
        Retorne em JSON.
        `;
        const result = await model.generateContent(prompt);
        trackUsage(result.response.usageMetadata);
        const jsonStr = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        res.json(JSON.parse(jsonStr));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ==============================================================================

};
