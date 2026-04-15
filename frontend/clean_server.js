const fs = require('fs');
const path = require('path');
let lines = fs.readFileSync('server.js', 'utf8').split('\n');

const requireBlock = `
// ==============================================================================
// ORQUESTRADOR MODULAR - ROTAS & DEPENDENCIAS
// ==============================================================================
const SITE_REPO_PATH = path.join(__dirname, '../../HipnoLawrence-Site/src/app');

// Shared deps for injected routes
const deps = {
    SITE_REPO_PATH,
    TEMPLATE_CATALOG,
    upload
};

// Modulos Injetados Automaticamente
require('./routes/acervo')(app, deps);
require('./routes/wordpress')(app, deps);
require('./routes/ai-generation')(app, deps);
require('./routes/health-marketing')(app, deps);
require('./routes/operations')(app, deps);
require('./routes/vortex')(app, deps);

// CATCH-ALL API (Movido para o final para nao quebrar rotas dinamicas)
app.use('/api/*', (req, res) => {
    res.status(404).json({ 
        success: false, 
        error: \`Endpoint '\${req.originalUrl}' nao encontrado no ecossistema NeuroEngine (Protocolo V5). Verifique se o backend esta atualizado e se a rota existe no server.js.\`
    });
});

const server = app.listen(port, () => {
    console.log(\`\\n🚀 AntiGravity CMS: Mission Control Ativo!\`);
    console.log(\`📡 Frontend & API rodando em http://localhost:\${port}\`);
    console.log(\`🛡️ Camada de Seguranca Proxy: ON\`);
    console.log(\`🎙️ WebSocket Voice Live: Disponivel em ws://localhost:\${port}\`);
});
`;

let targetLine = -1;
for(let i=0; i<lines.length; i++){
    if(lines[i].includes('GEST') && lines[i].includes('ACERVO') && lines[i].includes('LOCAL CMS')) {
        targetLine = i;
        break;
    }
}

if (targetLine !== -1) {
    const keepLines = lines.slice(0, targetLine - 1);
    const newContent = keepLines.join('\n') + '\n' + requireBlock;
    fs.writeFileSync('server.js', newContent, 'utf8');
    console.log('server.js reduced successfully!');
} else {
    console.log('Target line not found');
}
