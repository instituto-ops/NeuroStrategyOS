const fs = require('fs');
const path = require('path');

const filePath = 'c:\\Users\\artes\\Documents\\NeuroStrategy OS - VM\\Nucleo de Marketing\\frontend\\public\\js\\vortex-studio.js';
let content = fs.readFileSync(filePath, 'utf8');

const replacements = [
    [/Ã“/g, 'Ó'],
    [/Ã³/g, 'ó'],
    [/Ã­/g, 'í'],
    [/Ã§/g, 'ç'],
    [/Ã£/g, 'ã'],
    [/Ãª/g, 'ê'],
    [/Ã©/g, 'é'],
    [/Ãº/g, 'ú'],
    [/Ã /g, 'à'],
    [/â€”/g, '—'],
    [/ðŸŒ€/g, '🌀'],
    [/â Œ/g, '❌'],
    [/ðŸ“/g, '📂'],
    [/ðŸ”Ž/g, '🔍'],
    [/ðŸ’¬/g, '💬'],
    [/ðŸš€/g, '🚀'],
    [/âš ï¸/g, '⚠️'],
    [/ðŸ§ /g, '🧠'],
    [/ðŸ‘ ï¸/g, '👁️'],
    [/âœ…/g, '✅'],
    [/ðŸ”„/g, '🔄'],
    [/Ã—/g, '×'],
    [/âš ï¸/g, '⚠️'], 
    [/ðŸš€/g, '🚀'],
    [/âœ…/g, '✅'],
    [/Ã³/g, 'ó'],
    [/Ã¡/g, 'á'],
    [/Ã¢/g, 'â'],
    [/Ãµ/g, 'õ'],
    [/Ã´/g, 'ô'],
    [/Ã /g, 'à'],
];

replacements.forEach(([regex, replacement]) => {
    content = content.replace(regex, replacement);
});

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed Mojibake in vortex-studio.js');
