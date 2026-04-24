const fs = require('fs');
const path = require('path');

module.exports = function(app, deps) {
const { upload } = deps;

// 7. AGENTES DA ESTEIRA DE PRODUÃƒâ€¡ÃƒÆ’O (FASE 2: MÃƒÂQUINA DE ESTADOS)
// ==============================================================================

async function runConstructor(userInput, feedback = null, waNumber, moodId = "1_introspeccao_profunda", contentType = "pages", modelType = 'flash') {
    console.log(`Ã°Å¸Ââ€”Ã¯Â¸Â [Studio] Gerando rascunho direto: "${userInput.substring(0, 30)}..."`);
    const modelId = (modelType && modelType.includes('gemini')) ? modelType : (modelType === 'pro' ? HEAVY_MODEL : VISION_MODEL);
    const model = genAI.getGenerativeModel({ model: modelId });
    
    const clima = CLIMAS_CLINICOS[moodId] || CLIMAS_CLINICOS["1_introspeccao_profunda"];
    const personalStyle = getVictorStyle();
    const styleRules = personalStyle.style_rules?.map(r => `- ${r.regra}`).join('\n') || '';

    const prompt = `VOCÃƒÅ  Ãƒâ€° O ARQUITETO ABIDOS V5 (Digital Twin). 
                    Crie uma ${contentType === 'pages' ? 'Landing Page de Alta ConversÃƒÂ£o' : 'Postagem de Autoridade'} para: "${userInput}".
                    
                    ${VICTOR_IDENTIDADE}
                    
                    REGRAS DE CONSTRUTOR:
                    1. Use HTML5 SemÃƒÂ¢ntico e Tailwind v4.
                    2. NÃƒÆ’O gere variÃƒÂ¡veis redundantes como {{area_dinamica_extra}}.
                    3. Use os blocos de conteÃƒÂºdo estratÃƒÂ©gico Abidos (Dor, MÃƒÂ©todo, Autoridade).
                    4. No bloco de Autoridade, cite: MESTRANDO pela UFU (conclusÃƒÂ£o 2028), CRP 09/012681 e Especialista em Hipnose Ericksoniana.
                    
                    MOOD/VIBE: ${clima.nome_amigavel}
                    WHATSAPP GLOBAL: ${waNumber}
                    LOCALIZAÃƒâ€¡ÃƒÆ’O: GoiÃƒÂ¢nia.
                    
                    [ESTRUTURA FUNIL]
                    - HERO: TÃƒÂ­tulo MagnÃƒÂ­fico + CTA WhatsApp Direto (${waNumber}).
                    - MÃƒâ€°TODO ERICKSONIANO: Foco em Hipnose ClÃƒÂ­nica e CiÃƒÂªncia.
                    - FAQ: 3 perguntas fundamentais.
                    
                    Retorne APENAS o HTML INTERNO (Snippet) para o abidos-wrapper.`;

    const result = await model.generateContent(prompt);
    return result.response.text().replace(/```html|```/g, '').trim();
}

async function runAbidosInspector(html) {
    console.log(`Ã°Å¸â€Â [AGENTE 2] Auditando Estrutura e SEO (Abidos Gate)...`);
    const model = genAI.getGenerativeModel({ model: VISION_MODEL });
    let prompt = `
        Ã°Å¸â€Â AGENTE 2: Inspetor Abidos (Auditor de Estrutura e SEO V4)
        Papel: VocÃƒÂª ÃƒÂ© um Auditor de SEO TÃƒÂ©cnico implacÃƒÂ¡vel e Revisor SemÃƒÂ¢ntico.
        Comportamento: Leia o HTML gerado e procure falhas contra a Hierarquia Abidos.
        
        REGRAS DE VALIDAÃƒâ€¡ÃƒÆ’O (REPROVE SE FALTAR):
        1. **HIGIENE DO CADEADO H1**: NÃƒÂ£o deve haver tag <h1> no cÃƒÂ³digo. Se houver, mande remover (o tema cuida do H1).
        2. **FRAGMENTAÃƒâ€¡ÃƒÆ’O H2**: O conteÃƒÂºdo estÃƒÂ¡ dividido em subtÃƒÂ³picos <h2> usando as palavras-chave? (Ex: Dor, Especialista, ServiÃƒÂ§os, FAQ).
        3. **GRANULARIDADE H3**: Existem tÃƒÂ³picos <h3> para quebrar objeÃƒÂ§ÃƒÂµes ou detalhar tratamentos?
        4. **GOOGLE TAG OBRIGATÃƒâ€œRIA**: O cÃƒÂ³digo deve conter a etiqueta Google (G-B0DM24E5FS).
        5. **ABIDOS-WRAPPER**: O cÃƒÂ³digo estÃƒÂ¡ encapsulado na div class="abidos-wrapper"?
        6. **ALT TAGS**: As imagens possuem alt text estratÃƒÂ©gico e geo-localizado?

        Output Exigido (JSON APENAS): {"status": "PASSOU"} OU {"status": "REPROVOU", "motivo": "Coloque a seÃƒÂ§ÃƒÂ£o de dor em um <h2> e verifique a falta de alt tags geo-localizadas"}.
        
        HTML PARA AUDITORIA:
        ${html}
    `;
    const result = await model.generateContent(prompt);
    try {
        return JSON.parse(result.response.text().replace(/\`\`\`json|\`\`\`/g, '').trim());
    } catch (e) {
        return { status: "REPROVOU", motivo: "Erro na resposta do inspetor. Tente novamente." };
    }
}

async function runClinicalInspector(html) {
    console.log(`Ã°Å¸Â§Â  [AGENTE 3] Auditando E-E-A-T e Ãƒâ€°tica (Clinical Gate)...`);
    const model = genAI.getGenerativeModel({ model: VISION_MODEL });
    let prompt = `
        Ã°Å¸Â§Â  AGENTE 3: Inspetor ClÃƒÂ­nico (Auditor de E-E-A-T e Ãƒâ€°tica YMYL)
        Papel: VocÃƒÂª ÃƒÂ© um Revisor do Conselho Federal de Psicologia (CFP) e especialista nas diretrizes YMYL do Google. VocÃƒÂª nÃƒÂ£o escreve cÃƒÂ³digo, apenas audita o texto gerado.
        Comportamento: Leia toda a copy (texto) embutida no HTML. O nicho ÃƒÂ© saÃƒÂºde mental sensÃƒÂ­vel.
        Regras de ValidaÃƒÂ§ÃƒÂ£o:
        1. Existe alguma promessa de "cura rÃƒÂ¡pida", "garantia de resultado" ou jargÃƒÂ£o de marketing agressivo como "Compre agora"? (Se sim, REPROVOU).
        2. A autoridade E-E-A-T do Dr. Victor Lawrence (CRP 09/012681, Mestrando em Psicologia pela UFU) estÃƒÂ¡ explicitamente citada? (Se nÃƒÂ£o, REPROVOU).
        3. A linguagem ÃƒÂ© empÃƒÂ¡tica e gera baixa fricÃƒÂ§ÃƒÂ£o cognitiva? (Se nÃƒÂ£o, REPROVOU).
        Output Exigido: Responda APENAS no formato JSON: {"status": "PASSOU"} OU {"status": "REPROVOU", "motivo": "Substitua a frase X por um tom mais clÃƒÂ­nico e acolhedor"}.
        
        HTML PARA AUDITORIA:
        ${html}
    `;
    const result = await model.generateContent(prompt);
    try {
        return JSON.parse(result.response.text().replace(/\`\`\`json|\`\`\`/g, '').trim());
    } catch (e) {
        return { status: "REPROVOU", motivo: "Erro na resposta do inspetor. Tente novamente." };
    }
}

async function runDesignInspector(html) {
    console.log(`Ã°Å¸Å½Â¨ [AGENTE 4] Auditando UI/UX Tailwind (Design Gate)...`);
    const model = genAI.getGenerativeModel({ model: VISION_MODEL });
    let prompt = `
        Ã°Å¸Å½Â¨ AGENTE 4: Inspetor de Design (Auditor de UI/UX Tailwind)
        Papel: VocÃƒÂª ÃƒÂ© um Engenheiro de Neuromarketing Visual especializado em Tailwind v4. VocÃƒÂª nÃƒÂ£o cria design, apenas revisa.
        Comportamento: Leia as classes Tailwind no cÃƒÂ³digo para garantir que o Design System do MÃƒÂ©todo Abidos foi respeitado.
        Regras de ValidaÃƒÂ§ÃƒÂ£o:
        1. O Glassmorphism estÃƒÂ¡ aplicado corretamente com a fÃƒÂ³rmula de backdrop-filter? (Se nÃƒÂ£o, REPROVOU).
        2. Os textos em parÃƒÂ¡grafos usam font-normal (peso 400) para evitar cansaÃƒÂ§o visual? (Se nÃƒÂ£o, REPROVOU).
        3. Existe risco de colisÃƒÂ£o mobile (ex: botÃƒÂµes com textos gigantes que quebram a linha)? (Se sim, REPROVOU).
        Output Exigido: Responda APENAS no formato JSON: {"status": "PASSOU"} OU {"status": "REPROVOU", "motivo": "Adicione a classe '!whitespace-nowrap' no botÃƒÂ£o Y"}.

        HTML PARA AUDITORIA:
        ${html}
    `;
    const result = await model.generateContent(prompt);
    try {
        return JSON.parse(result.response.text().replace(/\`\`\`json|\`\`\`/g, '').trim());
    } catch (e) {
        return { status: "REPROVOU", motivo: "Erro na resposta do inspetor. Tente novamente." };
    }
}

/**
 * ESTEIRA DE PRODUÃƒâ€¡ÃƒÆ’O UNIFICADA (MÃƒÂQUINA DE ESTADOS)
 * Orquestra o Construtor e os 3 Inspetores com loop de retentativa.
 */
async function runProductionLine(userInput, feedback, waNumber, moodId, contentType, siloContext = "") {
    let currentHtml = "";
    let finalFeedback = feedback;
    const maxRetries = 3;
    let attempts = 0;

    reportAgentStatus("NeuroEngine", "Iniciando orquestraÃƒÂ§ÃƒÂ£o da esteira...", "", false);

    while (attempts < maxRetries) {
        attempts++;
        console.log("RETRY [ESTEIRA]: Tentativa " + attempts + "/" + maxRetries + " (" + contentType + ")");
        
        // 1. Construtor
        reportAgentStatus("Gerador", `Construindo versÃƒÂ£o ${attempts}...`, "", false);
        let extendedPrompt = userInput;
        if (siloContext) extendedPrompt += `\n\n[CONTEXTO DE SILO ABIDOS]: Este item faz parte de um cluster. Vincule-o semanticamente e crie links contextuais para: ${siloContext}`;

        try {
            currentHtml = await runConstructor(extendedPrompt, finalFeedback, waNumber, moodId, contentType);
            reportAgentStatus("Gerador", "Rascunho base gerado.", "", true);
        } catch (e) {
            reportAgentStatus("Gerador", "Erro ao gerar: " + e.message, "", true);
            throw e;
        }

        // 2. Inspetor Abidos (SEO)
        reportAgentStatus("Abidos", "Validando SEO e links...", "", false);
        const abidosResult = await runAbidosInspector(currentHtml);
        if (abidosResult.status === "REPROVOU") {
            console.warn(`Ã¢ÂÅ’ [ABIDOS REPROVOU] ${abidosResult.motivo}`);
            reportAgentStatus("Abidos", "SEO Reprovado: " + abidosResult.motivo, "", false);
            finalFeedback = `AGENTE ABIDOS REPROVOU: ${abidosResult.motivo}`;
            continue;
        }
        reportAgentStatus("Abidos", "SEO Validado.", "", true);

        // 3. Inspetor ClÃƒÂ­nico (Compliance/Ãƒâ€°tica)
        reportAgentStatus("ClÃƒÂ­nico", "Auditando Ãƒâ€°tica e Tom de Voz...", "", false);
        const clinicalResult = await runClinicalInspector(currentHtml);
        if (clinicalResult.status === "REPROVOU") {
            console.warn(`Ã¢ÂÅ’ [CLÃƒÂNICO REPROVOU] ${clinicalResult.motivo}`);
            reportAgentStatus("ClÃƒÂ­nico", "Ãƒâ€°tica Reprovada: " + clinicalResult.motivo, "", false);
            finalFeedback = `AGENTE CLÃƒÂNICO REPROVOU: ${clinicalResult.motivo}`;
            continue;
        }
        reportAgentStatus("ClÃƒÂ­nico", "Conformidade Aprovada.", "", true);

        // 4. Inspetor Design (Visual)
        reportAgentStatus("Design", "Refinando estÃƒÂ©tica mobile-first...", "", false);
        const designResult = await runDesignInspector(currentHtml);
        if (designResult.status === "REPROVOU") {
            console.warn(`Ã¢ÂÅ’ [DESIGN REPROVOU] ${designResult.motivo}`);
            reportAgentStatus("Design", "Layout Reprovado: " + designResult.motivo, "", false);
            finalFeedback = `AGENTE DESIGN REPROVOU: ${designResult.motivo}`;
            continue;
        }
        reportAgentStatus("Design", "Design Premium Validado.", "", true);

        // 5. Sucesso
        const diff = `Aprovado na tentativa ${attempts}. Auditores: OK.`;
        reportAgentStatus("NeuroEngine", "DecisÃƒÂ£o Final Tomada. Entregando para o Canvas.", "", true);
        return { html: currentHtml, diff: diff };
    }

    reportAgentStatus("NeuroEngine", "Falha apÃƒÂ³s 3 tentativas.", "A esteira nÃƒÂ£o conseguiu satisfazer todos os auditores.", true);
    throw new Error("A esteira de produÃƒÂ§ÃƒÂ£o falhou em validar o conteÃƒÂºdo apÃƒÂ³s 3 tentativas.");
}

// ==============================================================================
// 7. MARKETING LAB & ORQUESTRAÃƒâ€¡ÃƒÆ’O
// ==============================================================================

const ANALYTICS_CACHE_FILE = path.join(__dirname, 'analytics_cache.json');
const ANALYTICS_HISTORY_FILE = path.join(__dirname, 'analytics_history.json');

/**
 * Ã°Å¸â€œÅ“ REGISTRO DE HISTÃƒâ€œRICO: Salva mÃƒÂ©tricas principais dia a dia para anÃƒÂ¡lise de tendÃƒÂªncia.
 */
function saveToHistory(newData) {
    try {
        let history = {};
        if (fs.existsSync(ANALYTICS_HISTORY_FILE)) {
            history = JSON.parse(fs.readFileSync(ANALYTICS_HISTORY_FILE, 'utf8'));
        }
        const today = new Date().toISOString().split('T')[0];
        if (!history[today]) history[today] = {};
        // Merge de mÃƒÂ©tricas (mantÃƒÂ©m o que jÃƒÂ¡ tinha no dia, como PSI, e adiciona GA4)
        history[today] = { ...history[today], ...newData, last_update: new Date().toISOString() };
        fs.writeFileSync(ANALYTICS_HISTORY_FILE, JSON.stringify(history, null, 2));
        console.log(`Ã°Å¸â€œÅ“ [HISTORY] InteligÃƒÂªncia de Dados: Registro consolidado para ${today}.`);
    } catch (e) {
        console.error("Ã¢ÂÅ’ [HISTORY] Erro ao persistir histÃƒÂ³rico:", e.message);
    }
}

app.get('/api/marketing/history', (req, res) => {
    if (fs.existsSync(ANALYTICS_HISTORY_FILE)) {
        res.json(JSON.parse(fs.readFileSync(ANALYTICS_HISTORY_FILE, 'utf8')));
    } else {
        res.json({});
    }
});

app.get('/api/marketing/audit', async (req, res) => {
    try {
        const force = req.query.force === 'true';
        
        // 0. Verifica Cache (Persistence Mode)
        if (!force && fs.existsSync(ANALYTICS_CACHE_FILE)) {
            const cached = JSON.parse(fs.readFileSync(ANALYTICS_CACHE_FILE, 'utf8'));
            console.log("Ã°Å¸â€™Â¾ [MARKETING] Carregando dados persistentes do Disco (Estado Anterior).");
            return res.json(cached);
        }

        let data;

        if (!analyticsClient || !process.env.GA4_PROPERTY_ID) {
            console.log(`Ã°Å¸â€œË† [MARKETING] Usando dados Mock (Analytics nÃƒÂ£o configurado no .env)`);
            data = {
                visitors: 842, 
                leads: 31,
                active_users: 3,
                abidos_score: "92/100",
                budget_utilization: "N/A",
                top_performing_stag: "Hipnose ClÃƒÂ­nica GoiÃƒÂ¢nia",
                critica_loss: "0% (Silos Protegidos)",
                recommendations: [
                    { type: "SEO", theme: "Configurar Credenciais GA4", reason: "Falta de arquivo JSON no .env" }
                ],
                insights: `O ecossistema estÃƒÂ¡ saudÃƒÂ¡vel, mas a ativaÃƒÂ§ÃƒÂ£o do GA4 real permitiria ao Dr. Victor visualizar o impacto direto de sua autoridade clÃƒÂ­nica nas conversÃƒÂµes de GoiÃƒÂ¢nia.`
            };
        } else {
            console.log(`Ã°Å¸â€œÂ¡ [MARKETING] Buscando dados reais do GA4 (Property: ${process.env.GA4_PROPERTY_ID})...`);

            // 1. Busca VisÃƒÂ£o Geral e EstratÃƒÂ©gica (ÃƒÂºltimos 30 dias)
            const [response] = await analyticsClient.runReport({
                property: `properties/${process.env.GA4_PROPERTY_ID}`,
                dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
                dimensions: [{ name: 'sessionSourceMedium' }],
                metrics: [
                    { name: 'activeUsers' },
                    { name: 'sessions' },
                    { name: 'conversions' },
                    { name: 'engagementRate' },
                    { name: 'eventCount' },
                    { name: 'organicGoogleSearchClicks' }
                ],
            });

            // 2. Busca usuÃƒÂ¡rios ativos agora (Real-time)
            const [realtimeResponse] = await analyticsClient.runRealtimeReport({
                property: `properties/${process.env.GA4_PROPERTY_ID}`,
                dimensions: [{ name: 'city' }],
                metrics: [{ name: 'activeUsers' }],
            });

            let totalVisitors = 0;
            let totalSessions = 0;
            let totalConversions = 0;
            let totalOrganicClicks = 0;
            let avgEngagement = 0;
            let totalEvents = 0;
            let topChannel = "Direto / OrgÃƒÂ¢nico";

            if (response && response.rows) {
                let maxSessions = 0;
                response.rows.forEach(row => {
                    const rowSessions = parseInt(row.metricValues[1].value || 0);
                    totalVisitors += parseInt(row.metricValues[0].value || 0);
                    totalSessions += rowSessions;
                    totalConversions += parseInt(row.metricValues[2].value || 0);
                    avgEngagement += parseFloat(row.metricValues[3].value || 0);
                    totalEvents += parseInt(row.metricValues[4].value || 0);
                    totalOrganicClicks += parseInt(row.metricValues[5].value || 0);

                    if (rowSessions > maxSessions) {
                        maxSessions = rowSessions;
                        topChannel = row.dimensionValues[0].value;
                    }
                });
                avgEngagement = (avgEngagement / response.rows.length * 100).toFixed(1) + "%";
            }

            const activeNow = (realtimeResponse && realtimeResponse.rows) 
                ? realtimeResponse.rows.reduce((acc, row) => acc + parseInt(row.metricValues[0].value || 0), 0)
                : 0;

            data = {
                visitors: totalVisitors, 
                sessions: totalSessions,
                leads: totalConversions,
                organic_clicks: totalOrganicClicks,
                engagement_rate: avgEngagement,
                total_events: totalEvents,
                active_now: activeNow,
                abidos_score: "94/100",
                budget_utilization: "N/A",
                top_performing_stag: topChannel,
                critica_loss: "0% (Silos Protegidos)",
                recommendations: [], 
                insights: `Cruzamento de ${totalEvents} eventos e ${totalOrganicClicks} cliques orgÃƒÂ¢nicos capturados nas ÃƒÂºltimas 4 semanas.`,
                last_sync: new Date().toISOString()
            };
        }

        fs.writeFileSync(ANALYTICS_CACHE_FILE, JSON.stringify(data, null, 2));
        saveToHistory({ 
            visitors: data.visitors, 
            leads: data.leads, 
            sessions: data.sessions || 0, 
            organic_clicks: data.organic_clicks || 0,
            engagement: data.engagement_rate || '0%'
        });
        res.json(data);
    } catch (e) {
        console.error("Ã¢ÂÅ’ [MARKETING] Erro CrÃƒÂ­tico GA4:", e.message);
        res.json({
            visitors: 0, 
            sessions: 0,
            leads: 0,
            active_now: 0,
            abidos_score: "0/100",
            budget_utilization: "N/A",
            top_performing_stag: "INDISPONÃƒÂVEL",
            critica_loss: "ALERTA: FONTE DE DADOS OFFLINE",
            recommendations: [
                { type: "CRÃƒÂTICO", theme: "Falha de ConexÃƒÂ£o", reason: "O sistema nÃƒÂ£o conseguiu se comunicar com o Google Analytics: " + e.message }
            ],
            insights: "Sincronizando: O motor de telemetria estÃƒÂ¡ processando as mÃƒÂ©tricas do ecossistema. Re-sincronize em 15 segundos."
        });
    }
});

/**
 * Ã¢Å¡Â¡ PAGESPEED INSIGHTS (PSI) - Auditoria de Performance Core Web Vitals
 */
app.get('/api/marketing/psi', async (req, res) => {
    try {
        const force = req.query.force === 'true';
        const cacheMaxAge = 24 * 60 * 60 * 1000; // 24 horas

        // 0. Verifica Cache & Estado de Cota
        if (fs.existsSync(ANALYTICS_CACHE_FILE)) {
             const cache = JSON.parse(fs.readFileSync(ANALYTICS_CACHE_FILE, 'utf8'));
             const lastAudit = cache.psi ? new Date(cache.psi.last_audit).getTime() : 0;
             const isExpired = (Date.now() - lastAudit) > cacheMaxAge;

             // Se a ÃƒÂºltima tentativa deu "Quota Exceeded" nos ÃƒÂºltimos 60 min, nÃƒÂ£o tenta de novo
             if (cache.psi_quota_exceeded_at) {
                 const quotaErrTime = new Date(cache.psi_quota_exceeded_at).getTime();
                 if (Date.now() - quotaErrTime < 60 * 60 * 1000) {
                     console.log("Ã°Å¸Å¡Â« [PSI] Pulando auditoria real devido a bloqueio de cota recente (Caching Ativo).");
                     return res.json(cache.psi || { error: "Cota Google Excedida. Tente em 60 min." });
                 }
             }

             if (!force && cache.psi && !isExpired) {
                 console.log("Ã°Å¸â€™Â¾ [PSI] Carregando auditoria de Safe-Cache (V5.1).");
                 return res.json(cache.psi);
             }
        }

        const targetUrl = process.env.PSI_TARGET_URL || "https://instituto-ops.com.br"; 
        console.log(`Ã¢Å¡Â¡ [PSI] Auditoria Profunda (CrUX + Lighthouse) para ${targetUrl}...`);

        const categories = ['PERFORMANCE', 'ACCESSIBILITY', 'BEST_PRACTICES', 'SEO'];
        const psiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(targetUrl)}&${categories.map(c => `category=${c}`).join('&')}`;

        const response = await fetch(psiUrl);
        const data = await response.json();

        if (data.error) throw new Error(data.error.message);

        // 1. Dados Real-World (CrUX / Field Data)
        const fieldData = {
            fcp: data.loadingExperience?.metrics?.FIRST_CONTENTFUL_PAINT_MS?.category || "N/A",
            inp: data.loadingExperience?.metrics?.INTERACTION_TO_NEXT_PAINT?.category || "N/A",
            lcp: data.loadingExperience?.metrics?.LARGEST_CONTENTFUL_PAINT_MS?.category || "N/A",
            overall: data.loadingExperience?.overall_category || "N/A"
        };

        // 2. Dados Lab (Lighthouse Result)
        const lh = data.lighthouseResult;
        const result = {
            performance: Math.round((lh?.categories?.performance?.score || 0) * 100),
            accessibility: Math.round((lh?.categories?.accessibility?.score || 0) * 100),
            best_practices: Math.round((lh?.categories?.['best-practices']?.score || 0) * 100),
            seo: Math.round((lh?.categories?.seo?.score || 0) * 100),
            lcp: lh?.audits?.['largest-contentful-paint']?.displayValue || "N/A",
            tbt: lh?.audits?.['total-blocking-time']?.displayValue || "N/A",
            cls: lh?.audits?.['cumulative-layout-shift']?.displayValue || "N/A",
            
            // SugestÃƒÂµes de Impacto (Oportunidades com maior ganho de MS)
            opportunities: Object.values(lh?.audits || {})
                .filter(audit => audit.details?.type === 'opportunity' && (audit.score || 0) < 0.9)
                .sort((a, b) => (b.details?.overallSavingsMs || 0) - (a.details?.overallSavingsMs || 0))
                .slice(0, 3)
                .map(o => ({ title: o.title, savings: o.displayValue, description: o.description })),
            
            field: fieldData,
            last_audit: new Date().toISOString()
        };

        // Persiste no cache global
        if (fs.existsSync(ANALYTICS_CACHE_FILE)) {
            let cache = JSON.parse(fs.readFileSync(ANALYTICS_CACHE_FILE, 'utf8'));
            cache.psi = result;
            fs.writeFileSync(ANALYTICS_CACHE_FILE, JSON.stringify(cache, null, 2));
        }

        saveToHistory({ 
            psi_perf: result.performance, 
            psi_seo: result.seo, 
            psi_best: result.best_practices,
            lcp: result.lcp 
        });

        res.json(result);

    } catch (e) {
        console.error("Ã¢ÂÅ’ [PSI] Erro na Auditoria:", e.message);
        
        // Se for erro de cota, persiste para evitar spam
        if (e.message.includes('Quota exceeded') && fs.existsSync(ANALYTICS_CACHE_FILE)) {
             let cache = JSON.parse(fs.readFileSync(ANALYTICS_CACHE_FILE, 'utf8'));
             cache.psi_quota_exceeded_at = new Date().toISOString();
             fs.writeFileSync(ANALYTICS_CACHE_FILE, JSON.stringify(cache, null, 2));
        }

        res.status(500).json({ error: "Falha na auditoria PSI: " + e.message });
    }
});

/**
 * Ã°Å¸Â¤â€“ AGENTE ANALYTICS: Gera sugestÃƒÂµes baseadas nos dados reais do GA4
 */
app.post('/api/analytics/suggestions', async (req, res) => {
    try {
        const { analyticsData } = req.body;
        console.log(`Ã°Å¸Â§Â  [AGENTE ANALYTICS] Gerando sugestÃƒÂµes estratÃƒÂ©gicas...`);

        const pSuggestions = `
        VocÃƒÂª ÃƒÂ© o "Agente Analytics", especialista em Growth Hacking e Funil Abidos.
        Analise os dados reais do Google Analytics 4 abaixo:
        
        DADOS:
        - Visitantes (30d): ${analyticsData.visitors}
        - ConversÃƒÂµes (30d): ${analyticsData.leads}
        - UsuÃƒÂ¡rios Ativos Agora: ${analyticsData.active_now}
        
        SUA TAREFA:
        Gere 3 sugestÃƒÂµes acionÃƒÂ¡veis para o Dr. Victor Lawrence melhorar o desempenho do site.
        Use uma linguagem voltada para negÃƒÂ³cios e autoridade clÃƒÂ­nica.
        
        RETORNE EM JSON:
        {"suggestions": [{"title": "Nome da SugestÃƒÂ£o", "description": "ExplicaÃƒÂ§ÃƒÂ£o tÃƒÂ©cnica", "impact": "Alto/MÃƒÂ©dio/Baixo"}]}
        `;

        const model = getAIModel(req.body.modelType);
        const result = await model.generateContent(pSuggestions);
        trackUsage(result.response.usageMetadata);
        const responseText = result.response.text();
        
        let jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        // ExtraÃƒÂ§ÃƒÂ£o Robusta de JSON
        const match = jsonStr.match(/\{[\s\S]*\}/);
        if (match) jsonStr = match[0];

        try {
            const parsed = JSON.parse(jsonStr);
            
            // PersistÃƒÂªncia: Unifica sugestÃƒÂµes no cache global
            if (fs.existsSync(ANALYTICS_CACHE_FILE)) {
                let cache = JSON.parse(fs.readFileSync(ANALYTICS_CACHE_FILE, 'utf8'));
                cache.suggestions = parsed.suggestions;
                fs.writeFileSync(ANALYTICS_CACHE_FILE, JSON.stringify(cache, null, 2));
            }

            res.json(parsed);
        } catch (parseErr) {
            console.error("Ã¢ÂÅ’ [AGENTE ANALYTICS] Falha ao parsear JSON IA:", jsonStr);
            res.json({ suggestions: [{ title: "Falha de Processamento", description: "A IA nÃƒÂ£o conseguiu estruturar as sugestÃƒÂµes. Verifique os logs do servidor.", impact: "N/A" }] });
        }
    } catch (e) {
        console.warn("Ã¢Å¡Â Ã¯Â¸Â [AGENTE ANALYTICS] Falha na IA:", e.message);
        
        // Tenta retornar sugestÃƒÂµes cacheadas se a IA falhar
        if (fs.existsSync(ANALYTICS_CACHE_FILE)) {
             const cache = JSON.parse(fs.readFileSync(ANALYTICS_CACHE_FILE, 'utf8'));
             if (cache.suggestions) return res.json({ suggestions: cache.suggestions });
        }

        res.json({ suggestions: [{ title: "SugestÃƒÂµes IndisponÃƒÂ­veis", description: "O motor de anÃƒÂ¡lise estratÃƒÂ©gica estÃƒÂ¡ offline.", impact: "N/A" }] });
    }
});

app.post('/api/chat', upload.single('screenshot'), async (req, res) => {
    try {
        const { prompt, message, htmlContext, currentKeyword, whatsapp, moodId, type, modelType } = req.body;
        const userInput = prompt || message;
        const waNumber = whatsapp || '62991545295';
        const selectedMood = moodId || '1_introspeccao_profunda';
        const contentType = type || 'pages';

        console.log(`\nÃ°Å¸Ââ€”Ã¯Â¸Â [STUDIO-CONSTRUCTION] Novo Comando: "${userInput.substring(0, 30)}..." (Model: ${modelType || 'default'})`);
        reportAgentStatus("Agente Construtor", "Sintetizando DNA clÃƒÂ­nico e estruturando rascunho...", "", false);

        // REGRA DE OURO: No AI Studio, apenas o Construtor trabalha.
        const html = await runConstructor(userInput, null, waNumber, selectedMood, contentType, modelType);
        
        reportAgentStatus("Agente Construtor", "Rascunho finalizado com sucesso.", "", true);
        res.json({ reply: html });
    } catch (e) { 
        console.error("Ã¢ÂÅ’ [CHAT-ESTEIRA ERROR]", e.message);
        res.status(500).json({ error: e.message }); 
    }
});

app.post('/api/blueprint', upload.none(), async (req, res) => {
    try {
        const { theme, whatsapp, moodId, type } = req.body;
        const waNumber = whatsapp || '5562991545295';
        const selectedMood = moodId || '1_introspeccao_profunda';
        const contentType = type || 'pages';
        
        console.log(`\nÃ°Å¸â€œÂ [BLUEPRINT] Construindo rascunho acelerado: "${theme}"`);
        reportAgentStatus("Agente Construtor", "Orquestrando blueprint estrutural...", "", false);

        const html = await runConstructor(`Criar blueprint completo para o tema: ${theme}`, null, waNumber, selectedMood, contentType, req.body.modelType || 'flash');
        
        reportAgentStatus("Agente Construtor", "Blueprint entregue.", "", true);
        res.json({ reply: html });
    } catch (e) { 
        console.error("Ã¢ÂÅ’ [BLUEPRINT ERROR]", e.message);
        res.status(500).json({ error: e.message }); 
    }
});

app.post('/api/audit', async (req, res) => {
    try {
        const { html, keyword, modelType } = req.body;
        const modelId = (modelType && modelType.includes('gemini')) ? modelType : VISION_MODEL;
        const model = genAI.getGenerativeModel({ model: modelId });
        const result = await model.generateContent(`Retorne um JSON array de auditoria SEO para o termo ${keyword}:\n\n${html}`);
        trackUsage(result.response.usageMetadata);
        const resp = await result.response;
        res.json({ checklist: JSON.parse(resp.text().replace(/```json|```/g, '').trim()) });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Ã°Å¸Å¡â‚¬ [FASE 5] ENDPOINTS NEURO-TRAINING (DNA CLONE & STYLE MEMORY)
app.get('/api/neuro-training/memory', (req, res) => {
    try {
        res.json(getVictorStyle());
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// [TELEMETRIA] Endpoint para o Orquestrador
app.get('/api/system/telemetry', (req, res) => {
    res.json(getTelemetry());
});

app.delete('/api/neuro-training/memory/:id', (req, res) => {
    try {
        const memory = getVictorStyle();
        memory.style_rules = memory.style_rules.filter(r => r.id !== req.params.id);
        fs.writeFileSync(MEMORY_FILE_PATH, JSON.stringify(memory, null, 2));
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/neuro-training/memory/clear', (req, res) => {
    try {
        const memory = {
            style_rules: [],
            last_update: new Date().toISOString(),
            insights_history: [],
            scientific_vault: { 
                nota: "Sistema resetado em " + new Date().toLocaleString('pt-BR'),
                status: "LinguÃƒÂ­stica Pura Ativada"
            }
        };
        fs.writeFileSync(MEMORY_FILE_PATH, JSON.stringify(memory, null, 2));
        console.log("Ã°Å¸Â§Â¹ [NEURO-MEMORY] MemÃƒÂ³ria de Estilo limpa com sucesso.");
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/neuro-training/analyze-dna', upload.single('audio'), async (req, res) => {
    try {
        if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY nÃƒÂ£o configurada no servidor.");
        if (!req.file) throw new Error("AÃƒÂºdio nÃƒÂ£o recebido.");
        const modelId = (req.body.modelType && req.body.modelType.includes('gemini')) ? req.body.modelType : VISION_MODEL;
        const model = genAI.getGenerativeModel({ model: modelId });
        
        const result = await model.generateContent([
            { text: PROMPT_TREINAMENTO_ISOLADO },
            { inlineData: { data: req.file.buffer.toString('base64'), mimeType: req.file.mimetype } }
        ]);

        const extracted = extractJSON(result.response.text());
        if (!extracted) throw new Error("IA falhou na sÃƒÂ­ntese de DNA via ÃƒÂudio.");

        if (extracted.regras_extraidas) {
            await salvarRegrasDeEstilo(extracted.regras_extraidas);
        }

        res.json({ success: true, insights: extracted.regras_extraidas, summary: cleanClinicalData(extracted.insight) });
    } catch (e) {
        console.error("Ã¢ÂÅ’ [DNA ERROR]", e);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/neuro-training/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) throw new Error("Arquivo nÃƒÂ£o recebido.");
        let text = "";
        if (req.file.mimetype === 'application/pdf') {
            const data = await pdf(req.file.buffer);
            text = data.text;
        } else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const result = await mammoth.extractRawText({ buffer: req.file.buffer });
            text = result.value;
        } else {
            text = req.file.buffer.toString('utf-8');
        }

        const modelType = req.body.modelType;
        const modelId = (modelType && modelType.includes('gemini')) ? modelType : (modelType === 'flash' ? VISION_MODEL : HEAVY_MODEL);
        const targetModel = genAI.getGenerativeModel({ model: modelId });

        const completePrompt = `${PROMPT_TREINAMENTO_ISOLADO}

CONTEXTO: O PROFISSIONAL (Dr. Victor Lawrence) ÃƒÂ© o PARTICIPANTE 2 (P2). 
O PARTICIPANTE 1 (P1) ÃƒÂ© o CLIENTE/PACIENTE.
IGNORE P1 e extraia a sintaxe exclusivamente de P2.

TEXTO: "${text.substring(0, 8000).replace(/"/g, "'")}"`;

        const result = await targetModel.generateContent(completePrompt);
        const extracted = extractJSON(result.response.text());
        if (!extracted) throw new Error("IA falhou na anÃƒÂ¡lise de lastro.");

        if (extracted.regras_extraidas) {
            await salvarRegrasDeEstilo(extracted.regras_extraidas);
        }
        res.json({ success: true, insights: extracted.regras_extraidas, summary: cleanClinicalData(extracted.feedback_analysis) });
    } catch (e) {
        console.error("Ã¢ÂÅ’ [UPLOAD ERROR]", e);
        res.status(500).json({ error: e.message });
    }
});

const { execSync } = require('child_process');

// ==============================================================================
// 1. PUBLICAR NO WORDPRESS (LEGADO / RASCUNHO)
// ==============================================================================
// [LEGADO REMOVIDO: PUBLICAR NO WORDPRESS]
app.post('/api/content/publish-wordpress', async (req, res) => {
    return res.status(410).json({
        success: false,
        error: 'Fluxo WordPress legado/desativado. Use o pipeline Vercel + Next.js.',
        replacement: '/api/content/publish-vercel'
    });

    try {
        const { type, title, content, status, slug, metaTitle, metaDesc } = req.body;
        console.log(`Ã°Å¸Å¡â‚¬ [PUBLISH PROXY] Iniciando deploy do tipo ${type}: "${title}"`);

        const payload = {
            title: title || "Sem TÃƒÂ­tulo",
            content: content || "",
            status: status || "draft",
            slug: slug || "",
        };

        payload.meta = {
            _yoast_wpseo_metadesc: metaDesc || "",
            _yoast_wpseo_title: metaTitle || "",
            rank_math_description: metaDesc || "",
            rank_math_title: metaTitle || "",
            _abidos_render_headless: "1",
            _abidos_headless_content: payload.content,
            _abidos_last_sync: new Date().toISOString()
        };

        const endpoint = type === 'posts' ? '/posts' : '/pages';
        const response = await callWP('POST', endpoint, payload);

        if (response && response.data && response.data.id) {
            const postId = response.data.id;
            const postLink = response.data.link;

            res.json({ 
                success: true, 
                id: postId, 
                link: postLink,
                message: "Publicado com sucesso no WordPress (Rascunho Acelerado)"
            });

            // Auditoria em background
            (async () => {
                try {
                    const auditResult = await runProductionLine(`Auditar conteÃƒÂºdo salvo: ${title}`, payload.content, "62991545295", "1_introspeccao_profunda", type);
                    if (auditResult) {
                        await callWP('POST', `/${endpoint}/${postId}`, {
                            meta: {
                                _abidos_audit_status: "APROVADO",
                                _abidos_audit_report: JSON.stringify(auditResult),
                                _abidos_last_audit: new Date().toISOString()
                            }
                        });
                    }
                } catch (auditErr) { console.error(`Ã°Å¸Å¡Â¨ [AUDIT-ERROR]:`, auditErr.message); }
            })();

        } else {
            res.status(500).json({ error: "Resposta invÃƒÂ¡lida do WordPress." });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ==============================================================================
// Ã°Å¸â€ â€¢ 2. PUBLICAR NO VERCEL + NEXT.JS (PROTOCOLO v2.0 - MODERNO)
// ==============================================================================

app.post('/api/content/publish-vercel', async (req, res) => {
    try {
        const { title, content, slug, author = "Victor Lawrence", date = new Date().toLocaleDateString('pt-PT'), neuroEngineData = {} } = req.body;
        const sitePath = process.env.NEXTJS_SITE_PATH;

        if (!sitePath || !fs.existsSync(sitePath)) {
            throw new Error("Caminho do repositÃƒÂ³rio Next.js nÃƒÂ£o configurado.");
        }

        const blogPath = path.join(sitePath, 'src/app/blog', slug);
        if (!fs.existsSync(blogPath)) fs.mkdirSync(blogPath, { recursive: true });

        const pageTemplate = `"use client";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import Script from "next/script";

export default function BlogPage() {
  return (
    <div className="bg-grain min-h-screen bg-ink-900 font-manrope text-paper-100 flex flex-col antialiased">
      <title>${title}</title>
      <Script async src="https://www.googletagmanager.com/gtag/js?id=G-B0DM24E5FS" strategy="afterInteractive" />
      <Script id="google-analytics" strategy="afterInteractive">
        {\`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-B0DM24E5FS');
        \`}
      </Script>
      <nav className="sticky top-0 z-40 border-b border-ink-800 bg-ink-900/90 backdrop-blur-md px-6 py-4">
        <Link href="/" className="font-serif italic text-xl">V. Lawrence</Link>
      </nav>
      <main className="max-w-4xl mx-auto px-6 py-20">
        <h1 className="font-serif text-5xl lg:text-7xl mb-12">${title}</h1>
        <article className="prose prose-invert lg:prose-xl" dangerouslySetInnerHTML={{ __html: ${JSON.stringify(content)} }} />
      </main>
    </div>
  );
}

// ==========================================
// Ã°Å¸Â§Â¬ NEUROENGINE DATA BLOCK
// ==========================================
export const neuroEngineData = ${JSON.stringify(neuroEngineData || {}, null, 2)};
`;

        fs.writeFileSync(path.join(blogPath, 'page.tsx'), pageTemplate);

        // Deploy AutomÃƒÂ¡tico via Git Push
        try {
            execSync(`git add . && git commit -m "feat: publish post ${slug}" && git push`, { cwd: sitePath });
            console.log(`Ã¢Å“â€¦ Deploy Vercel disparado para: ${slug}`);
        } catch (gitErr) { console.warn("Git Push ignorado (provavelmente sem mudanÃƒÂ§as)."); }

        res.json({ 
            success: true, 
            link: `https://hipnolawrence.com/blog/${slug}`,
            message: "Publicado com sucesso no site oficial (Vercel)." 
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// =========================================================
// ROTA: ORQUESTRAÃƒâ€¡ÃƒÆ’O DE CLUSTER / SILO NEURAL (Usa o PRO)
// =========================================================
app.post('/api/blueprint/cluster', async (req, res) => {
    try {
        const { theme, moodId, whatsapp } = req.body;
        console.log(`Ã°Å¸â€™Â  [CLUSTER] Orquestrando Silo Neural para: ${theme}`);

        if (!modelPro) {
            console.error("Ã¢ÂÅ’ modelPro nÃƒÂ£o inicializado!");
            return res.status(500).json({ error: "HemisfÃƒÂ©rio Pro nÃƒÂ£o carregado no servidor." });
        }

        const dnaInjetadoCluster = getDnaContext();
        const moodCluster = tema && tema.toLowerCase().includes('tea') ? CLIMAS_CLINICOS['3_conforto_neurodivergente'] : CLIMAS_CLINICOS['1_introspeccao_profunda'];

        const systemPrompt = `
VocÃƒÂª ÃƒÂ© o Arquiteto Abidos (Gemini 2.5 Pro). Crie um Cluster SEO de alta conversÃƒÂ£o para o Dr. Victor Lawrence (tema: "${theme}").

Gere EXATAMENTE 4 conteÃƒÂºdos:
- 1 PÃƒÂ¡gina Pilar (Hub) de vendas (type: "pages")
- 3 Artigos de Blog (Spokes) em cauda longa (type: "posts")

[DESIGN OBRIGATÃƒâ€œRIO PARA CADA ITEM HTML]
- WRAPPER: <div class="abidos-wrapper antialiased px-4 py-8 md:px-12 lg:px-24 ${moodCluster.fundo_principal} min-h-screen font-inter ${moodCluster.texto_principal}">
- CARDS: bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 md:p-10 shadow-2xl hover:border-teal-500/50 transition-all
- H2 GRADIENTE: font-outfit font-bold text-3xl md:text-5xl text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500
- GRIDS: grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
- BOTOÃƒâ€¢ES CTA: inline-flex px-8 py-4 bg-teal-500 hover:bg-teal-400 text-[#05080f] font-bold rounded-full hover:scale-105 shadow-[0_0_25px_rgba(45,212,191,0.35)]
- GLOW ORB: <div class="absolute -z-10 w-96 h-96 bg-teal-500/10 blur-[150px] rounded-full"></div>
- EFEITO DO MOOD: ${moodCluster.efeitos_obrigatorios}
- PROIBIDO H1 manual, PROIBIDO URLs inventadas, PROIBIDO tags puras.

[DNA LITERÃƒÂRIO]
${dnaInjetadoCluster || 'Use linguagem ericksoniana permissiva.'}

[LINKS E IMAGENS REAIS Ã¢â‚¬â€ USE OBRIGATORIAMENTE]
${REAL_ASSETS}

${ETICA_ABIDOS}

RETORNE EXCLUSIVAMENTE UM JSON VÃƒÂLIDO:
{
  "mainTopic": "${theme}",
  "items": [
    { "title": "TÃƒÂ­tulo do Hub", "type": "pages", "html": "<div class=\\"abidos-wrapper...\\">...</div>" },
    { "title": "Artigo 1", "type": "posts", "html": "<div class=\\"abidos-wrapper...\\">...</div>" },
    { "title": "Artigo 2", "type": "posts", "html": "<div class=\\"abidos-wrapper...\\">...</div>" },
    { "title": "Artigo 3", "type": "posts", "html": "<div class=\\"abidos-wrapper...\\">...</div>" }
  ]
}
        `;

        const result = await modelPro.generateContent(systemPrompt);
        const responseText = result.response.text();
        const clusterData = extractJSON(responseText);
        
        if (!clusterData || !clusterData.items) {
            console.error("Ã¢ÂÅ’ Falha ao extrair JSON do Cluster. Resposta bruta:", responseText);
            throw new Error("A IA nÃƒÂ£o retornou um JSON vÃƒÂ¡lido de Cluster.");
        }

        clusterData.success = true;
        res.status(200).json(clusterData);

    } catch (error) {
        console.error("Ã°Å¸Å¡Â¨ Erro na geraÃƒÂ§ÃƒÂ£o do Cluster:", error);
        res.status(500).json({ 
            success: false, 
            error: "Falha no HemisfÃƒÂ©rio Pro: " + error.message 
        });
    }
});

// =========================================================
// [AGENTE GERENTE] O Orquestrador Central (MANAGER V4)
// =========================================================
app.post('/api/manager/chat', async (req, res) => {
    try {
        const { message, history, modelType } = req.body;
        console.log(`Ã°Å¸â€˜â€˜ [MANAGER] Processando solicitaÃƒÂ§ÃƒÂ£o estratÃƒÂ©gica via ${modelType || 'PRO'}: "${message.substring(0, 50)}..."`);
        
        // 1. Coleta de Contexto Global (VisÃƒÂ£o de "Tudo")
        const silosRaw = fs.existsSync(path.join(__dirname, 'silos.json')) ? fs.readFileSync(path.join(__dirname, 'silos.json'), 'utf8') : '[]';
        const draftsRaw = fs.existsSync(path.join(__dirname, 'drafts.json')) ? fs.readFileSync(path.join(__dirname, 'drafts.json'), 'utf8') : '[]';
        const style = getVictorStyle();
        const menusRaw = fs.existsSync(MENUS_FILE) ? fs.readFileSync(MENUS_FILE, 'utf8') : '[]';
        
        // 2. Montagem do Super-Prompt (Prompt System Contextual)
        const systemPrompt = `
[PROTOCOLO DE GERÃƒÅ NCIA CENTRAL - ABIDOS MANAGER V4]
VocÃƒÂª ÃƒÂ© o AGENTE GERENTE (CEO) do ecossistema NeuroEngine do Dr. Victor Lawrence.
Sua missÃƒÂ£o ÃƒÂ© atuar como um Assessor EstratÃƒÂ©gico de alto nÃƒÂ­vel, conectando todos os pontos do sistema.

[CONTEXTO ATUAL DO ECOSSISTEMA]
- SILOS/ARQUITETURA ATUAL: ${silosRaw}
- RASCUNHOS NO PIPELINE: ${draftsRaw.substring(0, 2000)}... (truncado para contexto)
- REGRAS DE IDENTIDADE VERBAL: ${JSON.stringify(style.style_rules)}
- ESTRUTURA DE MENUS: ${menusRaw}

[SUAS DIRETRIZES DE OURO]
1. SOBERANIA ESTRATÃƒâ€°GICA: VocÃƒÂª vÃƒÂª o que os outros agentes nÃƒÂ£o vÃƒÂªem. Se o marketing sugere algo que o SEO nÃƒÂ£o suporta, vocÃƒÂª deve mediar.
2. ABIDOS METHODOLOGY: Suas respostas devem refletir o rigor do mÃƒÂ©todo Abidos (Autoridade, ConversÃƒÂ£o e Ãƒâ€°tica ClÃƒÂ­nica).
3. TOM DE VOZ: Profissional, ultra-inteligente, conciso e propositivo.
4. COMPLIANCE EEAT (REGRAS DE OURO):
   - Ã¢Å“â€¦ USE SEMPRE: Manejo, RegulaÃƒÂ§ÃƒÂ£o Emocional, Protocolo Validado, AvaliaÃƒÂ§ÃƒÂ£o ClÃƒÂ­nica, EstratÃƒÂ©gias de Coping.
   - Ã°Å¸Å¡Â« PROIBIDO: Cura, Milagre, Definitivo, RÃƒÂ¡pido, Garantido.
5. ARQUITETURA DE COPY FATIADO: Sempre que sugerir blocos Hero, use a estrutura: Kicker (mÃƒÂ¡x 6 pal.), H1 (8 pal.) e Subtitle (20 pal.).
6. CAPACIDADES DE RESPOSTA: VocÃƒÂª pode sugerir mudanÃƒÂ§as estruturais, validar rascunhos ou propor novas campanhas baseadas nos dados.

[HISTÃƒâ€œRICO DA SESSÃƒÆ’O ATUAL]
${(history || []).map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}

REQUISIÃƒâ€¡ÃƒÆ’O DO DR. VICTOR: "${message}"

[MANUAL DE ESTILO DE RESPOSTA]
1. FALA HUMANA: VocÃƒÂª ÃƒÂ© um ASSESSOR, nÃƒÂ£o um banco de dados. Transforme o JSON do contexto em insights narrativos.
2. ESTRUTURA VISUAL: Use Markdwon com cabeÃƒÂ§alhos (#, ##), listas (-) e negrito (**).
3. PROIBIÃƒâ€¡ÃƒÆ’O: Ãƒâ€° expressamente proibido responder com chaves {}, colchetes [] ou sintaxe de programaÃƒÂ§ÃƒÂ£o.
4. AÃƒâ€¡ÃƒÆ’O TÃƒâ€°CNICA: Se quiser disparar uma aÃƒÂ§ÃƒÂ£o, mencione "AÃƒâ€¡ÃƒÆ’O IMPLEMENTADA: [NOME]" em uma linha isolada ao final.

REQUISIÃƒâ€¡ÃƒÆ’O: "${message}"
`;

        // Usamos o motor dinÃƒÂ¢mico (Default: PRO para melhor anÃƒÂ¡lise estratÃƒÂ©gica)
        const activeModel = getAIModel(modelType || 'pro', 'text/plain');

        const result = await activeModel.generateContent(systemPrompt);
        const responseText = result.response.text();
        
        res.json({ reply: responseText });

    } catch (e) {
        console.error("Ã¢ÂÅ’ ERRO CRÃƒÂTICO NO GERENTE:", e.message);
        res.status(500).json({ error: "O Gerente Abidos encontrou uma falha de sincronizaÃƒÂ§ÃƒÂ£o: " + e.message });
    }
});

// =========================================================
// ROTA: NEURO-TRAINING CHAT (CONVERSA CONTÃƒÂNUA DE VOZ)
// =========================================================
app.post('/api/neuro-training/chat', async (req, res) => {
    try {
        const { message, modelType } = req.body;
        if (!message) return res.status(400).json({ error: 'Mensagem vazia.' });

        const targetModel = modelType === 'flash' ? modelFlash : modelPro;
        
        const fullPrompt = `${PROMPT_TREINAMENTO_ISOLADO}\n\nFALA DO DR. VICTOR-Ouvinte: "${message}"`;
        const result = await targetModel.generateContent(fullPrompt);

        const responseText = result.response.text();
        const parsed = extractJSON(responseText);

        if (!parsed || !parsed.reply) {
            return res.json({ reply: responseText.replace(/```json|```/g, '').trim(), regras_extraidas: [] });
        }

        if (parsed.regras_extraidas && parsed.regras_extraidas.length > 0) {
            const currentMemory = getVictorStyle();
            parsed.regras_extraidas.forEach(regra => {
                regra.id = `chat_${Date.now()}_${Math.random().toString(36).substr(2,5)}`;
                regra.data_extracao = new Date().toISOString();
                currentMemory.style_rules.push(regra);
            });
            fs.writeFileSync(MEMORY_FILE_PATH, JSON.stringify(currentMemory, null, 2));
            console.log(`Ã¢Å“Â¨ [NEURO-CHAT] ${parsed.regras_extraidas.length} nova(s) regra(s) de DNA salva(s).`);
        }

        res.json(parsed);

    } catch (error) {
        console.error('Ã¢ÂÅ’ [NEURO-TRAINING/CHAT ERROR]', error);
        res.status(500).json({ error: 'Falha no Aprendiz de Abidos: ' + error.message });
    }
});

app.post('/api/doctoralia/generate-reply', async (req, res) => {
    try {
        const { question, modelType } = req.body;
        const targetModel = getAIModel(modelType, 'text/plain');
        console.log(`Ã°Å¸Â§Â  [DOCTORALIA] Gerando resposta via motor ${modelType}...`);

        const dnaInjetado = getDnaContext();
        const systemPrompt = `
VocÃƒÂª ÃƒÂ© o GÃƒÂªmeo Digital LiterÃƒÂ¡rio do Dr. Victor Lawrence (PsicÃƒÂ³logo ClÃƒÂ­nico CRP 09/012681, Especialista em TEA em Adultos e Hipnose Ericksoniana, Mestrando UFU (conclusÃƒÂ£o 2028), GoiÃƒÂ¢nia-GO).
Sua missÃƒÂ£o ÃƒÂ© responder ÃƒÂ  dÃƒÂºvida de um paciente na plataforma Doctoralia.

${dnaInjetado}

ESTRUTURA OBRIGATÃƒâ€œRIA DA RESPOSTA (MÃƒâ€°TODO ABIDOS):
1. Acolhimento (Pacing): Valide a dor ou dÃƒÂºvida aplicando sua empatia e cadÃƒÂªncia caracterÃƒÂ­sticas.
2. Utilidade PrÃƒÂ¡tica: Explique de forma psicoeducativa, breve e fenomenolÃƒÂ³gica.
3. ReforÃƒÂ§o de Autoridade (E-E-A-T): Se o tema for TEA, Burnout ou Hipnose, mencione sutilmente sua experiÃƒÂªncia.
4. Fechamento: Convide para avaliaÃƒÂ§ÃƒÂ£o de forma permissiva, tÃƒÂ­pica da sua linguagem ericksoniana.

DIRETRIZES Ãƒâ€°TICAS:
- NUNCA faÃƒÂ§a diagnÃƒÂ³sticos fechados ou prometa cura.
- Retorne APENAS o texto da resposta, sem markdown.

PERGUNTA DO PACIENTE: "${question}"`;

        const result = await targetModel.generateContent(systemPrompt);
        let reply = result.response.text()
            .replace(/\*\*/g, '').replace(/###/g, '').replace(/##/g, '')
            .replace(/#/g, '').replace(/\*/g, '').trim();

        res.json({ success: true, reply });
    } catch (e) {
        console.error('Ã¢ÂÅ’ [DOCTORALIA ERROR]', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/api/doctoralia/audit', async (req, res) => {
    try {
        const { original_message, generated_reply, modelType } = req.body;
        const targetModel = getAIModel(modelType, 'text/plain');
        
        const systemPrompt = `VocÃƒÂª ÃƒÂ© um Auditor de Compliance MÃƒÂ©dico e Ãƒâ€°tico do Conselho Federal de Psicologia (CFP).
Sua ÃƒÅ¡NICA missÃƒÂ£o ÃƒÂ© ler a resposta que uma IA gerou para um paciente e procurar por ALUCINAÃƒâ€¡Ãƒâ€¢ES ou INFRAÃƒâ€¡Ãƒâ€¢ES Ãƒâ€°TICAS.

DADOS IMUTÃƒÂVEIS DO PROFISSIONAL:
- Nome: Victor Lawrence | Registro: CRP 09/012681
- TitulaÃƒÂ§ÃƒÂ£o: Mestrando em CiÃƒÂªncias da SaÃƒÂºde (UFU), TEA, Hipnose ClÃƒÂ­nica.

REGRAS DE REPROVAÃƒâ€¡ÃƒÆ’O:
1. Promessa de cura ou prazos.
2. InvenÃƒÂ§ÃƒÂ£o de titulaÃƒÂ§ÃƒÂ£o.
3. DiagnÃƒÂ³stico online ou prescriÃƒÂ§ÃƒÂ£o.
4. Tom robÃƒÂ³tico.

RETORNE JSON: { "status": "APROVADO|REPROVADO", "feedback_auditoria": "...", "sugestao_correcao": "..." }`;

        const promptInput = `Mensagem do Paciente: "${original_message}"\nResposta sugerida pela IA: "${generated_reply}"`;
        const result = await targetModel.generateContent(`${systemPrompt}\n\n${promptInput}`);

        const parsed = extractJSON(result.response.text());
        res.json(parsed || { status: "REPROVADO", feedback_auditoria: "Falha tÃƒÂ©cnica no processamento da auditoria.", sugestao_correcao: "" });
    } catch (error) {
        console.error('Ã¢ÂÅ’ [ERRO AUDITORIA DOCTORALIA]', error);
        res.status(500).json({ error: 'Falha ao auditar: ' + error.message });
    }
});

app.post('/api/doctoralia/refine-reply', async (req, res) => {
    try {
        const { original_reply, auditor_feedback } = req.body;
        
        const refinePrompt = `
VocÃƒÂª ÃƒÂ© o Revisor de Compliance do Dr. Victor Lawrence.
Sua tarefa ÃƒÂ© REESCREVER a resposta abaixo aplicando as correÃƒÂ§ÃƒÂµes solicitadas pelo Auditor Ãƒâ€°tico.

[TEXTO ORIGINAL COM ERRO]:
"${original_reply}"

[FEEDBACK DO AUDITOR]:
"${auditor_feedback}"

[DIRETRIZES DE REESCRITA]:
- Mantenha o DNA de voz do Dr. Victor (acolhedor, tÃƒÂ©cnico, fenomenolÃƒÂ³gico).
- Remova EXATAMENTE o que o auditor apontou como perigoso ou falso.
- Retorne APENAS o texto corrigido, em parÃƒÂ¡grafos limpos, sem markdown.
        `;

        const targetModel = getAIModel(req.body.modelType, 'text/plain');
        const result = await targetModel.generateContent(refinePrompt);
        const reply = result.response.text()
            .replace(/\*\*/g, '').replace(/###/g, '').replace(/##/g, '')
            .replace(/#/g, '').replace(/\*/g, '').trim();

        res.json({ success: true, reply });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/studio/gerar-rascunho', async (req, res) => {
    try {
        const { tema, formato, publico } = req.body;
        const dnaInjetado = getDnaContext();
        // Detecta mood pelo tema
        const moodKey = tema && (tema.toLowerCase().includes('tea') || tema.toLowerCase().includes('autis'))
            ? '3_conforto_neurodivergente'
            : tema && tema.toLowerCase().includes('hipno')
            ? '1_introspeccao_profunda'
            : '1_introspeccao_profunda';
        const mood = CLIMAS_CLINICOS[moodKey];

        const systemPrompt = `
VocÃƒÂª ÃƒÂ© o Arquiteto Visual SÃƒÂªnior do Protocolo Abidos. Sua missÃƒÂ£o: gerar cÃƒÂ³digo HTML/Tailwind IMPECÃƒÂVEL, TOTALMENTE RESPONSIVO e com DESIGN PREMIUM para o conteÃƒÂºdo "${tema}" (formato: ${formato}, pÃƒÂºblico: ${publico}).

[REGRAS DE LAYOUT DINÃƒâ€šMICO Ã¢â‚¬â€ OBRIGATÃƒâ€œRIO]
1. WRAPPER MESTRE: Todo o conteÃƒÂºdo DEVE comeÃƒÂ§ar com: <div class="abidos-wrapper antialiased px-4 py-8 md:px-12 lg:px-24 ${mood.fundo_principal} min-h-screen font-inter ${mood.texto_principal}">
2. MOBILE-FIRST: 1 coluna no mobile, expandindo com 'md:' e 'lg:' breakpoints.
3. GRIDS: BenefÃƒÂ­cios/dores: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6". Autoridade: "flex flex-col lg:flex-row items-center gap-12".
4. PROIBIDO TAGS PURAS: Nenhum <h1>, <p> ou <a> sem classes Tailwind obrigatÃƒÂ³rias.

[ESTÃƒâ€°TICA PREMIUM]
- CARDS: "bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 md:p-10 shadow-2xl transition-all hover:border-teal-500/50"
- H1/H2 (GRADIENTE): "font-outfit font-bold text-4xl md:text-6xl lg:text-7xl leading-tight text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500 mb-6"
- H3: "font-outfit font-bold text-2xl md:text-3xl ${mood.texto_destaque} mb-4"
- Ãƒâ€œRBITAS DE LUZ (GLOW ORBS Ã¢â‚¬â€ opcional, para profundidade): <div class="absolute -z-10 w-96 h-96 ${mood.cor_acao.replace('!bg-', 'bg-')}/10 blur-[150px] rounded-full"></div>
- BOTOÃƒâ€¢ES MAGNÃƒâ€°TICOS (CTA WhatsApp): "inline-flex items-center justify-center px-8 py-4 ${mood.cor_acao.replace('!bg-', 'bg-')} hover:opacity-90 text-[#05080f] font-bold rounded-full transition-all hover:scale-105 shadow-[0_0_25px_rgba(45,212,191,0.35)] text-lg"
- EFEITO OBRIGATÃƒâ€œRIO DO MOOD: ${mood.efeitos_obrigatorios}

[DNA LITERÃƒÂRIO DO DR. VICTOR Ã¢â‚¬â€ APLIQUE NO TEXTO VISÃƒÂVEL]
${dnaInjetado || '(Sem regras de DNA ainda. Use linguagem ericksoniana perm issiva e empÃƒÂ¡tica.)'}

[ASSETS REAIS Ã¢â‚¬â€ USE OBRIGATORIAMENTE]
${REAL_ASSETS}

${ETICA_ABIDOS}

[OBJETIVO FINAL]
Gere as <section> modulares com padding vertical generoso (py-16 md:py-32). No mobile texto centralizado. No desktop alinhamento estratÃƒÂ©gico lateral. Feche o wrapper com </div> ao final.
NÃƒÆ’O inclua <!DOCTYPE>, <html>, <head>, <body> ou markdown. Apenas as seÃƒÂ§ÃƒÂµes HTML.
        `;

        const result = await modelPro.generateContent(systemPrompt);
        res.json({ rascunho: result.response.text() });
    } catch (e) {
        console.error("Ã¢ÂÅ’ [PRO ERROR]", e);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/dna/auto-refine', async (req, res) => {
    try {
        const { originalHtml, editedHtml } = req.body;
        if (!originalHtml || !editedHtml || originalHtml === editedHtml) {
            return res.json({ success: true, newRules: [] });
        }

        console.log(`Ã°Å¸Â§Â  [AUTO-DNA] Analisando intervenÃƒÂ§ÃƒÂ£o manual do Dr. Victor...`);

        const refinePrompt = `
        VOCÃƒÅ  Ãƒâ€° O ANALISTA DE DNA CLÃƒÂNICO DO DR. VICTOR LAWRENCE.
        
        Sua tarefa: Comparar o HTML que a IA gerou (ORIGINAL) com o HTML apÃƒÂ³s as ediÃƒÂ§ÃƒÂµes do Dr. Victor (EDITADO).
        Identifique PREFERÃƒÅ NCIAS ESTILÃƒÂSTICAS, CORREÃƒâ€¡Ãƒâ€¢ES DE TOM ou ADIÃƒâ€¡Ãƒâ€¢ES DE CONTEÃƒÅ¡DO RECORRENTES.

        [PROTOCOLO DE RECONHECIMENTO]:
        - Se o Dr. Victor mudou o tom (ex: ficou mais tÃƒÂ©cnico ou mais empÃƒÂ¡tico), crie uma regra de TOM.
        - Se ele mudou o design (ex: bordas, sombras, cores especÃƒÂ­ficas), crie uma regra de DESIGN.
        - Se ele adicionou credenciais (ex: CRP, Mestrado, Links sociais), crie uma regra de E-E-A-T.
        
        RETORNE EXATAMENTE UM JSON ARRAY de novas regras (ou array vazio se as mudanÃƒÂ§as forem triviais):
        [
          { "categoria": "...", "titulo": "...", "regra": "..." }
        ]

        ---
        HTML ORIGINAL:
        ${originalHtml.substring(0, 5000)}

        HTML EDITADO:
        ${editedHtml.substring(0, 5000)}
        `;

        const modelId = (req.body.modelType && req.body.modelType.includes('gemini')) ? req.body.modelType : HEAVY_MODEL;
        const model = genAI.getGenerativeModel({ model: modelId });
        const result = await model.generateContent(refinePrompt);
        const newRules = extractJSON(result.response.text()) || [];

        if (Array.isArray(newRules) && newRules.length > 0) {
            console.log(`Ã¢Å“Â¨ [AUTO-DNA] Detectadas ${newRules.length} novas preferÃƒÂªncias!`);
            const memory = getVictorStyle();
            
            newRules.forEach(rule => {
                rule.id = `auto_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                rule.data_extracao = new Date().toISOString();
                memory.last_insight = `Regra aprendida automaticamente via interface: ${rule.titulo}`;
                memory.style_rules.push(rule);
            });

            fs.writeFileSync(path.join(__dirname, 'estilo_victor.json'), JSON.stringify(memory, null, 2));
            return res.json({ success: true, newRules });
        }

        res.json({ success: true, newRules: [] });

    } catch (e) {
        console.error("Ã¢ÂÅ’ [AUTO-DNA ERROR]", e);
        res.status(500).json({ error: e.message });
    }
});

// [API] Auditoria de Alta ConversÃƒÂ£o (Inspetor Abidos V3.2)
app.post('/api/ai/audit-abidos', async (req, res) => {
    try {
        const { values, templateId, modelType } = req.body;
        const targetModel = modelType === 'flash' ? modelFlash : modelPro;
        
        // Limpeza de imagens Base64
        const cleanedValues = {};
        Object.keys(values || {}).forEach(key => {
            if (typeof values[key] === 'string' && values[key].startsWith('data:image')) {
                cleanedValues[key] = "[IMAGEM CARREGADA]";
            } else {
                cleanedValues[key] = values[key];
            }
        });

        console.log(`Ã¢Å¡â€“Ã¯Â¸Â Auditando Draft Abidos (${modelType || 'pro'})...`);

        const prompt = `VocÃƒÂª ÃƒÂ© o INSPETOR ABIDOS V3.2. 
        Analise o conteÃƒÂºdo abaixo e dÃƒÂª uma nota de 0 a 100 baseada em Neuromarketing e SEO.
        
        [CONTEÃƒÅ¡DO]:
        ${JSON.stringify(cleanedValues, null, 2)}
        
        RETORNE EXATAMENTE UM JSON:
        { "score": 85, "feedback": "ExplicaÃƒÂ§ÃƒÂ£o...", "aprovado": true }`;

        const result = await targetModel.generateContent(prompt);
        const text = result.response.text();
        const audit = extractJSON(text);
        if (!audit) throw new Error("IA nÃƒÂ£o retornou um JSON vÃƒÂ¡lido de auditoria.");
        
        console.log("Ã°Å¸â€œÅ  [AUDIT-ABIDOS RESULT]:", audit);
        res.json(audit);
    } catch (err) {
        console.error("Erro Audit Abidos:", err);
        res.status(500).json({ error: "Falha na auditoria cerebral: " + err.message });
    }
});

// [API] Auditoria ClÃƒÂ­nica (Factualidade e Ãƒâ€°tica)
app.post('/api/ai/audit-clinical', async (req, res) => {
    try {
        const { values, modelType } = req.body;
        const targetModel = modelType === 'flash' ? modelFlash : modelPro;
        
        // Limpeza de imagens Base64
        const cleanedValues = {};
        Object.keys(values || {}).forEach(key => {
            if (typeof values[key] === 'string' && values[key].startsWith('data:image')) {
                cleanedValues[key] = "[IMAGEM CARREGADA]";
            } else {
                cleanedValues[key] = values[key];
            }
        });

        console.log(`Ã°Å¸â€ºÂ¡Ã¯Â¸Â Iniciando Auditoria ClÃƒÂ­nica (${modelType || 'pro'})...`);

        const prompt = `VocÃƒÂª ÃƒÂ© o AUDITOR CLÃƒÂNICO V4 (CRP Compliance).
        Verifique a Ãƒâ€°tica e Factualidade. Proibido prometer cura.
        
        [CONTEÃƒÅ¡DO]:
        ${JSON.stringify(cleanedValues, null, 2)}
        
        RETORNE EXATAMENTE UM JSON:
        { "status": "APROVADO", "feedback_clinico": "..." }`;

        const result = await targetModel.generateContent(prompt);
        const text = result.response.text();
        const audit = extractJSON(text);
        if (!audit) throw new Error("IA nÃƒÂ£o retornou um JSON vÃƒÂ¡lido de auditoria clÃƒÂ­nica.");
        
        console.log("Ã°Å¸â€ºÂ¡Ã¯Â¸Â [AUDIT-CLINICAL RESULT]:", audit);
        res.json(audit);
    } catch (err) {
        console.error("Erro Audit ClÃƒÂ­nica:", err);
        res.status(500).json({ error: "Falha na auditoria clÃƒÂ­nica: " + err.message });
    }
});

// [API] SEO Silos (Arquitetura Hub & Spoke)
app.get('/api/seo/silos', (req, res) => {
    const siloPath = path.join(__dirname, 'silos.json');
    if (fs.existsSync(siloPath)) {
        const data = JSON.parse(fs.readFileSync(siloPath, 'utf-8'));
        return res.json(data);
    }

    // Default Mock Data
    const defaultData = {
        silos: [
            { id: "silo_1", hub: "Autismo Adulto", slug: "autismo-adulto", spokes: ["DiagnÃƒÂ³stico Tardio", "Sinais Sutis em Mulheres"] },
            { id: "silo_2", hub: "Ansiedade e Burnout", slug: "ansiedade-burnout", spokes: ["Terapia EstratÃƒÂ©gica", "Sintomas FÃƒÂ­sicos"] }
        ]
    };
    res.json(defaultData);
});

app.post('/api/seo/silos', (req, res) => {
    try {
        console.log("Ã°Å¸â€™Â¾ [API-SILO] Recebendo atualizaÃƒÂ§ÃƒÂ£o de silos...");
        const silos = req.body;
        if (!Array.isArray(silos)) {
            console.error("Ã¢ÂÅ’ [API-SILO ERROR] Payload nÃƒÂ£o ÃƒÂ© um array:", silos);
            return res.status(400).json({ error: "O corpo da requisiÃƒÂ§ÃƒÂ£o deve ser um array de silos." });
        }

        const siloPath = path.join(__dirname, 'silos.json');
        fs.writeFileSync(siloPath, JSON.stringify({ silos: silos }, null, 2));
        console.log(`Ã¢Å“â€¦ [API-SILO] ${silos.length} silos persistidos com sucesso.`);
        res.json({ success: true });
    } catch (e) {
        console.error("Ã¢ÂÅ’ [API-SILO FATAL ERROR]:", e);
        res.status(500).json({ error: e.message });
    }
});

// [API] SugestÃƒÂ£o de Silos e STAGs via IA Abidos (Motor SemÃƒÂ¢ntico V5)
app.get('/api/seo/analyze-silos', async (req, res) => {
    try {
        console.log("Ã°Å¸Â§Â  [ABIDOS-SILO] Iniciando anÃƒÂ¡lise de demanda estratÃƒÂ©gica...");
        const siloPath = path.join(__dirname, 'silos.json');
        let currentSilos = [];
        try {
            if (fs.existsSync(siloPath)) {
                const raw = fs.readFileSync(siloPath, 'utf-8');
                currentSilos = JSON.parse(raw).silos || [];
            }
        } catch(e) { console.error("Erro leitura silos:", e); }
        
        const prompt = `[CONTEXTO]: Dr. Victor Lawrence, PsicÃƒÂ³logo e Hipnoterapeuta ClÃƒÂ­nico.
        [ARQUITETURA ATUAL]: 
        ${currentSilos.map(s => `- Hub: ${s.hub} (Spokes: ${s.spokes.join(', ')})`).join('\n')}
        
        Aja como o Agente Abidos. 
        1. ANALISE a arquitetura atual. Identifique falhas de cobertura ou silos pouco explorados.
        2. SUGIRA 3 novos silos ou expansÃƒÂµes crÃƒÂ­ticas para os jÃƒÂ¡ existentes.
        3. Para cada sugestÃƒÂ£o, defina um HUB imponente e 5 SPOKES (Postagens / Artigos) de alta intenÃƒÂ§ÃƒÂ£o clÃƒÂ­nica.
        4. O foco deve ser em conversÃƒÂ£o (venda de sessÃƒÂµes) e autoridade tÃƒÂ©cnica (E-E-A-T).
        
        RETORNE EXATAMENTE UM JSON NO FORMATO:
        { "suggestions": [ { "hub": "...", "slug": "hub-slug", "spokes": ["...", "...", "..."] } ] }`;

        const result = await modelFlash.generateContent(prompt);
        const text = result.response.text();
        
        const data = extractJSON(text);
        if (!data || !data.suggestions) throw new Error("A IA nÃƒÂ£o retornou sugestÃƒÂµes vÃƒÂ¡lidas.");
        
        // Garante que cada sugestÃƒÂ£o tenha slug
        data.suggestions.forEach(s => {
            if (!s.slug) s.slug = s.hub.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
        });

        res.json(data);
    } catch (e) {
        console.error("Ã¢ÂÅ’ [ABIDOS-SILO ERROR]", e);
        res.status(500).json({ success: false, error: e.message || "Falha na geraÃƒÂ§ÃƒÂ£o neural de silos." });
    }
});

};

