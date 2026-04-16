"use client";
import React, { useState, useEffect, useRef, useMemo, useCallback, Fragment } from 'react';
import { Zap, ArrowRight } from 'lucide-react';

const Lucide = { Zap, ArrowRight };



/**
 * Test Hero Component (IA Generated Style)
 * This component uses Lucide icons and typical IA artifacts.
 */
const HeroTest = () => {
    return (
        <section className="relative h-screen flex items-center justify-center bg-slate-900 text-white overflow-hidden">
            <div className="container mx-auto px-6 z-10">
                <div className="flex flex-col items-center text-center">
                    <div className="mb-6 p-3 bg-blue-500/20 rounded-full">
                        <Lucide.Zap className="w-8 h-8 text-blue-400" />
                    </div>
                    <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
                        Vórtex <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Engine 3.1</span>
                    </h1>
                    <p className="text-xl text-slate-400 max-w-2xl mb-10">
                        Validando o pipeline de hidratação atômica para componentes Next.js de alta fidelidade.
                    </p>
                    <div className="flex gap-4">
                        <button className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-all flex items-center gap-2">
                            Começar Agora
                            <Lucide.ArrowRight className="w-4 h-4" />
                        </button>
                        <button className="px-8 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg font-semibold transition-all">
                            Documentação
                        </button>
                    </div>
                </div>
            </div>
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 blur-[120px] rounded-full -mr-48 -mt-48"></div>
        </section>
    );
};

export default HeroTest;