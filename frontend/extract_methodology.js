const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

const files = [
    'Metodologia Antigravity.docx',
    'Metodologia de Desenvolvimento Acelerado com IA.docx'
];

const folder = 'c:/Users/artes/Documents/NeuroStrategy OS - VM/Modulo WordPress Publicação/docs/Metodologia Antigravity';

async function process() {
    // Make sure tmp directory exists
    const tmpDir = 'c:/Users/artes/Documents/NeuroStrategy OS - VM/Modulo WordPress Publicação/tmp';
    if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
    }

    for (const file of files) {
        const fullPath = path.join(folder, file);
        try {
            console.log(`Processing: ${fullPath}`);
            const result = await mammoth.extractRawText({path: fullPath});
            const text = result.value;
            const outputPath = path.join(tmpDir, file.replace('.docx', '.txt'));
            fs.writeFileSync(outputPath, text);
            console.log(`Extracted: ${file} to ${outputPath}`);
        } catch (e) {
            console.error(`Error extracting ${file}:`, e.message);
        }
    }
}

process();
