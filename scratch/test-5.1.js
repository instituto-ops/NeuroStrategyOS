/**
 * 🌀 VÓRTEX 3.1 — FINAL VALIDATION (FASE V)
 * Teste de integração do Protocolo Naked -> Hidratação Local
 */

const { hydrate } = require('../frontend/public/js/hydration-map.js');

const nakedCode = `
const HeroSection = () => {
    const [active, setActive] = React.useState(false);

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-10 bg-[#050810]"
        >
            <Lucide.Shield className="text-[#14b8a6]" />
            <h1 className="text-white">Neuro-Estratega em Uberlândia</h1>
            <Link href="/agendar" className="btn">Agendar</Link>
        </motion.div>
    );
};

export default HeroSection;
`;

console.log("🌀 INICIANDO VALIDAÇÃO DO PROTOCOLO NAKED 3.1...");
const output = hydrate(nakedCode);

console.log("\n--- [INPUT NAKED] ---");
console.log(nakedCode);

console.log("\n--- [OUTPUT HYDRATED] ---");
console.log(output);

// Verificações
const hasUseClient = output.includes('"use client";');
const hasReactImport = output.includes("import React, {");
const hasMotionImport = output.includes("import { motion");
const hasLucideImport = output.includes("import { Shield } from 'lucide-react';");
const hasLinkImport = output.includes("import Link from 'next/link';");
const hasLucideBridge = output.includes("const Lucide = { Shield };");

if (hasUseClient && hasReactImport && hasMotionImport && hasLucideImport && hasLinkImport && hasLucideBridge) {
    console.log("\n✅ VALIDAÇÃO SUCEDIDA: O motor materializou o código conforme o Protocolo 3.1.");
} else {
    console.error("\n❌ FALHA NA VALIDAÇÃO: Algum elemento de hidratação está ausente.");
}
