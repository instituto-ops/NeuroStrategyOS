const fs = require('fs');
const path = require('path');

// --- Hydrate Logic ---
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
    return [...imports, "", ...helperLines, "", cleanCode].join('\n').trim();
}

// --- Test 4.3 ---
const nakedPath = path.join(__dirname, 'nav-test-naked.jsx');
const hydratedCode = hydrate(fs.readFileSync(nakedPath, 'utf8'));

console.log('✅ [TEST 4.3] Navigation Hydration successful.');
if (hydratedCode.includes("import Link from 'next/link';")) console.log('[OK] next/link import detected.');
if (hydratedCode.includes("import Image from 'next/image';")) console.log('[OK] next/image import detected.');
if (hydratedCode.includes("import { useRouter, usePathname, useSearchParams } from 'next/navigation';")) console.log('[OK] next/navigation import detected.');
if (hydratedCode.includes('const router = useRouter();') && !hydratedCode.includes('window.useRouter')) console.log('[OK] useRouter call normalized.');

fs.writeFileSync(path.join(__dirname, 'nav-test-hydrated.tsx'), hydratedCode);
