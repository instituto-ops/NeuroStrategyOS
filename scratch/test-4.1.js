const fs = require('fs');
const path = require('path');

// --- Hydration Map Logic ---
const HYDRATION_MAP = {
    react: { globalPattern: 'React', importStatement: "import React, { useState, useEffect, useRef, useMemo, useCallback, Fragment } from 'react';", type: 'static' },
    framerMotion: { globalPattern: 'motion', importStatement: "import { motion, AnimatePresence } from 'framer-motion';", type: 'static' },
    lucideReact: { globalPattern: 'Lucide', importStatement: null, type: 'dynamic' },
    nextLink: { globalPattern: 'Link', importStatement: "import Link from 'next/link';", type: 'static' },
    nextImage: { globalPattern: 'Image', importStatement: "import Image from 'next/image';", type: 'static' },
    nextNavigation: { globalPattern: 'useRouter', importStatement: "import { useRouter, usePathname, useSearchParams } from 'next/navigation';", type: 'static' }
};

function extractLucideIcons(code) {
    const icons = new Set();
    const dotAccessRegex = /(?:window\.)?Lucide\.([A-Z][a-zA-Z0-9]*)/g;
    let match;
    while ((match = dotAccessRegex.exec(code)) !== null) icons.add(match[1]);
    const destructureRegex = /(?:const|let|var)\s*\{([^}]+)\}\s*=\s*(?:window\.)?Lucide/g;
    while ((match = destructureRegex.exec(code)) !== null) {
        const names = match[1].split(',').map(s => s.trim()).filter(Boolean);
        names.forEach(name => {
            const clean = name.split(/\s+as\s+/)[0].trim();
            if (/^[A-Z]/.test(clean)) icons.add(clean);
        });
    }
    return Array.from(icons);
}

function strip(code) {
    if (!code) return '';
    const markdownRegex = /```(?:jsx|javascript|js|tsx|ts)?\s*([\s\S]*?)```/i;
    const match = code.match(markdownRegex);
    return (match ? match[1] : code).trim();
}

function hydrate(code) {
    if (!code) return '';
    let cleanCode = strip(code);
    cleanCode = cleanCode.replace(/window\.(React|Lucide|motion|Link|Image|useRouter|usePathname|useSearchParams)/g, '$1');

    const imports = ["\"use client\";"];
    const helperLines = [];

    // 1. Detection
    for (const key in HYDRATION_MAP) {
        const item = HYDRATION_MAP[key];
        const pattern = new RegExp('\\b' + item.globalPattern + '\\b');
        if (pattern.test(cleanCode)) {
            if (item.type === 'static') {
                imports.push(item.importStatement);
            } else if (key === 'lucideReact') {
                const icons = extractLucideIcons(cleanCode);
                if (icons.length > 0) {
                    imports.push(`import { ${icons.join(', ')} } from 'lucide-react';`);
                    helperLines.push(`const Lucide = { ${icons.join(', ')} };`);
                }
            }
        }
    }

    // 2. Deduplication
    cleanCode = cleanCode.replace(/import\s+React\s+from\s+['"]react['"];?/g, '');
    cleanCode = cleanCode.replace(/import\s+.*\s+from\s+['"]framer-motion['"];?/g, '');
    cleanCode = cleanCode.replace(/import\s+.*\s+from\s+['"]lucide-react['"];?/g, '');
    cleanCode = cleanCode.replace(/import\s+Link\s+from\s+['"]next\/link['"];?/g, '');
    cleanCode = cleanCode.replace(/import\s+Image\s+from\s+['"]next\/image['"];?/g, '');
    cleanCode = cleanCode.replace(/import\s+.*\s+from\s+['"]next\/navigation['"];?/g, '');

    return [...imports, "", ...helperLines, "", cleanCode].join('\n').trim();
}

// --- Execution ---
const nakedCode = fs.readFileSync(path.join(__dirname, 'hero-test-naked.jsx'), 'utf8');
const result = hydrate(nakedCode);

console.log('✅ [FINAL TEST] Hydration & Deduplication successful.');
if (result.startsWith('"use client";\nimport React')) console.log('[OK] React import correctly placed at the top.');
if ((result.match(/import React/g) || []).length === 1) console.log('[OK] No duplicate React imports.');

fs.writeFileSync(path.join(__dirname, 'hero-test-hydrated.tsx'), result);
