/**
 * frontend/public/js/vortex-renderer.js
 * 
 * Data-driven Renderer para o Vórtex Studio.
 * Converte JSON semântico em código TSX Naked compatível com o Studio.
 */

const VortexRenderer = {
  /**
   * Renderiza uma página inteira
   */
  renderPage(page) {
    const sections = page.sections.map(s => this.renderSection(s)).join('\n\n');
    return `function Page() {
  return (
    <main className="bg-[#050810] min-h-screen text-slate-200">
${sections}
    </main>
  );
}`;
  },

  /**
   * Dispatcher por 'kind'
   */
  renderSection(section) {
    switch (section.kind) {
      case 'hero': return this.templates.hero(section.props);
      case 'content': return this.templates.content(section.props);
      case 'cta': return this.templates.cta(section.props);
      case 'clinical_profile': return this.templates.clinical_profile(section.props);
      case 'features': return this.templates.features(section.props);
      case 'testimonials': return this.templates.testimonials(section.props);
      default:
        console.warn(`[RENDERER] Kind desconhecido: ${section.kind}`);
        return `<!-- Kind ${section.kind} não suportado -->`;
    }
  },

  templates: {
    hero: (p) => `
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              ${p.title || 'Título Hero'}
            </h1>
            <p className="text-xl text-slate-400 max-w-2xl mb-8">
              ${p.subtitle || ''}
            </p>
            ${p.cta ? `<button className="bg-teal-500 hover:bg-teal-400 text-black font-bold py-4 px-8 rounded-full transition-all">${p.cta}</button>` : ''}
          </motion.div>
        </div>
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-teal-500/10 to-transparent blur-3xl" />
      </section>
    `,

    content: (p) => `
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto prose prose-invert prose-teal">
          ${p.body || ''}
        </div>
      </section>
    `,

    cta: (p) => `
      <section className="py-20 px-6 bg-slate-900/50 border-y border-slate-800">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">${p.title || 'Pronto para começar?'}</h2>
          <p className="text-slate-400 mb-8">${p.subtitle || ''}</p>
          <button className="bg-white text-black font-bold py-3 px-10 rounded-lg hover:scale-105 transition-transform">
            ${p.buttonText || 'Saiba Mais'}
          </button>
        </div>
      </section>
    `,

    clinical_profile: (p) => `
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="relative aspect-square rounded-2xl overflow-hidden border border-slate-800">
            <img src="${p.image || '/api/placeholder/600/600'}" alt="${p.name}" className="object-cover w-full h-full" />
          </div>
          <div>
            <div className="text-teal-500 font-mono mb-2">${p.specialty || 'Especialista'}</div>
            <h2 className="text-4xl font-bold mb-6">${p.name || 'Nome do Profissional'}</h2>
            <div className="space-y-4 text-slate-400">
              ${p.bio || ''}
            </div>
          </div>
        </div>
      </section>
    `,

    features: (p) => `
      <section className="py-20 px-6 bg-[#050810]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center font-heading text-white">${p.title || 'Diferenciais'}</h2>
          <div className="grid md:grid-cols-3 gap-8">
            ${(p.items || []).map(item => `
              <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-teal-500/30 transition-all group">
                <div className="text-teal-400 mb-4 text-2xl group-hover:scale-110 transition-transform">
                  <Lucide.${item.icon || 'CheckCircle'} />
                </div>
                <h3 className="text-xl font-bold mb-2 text-slate-100">${item.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">${item.description}</p>
              </div>
            `).join('')}
          </div>
        </div>
      </section>
    `,

    testimonials: (p) => `
      <section className="py-20 px-6 bg-slate-900/20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center font-heading text-white">${p.title || 'Depoimentos'}</h2>
          <div className="grid md:grid-cols-2 gap-8">
            ${(p.items || []).map(item => `
              <div className="p-8 rounded-2xl bg-black border border-slate-800 relative shadow-2xl">
                <div className="text-teal-500/20 absolute top-4 right-8 text-6xl font-serif">“</div>
                <p className="text-slate-300 italic mb-6 leading-relaxed relative z-10">${item.quote}</p>
                <div className="flex items-center gap-4 border-t border-slate-800 pt-6">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                    ${item.author?.charAt(0) || 'P'}
                  </div>
                  <div>
                    <div className="font-bold text-slate-200">${item.author}</div>
                    <div className="text-xs text-slate-500">${item.role || 'Paciente'}</div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </section>
    `
  }
};

window.VortexRenderer = VortexRenderer;
