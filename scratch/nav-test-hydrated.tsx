"use client";
import React, { useState, useEffect, useRef, useMemo, useCallback, Fragment } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';


import React from 'react';

/**
 * Navigation Component (IA Generated Style)
 * Uses Link, Image and useRouter.
 */
const NavbarTest = () => {
    const router = useRouter();
    
    return (
        <nav className="flex items-center justify-between p-4 bg-white border-b border-slate-200">
            <div className="flex items-center gap-2">
                <Image 
                    src="/logo.png" 
                    alt="Logo" 
                    width={32} 
                    height={32} 
                    className="rounded-lg"
                />
                <span className="font-bold text-lg">Marketing Studio</span>
            </div>
            
            <div className="hidden md:flex items-center gap-6">
                <Link href="/" className="text-slate-600 hover:text-blue-600 font-medium">Home</Link>
                <Link href="/servicos" className="text-slate-600 hover:text-blue-600 font-medium">Serviços</Link>
                <Link href="/contato" className="text-slate-600 hover:text-blue-600 font-medium">Contato</Link>
            </div>
            
            <button 
                onClick={() => router.push('/login')}
                className="px-5 py-2 bg-blue-600 text-white rounded-full text-sm font-semibold"
            >
                Entrar
            </button>
        </nav>
    );
};

export default NavbarTest;