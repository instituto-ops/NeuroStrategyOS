const fs = require('fs');
const path = require('path');

const serverJsPath = path.join(__dirname, 'server.js');
let content = fs.readFileSync(serverJsPath, 'utf8');

function extractAndReplace(moduleName, regexStart, regexEnd) {
    const startIndex = content.search(regexStart);
    if (startIndex === -1) {
        console.log(`Start not found for ${moduleName}`);
        return;
    }
    
    // Find where the block ends
    let endIndex = -1;
    if (regexEnd) {
        endIndex = content.search(regexEnd);
        if (endIndex === -1) {
            console.log(`End not found for ${moduleName}`);
            return;
        }
    } else {
        endIndex = content.length;
    }
    
    const block = content.substring(startIndex, endIndex);
    
    // Clean up
    content = content.substring(0, startIndex) +
        `\n// [${moduleName.toUpperCase()}] Module Extracted \nrequire('./routes/${moduleName}')(app, deps);\n\n` +
        content.substring(endIndex);
        
    // Wrap the extracted code
    const wrappedCode = `const fs = require('fs');
const path = require('path');
// Import all specific deps from shared if needed. For now just passing app and deps.
const { genAI, getAIModel, wrapModel, extractJSON, trackUsage, LITE_MODEL, MAIN_MODEL, PRO_MODEL, GoogleAICacheManager } = require('../shared');

module.exports = function(app, deps) {
    const { SITE_REPO_PATH, TEMPLATE_CATALOG, upload } = deps;
    
` + block + `
};
`;

    fs.writeFileSync(path.join(__dirname, 'routes', `${moduleName}.js`), wrappedCode, 'utf8');
    console.log(`Extracted ${moduleName} -> routes/${moduleName}.js`);
}

// Ensure routes dir exists
if (!fs.existsSync(path.join(__dirname, 'routes'))) {
    fs.mkdirSync(path.join(__dirname, 'routes'));
}

// 1. Acervo
extractAndReplace('acervo', 
    /\/\/\s*==============================================================================\r?\n\/\/\s*GEST.O DE ACERVO \(LOCAL CMS\)/, 
    /\/\/\s*.*COMPILADOR DE DNA/);

// 2. Wordpress
extractAndReplace('wordpress',
    /\/\/\s*.*COMPILADOR DE DNA/,
    /\/\/\s*2\.\s*PROXY AI/);

// 3. AI Generation
extractAndReplace('ai-generation',
    /\/\/\s*2\.\s*PROXY AI/,
    /\/\/\s*4\.\s*MOTOR SEM/);

// 4. Health Marketing
extractAndReplace('health-marketing',
    /\/\/\s*4\.\s*MOTOR SEM/,
    /\/\/\s*7\.\s*AGENTES DA ESTEIRA/);

// 5. Operations
extractAndReplace('operations',
    /\/\/\s*7\.\s*AGENTES DA ESTEIRA/,
    /\/\/\s*.*ORTEX AI STUDIO/);

// Also extract the stray Vortex code at the end
const strayStart = content.search(/\/\/\s*\[VORTEX\] Endpoint: Ingest.o/);
if (strayStart !== -1) {
    const strayBlock = content.substring(strayStart);
    content = content.substring(0, strayStart);
    fs.appendFileSync(path.join(__dirname, 'routes', 'vortex.js'), `\n// Stray Vortex Endpoints moved from server.js\n// NOTE: Added to existing vortex.js export manually? We should inject inside the export block actually!\n`);
    // wait! I will just append this into `operations` or save it to a new file `vortex_stray.js` for now so I don't break vortex.js syntax!
    fs.writeFileSync(path.join(__dirname, 'routes', 'vortex_stray.js'), `module.exports = function(app, deps) { const { upload } = deps; \n` + strayBlock + `\n};`);
    console.log('Saved stray Vortex code to routes/vortex_stray.js');
    
    // Add to server
    content += `\nrequire('./routes/vortex_stray')(app, Object.assign({}, deps, { upload }));\n`;
}

fs.writeFileSync(serverJsPath, content, 'utf8');
console.log('Done.');
