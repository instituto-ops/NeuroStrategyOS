/**
 * NeuroEngine — Sistema de Blocos HTML/CSS Modular (Método Abidos)
 * ─────────────────────────────────────────────────────────────────
 * Cada bloco é um HTML autossuficiente com <style> interno.
 * Mobile-First: 1 coluna → 2/3 colunas a partir de 768px.
 * Sem classes lw-* ou dependências externas.
 *
 * ⚠️  REGRA DE POSTAGEM NO WORDPRESS/ELEMENTOR:
 *      Cole CADA BLOCO no Widget HTML (não no Editor de Texto).
 *      O Editor de Texto sanitiza e quebra o HTML.
 *
 * Referências:
 *   docs/AI Studio/Sistema de Blocos HTMLCSS Modular.md
 *   docs/AI Studio/Otimização de Landing Page para Psicologia.md
 */

window.AbidosBlocks = {

    // ── Configurações do especialista (E-E-A-T) ────────────────────
    ctx: {
        name: "Victor Lawrence Bernardes Santana",
        crp:  "09/012681",
        wa:   "https://wa.me/5562991545295?text=Ol%C3%A1%2C%20gostaria%20de%20agendar%20uma%20consulta",
        site: "https://www.hipnolawrence.com",
    },

    /**
     * Retorna o HTML de um bloco pelo ID.
     * @param {string} id  — identificador do bloco
     * @param {string} [kw] — palavra-chave primária da pagina (opcional)
     */
    get(id, kw) {
        const { name, crp, wa, site } = this.ctx;
        if (!kw || kw === '') kw = 'psicólogo especialista em Goiânia';

        const map = {

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ① HERO — PRIMEIRA DOBRA
//    H1: Keyword + Promessa + Localização (ÚNICO por página)
//    H2: Subtítulo de apoio
//    CTA: Botão primário + WhatsApp flutuante onipresente
//
//    ⚠️ REGRA WORDPRESS: O tema Astra já gera um H1 automático com
//    o título da Página. Se você colar este bloco em um Post/Page
//    que já tem título visível, REMOVA o <h1> abaixo ou troque por <h2>.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
'h1': `
<section data-bloco="hero-h1" style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:3rem 1.5rem;text-align:center;color:white;">
  <div style="max-width:800px;margin:0 auto;">
    <!-- H1: Keyword Primária + Promessa + Localização | ÚNICO por página -->
    <!-- REGRA WP: Se o Astra já gerou um H1, troque esta tag por <h2> -->
    <h1 style="font-size:clamp(1.75rem,5vw,3rem);font-weight:700;line-height:1.2;margin:0 0 1rem 0;color:white;">
      Psicólogo Especialista em Goiânia: Supere a Ansiedade e Restaure seu Equilíbrio Mental
    </h1>
    <!-- H2: Subtítulo de apoio — modalidades + diferenciais -->
    <h2 style="font-size:clamp(1rem,3vw,1.375rem);font-weight:400;color:rgba(255,255,255,0.9);margin:0 0 1.5rem 0;line-height:1.6;">
      Atendimento presencial em Goiânia e online para todo o Brasil. Sigilo garantido. CRP ${crp}.
    </h2>
    <!-- CTA Mobile-First: "Toque" = linguagem de celular, não "Clique" -->
    <a href="${wa}" target="_blank" style="display:inline-block;background:#ff6b6b;color:white;padding:1rem 2rem;border-radius:8px;font-size:1rem;font-weight:700;text-decoration:none;letter-spacing:0.05em;">
      📱 Toque aqui para agendar
    </a>
    <p style="font-size:0.85rem;margin-top:1rem;color:rgba(255,255,255,0.7);">
      ✓ Sigilo absoluto (CFP) &nbsp;|&nbsp; ✓ Hipnose Ericksoniana &nbsp;|&nbsp; ✓ CRP ${crp}
    </p>
  </div>
</section>
<style>
  [data-bloco="hero-h1"]{ position:relative; overflow:hidden; }
  @media(min-width:768px){ [data-bloco="hero-h1"]{ padding:5rem 2rem; } }
</style>`,

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ① SUBTÍTULO DE APOIO (complemento do Hero)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
'subtitulo': `
<section data-bloco="hero-subtitulo" style="padding:2rem 1.5rem;text-align:center;background:#f8fafc;">
  <!-- Parágrafo de apoio ao H1 — evita heading desnecessário -->
  <p style="font-size:1.0625rem;color:#475569;line-height:1.8;max-width:700px;margin:0 auto;">
    Atendimento presencial no Setor Sul, Goiânia, e online para todo o Brasil.
    Ambiente acolhedor, sigiloso e preparado para você.
    Método Ericksoniano e Avaliação de TEA em Adultos com protocolo validado (ADOS-2 &amp; ADI-R).
  </p>
</section>`,

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ① CTA PRIMÁRIO + BOTÃO FLUTUANTE WHATSAPP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
'cta': `
<section data-bloco="hero-cta" style="padding:2rem 1.5rem;text-align:center;background:#f0fdf4;">
  <!-- CTA com linguagem Mobile-First: "Toque" não "Clique" -->
  <a href="${wa}" target="_blank" style="display:inline-block;background:#16a34a;color:white;padding:1rem 2rem;border-radius:50px;font-size:1.1rem;font-weight:700;text-decoration:none;box-shadow:0 4px 15px rgba(22,163,74,0.4);">
    📱 Toque aqui para falar comigo
  </a>
  <p style="color:#64748b;font-size:0.8rem;margin-top:0.75rem;">Resposta em até 24h &bull; Sem compromisso</p>
</section>
<!-- Botão Flutuante WhatsApp — onipresente, presente em toda a página -->
<a href="${wa}" target="_blank" aria-label="Agendar pelo WhatsApp"
   style="position:fixed;bottom:20px;right:20px;background:#16a34a;color:white;width:56px;height:56px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:28px;text-decoration:none;z-index:9999;box-shadow:0 4px 15px rgba(0,0,0,0.2);">💬</a>`,

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ② DOR — Identificação da Dor
//    H2: pergunta retórica (conexão emocional)
//    H3: micro-identificadores de dor (ícone + rótulo)
//    Grid: 1 col (mobile) → 2 col (480px) → 3 col (768px)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
'dor': `
<section data-bloco="dor" style="padding:3rem 1.5rem;background:#ffffff;">
  <div style="max-width:1200px;margin:0 auto;">
    <!-- H2: Pergunta retórica de empatia — silo semântico de dor -->
    <h2 style="font-size:clamp(1.5rem,4vw,2.25rem);font-weight:700;text-align:center;color:#1e293b;margin:0 0 1rem 0;">
      Sente que a exaustão emocional está travando sua vida?
    </h2>
    <p style="text-align:center;font-size:1rem;color:#64748b;max-width:680px;margin:0 auto 2.5rem;line-height:1.7;">
      Você não está sozinho. A ansiedade, o masking e as dificuldades relacionais afetam milhões. Existem caminhos comprovados.
    </p>
    <!-- Card Grid Mobile-First -->
    <div class="dor-grid" style="display:grid;grid-template-columns:1fr;gap:1.5rem;">

      <!-- H3: Micro-identificador de dor 1 -->
      <div style="background:#f8fafc;border-left:4px solid #6366f1;padding:1.75rem;border-radius:8px;">
        <h3 style="font-size:1.15rem;font-weight:600;color:#1e293b;margin:0 0 0.5rem 0;">🔄 Ciclos de Ansiedade Crônica</h3>
        <p style="color:#64748b;line-height:1.6;margin:0;">Pensamentos acelerados, insônia e sensação de pânico. O corpo preso num loop que parece impossível quebrar.</p>
      </div>

      <!-- H3: Micro-identificador de dor 2 -->
      <div style="background:#f8fafc;border-left:4px solid #f43f5e;padding:1.75rem;border-radius:8px;">
        <h3 style="font-size:1.15rem;font-weight:600;color:#1e293b;margin:0 0 0.5rem 0;">🎭 Masking e Exaustão Social</h3>
        <p style="color:#64748b;line-height:1.6;margin:0;">Esforço constante para parecer "normal". Cansaço profundo que ninguém ao redor consegue entender.</p>
      </div>

      <!-- H3: Micro-identificador de dor 3 -->
      <div style="background:#f8fafc;border-left:4px solid #0ea5e9;padding:1.75rem;border-radius:8px;">
        <h3 style="font-size:1.15rem;font-weight:600;color:#1e293b;margin:0 0 0.5rem 0;">🔍 Dúvida: "Serei autista?"</h3>
        <p style="color:#64748b;line-height:1.6;margin:0;">Sensação de sempre ser "diferente" sem saber o porquê. Busca por diagnóstico e autoconhecimento.</p>
      </div>

    </div>
    <div style="text-align:center;margin-top:2rem;">
      <a href="${wa}" target="_blank" style="display:inline-block;background:#6366f1;color:white;padding:0.875rem 2rem;border-radius:8px;font-weight:600;text-decoration:none;">
        Descubra a Solução →
      </a>
    </div>
  </div>
</section>
<style>
  @media(min-width:768px){ [data-bloco="dor"] .dor-grid{ grid-template-columns:repeat(3,1fr)!important; } }
  @media(min-width:480px) and (max-width:767px){ [data-bloco="dor"] .dor-grid{ grid-template-columns:repeat(2,1fr)!important; } }
</style>`,

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ③ BENEFÍCIOS & SERVIÇOS
//    H2: silo semântico de serviços + keyword + cidade
//    H3: detalhe de cada serviço (micro-intenção de busca)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
'beneficios': `
<section data-bloco="beneficios" style="padding:3rem 1.5rem;background:linear-gradient(135deg,#f5f7fa 0%,#e9ecf1 100%);">
  <div style="max-width:1200px;margin:0 auto;">
    <!-- H2: Introdução do silo de serviços com keyword + cidade -->
    <h2 style="font-size:clamp(1.5rem,4vw,2.25rem);font-weight:700;text-align:center;color:#1e293b;margin:0 0 1rem 0;">
      Como a Psicologia Especializada em Goiânia Pode te Ajudar
    </h2>
    <p style="text-align:center;font-size:1rem;color:#64748b;max-width:680px;margin:0 auto 2.5rem;line-height:1.7;">
      Abordagens comprovadas, baseadas em ciência e ética para sua saúde emocional.
    </p>
    <div class="benef-grid" style="display:grid;grid-template-columns:1fr;gap:2rem;">

      <!-- H3: Serviço 1 — micro-intenção: avaliação TEA -->
      <div style="background:white;padding:2rem;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,0.08);border-top:4px solid #6366f1;">
        <div style="font-size:2rem;margin-bottom:0.75rem;">🧠</div>
        <h3 style="font-size:1.25rem;font-weight:600;color:#1e293b;margin:0 0 0.5rem 0;">Avaliação Diagnóstica de TEA em Adultos em Goiânia</h3>
        <p style="color:#64748b;line-height:1.6;margin:0 0 1rem 0;">Processo criterioso e humanizado com instrumentos validados (ADOS-2, ADI-R). Laudo técnico para adaptação social e laboral.</p>
        <ul style="color:#64748b;margin:0;padding-left:1.25rem;line-height:1.8;">
          <li>Escala AQ validada em pesquisa própria (UFU)</li>
          <li>Entrevista estruturada e observação clínica</li>
          <li>Relatório reconhecido por instituições</li>
        </ul>
      </div>

      <!-- H3: Serviço 2 — micro-intenção: hipnose clínica -->
      <div style="background:white;padding:2rem;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,0.08);border-top:4px solid #0ea5e9;">
        <div style="font-size:2rem;margin-bottom:0.75rem;">🌀</div>
        <h3 style="font-size:1.25rem;font-weight:600;color:#1e293b;margin:0 0 0.5rem 0;">Hipnose Clínica Ericksoniana para Ansiedade, Fobias e Compulsões</h3>
        <p style="color:#64748b;line-height:1.6;margin:0 0 1rem 0;">Reconhecida pelo CFP (Resolução 013/2000). Acessa o inconsciente para reprogramar respostas emocionais.</p>
        <ul style="color:#64748b;margin:0;padding-left:1.25rem;line-height:1.8;">
          <li>Resultados profundos em poucas sessões</li>
          <li>Compatível com outras abordagens terapêuticas</li>
          <li>Sem efeitos colaterais</li>
        </ul>
      </div>

      <!-- H3: Serviço 3 — micro-intenção: psicoterapia online -->
      <div style="background:white;padding:2rem;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,0.08);border-top:4px solid #16a34a;">
        <div style="font-size:2rem;margin-bottom:0.75rem;">💬</div>
        <h3 style="font-size:1.25rem;font-weight:600;color:#1e293b;margin:0 0 0.5rem 0;">Psicoterapia Online — Sigilo Garantido para Todo o Brasil</h3>
        <p style="color:#64748b;line-height:1.6;margin:0 0 1rem 0;">Atendimento por videochamada com a mesma qualidade e sigilo do presencial.</p>
        <ul style="color:#64748b;margin:0;padding-left:1.25rem;line-height:1.8;">
          <li>Plataforma segura e criptografada</li>
          <li>Horários flexíveis incluindo finais de semana</li>
          <li>Aceita pacientes de qualquer estado</li>
        </ul>
      </div>

    </div>
    <div style="text-align:center;margin-top:2.5rem;">
      <a href="${wa}" target="_blank" style="display:inline-block;background:#ff6b6b;color:white;padding:0.875rem 2rem;border-radius:8px;font-weight:600;text-decoration:none;">
        Qual serviço é certo para você? →
      </a>
    </div>
  </div>
</section>
<style>
  @media(min-width:768px){ [data-bloco="beneficios"] .benef-grid{ grid-template-columns:repeat(3,1fr)!important; } }
  @media(min-width:480px) and (max-width:767px){ [data-bloco="beneficios"] .benef-grid{ grid-template-columns:repeat(2,1fr)!important; } }
</style>`,

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ④ OBJEÇÕES — Quebra de Resistência
//    H2: sub-silo dentro de Benefícios
//    H3: cada prova/objeção específica
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
'objections': `
<section data-bloco="objections" style="padding:2.5rem 1.5rem;background:#fffbe8;border-top:1px solid #fef08a;">
  <div style="max-width:800px;margin:0 auto;">
    <!-- H2: Quebra de objeções — pergunta retórica -->
    <h2 style="font-size:clamp(1.25rem,3vw,1.75rem);font-weight:700;color:#854d0e;margin:0 0 1.5rem 0;">
      Ainda tem dúvidas? Veja o que nossos pacientes precisavam saber antes de agendar
    </h2>
    <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:1rem;">
      <!-- H3: cada objeção específica -->
      <li style="background:white;padding:1rem 1.25rem;border-radius:8px;border-left:3px solid #eab308;">
        <h3 style="font-size:0.95rem;color:#64748b;margin:0;font-weight:normal;">✅ <strong>Sigilo garantido</strong> — Código de Ética do CFP (art. 9º). Nenhuma informação compartilhada sem sua autorização expressa.</h3>
      </li>
      <li style="background:white;padding:1rem 1.25rem;border-radius:8px;border-left:3px solid #eab308;">
        <h3 style="font-size:0.95rem;color:#64748b;margin:0;font-weight:normal;">✅ <strong>Sem julgamentos</strong> — Um ambiente seguro para você ser quem é, sem máscaras.</h3>
      </li>
      <li style="background:white;padding:1rem 1.25rem;border-radius:8px;border-left:3px solid #eab308;">
        <h3 style="font-size:0.95rem;color:#64748b;margin:0;font-weight:normal;">✅ <strong>Primeira sessão de alinhamento</strong> — Para avaliar juntos o melhor caminho antes de qualquer compromisso.</h3>
      </li>
    </ul>
  </div>
</section>`,

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⑤ AUTORIDADE (E-E-A-T)
//    H2: Humanização + identificação do especialista
//    H3: Credenciais verificáveis (CRP em texto selecionável para bots)
//    ✋ REGRA CFP: SEM depoimentos de pacientes → use currículo + ciência
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
'autoridade': `
<section data-bloco="autoridade" style="padding:3rem 1.5rem;background:#ffffff;">
  <div style="max-width:1200px;margin:0 auto;">
    <!-- H2: Apresentação do Especialista — E-E-A-T -->
    <h2 style="font-size:clamp(1.5rem,4vw,2.25rem);font-weight:700;text-align:center;color:#1e293b;margin:0 0 2rem 0;">
      Conheça ${name}, seu Psicólogo Especialista em Goiânia
    </h2>
    <div class="bio-layout" style="display:grid;grid-template-columns:1fr;gap:2.5rem;align-items:center;">
      <!-- Foto: Alt Tag otimizada — nome + especialidade + cidade -->
      <div style="text-align:center;">
        <img src="/wp-content/uploads/victor-lawrence-psicologo-goiania.jpg"
             alt="${name} — Psicólogo Especialista em TEA e Hipnose Clínica em Goiânia, CRP ${crp}"
             style="width:100%;max-width:380px;height:auto;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.12);">
        <p style="font-size:0.7rem;color:#94a3b8;margin-top:0.5rem;">📸 Arquivo: victor-lawrence-psicologo-goiania.jpg</p>
      </div>
      <!-- Bio + Credenciais -->
      <div>
        <!-- H3: Credenciais verificáveis — texto selecionável para bots e rastreadores -->
        <h3 style="font-size:1rem;font-weight:600;color:#6366f1;margin:0 0 1rem 0;">
          Psicólogo CRP ${crp} &bull; Mestrando em Ciências da Saúde (UFU) &bull; Instituto Lawrence de Hipnose Clínica
        </h3>
        <p style="color:#475569;line-height:1.8;margin:0 0 1.5rem 0;">
          Especialista em Avaliação e Diagnóstico de TEA em Adultos e Hipnose Clínica Ericksoniana.
          Mais de 8 anos dedicados ao cuidado de adultos que sempre sentiram que eram "diferentes".
        </p>
        <!-- Credenciais Técnicas — substitui depoimentos (regra CFP) -->
        <div style="background:#f8f9fa;padding:1.25rem;border-radius:8px;margin-bottom:1.5rem;">
          <p style="margin:0 0 0.75rem;font-weight:700;color:#1e293b;">Credenciais Profissionais (E-E-A-T):</p>
          <ul style="color:#64748b;margin:0;padding-left:1.25rem;line-height:1.9;">
            <li><strong>CRP ${crp}</strong> – Registro ativo no CRP-GO</li>
            <li><strong>Mestrando</strong> em Ciências da Saúde – UFU (pesquisa: Psicometria e TEA)</li>
            <li><strong>Pesquisador</strong> – Escala AQ traduzida e validada em PT-BR</li>
            <li><strong>Hipnose Ericksoniana</strong> – Milton H. Erickson Foundation</li>
            <li><strong>PNL Avançada</strong> – Programação Neurolinguística</li>
          </ul>
        </div>
        <a href="${wa}" target="_blank"
           style="display:inline-block;background:#6366f1;color:white;padding:0.875rem 1.5rem;border-radius:8px;font-weight:600;text-decoration:none;">
          Falar com o Especialista →
        </a>
      </div>
    </div>
  </div>
</section>
<style>
  @media(min-width:768px){ [data-bloco="autoridade"] .bio-layout{ grid-template-columns:1fr 1fr!important; } }
</style>`,

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⑥ AMBIENTE & TRANSPARÊNCIA
//    H2: elimina medo do desconhecido
//    Alt Tags: nome-arquivo-keyword-cidade.jpg (SEO de imagem)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
'ambiente': `
<section data-bloco="ambiente" style="padding:3rem 1.5rem;background:#f8fafc;">
  <div style="max-width:1200px;margin:0 auto;text-align:center;">
    <!-- H2: Transparência — elimina o medo do desconhecido -->
    <h2 style="font-size:clamp(1.5rem,4vw,2.25rem);font-weight:700;color:#1e293b;margin:0 0 1rem 0;">
      Um Ambiente Seguro e Preparado para Você em Goiânia
    </h2>
    <p style="color:#64748b;font-size:1rem;max-width:680px;margin:0 auto 2rem;line-height:1.7;">
      Consultório no Setor Sul com isolamento acústico e conforto sensorial — ou atendimento online com total privacidade.
    </p>
    <!-- SEO de Imagem: nome do arquivo = consultorio-psicologo-goiania-01.jpg -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1.5rem;">
      <img src="/wp-content/uploads/consultorio-psicologo-goiania-01.jpg"
           alt="Consultório do psicólogo ${name} em Goiânia — ambiente acolhedor para terapia"
           style="width:100%;height:220px;object-fit:cover;border-radius:10px;box-shadow:0 4px 12px rgba(0,0,0,0.1);">
      <img src="/wp-content/uploads/consultorio-psicologo-goiania-02.jpg"
           alt="Sala de atendimento sigilosa para hipnose e TEA adulto em Goiânia"
           style="width:100%;height:220px;object-fit:cover;border-radius:10px;box-shadow:0 4px 12px rgba(0,0,0,0.1);">
      <img src="/wp-content/uploads/consultorio-psicologo-goiania-03.jpg"
           alt="Ambiente tranquilo do psicólogo Lawrence — conforto sensorial para neurodivergentes"
           style="width:100%;height:220px;object-fit:cover;border-radius:10px;box-shadow:0 4px 12px rgba(0,0,0,0.1);">
    </div>
    <p style="font-size:0.7rem;color:#94a3b8;margin-top:0.75rem;">📸 Substitua pelas fotos reais. Nomes de arquivo sugeridos acima para SEO.</p>
  </div>
</section>`,

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⑦ PROVA SOCIAL ACADÊMICA
//    H2: Certificações (substitui depoimentos — regra CFP)
//    H3: cada credencial
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
'social': `
<section data-bloco="social" style="padding:3rem 1.5rem;background:#fffbe8;border-top:3px solid #eab308;">
  <div style="max-width:1200px;margin:0 auto;text-align:center;">
    <!-- H2: Prova Social Acadêmica — regra CFP: SEM depoimentos de pacientes -->
    <h2 style="font-size:clamp(1.5rem,4vw,2.25rem);font-weight:700;color:#854d0e;margin:0 0 0.5rem 0;">
      Formação e Reconhecimento Técnico do Dr. ${name}
    </h2>
    <p style="color:#92400e;font-size:0.9rem;margin:0 0 2rem 0;">
      Em saúde mental, a prova de qualidade é o currículo, as certificações e a ciência — não promessas.
    </p>
    <div class="social-grid" style="display:grid;grid-template-columns:1fr;gap:1.25rem;text-align:left;">
      <!-- H3: cada certificação / credencial -->
      <div style="background:white;padding:1.25rem 1.5rem;border-radius:8px;border:1px solid #fef08a;display:flex;align-items:center;gap:1rem;">
        <div style="font-size:2rem;">🎓</div>
        <h3 style="font-size:0.9rem;font-weight:600;color:#64748b;margin:0;">Mestrando em Ciências da Saúde — UFU (pesquisa: Psicometria e TEA em Adultos)</h3>
      </div>
      <div style="background:white;padding:1.25rem 1.5rem;border-radius:8px;border:1px solid #fef08a;display:flex;align-items:center;gap:1rem;">
        <div style="font-size:2rem;">📋</div>
        <h3 style="font-size:0.9rem;font-weight:600;color:#64748b;margin:0;">CRP ${crp} — Registro ativo no Conselho Regional de Psicologia de Goiás</h3>
      </div>
      <div style="background:white;padding:1.25rem 1.5rem;border-radius:8px;border:1px solid #fef08a;display:flex;align-items:center;gap:1rem;">
        <div style="font-size:2rem;">🌀</div>
        <h3 style="font-size:0.9rem;font-weight:600;color:#64748b;margin:0;">Especial. Hipnose Ericksoniana — Milton H. Erickson Foundation (EUA)</h3>
      </div>
      <div style="background:white;padding:1.25rem 1.5rem;border-radius:8px;border:1px solid #fef08a;display:flex;align-items:center;gap:1rem;">
        <div style="font-size:2rem;">⭐</div>
        <h3 style="font-size:0.9rem;font-weight:600;color:#64748b;margin:0;">Avaliações Google Meu Negócio verificadas (conforme diretrizes CFP)</h3>
      </div>
    </div>
  </div>
</section>
<style>
  @media(min-width:768px){ [data-bloco="social"] .social-grid{ grid-template-columns:repeat(2,1fr)!important; } }
</style>`,

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⑧ FAQ — SEMPRE H2 (metodologia Abidos: regra obrigatória!)
//    HTML5 <details>/<summary>: sem JS customizado
//    Compatível com Widget HTML do Elementor (não Editor de Texto)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
'faq': `
<section data-bloco="faq" style="padding:3rem 1.5rem;background:linear-gradient(135deg,#f5f7fa 0%,#e9ecf1 100%);">
  <div style="max-width:900px;margin:0 auto;">
    <h2 style="font-size:clamp(1.5rem,4vw,2.25rem);font-weight:700;text-align:center;color:#1e293b;margin:0 0 1rem 0;">
      Perguntas Frequentes sobre Psicologia e TEA Adulto em Goiânia
    </h2>
    <p style="text-align:center;color:#64748b;font-size:1rem;margin:0 0 2rem 0;">
      Esclareça suas dúvidas sobre sigilo, processo e metodologia.
    </p>

    <!-- Accordion HTML5 nativo: <details>/<summary> sem JavaScript extra -->
    <details style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:1.25rem 1.5rem;margin-bottom:0.75rem;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
      <summary style="cursor:pointer;font-weight:600;color:#1e293b;font-size:1rem;user-select:none;list-style:none;">
        ▶ O atendimento psicológico em Goiânia é sigiloso?
      </summary>
      <p style="color:#64748b;line-height:1.7;margin:1rem 0 0 0;">
        Sim. O sigilo profissional é garantido pelo Código de Ética do CFP (art. 9º). Nenhuma informação será compartilhada sem autorização expressa. Exceções legais: risco à vida.
      </p>
    </details>

    <details style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:1.25rem 1.5rem;margin-bottom:0.75rem;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
      <summary style="cursor:pointer;font-weight:600;color:#1e293b;font-size:1rem;user-select:none;list-style:none;">
        ▶ Quanto tempo dura a avaliação de TEA em Adultos?
      </summary>
      <p style="color:#64748b;line-height:1.7;margin:1rem 0 0 0;">
        O processo varia de 3 a 6 sessões. Utilizamos instrumentos validados internacionalmente: ADOS-2, ADI-R e Escala AQ validada em PT-BR pelo próprio profissional (UFU).
      </p>
    </details>

    <details style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:1.25rem 1.5rem;margin-bottom:0.75rem;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
      <summary style="cursor:pointer;font-weight:600;color:#1e293b;font-size:1rem;user-select:none;list-style:none;">
        ▶ A hipnose clínica funciona para ansiedade e TEA?
      </summary>
      <p style="color:#64748b;line-height:1.7;margin:1rem 0 0 0;">
        Sim. Reconhecida pelo CFP (Resolução 013/2000). A Hipnose Ericksoniana é especialmente gentil e adaptável. Eficaz para ansiedade, fobias, compulsões e regulação emocional em neurodivergentes.
      </p>
    </details>

    <details style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:1.25rem 1.5rem;margin-bottom:0.75rem;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
      <summary style="cursor:pointer;font-weight:600;color:#1e293b;font-size:1rem;user-select:none;list-style:none;">
        ▶ O psicólogo atende plano de saúde?
      </summary>
      <p style="color:#64748b;line-height:1.7;margin:1rem 0 0 0;">
        No momento atendo apenas de forma particular. Consulte valores e pacotes de sessões pelo WhatsApp.
      </p>
    </details>

    <details style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:1.25rem 1.5rem;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
      <summary style="cursor:pointer;font-weight:600;color:#1e293b;font-size:1rem;user-select:none;list-style:none;">
        ▶ Como funciona o atendimento online?
      </summary>
      <p style="color:#64748b;line-height:1.7;margin:1rem 0 0 0;">
        Sessões por videochamada segura (Zoom ou Google Meet). Privacidade pelo mesmo rigor das sessões presenciais. Atenda de casa em local confortável.
      </p>
    </details>

  </div>
</section>
<style>
  [data-bloco="faq"] details[open] summary{ color:#6366f1; }
  [data-bloco="faq"] details[open]{ background:#f9fafb; }
  [data-bloco="faq"] details summary::-webkit-details-marker{ margin-right:0.5rem; }
</style>`,

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⑨ LINKAGEM INTERNA (Silos)
//    H2: distribui Link Equity entre silos
//    H3: nome de cada silo (micro-intenção)
//    ➜ URLs SEMPRE com www.hipnolawrence.com (regra absoluta)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
'linkagem': `
<section data-bloco="silos" style="padding:3rem 1.5rem;background:#ffffff;">
  <div style="max-width:1200px;margin:0 auto;">
    <h2 style="font-size:clamp(1.5rem,4vw,2.25rem);font-weight:700;text-align:center;color:#1e293b;margin:0 0 1rem 0;">
      Explore Outros Serviços Especializados em Goiânia
    </h2>
    <p style="text-align:center;color:#64748b;font-size:1rem;max-width:680px;margin:0 auto 2.5rem;line-height:1.7;">
      Cada página foi desenvolvida para orientá-lo completamente sobre o tratamento específico.
    </p>
    <div class="silos-grid" style="display:grid;grid-template-columns:1fr;gap:1.5rem;">

      <!-- Silos: href SEMPRE com www.hipnolawrence.com -->
      <a href="https://www.hipnolawrence.com/terapia-para-ansiedade-em-goiania/"
         style="display:block;text-decoration:none;background:white;border:2px solid #e2e8f0;padding:1.5rem;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.05);transition:border-color .2s,box-shadow .2s;"
         onmouseover="this.style.borderColor='#6366f1';this.style.boxShadow='0 4px 16px rgba(99,102,241,.2)'"
         onmouseout="this.style.borderColor='#e2e8f0';this.style.boxShadow='0 2px 8px rgba(0,0,0,.05)'">
        <h3 style="font-size:1.125rem;font-weight:600;color:#1e293b;margin:0 0 0.5rem 0;">🧘 Terapia para Ansiedade em Goiânia</h3>
        <p style="color:#64748b;line-height:1.6;margin:0;">Tratamento especializado para ansiedade, pânico e hiperativação com base científica.</p>
      </a>

      <a href="https://www.hipnolawrence.com/hipnose-clinica-goiania/"
         style="display:block;text-decoration:none;background:white;border:2px solid #e2e8f0;padding:1.5rem;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.05);transition:border-color .2s,box-shadow .2s;"
         onmouseover="this.style.borderColor='#0ea5e9';this.style.boxShadow='0 4px 16px rgba(14,165,233,.2)'"
         onmouseout="this.style.borderColor='#e2e8f0';this.style.boxShadow='0 2px 8px rgba(0,0,0,.05)'">
        <h3 style="font-size:1.125rem;font-weight:600;color:#1e293b;margin:0 0 0.5rem 0;">🌀 Hipnose Clínica Ericksoniana</h3>
        <p style="color:#64748b;line-height:1.6;margin:0;">Metodologia para traumas, bloqueios emocionais e reprogramação do inconsciente.</p>
      </a>

      <a href="https://www.hipnolawrence.com/diagnostico-tea-adulto-goiania/"
         style="display:block;text-decoration:none;background:white;border:2px solid #e2e8f0;padding:1.5rem;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.05);transition:border-color .2s,box-shadow .2s;"
         onmouseover="this.style.borderColor='#16a34a';this.style.boxShadow='0 4px 16px rgba(22,163,74,.2)'"
         onmouseout="this.style.borderColor='#e2e8f0';this.style.boxShadow='0 2px 8px rgba(0,0,0,.05)'">
        <h3 style="font-size:1.125rem;font-weight:600;color:#1e293b;margin:0 0 0.5rem 0;">🧠 Diagnóstico TEA em Adultos</h3>
        <p style="color:#64748b;line-height:1.6;margin:0;">Avaliação com escala validada em pesquisa. Laudo técnico reconhecido.</p>
      </a>

      <!-- Página Inicial — SEMPRE www.hipnolawrence.com com www -->
      <a href="https://www.hipnolawrence.com"
         style="display:block;text-decoration:none;background:#1e293b;border:2px solid #334155;padding:1.5rem;border-radius:10px;text-align:center;transition:background .2s;"
         onmouseover="this.style.background='#334155'"
         onmouseout="this.style.background='#1e293b'">
        <h3 style="font-size:1.125rem;font-weight:700;color:white;margin:0;">🏠 Início — www.hipnolawrence.com</h3>
      </a>

    </div>
  </div>
</section>
<style>
  @media(min-width:768px){ [data-bloco="silos"] .silos-grid{ grid-template-columns:repeat(2,1fr)!important; } }
</style>`,

        }; // end map

        return map[id] || null;
    }, // end get()

    /**
     * Retorna a lista de blocos disponíveis para o menu de inserção.
     */
    getList() {
        return [
            { id: 'hero', label: '🥇 Hero Completo', group: '① HERO' },
            { id: 'h1', label: 'H1 Título', group: '① HERO' },
            { id: 'subtitulo', label: '📝 Subtítulo', group: '① HERO' },
            { id: 'cta', label: '📲 CTA + WhatsApp', group: '① HERO' },
            { id: 'dor', label: '💔 Identificação da Dor', group: '② JORNADA' },
            { id: 'beneficios', label: '✅ Benefícios', group: '② JORNADA' },
            { id: 'objections', label: '🛡 Objeções', group: '② JORNADA' },
            { id: 'autoridade', label: '🏅 Especialista', group: '③ E-E-A-T' },
            { id: 'ambiente', label: '🏡 Ambiente', group: '③ E-E-A-T' },
            { id: 'social', label: '⭐ Prova Social', group: '③ E-E-A-T' },
            { id: 'faq', label: '❓ FAQ', group: '④ RETENÇÃO' },
            { id: 'linkagem', label: '🔗 Linkagem', group: '④ RETENÇÃO' },
        ];
    },

}; // end AbidosBlocks

/**
 * 🌳 MenuMapper - Motor de Renderização de Navegação Dinâmica
 * Transforma o JSON de menus nos designs específicos de cada template.
 */
window.MenuMapper = {
    async generate(menuId, templateId, pageContent = {}, pageTheme = '') {
        if (!menuId) return { html: '', schema: '' };

        try {
            const res = await fetch('/api/menus');
            const menus = await res.json();
            const menu = menus.find(m => m.id === menuId);
            if (!menu) return { html: '', schema: '' };

            const slug = pageContent.slug || 'pagina-gerada';
            const title = pageContent.SEO_TITLE || '';
            const currentPath = slug.startsWith('/') ? slug : `/${slug}`;

            const processUrl = (url) => {
                let finalUrl = url.replace('{{slug}}', slug);
                if (finalUrl.includes('wa.me') || finalUrl.includes('api.whatsapp.com')) {
                    const msg = encodeURIComponent(`\n\n(Vim da página: ${title || slug})`);
                    finalUrl += (finalUrl.includes('?') ? '&' : '?') + 'text=' + msg;
                }
                return finalUrl;
            };

            const filterItems = (items) => items.filter(i => i.status !== 'draft').map(i => ({
                ...i,
                active: processUrl(i.url) === currentPath,
                children: i.children ? filterItems(i.children) : []
            }));

            const validItems = filterItems(menu.items || []);
            let html = '';

            // --- RENDERIZAÇÃO POR DESIGN SYSTEM (Sincronizado com server.js) ---
            if (templateId === '01' || templateId === '08') {
                const isEthereal = templateId === '08';
                const accent = isEthereal ? 'text-aura-indigo' : 'text-cyan-400';
                html += `<nav class="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-fit px-4 animate-fade-in-up"><div class="glass-panel rounded-full px-2 py-2 flex items-center gap-2 sm:gap-6 shadow-2xl">`;
                if (isEthereal) {
                    html += `<div class="relative w-10 h-10 flex items-center justify-center shrink-0 bg-white/50 rounded-full"><svg class="absolute inset-0 w-10 h-10" viewBox="0 0 100 100"><circle class="text-slate-200/50 stroke-current" stroke-width="6" cx="50" cy="50" r="44" fill="transparent"></circle><circle id="navProgressCircle" class="${accent} progress-ring stroke-current" stroke-width="6" stroke-linecap="round" cx="50" cy="50" r="44" fill="transparent" stroke-dasharray="276.46" stroke-dashoffset="276.46"></circle></svg><i data-lucide="sparkles" class="w-4 h-4 text-slate-700 absolute"></i></div>`;
                } else {
                    html += `<div class="w-10 h-10 bg-black/20 rounded-full flex items-center justify-center"><i data-lucide="brain" class="w-5 h-5 ${accent}"></i></div>`;
                }
                html += `<ul class="hidden md:flex items-center gap-6 pr-4 border-r border-white/10 ml-2">`;
                validItems.forEach(item => {
                    const active = item.active ? 'text-white font-bold' : 'text-slate-400 hover:text-white';
                    html += `<li class="relative group"><a href="${processUrl(item.url)}" class="text-xs uppercase tracking-widest transition-all ${active}">${item.label}</a>`;
                    if (item.children.length > 0) {
                        html += `<ul class="absolute top-full left-0 mt-4 w-48 glass-panel rounded-2xl p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all flex flex-col gap-2">`;
                        item.children.forEach(s => html += `<li><a href="${processUrl(s.url)}" class="text-[10px] uppercase text-slate-400 hover:text-white block px-2 py-1">${s.label}</a></li>`);
                        html += `</ul>`;
                    }
                    html += `</li>`;
                });
                html += `</ul><button onclick="openBooking()" class="bg-slate-900 text-white text-[10px] uppercase font-bold tracking-tighter px-6 py-2.5 rounded-full hover:bg-black transition-all">Agendar Consultoria</button></div></nav>`;
            } else if (['02', '03', '07'].includes(templateId)) {
                const isVintage = templateId === '07';
                const bg = isVintage ? 'bg-[#fcf8f1]' : 'bg-white/95';
                html += `<nav class="w-full ${bg} border-b border-slate-200 sticky top-0 z-50 px-6 py-4 backdrop-blur-md"><div class="max-w-7xl mx-auto flex items-center justify-between"><a href="/" class="font-serif italic text-2xl text-slate-900 tracking-tighter">NeuroEngine<span class="text-[#14b8a6]">.</span></a><div class="flex gap-8 items-center">`;
                validItems.forEach(item => {
                    const active = item.active ? 'text-slate-900 border-b-2 border-[#14b8a6]' : 'text-slate-500 hover:text-slate-900';
                    html += `<div class="group relative py-2"><a href="${processUrl(item.url)}" class="text-xs uppercase font-bold tracking-[0.2em] transition-all ${active}">${item.label}</a>`;
                    if (item.children.length > 0) {
                        html += `<div class="absolute top-full left-0 pt-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all"><div class="bg-white border border-slate-100 shadow-2xl rounded p-4 w-56 flex flex-col gap-3">`;
                        item.children.forEach(s => html += `<a href="${processUrl(s.url)}" class="text-xs text-slate-500 hover:text-[#14b8a6] pb-2 border-b border-slate-50 last:border-0">${s.label}</a>`);
                        html += `</div></div>`;
                    }
                    html += `</div>`;
                });
                html += `<button onclick="openBooking()" class="hidden lg:block bg-slate-900 text-white px-6 py-2 text-xs font-bold uppercase tracking-widest rounded hover:bg-[#14b8a6] transition-all">Contato</button></div></div></nav>`;
            } else if (templateId === '09') {
                html += `<nav class="fixed w-full top-0 z-40 transition-all duration-500 bg-midnight-950/20 backdrop-blur-sm hover:bg-midnight-950/80 border-b border-white/5" id="navbar"><div class="max-w-7xl mx-auto px-6 lg:px-12 h-24 flex items-center justify-between"><div class="font-serif italic text-2xl tracking-wider text-bone-50">L<span class="text-gold-500">.</span> System</div><ul class="hidden lg:flex gap-10 items-center">`;
                validItems.forEach(item => html += `<li><a href="${processUrl(item.url)}" class="text-[10px] uppercase tracking-[0.3em] font-medium transition-colors ${item.active ? 'text-gold-500' : 'text-bone-200/60 hover:text-gold-500'}">${item.label}</a></li>`);
                html += `</ul><button onclick="openBooking()" class="text-[10px] uppercase tracking-[0.2em] font-medium text-bone-100 hover:text-gold-500 transition-colors flex items-center gap-3 group border border-bone-100/20 hover:border-gold-500/50 px-6 py-3 rounded-full backdrop-blur-sm">Agendar Reserva <div class="w-1 h-1 rounded-full bg-gold-500 group-hover:scale-150 transition-transform"></div></button></div></nav>`;
            } else if (['10', '04', '05'].includes(templateId)) {
                html += `<nav class="fixed top-0 w-full z-50 p-6 flex flex-col gap-4 hide-on-focus transition-opacity duration-500"><div class="max-w-7xl mx-auto w-full glass-card rounded-2xl px-6 py-4 flex items-center justify-between shadow-2xl backdrop-blur-xl border border-white/5"><div class="flex items-center gap-3"><div class="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white"><i data-lucide="zap" class="w-5 h-5"></i></div><span class="font-bold text-white tracking-tighter">TECH::FOCUS</span></div><div class="flex items-center gap-8">`;
                validItems.forEach(item => html += `<a href="${processUrl(item.url)}" class="text-xs uppercase tracking-widest transition-colors ${item.active ? 'text-orange-500 font-bold' : 'text-mist/40 hover:text-white'}">${item.label}</a>`);
                html += `<button onclick="openBooking()" class="bg-white text-black font-bold text-[10px] px-6 py-2.5 rounded-xl hover:bg-orange-500 hover:text-white transition-all">CONSULTA</button></div></div></nav>`;
            } else {
                html += `<header class="fixed top-0 w-full z-50 py-4 px-6 flex justify-between items-center bg-white/80 backdrop-blur-lg border-b border-slate-100"><div class="font-extrabold text-xl tracking-tight text-indigo-600">CLINIC<span class="text-slate-900">OS</span></div><div class="hidden md:flex gap-8 text-[11px] font-bold uppercase tracking-widest text-slate-500">`;
                validItems.forEach(item => html += `<a href="${processUrl(item.url)}" class="transition-colors ${item.active ? 'text-indigo-600' : 'hover:text-indigo-600'}">${item.label}</a>`);
                html += `</div><button onclick="openBooking()" class="bg-indigo-600 text-white px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-indigo-200">Agendar Agora</button></header>`;
            }

            const schema = `<script type="application/ld+json">\n${JSON.stringify({
                "@context": "https://schema.org",
                "@type": "SiteNavigationElement",
                "name": validItems.map(i => i.label),
                "url": validItems.map(i => processUrl(i.url))
            }, null, 2)}\n</script>`;

            return { html, schema };

        } catch (e) {
            console.error("❌ Erro no MenuMapper:", e);
            return { html: '', schema: '' };
        }
    }
};
