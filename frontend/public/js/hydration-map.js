// =========================================================================
// VÓRTEX 3.1 — HYDRATION MAP (Dicionário de Hidratação)
// =========================================================================
// Este módulo mapeia referências globais usadas no Preview Shell
// para os imports reais de produção (Next.js / npm).
//
// Fluxo:
//   Preview Shell (naked) → hydrate() → Código Next.js válido
//
// SSOT: Plano_Vortex_3.md — Fase III
// =========================================================================

/**
 * Dicionário de Hidratação.
 * Cada chave é o padrão global usado no Preview Shell.
 * Cada valor contém o import real para produção.
 *
 * Estrutura:
 *   globalPattern: string  — Regex ou nome global usado no shell
 *   importStatement: string — Linha de import para Next.js
 *   type: 'static' | 'dynamic' — Se é um import fixo ou extraído do código
 */
const HYDRATION_MAP = {

    // === React Core ===
    react: {
        globalPattern: 'React',
        importStatement: "import React, { useState, useEffect, useRef, useMemo, useCallback, Fragment } from 'react';",
        type: 'static'
    },

    // === Framer Motion ===
    framerMotion: {
        globalPattern: 'motion',
        importStatement: "import { motion, AnimatePresence } from 'framer-motion';",
        type: 'static'
    },

    // === Lucide Icons (dinâmico — depende dos ícones usados) ===
    lucideReact: {
        globalPattern: 'Lucide',
        importStatement: null, // Gerado dinamicamente por extractLucideIcons()
        type: 'dynamic'
    },

    // === Next.js Navigation ===
    nextLink: {
        globalPattern: 'Link',
        importStatement: "import Link from 'next/link';",
        type: 'static'
    },
    nextImage: {
        globalPattern: 'Image',
        importStatement: "import Image from 'next/image';",
        type: 'static'
    },
    nextNavigation: {
        globalPattern: 'useRouter',
        importStatement: "import { useRouter, usePathname, useSearchParams } from 'next/navigation';",
        type: 'static'
    }
};

// Export para uso futuro (será consumido pelas funções de hydrate/strip)
if (typeof window !== 'undefined') {
    window.HYDRATION_MAP = HYDRATION_MAP;
}

// =========================================================================
// extractLucideIcons(code) → string[]
// =========================================================================
// Varre o código e retorna um array com os nomes únicos de ícones Lucide.
//
// Padrões detectados:
//   1. Lucide.Camera         → ['Camera']
//   2. window.Lucide.Camera  → ['Camera']
//   3. const { Camera, Heart } = Lucide;  → ['Camera', 'Heart']
//
// Se ícones forem detectados via padrão 1/2 mas não via destructuring,
// e o código contiver destructuring genérico de Lucide, emite um warning.
// =========================================================================
function extractLucideIcons(code) {
    const icons = new Set();

    // Padrão 1 e 2: Lucide.IconName ou window.Lucide.IconName
    const dotAccessRegex = /(?:window\.)?Lucide\.([A-Z][a-zA-Z0-9]*)/g;
    let match;
    while ((match = dotAccessRegex.exec(code)) !== null) {
        icons.add(match[1]);
    }

    // Padrão 3: const { Icon1, Icon2 } = Lucide;
    const destructureRegex = /(?:const|let|var)\s*\{([^}]+)\}\s*=\s*(?:window\.)?Lucide/g;
    while ((match = destructureRegex.exec(code)) !== null) {
        const names = match[1].split(',').map(s => s.trim()).filter(Boolean);
        names.forEach(name => {
            // Limpar alias (ex: Camera as CameraIcon)
            const clean = name.split(/\s+as\s+/)[0].trim();
            if (/^[A-Z]/.test(clean)) {
                icons.add(clean);
            }
        });
    }

    // Warning fallback: se há referência a Lucide mas nenhum ícone extraído
    if (icons.size === 0 && /(?:window\.)?Lucide\b/.test(code)) {
        console.warn('[HYDRATION] ⚠️ Referência a Lucide detectada, mas nenhum ícone extraído. Verifique o padrão de uso.');
    }

    return Array.from(icons);
}

function strip(code) {
    if (!code) return '';

    // Padrão para detectar blocos de código Markdown (insensitivo a caso)
    const markdownRegex = /```(?:jsx|javascript|js|tsx|ts)?\s*([\s\S]*?)```/i;
    const match = code.match(markdownRegex);

    return (match ? match[1] : code).trim();
}

/**
 * hydrate(code) → string
 * O Coração do Vórtex: Transforma código 'naked' em Next.js de produção.
 */
function hydrate(code) {
    if (!code) return '';

    let cleanCode = strip(code);
    
    // Normalização: Remove referências a 'window.' para compatibilidade com SSR
    cleanCode = cleanCode.replace(/window\.(React|Lucide|motion|Link|Image|useRouter|usePathname|useSearchParams)/g, '$1');

    const imports = ["\"use client\";"];
    const helperLines = [];

    // Processa o mapa de hidratação
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
                    // Bridge de compatibilidade para código que usa Lucide.IconName
                    helperLines.push(`const Lucide = { ${icons.join(', ')} };`);
                }
            }
        }
    }

    // Montagem do arquivo final
    return [
        ...imports,
        "",
        ...helperLines,
        "",
        cleanCode
    ].join('\n').trim();
}

// Export
if (typeof window !== 'undefined') {
    window.HYDRATION_MAP = HYDRATION_MAP;
    window.extractLucideIcons = extractLucideIcons;
    window.strip = strip;
    window.hydrate = hydrate;
}
