const fs = require('fs');
const path = require('path');
const lines = fs.readFileSync('server.js', 'utf8').split('\n');

let opsStart = lines.findIndex(l => l.includes('AGENTES DA ESTEIRA'));
let opsEnd = lines.findIndex(l => l.includes('/routes/vortex') && l.includes('require'));

if (opsStart !== -1 && opsEnd !== -1) {
    const block = lines.slice(opsStart - 1, opsEnd - 1).join('\n');
    const wrapped = `const fs = require('fs');\nconst path = require('path');\nconst { upload } = require('../shared');\nmodule.exports = function(app, deps) {\n` + block + `\n};`;
    fs.writeFileSync('routes/operations.js', wrapped);
    lines[opsStart] = `// [OPERATIONS] Module Extracted\nrequire('./routes/operations')(app, deps);\n` + '\n'.repeat(opsEnd - 1 - opsStart);
    let finalContent = lines.join('\n');
    finalContent = finalContent.replace(/\n{5,}/g, '\n\n');
    fs.writeFileSync('server.js', finalContent);
    console.log('Operations extracted!');
} else {
    console.log('Could not find boundaries!', {opsStart, opsEnd});
}
