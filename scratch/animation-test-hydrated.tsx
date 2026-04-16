"use client";
import React, { useState, useEffect, useRef, useMemo, useCallback, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star } from 'lucide-react';

const Lucide = { Star };

import React from 'react';

/**
 * Animated Component (IA Generated Style)
 * Uses motion and Lucide.
 */
const AnimatedCard = () => {
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="p-6 bg-white rounded-2xl shadow-xl border border-slate-100 max-w-sm"
        >
            <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Lucide.Star className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                    <h3 className="font-bold text-slate-800">Card Animado</h3>
                    <p className="text-sm text-slate-500">Teste de Framer Motion</p>
                </div>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed">
                Este componente testa a injeção automática de Framer Motion e a substituição de referências globais pelo pipeline Vórtex 3.1.
            </p>
            <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="mt-6 w-full py-2 bg-purple-600 text-white rounded-lg font-medium"
            >
                Interagir
            </motion.button>
        </motion.div>
    );
};

export default AnimatedCard;