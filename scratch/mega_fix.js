const fs = require('fs');
const path = require('path');

const replacements = [
    { reg: /MAIÃšS/g, rep: 'MAIÚS' },
    { reg: /âœ¦/g, rep: '✦' },
    { reg: /ðŸ‘ ï¸ /g, rep: '👁️' },
    { reg: /ðŸ§ /g, rep: '🧠' },
    { reg: /ðŸ¤–/g, rep: '🤖' },
    { reg: /ðŸ“¸/g, rep: '📸' },
    { reg: /ðŸš€/g, rep: '🚀' },
    { reg: /ðŸ–Œï¸ /g, rep: '🖌️' },
    { reg: /ðŸ›¡ï¸ /g, rep: '🛡️' },
    { reg: /MÃƒÂ QUINA/g, rep: 'MÁQUINA' },
    { reg: /VOCÃƒÅ  Ãƒâ€°/g, rep: 'VOCÊ É' },
    { reg: /MÃƒâ€°TODO/g, rep: 'MÉTODO' },
    { reg: /OBRIGATÃƒâ€œRIA/g, rep: 'OBRIGATÓRIA' },
    { reg: /Ã°Å¸Â â€”Ã¯Â¸Â /g, rep: '🏗️' },
    { reg: /Ã°Å¸â€ Â /g, rep: '🔍' },
    { reg: /Ã°Å¸â€œâ€š/g, rep: '📂' },
    { reg: /Ã°Å¸â€œâ€ /g, rep: '📝' },
    { reg: /Ã°Å¸â€œÂ /g, rep: '📊' },
    { reg: /Ã°Å¸Å½Â¨/g, rep: '🎨' },
    { reg: /Ã°Å¸â€™Â¡/g, rep: '💡' },
    { reg: /Ã°Å¸â€™Â /g, rep: '💡' },
    { reg: /Ã¢Å“Â¨/g, rep: '✨' },
    { reg: /Ã¢Å“â€¦/g, rep: '✅' },
    { reg: /Ã¢Â Å’/g, rep: '❌' },
    { reg: /ÃƒÂ¡/g, rep: 'á' },
    { reg: /ÃƒÂ©/g, rep: 'é' },
    { reg: /ÃƒÂ­/g, rep: 'í' },
    { reg: /ÃƒÂ³/g, rep: 'ó' },
    { reg: /ÃƒÂº/g, rep: 'ú' },
    { reg: /ÃƒÂ¢/g, rep: 'â' },
    { reg: /ÃƒÂª/g, rep: 'ê' },
    { reg: /ÃƒÂ´/g, rep: 'ô' },
    { reg: /ÃƒÂ£/g, rep: 'ã' },
    { reg: /ÃƒÂµ/g, rep: 'õ' },
    { reg: /ÃƒÂ§/g, rep: 'ç' },
    { reg: /ÃƒÂ /g, rep: 'Á' },
    { reg: /Ãƒâ€°/g, rep: 'É' },
    { reg: /Ãƒâ€œ/g, rep: 'Ó' },
    { reg: /ÃƒÅ¡/g, rep: 'Ú' },
    { reg: /ÃƒÆ’/g, rep: 'Ã' },
    { reg: /Ãƒâ€¢/g, rep: 'Õ' },
    { reg: /ÃƒÅ /g, rep: 'Ê' },
    { reg: /Ãƒâ€¡/g, rep: 'Ç' }
];

const filesToFix = [
    'frontend/public/js/vortex-studio.js',
    'frontend/routes/operations.js',
    'frontend/routes/acervo.js',
    'frontend/routes/ai-generation.js',
    'frontend/routes/health-marketing.js'
];

filesToFix.forEach(relPath => {
    const absPath = path.join(process.cwd(), relPath);
    if (!fs.existsSync(absPath)) return;

    let content = fs.readFileSync(absPath, 'utf8');
    let original = content;

    replacements.forEach(r => {
        content = content.replace(r.reg, r.rep);
    });

    if (content !== original) {
        fs.writeFileSync(absPath, content, 'utf8');
        console.log(`✅ Fixed ${relPath}`);
    }
});
