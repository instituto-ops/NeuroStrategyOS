import React from 'react';

/**
 * Navigation Component (IA Generated Style)
 * Uses window.Link, window.Image and window.useRouter.
 */
const NavbarTest = () => {
    const router = window.useRouter();
    
    return (
        <nav className="flex items-center justify-between p-4 bg-white border-b border-slate-200">
            <div className="flex items-center gap-2">
                <window.Image 
                    src="/logo.png" 
                    alt="Logo" 
                    width={32} 
                    height={32} 
                    className="rounded-lg"
                />
                <span className="font-bold text-lg">Marketing Studio</span>
            </div>
            
            <div className="hidden md:flex items-center gap-6">
                <window.Link href="/" className="text-slate-600 hover:text-blue-600 font-medium">Home</window.Link>
                <window.Link href="/servicos" className="text-slate-600 hover:text-blue-600 font-medium">Serviços</window.Link>
                <window.Link href="/contato" className="text-slate-600 hover:text-blue-600 font-medium">Contato</window.Link>
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
