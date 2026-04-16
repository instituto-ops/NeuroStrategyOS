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
// analyzeCodeWithAST(code) → { icons, components, hasExportDefault }
// =========================================================================
/**
 * Analisa a estrutura do código usando Babel AST para soberania sintática.
 * Retorna metadados estruturais para o motor de hidratação.
 */
function analyzeCodeWithAST(code) {
    if (typeof Babel === 'undefined' || !Babel.packages || !Babel.packages.parser) {
        return null;
    }

    try {
        const icons = new Set();
        const components = [];
        let hasExportDefault = false;

        const ast = Babel.packages.parser.parse(code, {
            sourceType: "module",
            plugins: ["jsx", "typescript"]
        });

        Babel.packages.traverse(ast, {
            // 1. Detecção de Acesso Direto: Lucide.Camera ou window.Lucide.Camera
            MemberExpression(path) {
                const node = path.node;
                const obj = node.object;
                const prop = node.property;

                // Caso: Lucide.Icon
                if (obj.type === 'Identifier' && obj.name === 'Lucide' && prop.type === 'Identifier') {
                    if (/^[A-Z]/.test(prop.name)) icons.add(prop.name);
                }
                // Caso: window.Lucide.Icon
                if (obj.type === 'MemberExpression' && 
                    obj.object.name === 'window' && 
                    obj.property.name === 'Lucide' && 
                    prop.type === 'Identifier') {
                    if (/^[A-Z]/.test(prop.name)) icons.add(prop.name);
                }
            },
            // 2. Detecção de Destructuring: const { Camera } = Lucide
            VariableDeclarator(path) {
                const init = path.node.init;
                if (!init) return;

                const isLucide = (init.type === 'Identifier' && init.name === 'Lucide') ||
                                 (init.type === 'MemberExpression' && init.object.name === 'window' && init.property.name === 'Lucide');

                if (isLucide && path.node.id.type === 'ObjectPattern') {
                    path.node.id.properties.forEach(p => {
                        if (p.type === 'ObjectProperty' && p.key.type === 'Identifier') {
                            icons.add(p.key.name);
                        }
                    });
                }
            },
            // 3. Identificação de Componentes (PascalCase)
            FunctionDeclaration(path) {
                if (path.node.id && /^[A-Z]/.test(path.node.id.name)) {
                    components.push(path.node.id.name);
                }
            },
            VariableDeclaration(path) {
                path.node.declarations.forEach(decl => {
                    if (decl.id.type === 'Identifier' && /^[A-Z]/.test(decl.id.name)) {
                        components.push(decl.id.name);
                    }
                });
            },
            // 4. Detecção de Export Global
            ExportDefaultDeclaration() {
                hasExportDefault = true;
            }
        });

        return { icons: Array.from(icons), components, hasExportDefault };
    } catch (e) {
        console.warn('[HYDRATION AST] Falha no parsing estrutural:', e.message);
        return null;
    }
}

// =========================================================================
// extractLucideIcons(code) → string[]
// =========================================================================
/**
 * Varre o código e retorna um array com os nomes únicos de ícones Lucide.
 * Tenta usar AST (Babel) primeiro, com fallback para RegEx.
 */
function extractLucideIcons(code, astData = null) {
    if (astData && astData.icons) return astData.icons;

    const icons = new Set();

    // Fallback RegEx (legado mas resiliente)
    const dotAccessRegex = /(?:window\.)?Lucide\.([A-Z][a-zA-Z0-9]*)/g;
    let match;
    while ((match = dotAccessRegex.exec(code)) !== null) {
        icons.add(match[1]);
    }

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
    
    // Análise Estrutural (AST Sovereignty)
    const astData = analyzeCodeWithAST(cleanCode);

    // Normalização: Remove referências a 'window.' para compatibilidade com SSR
    cleanCode = cleanCode.replace(/window\.(React|Lucide|motion|Link|Image|useRouter|usePathname|useSearchParams)/g, '$1');

    const imports = ["\"use client\";"];
    const helperLines = [];

    // 1. Detecção de Dependências (antes de limpar os imports do corpo)
    for (const key in HYDRATION_MAP) {
        const item = HYDRATION_MAP[key];
        const pattern = new RegExp('\\b' + item.globalPattern + '\\b');

        if (pattern.test(cleanCode)) {
            if (item.type === 'static') {
                imports.push(item.importStatement);
            } else if (key === 'lucideReact') {
                const icons = extractLucideIcons(cleanCode, astData);
                if (icons.length > 0) {
                    imports.push(`import { ${icons.join(', ')} } from 'lucide-react';`);
                    // Bridge de compatibilidade para código que usa Lucide.IconName
                    helperLines.push(`const Lucide = { ${icons.join(', ')} };`);
                }
            }
        }
    }

    // 2. Limpeza de Imports Redundantes no corpo (Deduplicação)
    cleanCode = cleanCode.replace(/import\s+React\s+from\s+['"]react['"];?/g, '');
    cleanCode = cleanCode.replace(/import\s+.*\s+from\s+['"]framer-motion['"];?/g, '');
    cleanCode = cleanCode.replace(/import\s+.*\s+from\s+['"]lucide-react['"];?/g, '');
    cleanCode = cleanCode.replace(/import\s+Link\s+from\s+['"]next\/link['"];?/g, '');
    cleanCode = cleanCode.replace(/import\s+Image\s+from\s+['"]next\/image['"];?/g, '');
    cleanCode = cleanCode.replace(/import\s+.*\s+from\s+['"]next\/navigation['"];?/g, '');

    // 3. Auto-Export (Naked Protocol compatibility)
    const hasExportDefault = astData ? astData.hasExportDefault : /export\s+default\b/.test(cleanCode);
    
    if (!hasExportDefault && (cleanCode.includes('function') || cleanCode.includes('const'))) {
        let componentName = 'App';
        
        if (astData && astData.components.length > 0) {
            // Se houver mais de um, tentamos encontrar um que pareça principal (ex: App, Page, ou o último definido)
            const main = astData.components.find(c => ['App', 'Page', 'Component', 'Home'].includes(c));
            componentName = main || astData.components[astData.components.length - 1];
        } else {
            // Fallback RegEx
            const componentMatch = cleanCode.match(/(?:function|const)\s+([A-Z][a-zA-Z0-9]*)/);
            if (componentMatch) componentName = componentMatch[1];
        }
        
        helperLines.push(`export default ${componentName};`);
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

// Export para navegador e Node.js
if (typeof window !== 'undefined') {
    window.HYDRATION_MAP = HYDRATION_MAP;
    window.extractLucideIcons = extractLucideIcons;
    window.strip = strip;
    window.hydrate = hydrate;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { HYDRATION_MAP, extractLucideIcons, strip, hydrate };
}
