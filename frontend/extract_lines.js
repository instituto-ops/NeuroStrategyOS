const fs = require('fs');
const path = require('path');
const lines = fs.readFileSync('server.js', 'utf8').split('\n');

// Find boundaries
let acervoStart = lines.findIndex(l => l.includes('GEST') && l.includes('ACERVO'));
let acervoEnd = lines.findIndex(l => l.includes('[WORDPRESS] Module Extracted'));

let opsStart = lines.findIndex(l => l.includes('AGENTES DA ESTEIRA'));
let opsEnd = lines.findIndex(l => l.includes('vortex.js') && l.includes('require'));

// Extract Acervo
if (acervoStart !== -1 && acervoEnd !== -1) {
    const block = lines.slice(acervoStart - 1, acervoEnd).join('\n');
    const wrapped = `const fs = require('fs');\nconst path = require('path');\nmodule.exports = function(app, Object.assign({}, deps)) {\nconst { SITE_REPO_PATH, TEMPLATE_CATALOG } = deps;\n` + block + `\n};`;
    fs.writeFileSync('routes/acervo.js', wrapped);
    console.log('Acervo extracted!');
    lines[acervoStart] = `// [ACERVO] Module Extracted\nrequire('./routes/acervo')(app, deps);\n` + '\n'.repeat(acervoEnd - acervoStart);
}

// Extract Operations
if (opsStart !== -1 && opsEnd !== -1) {
    const block = lines.slice(opsStart - 1, opsEnd - 1).join('\n');
    const wrapped = `const fs = require('fs');\nconst path = require('path');\nmodule.exports = function(app, Object.assign({}, deps)) {\n` + block + `\n};`;
    fs.writeFileSync('routes/operations.js', wrapped);
    console.log('Operations extracted!');
    lines[opsStart] = `// [OPERATIONS] Module Extracted\nrequire('./routes/operations')(app, deps);\n` + '\n'.repeat(opsEnd - 1 - opsStart);
}

let newContent = lines.join('\n');
newContent = newContent.replace(/\n{5,}/g, '\n\n');

fs.writeFileSync('server.js', newContent);
console.log('server.js updated!');
