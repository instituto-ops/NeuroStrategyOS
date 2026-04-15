const fs = require('fs');
const path = require('path');

const rawPath = path.join(__dirname, 'routes', 'acervo.raw.js');
let rawCode = fs.readFileSync(rawPath, 'utf8');

const wrapper = \const fs = require('fs');
const path = require('path');

module.exports = function(app, deps) {
    const { SITE_REPO_PATH, TEMPLATE_CATALOG } = deps;
    
\
};
\;

fs.writeFileSync(path.join(__dirname, 'routes', 'acervo.js'), wrapper, 'utf8');
