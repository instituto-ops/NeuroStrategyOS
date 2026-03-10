/**
 * NeuroEngine Copilot - Core Logic
 * Handles Chat, AI Studio, WP Integration and Method Abidos analysis.
 */

window.chatApp = {
    currentItemId: null,
    currentType: null,
    selectedElement: null,
    // [NOVO] Dados de Autoridade do Dr. Victor Lawrence (E-E-A-T)
    authorityContext: {
        name: "Victor Lawrence Bernardes Santana",
        crp: "09/012681",
        title: "Mestrando em Ciências da Saúde (UFU)",
        institution: "Instituto Lawrence de Hipnose Clínica",
        socials: {
            instagram: "https://www.instagram.com/hipnolawrence",
            doctoralia: "https://www.doctoralia.com.br/victor-lawrence-bernardes-santana/psicologo-terapeuta-complementar/goiania",
            whatsapp: "62 98217-1845"
        }
    },
    mediaGallery: [], // Cache de mídias para a IA
    historyStack: [],  // Undo history
    redoStack: [],     // Redo history

    init() {
        this.setupEventListeners();
        this.setupInspector();
        this.setupKeyboardShortcuts();
        console.log("🧠 NeuroEngine Copilot Initialized");
    },

    // --- HISTORY (Undo / Redo) ---
    saveHistory() {
        const preview = document.getElementById('live-preview');
        this.historyStack.push(preview.innerHTML);
        this.redoStack = []; // clear redo on new change
        if (this.historyStack.length > 50) this.historyStack.shift();
    },

    undoHistory() {
        const preview = document.getElementById('live-preview');
        if (this.historyStack.length === 0) {
            this.addMessage("↩️ Nada para desfazer.", false);
            return;
        }
        this.redoStack.push(preview.innerHTML);
        preview.innerHTML = this.historyStack.pop();
        this.addMessage("↩️ Desfeito.", false);
    },

    redoHistory() {
        const preview = document.getElementById('live-preview');
        if (this.redoStack.length === 0) {
            this.addMessage("↪️ Nada para refazer.", false);
            return;
        }
        this.historyStack.push(preview.innerHTML);
        preview.innerHTML = this.redoStack.pop();
        this.addMessage("↪️ Refeito.", false);
    },

    // --- DELETE SELECTED ---
    deleteSelected() {
        if (!this.selectedElement) {
            this.addMessage("🗑️ Clique em um elemento no Preview para selecioná-lo antes de deletar.", false);
            return;
        }
        if (!confirm(`Deletar elemento <${this.selectedElement.tagName.toLowerCase()}>?`)) return;
        this.saveHistory();
        this.selectedElement.remove();
        this.selectedElement = null;
        this.hideMicroCommandsMenu();
        this.addMessage("🗑️ Elemento deletado. Use ↩️ Desfazer se necessário.", false);
    },

    // --- KEYBOARD SHORTCUTS ---
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'z') { e.preventDefault(); this.undoHistory(); }
            if (e.ctrlKey && e.key === 'y') { e.preventDefault(); this.redoHistory(); }
            if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedElement && document.activeElement.tagName !== 'TEXTAREA' && document.activeElement.tagName !== 'INPUT') {
                e.preventDefault();
                this.deleteSelected();
            }
        });
    },

    // --- JACKAL PANEL TOGGLE ---
    toggleJackal() {
        const panel = document.getElementById('jackal-panel');
        const buttons = document.getElementById('jackal-buttons');
        const isOpen = buttons.style.display === 'flex';
        if (isOpen) {
            buttons.style.display = 'none';
            panel.style.width = '40px';
        } else {
            buttons.style.display = 'flex';
            panel.style.width = '110px';
        }
    },

    // --- ABIDOS BLOCK INSERTER ---
    insertAbidosBlock(blockType) {
        const preview = document.getElementById('live-preview');
        if (preview.style.display === 'none') {
            preview.style.display = 'block';
            const welcome = document.getElementById('blueprint-welcome');
            if (welcome) welcome.style.display = 'none';
        }
        this.saveHistory();

        const whatsapp = `https://wa.me/5562982171845`;
        const crp = this.authorityContext.crp;
        const name = this.authorityContext.name;

        const blocks = {
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // ① HERO — PRIMEIRA DOBRA
            // ⚠️ REGRA: H1 é ÚNICO por página. SE colando no WordPress/Elementor,
            // o título do post (gerado pelo Astra) JÁ É o H1 do tema.
            // Nesse caso, SUBSTITUA o <h1> abaixo por <h2>.
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            'h1': `<header class="abidos-hero" style="padding:60px 20px; background:linear-gradient(135deg,#f0f9ff,#e0f2fe); text-align:center; border-bottom:3px solid #0ea5e9;">
  <!-- H1: ÚNICO por página. Keyword Primária + Promessa + Localização -->
  <h1 style="font-size:clamp(24px,4vw,42px); color:#0c4a6e; margin:0 0 15px 0; line-height:1.2;">Psicólogo Especialista em TEA Adulto em Goiânia: Diagnóstico e Suporte para Quem Sempre Se Sentiu Diferente</h1>
</header>`,

            'subtitulo': `<div style="padding:30px 20px; text-align:center; background:#f8fafc; max-width:700px; margin:0 auto;">
  <!-- Parágrafo de apoio ao H1: modalidades + diferenciais -->
  <p style="font-size:18px; color:#475569; line-height:1.7;">Atendimento presencial em Goiânia e online para todo o Brasil. Ambiente sigiloso e acolhedor, conduzido por psicólogo CRP ${crp}.</p>
</div>`,

            'cta': `<div style="text-align:center; padding:30px 20px; background:#f0fdf4;">
  <!-- CTA Primário: botão focado no benefício -->
  <a href="${whatsapp}" target="_blank" style="display:inline-block; background:#16a34a; color:white; padding:16px 32px; border-radius:50px; font-size:18px; font-weight:bold; text-decoration:none; box-shadow:0 4px 15px rgba(22,163,74,0.4);">📱 Toque aqui para falar comigo</a>
  <p style="color:#64748b; font-size:12px; margin-top:10px;">Resposta em até 24h • Sem compromisso</p>
</div>
<!-- Botão flutuante WhatsApp (onipresente, Mobile-First) -->
<a href="${whatsapp}" target="_blank" aria-label="Falar pelo WhatsApp" style="position:fixed; bottom:20px; right:20px; background:#16a34a; color:white; width:56px; height:56px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:28px; text-decoration:none; z-index:9999; box-shadow:0 4px 15px rgba(0,0,0,0.2);">💬</a>`,

            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // ② CORPO / JORNADA
            // H2 = Seção estratégica / silo semântico
            // H3 = Subtítulo dentro do H2 (detalhe de serviço ou objeção)
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            'dor': `<section style="padding:50px 20px; background:#fff1f2; border-top:3px solid #f43f5e;">
  <div style="max-width:700px; margin:0 auto; text-align:center;">
    <!-- H2: Pergunta retórica para conexão emocional / identificação da dor -->
    <h2 style="color:#9f1239; font-size:clamp(20px,3vw,28px);">Sente que a exaustão emocional está travando sua vida?</h2>
    <p style="color:#64748b; font-size:16px; line-height:1.8; margin-top:15px;">Você se esforça muito mais do que os outros só para parecer "normal". Sente um cansaço profundo que ninguém ao redor consegue entender.</p>
    <div style="display:flex; justify-content:center; gap:20px; margin-top:30px; flex-wrap:wrap;">
      <!-- H3: Ícones + micro-identificadores de dor -->
      <div style="background:white; padding:15px 20px; border-radius:8px; border-left:4px solid #f43f5e; max-width:200px; text-align:left;"><span style="font-size:24px;">😰</span><h3 style="font-size:13px; color:#64748b; margin:5px 0 0 0; font-weight:normal;">Ansiedade social e sobrecarga sensorial</h3></div>
      <div style="background:white; padding:15px 20px; border-radius:8px; border-left:4px solid #f43f5e; max-width:200px; text-align:left;"><span style="font-size:24px;">🎭</span><h3 style="font-size:13px; color:#64748b; margin:5px 0 0 0; font-weight:normal;">Mascaramento (Masking) exaustivo</h3></div>
      <div style="background:white; padding:15px 20px; border-radius:8px; border-left:4px solid #f43f5e; max-width:200px; text-align:left;"><span style="font-size:24px;">🔍</span><h3 style="font-size:13px; color:#64748b; margin:5px 0 0 0; font-weight:normal;">Dúvida: "Será que sou autista?"</h3></div>
    </div>
  </div>
</section>`,

            'beneficios': `<section style="padding:50px 20px; background:#f8fafc;">
  <div style="max-width:800px; margin:0 auto;">
    <!-- H2: Introdução dos serviços / silos semânticos -->
    <h2 style="text-align:center; color:#1e293b; font-size:clamp(20px,3vw,28px);">Como a Psicologia Especializada em Goiânia Pode te Ajudar</h2>
    <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:20px; margin-top:30px;">
      <!-- H3: Detalhamento de cada serviço (micro-intenção) -->
      <div style="background:white; padding:25px; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.06);"><div style="font-size:30px; margin-bottom:10px;">🧠</div><h3 style="font-size:16px; color:#1e293b; margin:0 0 8px 0;">Avaliação Diagnóstica de TEA em Adultos em Goiânia</h3><p style="font-size:13px; color:#64748b; margin:0;">Processo criterioso, humanizado e baseado em instrumentos validados internacionalmente.</p></div>
      <div style="background:white; padding:25px; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.06);"><div style="font-size:30px; margin-bottom:10px;">🌀</div><h3 style="font-size:16px; color:#1e293b; margin:0 0 8px 0;">Hipnose Clínica Ericksoniana para Ansiedade</h3><p style="font-size:13px; color:#64748b; margin:0;">Técnica reconhecida pelo CFP (Res. 013/2000) para ansiedade, compulsões e fobias.</p></div>
      <div style="background:white; padding:25px; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.06);"><div style="font-size:30px; margin-bottom:10px;">💬</div><h3 style="font-size:16px; color:#1e293b; margin:0 0 8px 0;">Psicoterapia Online — Todo o Brasil</h3><p style="font-size:13px; color:#64748b; margin:0;">Atendimento seguro, sigiloso e com a mesma qualidade do presencial.</p></div>
    </div>
  </div>
</section>`,

            'objections': `<section style="padding:40px 20px; background:#fffbe8; border-top:1px solid #fef08a;">
  <div style="max-width:700px; margin:0 auto;">
    <!-- H2: Quebra de objeções (sub-silo dentro de Benefícios) -->
    <h2 style="color:#854d0e; font-size:clamp(18px,2.5vw,22px);">Ainda tem dúvidas? Veja o que nossos pacientes precisavam saber antes de agendar</h2>
    <ul style="list-style:none; padding:0; margin:15px 0 0 0; display:flex; flex-direction:column; gap:12px;">
      <!-- H3: Prova de cada objeção específica -->
      <li style="background:white; padding:12px 15px; border-radius:8px; border-left:3px solid #eab308;"><h3 style="font-size:14px; color:#64748b; margin:0; font-weight:normal;">✅ <strong>Sigilo garantido</strong> — Protegido pelo Código de Ética do CFP (art. 9º).</h3></li>
      <li style="background:white; padding:12px 15px; border-radius:8px; border-left:3px solid #eab308;"><h3 style="font-size:14px; color:#64748b; margin:0; font-weight:normal;">✅ <strong>Sem julgamentos</strong> — Um ambiente seguro para você ser quem é.</h3></li>
      <li style="background:white; padding:12px 15px; border-radius:8px; border-left:3px solid #eab308;"><h3 style="font-size:14px; color:#64748b; margin:0; font-weight:normal;">✅ <strong>Primeira sessão de alinhamento</strong> — Para avaliar juntos o melhor caminho.</h3></li>
    </ul>
  </div>
</section>`,

            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // ③ AUTORIDADE / E-E-A-T
            // H2 = seção de autoridade / transparência
            // H3 = credenciais, detalhes do especialista
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            'autoridade': `<section style="padding:50px 20px; background:#eef2ff; border-top:3px solid #6366f1;">
  <div style="max-width:700px; margin:0 auto; display:flex; gap:30px; align-items:center; flex-wrap:wrap;">
    <div style="width:120px; height:120px; border-radius:50%; background:#cbd5e1; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:40px;">👨‍⚕️</div>
    <div style="flex:1;">
      <!-- H2: Humanização + Autoridade (E-E-A-T) -->
      <h2 style="color:#312e81; font-size:clamp(18px,2.5vw,24px); margin:0 0 5px 0;">Conheça ${name}, seu Psicólogo Especialista em Goiânia</h2>
      <!-- H3: Credenciais e registro (sinal de E-E-A-T para o Google) -->
      <h3 style="color:#4338ca; font-size:14px; margin:0 0 12px 0; font-weight:600;">Psicólogo CRP ${crp} • Mestrando em Ciências da Saúde (UFU) • Instituto Lawrence de Hipnose Clínica</h3>
      <p style="color:#475569; font-size:14px; line-height:1.7; margin:0;">Especialista em Avaliação e Diagnóstico de TEA em Adultos e Hipnose Clínica Ericksoniana. Mais de 5 anos dedicados ao cuidado de adultos que sempre sentiram que eram "diferentes".</p>
    </div>
  </div>
</section>`,

            'ambiente': `<section style="padding:50px 20px; background:#f8fafc;">
  <div style="max-width:800px; margin:0 auto; text-align:center;">
    <!-- H2: Transparência do consultório — elimina medo do desconhecido -->
    <h2 style="color:#1e293b; font-size:clamp(18px,2.5vw,24px);">Um Ambiente Seguro e Preparado para Você em Goiânia</h2>
    <p style="color:#64748b; font-size:14px; margin:10px 0 25px 0;">Consultório pensado para conforto sensorial e privacidade total.</p>
    <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:15px;">
      <!-- Substitua pelos arquivos reais: consultorio-goiania-01.jpg, etc. -->
      <div style="background:#e2e8f0; height:180px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:40px;">🏠</div>
      <div style="background:#e2e8f0; height:180px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:40px;">🛋️</div>
      <div style="background:#e2e8f0; height:180px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:40px;">🌿</div>
    </div>
    <p style="font-size:11px; color:#94a3b8; margin-top:10px;">📸 Troque os ícones por fotos do consultório. Nome do arquivo: consultorio-psicologo-goiania-01.jpg</p>
  </div>
</section>`,

            'social': `<section style="padding:50px 20px; background:#fffbe8; border-top:3px solid #eab308;">
  <div style="max-width:700px; margin:0 auto; text-align:center;">
    <!-- H2: Prova Social / Certificações (em nichos regulamentados: currículo e ciência) -->
    <h2 style="color:#854d0e; font-size:clamp(18px,2.5vw,24px);">Formação e Reconhecimento Técnico do Dr. ${name}</h2>
    <p style="color:#92400e; font-size:13px; margin-bottom:25px;">Em saúde mental, a prova de qualidade é o currículo, as certificações e a ciência.</p>
    <div style="display:flex; justify-content:center; gap:20px; flex-wrap:wrap;">
      <!-- H3: Cada certificação / credencial -->
      <div style="background:white; padding:15px 20px; border-radius:8px; border:1px solid #fef08a; min-width:140px;"><div style="font-size:28px;">🎓</div><h3 style="font-size:12px; color:#64748b; margin:5px 0 0 0; font-weight:600;">Mestrando UFU — Ciências da Saúde</h3></div>
      <div style="background:white; padding:15px 20px; border-radius:8px; border:1px solid #fef08a; min-width:140px;"><div style="font-size:28px;">📋</div><h3 style="font-size:12px; color:#64748b; margin:5px 0 0 0; font-weight:600;">CRP ${crp} — Psicólogo Registrado</h3></div>
      <div style="background:white; padding:15px 20px; border-radius:8px; border:1px solid #fef08a; min-width:140px;"><div style="font-size:28px;">⭐</div><h3 style="font-size:12px; color:#64748b; margin:5px 0 0 0; font-weight:600;">Avaliações Google Meu Negócio</h3></div>
    </div>
  </div>
</section>`,

            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // ④ RETENÇÃO / RODAPÉ
            // FAQ: SEMPRE H2 (obrigatório pelo Método Abidos)
            // Linkagem: SEMPRE www.hipnolawrence.com como página raiz
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            'faq': `<section style="padding:50px 20px; background:#f8fafc;">
  <div style="max-width:700px; margin:0 auto;">
    <!-- H2: FAQ (OBRIGATÓRIO ser H2 — nunca H3 ou H4) -->
    <h2 style="text-align:center; color:#1e293b; font-size:clamp(18px,2.5vw,24px);">Perguntas Frequentes sobre Psicologia e TEA Adulto em Goiânia</h2>
    <!-- Accordion nativo HTML5 (<details>/<summary>) — compatível com Elementor sem JavaScript customizado -->
    <div style="margin-top:25px; display:flex; flex-direction:column; gap:10px;">
      <details style="background:white; padding:15px 20px; border-radius:8px; border:1px solid #e2e8f0; cursor:pointer;"><summary style="font-weight:bold; color:#334155; font-size:14px;">O atendimento psicológico em Goiânia é sigiloso?</summary><p style="color:#64748b; font-size:13px; margin:10px 0 0 0; line-height:1.7;">Sim. O sigilo profissional é garantido pelo Código de Ética do CFP (art. 9º). Nenhuma informação sua será compartilhada sem autorização expressa.</p></details>
      <details style="background:white; padding:15px 20px; border-radius:8px; border:1px solid #e2e8f0; cursor:pointer;"><summary style="font-weight:bold; color:#334155; font-size:14px;">Quanto tempo dura a avaliação de TEA Adulto?</summary><p style="color:#64748b; font-size:13px; margin:10px 0 0 0; line-height:1.7;">O processo varia de 3 a 6 sessões, dependendo do caso. Utilizamos instrumentos validados internacionalmente pelo protocolo ADOS-2 e ADI-R.</p></details>
      <details style="background:white; padding:15px 20px; border-radius:8px; border:1px solid #e2e8f0; cursor:pointer;"><summary style="font-weight:bold; color:#334155; font-size:14px;">A hipnose clínica funciona para ansiedade?</summary><p style="color:#64748b; font-size:13px; margin:10px 0 0 0; line-height:1.7;">Sim. A Hipnose Clínica Ericksoniana é reconhecida pelo CFP (Resolução 013/2000) e tem eficácia comprovada em ansiedade, fobias e compulsões.</p></details>
      <details style="background:white; padding:15px 20px; border-radius:8px; border:1px solid #e2e8f0; cursor:pointer;"><summary style="font-weight:bold; color:#334155; font-size:14px;">O psicólogo atende plano de saúde?</summary><p style="color:#64748b; font-size:13px; margin:10px 0 0 0; line-height:1.7;">No momento atendo apenas de forma particular. Consulte valores e condições pelo WhatsApp.</p></details>
    </div>
  </div>
</section>`,

            'linkagem': `<section style="padding:40px 20px; background:#1e293b;">
  <div style="max-width:700px; margin:0 auto; text-align:center;">
    <!-- Linkagem interna estratégica (Silo) — distribui autoridade pelo site -->
    <p style="color:#94a3b8; font-size:13px; margin:0 0 20px 0; text-transform:uppercase; letter-spacing:1px;">Veja também</p>
    <div style="display:flex; justify-content:center; gap:15px; flex-wrap:wrap;">
      <a href="https://www.hipnolawrence.com/psicologia-goiania" style="background:#334155; color:#e2e8f0; padding:10px 20px; border-radius:8px; text-decoration:none; font-size:13px;">🧠 Psicologia em Goiânia</a>
      <a href="https://www.hipnolawrence.com/hipnose-clinica-goiania" style="background:#334155; color:#e2e8f0; padding:10px 20px; border-radius:8px; text-decoration:none; font-size:13px;">🌀 Hipnose Clínica</a>
      <!-- Link para a Página Inicial — SEMPRE www.hipnolawrence.com -->
      <a href="https://www.hipnolawrence.com" style="background:#0ea5e9; color:white; padding:10px 20px; border-radius:8px; text-decoration:none; font-size:13px; font-weight:bold;">🏠 Início — hipnolawrence.com</a>
    </div>
  </div>
</section>`,

            'hero': null, // handled below — composição de h1 + subtitulo + cta
        };

        // 'hero' = h1 + subtitulo + cta composto
        if (blockType === 'hero') {
            preview.insertAdjacentHTML('afterbegin', blocks['h1'] + blocks['subtitulo'] + blocks['cta']);
        } else if (blocks[blockType]) {
            preview.insertAdjacentHTML('beforeend', blocks[blockType]);
        } else {
            this.addMessage(`⚠️ Bloco "${blockType}" não reconhecido.`, false);
            return;
        }

        this.addMessage(`✅ Bloco **${blockType}** inserido. Clique no Preview para editar com Micro-Comandos.`, false);
    },

    setupEventListeners() {
        const chatInput = document.getElementById('chat-input');
        const btnSend = document.getElementById('btn-send-chat');
        const btnSnap = document.getElementById('btn-snap-error');

        btnSend.addEventListener('click', () => this.sendMessage(false));
        btnSnap.addEventListener('click', () => {
            if (!chatInput.value.trim()) {
                chatInput.value = "Por favor, olhe como a página está ficando. Pode corrigir a formatação?";
            }
            this.sendMessage(true);
        });

        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage(false);
            }
        });
    },

    setupInspector() {
        const preview = document.getElementById('live-preview');
        preview.addEventListener('click', (e) => {
            const validTags = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'li', 'a', 'strong', 'em', 'button'];
            const tagName = e.target.tagName.toLowerCase();

            if (!validTags.includes(tagName)) return;

            e.preventDefault();
            e.stopPropagation();

            // Limpa seleção anterior
            if (this.selectedElement) {
                this.selectedElement.classList.remove('element-selected', 'outline-blue');
                this.selectedElement.style.outline = '';
            }

            this.selectedElement = e.target;
            this.selectedElement.classList.add('element-selected', 'outline-blue');
            this.selectedElement.style.outline = '2px dashed #3b82f6';
            this.selectedElement.style.outlineOffset = '2px';

            this.showMicroCommandsMenu(e.target, e.clientX, e.clientY);
        });

        // Fechar menu ao clicar fora
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#micro-commands-menu') && !e.target.closest('#live-preview')) {
                this.hideMicroCommandsMenu();
            }
        });
    },

    showMicroCommandsMenu(target, x, y) {
        let menu = document.getElementById('micro-commands-menu');
        if (!menu) {
            menu = document.createElement('div');
            menu.id = 'micro-commands-menu';
            menu.style.cssText = 'position: fixed; z-index: 10000; background: white; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); padding: 5px; display: flex; flex-direction: column; gap: 5px; min-width: 150px;';
            document.body.appendChild(menu);
        }

        menu.innerHTML = `
            <div style="font-size: 10px; font-weight: bold; color: #64748b; padding: 4px 5px; border-bottom: 1px solid #f1f5f9; margin-bottom: 3px; cursor: default;">Micro-Comandos IA</div>
            <button onclick="window.chatApp.executeMicroCommand('Reescreva de forma mais empática, acolhedora e focada na dor emocional do paciente')" class="btn" style="background: #eff6ff; color: #1d4ed8; font-size: 11px; text-align: left; padding: 6px 10px; border: none; border-radius: 4px; cursor: pointer;">🪄 + Empático</button>
            <button onclick="window.chatApp.executeMicroCommand('Reescreva com mais autoridade clínica profissional, adicionando tom técnico de psicologia')" class="btn" style="background: #fdf2f8; color: #be185d; font-size: 11px; text-align: left; padding: 6px 10px; border: none; border-radius: 4px; cursor: pointer;">🪄 + Clínico</button>
            <button onclick="window.chatApp.executeMicroCommand('Reescreva de forma mais curta, concisa e direta ao ponto')" class="btn" style="background: #f0fdf4; color: #15803d; font-size: 11px; text-align: left; padding: 6px 10px; border: none; border-radius: 4px; cursor: pointer;">🪄 Mais Curto</button>
            <button onclick="window.chatApp.hideMicroCommandsMenu()" class="btn" style="background: transparent; color: #94a3b8; font-size: 10px; text-align: center; margin-top: 3px; padding: 4px; border: none; cursor: pointer;">✕ Cancelar</button>
        `;

        // Evitar que o menu saia da tela
        const menuWidth = 150;
        const menuHeight = 160;
        const adjustedX = x + menuWidth > window.innerWidth ? window.innerWidth - menuWidth - 20 : x + 15;
        const adjustedY = y + menuHeight > window.innerHeight ? window.innerHeight - menuHeight - 20 : y + 15;

        menu.style.left = `${adjustedX}px`;
        menu.style.top = `${adjustedY}px`;
        menu.style.display = 'flex';
    },

    hideMicroCommandsMenu() {
        const menu = document.getElementById('micro-commands-menu');
        if (menu) menu.style.display = 'none';
        if (this.selectedElement) {
            this.selectedElement.classList.remove('element-selected', 'outline-blue');
            this.selectedElement.style.outline = '';
            // Não anulamos o selectedElement para permitir que o chat normal ainda faça referência a ele se necessário
        }
    },

    async executeMicroCommand(instruction) {
        if (!this.selectedElement) return;

        const target = this.selectedElement;
        const originalText = target.innerText;
        
        target.innerText = "⏳ Reescrevendo...";
        this.hideMicroCommandsMenu();

        try {
            const prompt = `Você é um Copywriter Clínico focado em Psicologia (Método Abidos). Sua tarefa é reescrever o texto a seguir aplicando esta exata instrução: "${instruction}".\n\nTexto original: "${originalText}"\n\nREGRAS CRÍTICAS:\n- Retorne APENAS o texto puro (plain text) da nova frase.\n- Não inclua aspas no começo nem no fim.\n- Não use NENHUMA tag HTML (ex: sem <p>, sem <strong>).\n- Não forneça explicações.\n- Mantenha o tamanho compatível com a instrução.`;
            
            let newText = null;
            
            // Usando a instância local de Gemini
            if (typeof gemini !== 'undefined' && gemini.callAPI) {
                newText = await gemini.callAPI(prompt);
            } else {
                // Fallback para backend node
                const formData = new FormData();
                formData.append('message', prompt);
                const response = await fetch('http://localhost:3001/api/chat', {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();
                newText = data.reply;
            }

            if (newText) {
                // Remove qualquer resquício de HTML ou aspas que a LLM possa ter teimado em incluir
                let cleanedText = newText.replace(/<[^>]*>?/gm, '').replace(/^"|"$/g, '').trim();
                target.innerText = cleanedText;
                this.addMessage(`✅ Texto atualizado com sucesso via Micro-Comando.`, false);
            } else {
                throw new Error("Resposta vazia da IA");
            }
        } catch (error) {
            console.error("MicroCommand Error:", error);
            target.innerText = originalText;
            alert("Não foi possível reescrever o texto no momento. Verifique sua conexão com a API.");
        }
    },

    async generateBlueprint(theme) {
        // Mostra o loading state
        const welcomeContainer = document.getElementById('blueprint-welcome');
        if (welcomeContainer) welcomeContainer.style.display = 'none';
        
        const preview = document.getElementById('live-preview');
        preview.style.display = 'block';
        preview.innerHTML = `<div style="text-align:center; padding-top: 100px;">
            <div class="spinner" style="font-size:40px;">⚙️</div>
            <h3 style="color:#334155; margin-top:20px;">Montando Blueprint: ${theme}</h3>
            <p style="color:#64748b; font-size:14px;">Injetando Método Abidos... isso leva em média 10 segundos.</p>
        </div>`;
        
        const chatCanvas = document.getElementById('studio-canvas');
        if(chatCanvas) chatCanvas.classList.add('split-active');
        const studioSidebarArea = document.getElementById('studio-sidebar');
        if (studioSidebarArea) studioSidebarArea.style.display = 'flex'; // Mostra sidebar de edição
        
        // Define o contexto SEO sugerido baseado no Blueprint para o frontend e chat
        document.getElementById('seo-context').value = theme;
        document.getElementById('ai-studio-new-title').value = `Campanha ${theme}`;
        
        try {
            const formData = new FormData();
            formData.append('theme', theme);
            
            const response = await fetch('http://localhost:3001/api/blueprint', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) throw new Error(`Network response was not ok: ${response.status}`);
            
            const data = await response.json();
            
            if (data.html) {
                preview.innerHTML = data.html;
                this.addMessage(`✅ Blueprint de **${theme}** gerado com sucesso. Clique em qualquer texto à esquerda para usar os Micro-Comandos.`, false);
            } else {
                throw new Error("HTML não retornado pela API");
            }
        } catch (error) {
            console.error("Blueprint Error:", error);
            preview.innerHTML = `<div style="text-align:center; padding-top: 100px; color:red;">
                <h3>Status Vermelho</h3><p>Ocorreu um erro (${error.message}) ao gerar o Blueprint. O servidor Node.js está rodando?</p>
                <button class="btn" onclick="window.location.reload()">Recarregar Studio</button>
            </div>`;
        }
    },
    
    async auditAbidos() {
        const preview = document.getElementById('live-preview');
        const currentHtml = preview.innerHTML;
        const keyword = document.getElementById('ai-studio-keyword').value || 'Terapia em Goiânia';

        if(currentHtml.trim().length === 0 || currentHtml.includes('Crie algo novo')) {
            this.addMessage("⚠️ Rascunho vazio. Gere um Blueprint ou adicione conteúdo antes de auditar.", false);
            return;
        }

        this.addMessage("🔍 Rodando Auditoria Abidos...", false);
        
        try {
            const formData = new FormData();
            formData.append('html', currentHtml);
            formData.append('keyword', keyword);
            
            const response = await fetch('http://localhost:3001/api/audit', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error(`Network response was not ok: ${response.status}`);
            
            const data = await response.json();
            
            if (data.checklist) {
                this.renderAuditFeedback(data.checklist);
            } else {
                throw new Error("Checklist não retornado.");
            }
        } catch (error) {
            console.error("Audit Error:", error);
            this.addMessage("🚨 Erro na auditoria. Verifique a conexão com o node.", false);
        }
    },

    renderAuditFeedback(checklist) {
        const chatHistory = document.getElementById('chat-history');
        const msgDiv = document.createElement('div');
        msgDiv.style.padding = '10px 15px';
        msgDiv.style.borderRadius = '10px 10px 10px 0';
        msgDiv.style.alignSelf = 'flex-start';
        msgDiv.style.maxWidth = '85%';
        msgDiv.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
        msgDiv.style.background = '#fef2f2';
        msgDiv.style.border = '1px solid #fee2e2';

        let html = '<div style="font-weight:bold; color:#b91c1c; margin-bottom: 8px;">📋 Checklist Método Abidos:</div><ul style="padding-left: 20px; list-style-type: none; margin: 0; color: #7f1d1d; font-size: 12px; display:flex; flex-direction:column; gap:8px;">';
        
        checklist.forEach(item => {
            if (item.passou) {
                html += `<li style="display:flex; align-items:flex-start; gap:5px;"><span style="color:#15803d; font-weight:bold;">✅</span> <span>${item.criterio}</span></li>`;
            } else {
                let actionBtn = "";
                if (item.acao) {
                    actionBtn = `<button onclick="window.chatApp.injectBlock('${item.acao}')" style="margin-top:4px; padding:3px 8px; font-size:10px; border:none; background:#991b1b; color:white; border-radius:3px; cursor:pointer;">Inserir Bloco</button>`;
                }
                html += `<li style="display:flex; align-items:flex-start; gap:5px;"><span style="color:#b91c1c; font-weight:bold;">❌</span> <div><span>${item.criterio}</span><br>${actionBtn}</div></li>`;
            }
        });
        
        html += '</ul>';
        msgDiv.innerHTML = html;
        chatHistory.appendChild(msgDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    },

    injectBlock(action) {
        const preview = document.getElementById('live-preview');
        let blockHtml = "";
        
        if (action === "inserir_prova_social") {
            blockHtml = `
                <section class="abidos-social-proof" style="padding: 40px 20px; background: #fffbe8; border-top: 1px solid #fef08a;">
                    <h2 style="text-align:center; color:#854d0e;">O que dizem os pacientes</h2>
                    <div style="display:flex; justify-content:center; gap:20px; margin-top:20px; flex-wrap:wrap;">
                        <div style="background:white; padding:15px; border-radius:8px; width:250px; box-shadow:0 2px 4px rgba(0,0,0,0.05);">⭐️⭐️⭐️⭐️⭐️<br>"Encontrei no Dr. Lawrence um espaço seguro para falar sobre meu diagnóstico tardio."<br><em>- M. S.</em></div>
                        <div style="background:white; padding:15px; border-radius:8px; width:250px; box-shadow:0 2px 4px rgba(0,0,0,0.05);">⭐️⭐️⭐️⭐️⭐️<br>"A hipnose ajudou a focar e a entender o meu burnout."<br><em>- J. P.</em></div>
                    </div>
                </section>`;
        } else if (action === "inserir_cta") {
            blockHtml = `
                <div class="abidos-cta-block" style="text-align:center; padding: 20px; margin: 20px 0;">
                    <a href="${this.authorityContext.socials.whatsapp}" style="background:#16a34a; color:white; padding: 12px 24px; font-weight:bold; border-radius:30px; text-decoration:none; display:inline-block;">Agendar Avaliação via WhatsApp</a>
                </div>`;
        }

        if (blockHtml) {
            preview.innerHTML += blockHtml;
            this.addMessage("✅ Bloco injetado no final da página. Revise o Live Preview.", false);
        }
    },
    
    addMessage(text, isUser = false) {
        const chatHistory = document.getElementById('chat-history');
        const msgDiv = document.createElement('div');
        msgDiv.style.padding = '10px 15px';
        msgDiv.style.borderRadius = isUser ? '10px 10px 0 10px' : '10px 10px 10px 0';
        msgDiv.style.alignSelf = isUser ? 'flex-end' : 'flex-start';
        msgDiv.style.maxWidth = '85%';
        msgDiv.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
        
        if (isUser) {
            msgDiv.style.background = '#1e293b';
            msgDiv.style.color = 'white';
            msgDiv.innerHTML = `<strong>Você:</strong><br>${text.replace(/\n/g, '<br>')}`;
        } else {
            msgDiv.style.background = '#e0f2fe';
            msgDiv.style.color = '#0369a1';
            
            // Formatando blocos de código HTML (Refatorado para Injeção Não-Destrutiva)
            let formattedText = text.replace(/```html([\s\S]*?)```/g, (match, p1) => {
                return `<br><br><div style="background:#1e293b; color:#fbbf24; padding:10px; border-radius:5px; font-family:monospace; font-size:12px; overflow-x:auto;">${p1.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
                <div style="margin-top:8px; display:flex; gap:5px; align-items:center;">
                    <select class="injection-mode" style="padding:4px; font-size:11px; border-radius:4px; border:1px solid #cbd5e1;">
                        <option value="append">➕ Adicionar ao Final</option>
                        <option value="prepend">🔙 Adicionar ao Início</option>
                        <option value="replace">🔄 Substituir Tudo</option>
                    </select>
                    <button onclick="window.injectCode(this)" data-code="${encodeURIComponent(p1)}" style="padding:5px 12px; background:#6366f1; color:white; border:none; border-radius:4px; cursor:pointer; font-size:11px; font-weight:bold;">⚡ Aplicar no Canvas</button>
                </div><br><br>`;
            });

            // Formatando markdown básico
            formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            msgDiv.innerHTML = `<strong>NeuroEngine:</strong><br>${formattedText}`;
        }
        
        chatHistory.appendChild(msgDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    },

    async sendMessage(hasScreenshot = false) {
        const chatInput = document.getElementById('chat-input');
        const btnSend = document.getElementById('btn-send-chat');
        const btnSnap = document.getElementById('btn-snap-error');
        const livePreview = document.getElementById('live-preview');
        const keyword = document.getElementById('ai-studio-keyword').value;

        const message = chatInput.value.trim();
        if (!message) return;

        chatInput.value = '';
        
        // [NOVO] Injeção de Contexto de SEO Dinâmico
        const seoContext = document.getElementById('seo-context').value;
        let enhancedMessage = message;
        if (seoContext) {
            enhancedMessage += `\n\n[INSTRUÇÃO DE SEO OCULTA]: Certifique-se de usar a palavra-chave "${seoContext}" nas tags H1, H2 ou no primeiro parágrafo gerado. Foco em conversão clínica.`;
        }

        if (hasScreenshot) {
            this.addMessage(message + "<br><em>📸 (Anexou Visualização da Tela)</em>", true);
            btnSnap.innerHTML = '⚙️ Processando...';
            btnSnap.disabled = true;
        } else {
            this.addMessage(message, true);
            btnSend.innerHTML = '⚙️ Processando...';
            btnSend.disabled = true;
        }

        const formData = new FormData();
        
        // CONSTRUÇÃO DO PROMPT COM CONTEXTO
        let promptContext = enhancedMessage;
        
        // 1. Contexto de Keyword SEO
        if (keyword) {
            promptContext += `\n\n[FOCO SEO]: A keyword prioritária é "${keyword}". Use-a estrategicamente conforme o Método Abidos.`;
        }

        // 1.1 Contexto de Autoridade (E-E-A-T / Psicólogo Victor Lawrence)
        promptContext += `\n\n[DADOS DO ESPECIALISTA]: Nome: ${this.authorityContext.name}, CRP: ${this.authorityContext.crp}, Titulação: ${this.authorityContext.title}, Clínica: ${this.authorityContext.institution}. 
        Tratamento Profissional: Utilize sempre "Psicólogo Victor Lawrence" em vez de "Dr.".
        Linkagem Interna: Sempre cite a home www.hipnolawrence.com.
        WhatsApp: ${this.authorityContext.socials.whatsapp}.
        IMPORTANTE: Sempre inclua o CRP próximo ao nome do especialista em seções de autoridade.`;

        // 1.2 Contexto de Mídia (Imagens Reais)
        if (this.mediaGallery && this.mediaGallery.length > 0) {
            const mediaLinks = this.mediaGallery.map(m => `[ID: ${m.id}] Title: ${m.title.rendered} | Alt: ${m.alt_text || 'vazio'} | URL: ${m.source_url}`).join('\n');
            promptContext += `\n\n[ATIVOS DE MÍDIA DISPONÍVEIS]: Você tem acesso às seguintes imagens reais do banco de dados do usuário:
            ${mediaLinks}
            SYSTEM NOTE: Sempre que gerar um código HTML (<img src>), utilize EXCLUSIVAMENTE as URLs reais desta lista que sejam mais adequadas ao contexto gerado no Método Abidos. Se nenhuma servir, use um placeholder de cor sólida condizente com a paleta.`;
        }

        // 2. Contexto de Ajuste Fino (Elemento Selecionado)
        if (this.selectedElement) {
            const elHtml = this.selectedElement.outerHTML;
            promptContext += `\n\n[AJUSTE FINO]: O usuário selecionou este elemento: \n${elHtml}\nAltere apenas este elemento ou o bloco sugerido.`;
        }

        formData.append('message', promptContext);
        
        // 3. Contexto da Página Inteira
        const currentHtml = livePreview.innerHTML;
        if(currentHtml.trim().length > 0 && !currentHtml.includes('Crie algo novo')) {
            formData.append('htmlContext', currentHtml);
        }

        try {
            if (hasScreenshot && window.html2canvas) {
                const canvas = await html2canvas(livePreview);
                const blob = await new Promise(resolve => canvas.toBlob(resolve));
                formData.append('screenshot', blob, 'preview.png');
            }
            
            const response = await fetch('http://localhost:3001/api/chat', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            
            if (data.reply) {
                this.addMessage(data.reply, false);
            } else {
                this.addMessage("Desculpe, deu um erro interno na IA.", false);
            }
        } catch (error) {
            console.error(error);
            this.addMessage("Erro de conexão com o terminal IA (Port 3001).", false);
        } finally {
            btnSend.innerHTML = '🚀 Executar';
            btnSnap.innerHTML = '📷 Corrigir Layout Visualmente';
            btnSend.disabled = false;
            btnSnap.disabled = false;
        }
    },

    // --- LAYOUT CONTROLS ---

    toggleHeaderAI() {
        const header = document.getElementById('studio-header');
        header.classList.toggle('collapsed');
        const btn = document.querySelector('button[title="Esconder Topo"]');
        btn.innerText = header.classList.contains('collapsed') ? '🔽' : '🔼';
    },

    toggleSidebarAI() {
        const sidebar = document.getElementById('studio-sidebar');
        sidebar.classList.toggle('collapsed');
        const btn = document.querySelector('button[title="Esconder Assistente"]');
        btn.innerText = sidebar.classList.contains('collapsed') ? '◀️' : '▶️';
    },

    previewLive() {
        if (!this.currentItemId) return alert("Salve um rascunho primeiro para visualizar no site.");
        const baseUrl = wpAPI.url.replace('/wp-json/wp/v2', '').replace(/\/$/, '');
        window.open(`${baseUrl}/?p=${this.currentItemId}&preview=true`, '_blank');
    },

    async publishWP() {
        if (!this.currentItemId) return alert("Salve um rascunho antes de publicar.");
        if (!confirm("Deseja publicar esta página oficialmente no site?")) return;

        const btn = event.currentTarget;
        const originalText = btn.innerText;
        btn.innerText = "🚀 Publicando..."; btn.disabled = true;

        const result = await wpAPI.saveContent(this.currentType, { status: 'publish' }, this.currentItemId);
        if (result) {
            alert("Página publicada com sucesso!");
            this.addMessage("✅ **Página Publicada!** Ela agora está visível para o público.");
        }
        btn.innerText = originalText; btn.disabled = false;
    },

    onSEOContextChange() {
        const seoContext = document.getElementById('seo-context').value;
        const keyword = document.getElementById('ai-studio-keyword').value;
        const titleInput = document.getElementById('ai-studio-new-title');
        
        if (seoContext || keyword) {
            let msg = `Você selecionou um novo foco SEO.\nContexto: **${seoContext || 'Nenhum'}**\nPalavra-chave: **${keyword || 'Nenhuma'}**`;
            this.addMessage(msg, false);
            
            // Sugerir automaticamente um título estratégico se o usuário ainda não tiver preenchido
            if (titleInput && !titleInput.value) {
                this.suggestTitle();
            }
        }
    },

    // --- WP INTEGRATION ---

    async loadList(selectedId = null) {
        const typeSelect = document.getElementById('ai-studio-type');
        const itemSelect = document.getElementById('ai-studio-item');
        const type = typeSelect.value;
        
        itemSelect.innerHTML = '<option>Carregando...</option>';
        itemSelect.style.display = 'block';

        const data = await wpAPI.fetchContent(type);
        
        // Sincroniza mídias para o contexto da IA
        this.mediaGallery = await wpAPI.fetchMedia(20);
        
        if(!data || data.length === 0) {
            itemSelect.innerHTML = '<option>Nenhum item encontrado.</option>';
            return;
        }

        itemSelect.innerHTML = '<option value="">-- Selecione para Editar --</option>';
        data.forEach(item => {
            const title = item.title && item.title.rendered ? item.title.rendered : `Sem Título #${item.id}`;
            const isSelected = selectedId && parseInt(item.id) === parseInt(selectedId) ? 'selected' : '';
            itemSelect.innerHTML += `<option value="${item.id}" ${isSelected}>${title}</option>`;
        });
        
        document.getElementById('ai-studio-load-btn')?.remove(); // Not needed if we use onchange or separate btn
        // Let's keep a Load Button for safety
        const existingBtn = document.getElementById('ai-studio-load-btn');
        if(!existingBtn) {
            const btn = document.createElement('button');
            btn.id = 'ai-studio-load-btn';
            btn.className = 'btn btn-primary';
            btn.style.padding = '5px 10px';
            btn.innerText = '📥 Carregar';
            btn.onclick = () => this.loadItem();
            itemSelect.after(btn);
        }
    },

    async loadItem() {
        const type = document.getElementById('ai-studio-type').value;
        const id = document.getElementById('ai-studio-item').value;
        if(!id) return;

        const titleSpan = document.getElementById('ai-studio-title');
        titleSpan.innerText = `Baixando...`;

        const data = await wpAPI.getContent(type, id);
        if(data) {
            this.currentItemId = id;
            this.currentType = type;
            document.getElementById('live-preview').innerHTML = data.content.rendered;
            titleSpan.innerText = `Editando: ${data.title.rendered}`;
            
        document.getElementById('ai-studio-new-title').style.display = 'none';
        document.getElementById('ai-studio-accept-btn').style.display = 'none';
        document.getElementById('ai-studio-suggest-btn').style.display = 'none';
        document.getElementById('ai-studio-preview-btn').style.display = 'block';
            document.getElementById('ai-studio-item').style.display = 'block';
            
            this.updateAbidusScore();
            this.addMessage(`Carreguei **${data.title.rendered}**. O que deseja ajustar?`);
        }
    },

    createNew() {
        this.currentItemId = null;
        this.currentType = document.getElementById('ai-studio-type').value;
        
        document.getElementById('ai-studio-item').style.display = 'none';
        const titleInput = document.getElementById('ai-studio-new-title');
        titleInput.style.display = 'block';
        titleInput.value = "";
        titleInput.focus();
        
        document.getElementById('ai-studio-accept-btn').style.display = 'block';
        document.getElementById('ai-studio-suggest-btn').style.display = 'block';
        document.getElementById('live-preview').innerHTML = '<h1 style="color: #1a202c; font-size: 24px; text-align: center; margin-top: 50px; opacity: 0.5;">Comece a escrever seu novo rascunho ou peça para a IA...</h1>';
        document.getElementById('ai-studio-title').innerText = "Novo Rascunho";
        
        this.addMessage(`Pronto! Digite o título, clique em ✅ para confirmar e use os botões de prompts rápidos para começar.`);
    },

    acceptTitle() {
        const title = document.getElementById('ai-studio-new-title').value.trim();
        if(!title) return alert("Digite o título primeiro.");
        this.addMessage(`Título **"${title}"** aceito! Vou usá-lo como base para os comandos.`);
        document.getElementById('ai-studio-title').innerText = `Rascunho: ${title}`;
    },

    async saveToWP() {
        const titleInput = document.getElementById('ai-studio-new-title');
        const isNew = !this.currentItemId;
        const newTitle = titleInput.value.trim();
        const type = document.getElementById('ai-studio-type').value;

        if (isNew && !newTitle) return alert("Digite um título.");

        const htmlContent = document.getElementById('live-preview').innerHTML;
        const slug = document.getElementById('seo-slug').value.trim();
        
        const payload = { 
            content: htmlContent, 
            status: "draft" 
        };

        if (isNew) payload.title = newTitle;
        if (slug) payload.slug = slug;

        const result = await wpAPI.saveContent(type, payload, this.currentItemId);
        
        if(result && result.id) {
            this.currentItemId = result.id;
            this.currentType = type;
            titleInput.style.display = 'none';
            document.getElementById('ai-studio-suggest-btn').style.display = 'none';
            document.getElementById('ai-studio-preview-btn').style.display = 'block';
            document.getElementById('ai-studio-title').innerText = `Rascunho: ${result.title.rendered || newTitle}`;
            alert("Rascunho salvo!");
            
            // Recarrega a lista para o novo rascunho aparecer no dropdown e mantém selecionado
            this.loadList(result.id);
        }
    },

    // --- ANALYTICS & TOOLS ---

    async suggestTitle() {
        const type = document.getElementById('ai-studio-type').value;
        const keyword = document.getElementById('ai-studio-keyword').value || "TEA em Adultos";
        const btn = document.getElementById('ai-studio-suggest-btn');
        const originalText = btn.innerText;

        btn.innerText = "⏳..."; btn.disabled = true;
        
        const prompt = `Atue como um Especialista em Copywriting de Conversão (Método Abidos).
Sugerir EXATAMENTE UM (1) título de impacto para um(a) ${type === 'pages' ? 'Página' : 'Post'}.
Foco: "${keyword}".
REGRAS:
1. FOCO na DOR ou DESEJO do paciente.
2. Seja direto e persuasivo.
3. RETORNE APENAS O TEXTO DO TÍTULO.`;

        try {
            const suggestion = await gemini.callAPI(prompt);
            if(suggestion) {
                const cleanTitle = suggestion.replace(/^["']|["']$/g, '').trim();
                const titleInput = document.getElementById('ai-studio-new-title');
                titleInput.value = cleanTitle;
                titleInput.style.display = 'block';
                this.addMessage(`💡 Sugestão de Título: **"${cleanTitle}"**`);
            }
        } catch(e) { console.error(e); }
        
        btn.innerText = originalText; btn.disabled = false;
    },

    toggleChecklist() {
        const panel = document.getElementById('abidus-checklist-panel');
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    },

    updateAbidusScore() {
        const html = document.getElementById('live-preview').innerHTML;
        const text = document.getElementById('live-preview').innerText;
        let score = 0;
        let suggestions = [];

        const checks = {
            'check-seo': text.toLowerCase().includes('goiânia'),
            'check-eat': ['crp', 'crm', 'psicó', 'especialista'].some(k => text.toLowerCase().includes(k)),
            'check-pain': ['tea', 'autismo', 'masking', 'burnout'].some(k => text.toLowerCase().includes(k)),
            'check-cta': html.toLowerCase().includes('href') && (html.toLowerCase().includes('whatsapp') || html.toLowerCase().includes('agende')),
            'check-keyword': html.toLowerCase().includes('hipnolawrence.com')
        };

        // Custom label for checklist items to show what they are
        const labels = {
            'check-seo': 'SEO Local (Goiânia)',
            'check-eat': 'Autoridade (E-E-A-T)',
            'check-pain': 'Foco na Dor (TEA/Adulto)',
            'check-cta': 'Conversão (WhatsApp)',
            'check-keyword': 'Link Interno (Home)'
        };

        Object.keys(checks).forEach(id => {
            const el = document.getElementById(id);
            if(el) {
                if(checks[id]) {
                    score += 20;
                    el.style.color = '#059669';
                    el.innerHTML = `✅ ${labels[id]}`;
                } else {
                    el.style.color = '#dc2626';
                    el.innerHTML = `❌ ${labels[id]}`;
                }
            }
        });

        document.getElementById('abidus-progress').style.width = score + '%';
        document.getElementById('abidus-percentage').innerText = score + '%';
    },

    runQuickPrompt(type) {
        const keyword = document.getElementById('ai-studio-keyword').value || "TEA em Adultos";
        const title = document.getElementById('ai-studio-new-title').value || "Psicoterapia Especializada";
        const prompts = {
            full: `Crie um conteúdo COMPLETO seguindo a ARQUITETURA OBRIGATÓRIA LAWRENCE para o Título: "${title}". Use a keyword "${keyword}". 
ORDEM DE CONSTRUÇÃO:
1. Seção Hero: H1 (Forte + Goiânia), subtítulo acolhedor e botão WhatsApp.
2. Jornada do Paciente: H2 Identificação da Dor (Empatia profunda), H2 Benefícios Clínicos, H3 Quebra de Objeções/FAQ sutil.
3. Autoridade: H2 Sobre o Especialista (Dr. Victor Lawrence, Bio, CRP, espaço para foto), H2 Infraestrutura/Ambiente.
4. Retenção: H2 FAQ Accordion, Linkagem Interna linkando para www.hipnolawrence.com.
Regras: NUNCA cite a palavra Abidos. Use tom empático-clínico. Localização: Goiânia.`,
            hero: `Crie uma dobra Hero (Header) focada em conversão para "${keyword}". Regra: Título de impacto focado na dor do paciente, subtexto de autoridade e um botão de CTA para WhatsApp em Goiânia. NUNCA use a palavra Abidos no texto. OBRIGATÓRIO: Inclua um link orgânico para a home em www.hipnolawrence.com.`,
            social: `Gere uma seção de depoimentos de pacientes adultos com TEA. Use um design limpo e inclua um link sutil para 'Conhecer nossa história' levando a www.hipnolawrence.com. NUNCA cite a palavra Abidos.`,
            faq: `Crie um FAQ quebra-objeções focado em TEA Adulto e Hipnose. As respostas devem ser acolhedoras e citar a página inicial www.hipnolawrence.com para mais detalhes sobre a clínica.`,
            eeat: `Crie uma seção 'Sobre o Especialista' focada no Dr. Victor Lawrence, CRM/CRP e especialidade em Autismo Feminino. Inclua um botão 'Voltar para a Home' para www.hipnolawrence.com.`,
            cta: `Crie um botão flutuante de WhatsApp animado e um link de rodapé contextualizado para www.hipnolawrence.com.`
        };
        const input = document.getElementById('chat-input');
        input.value = prompts[type];
        this.sendMessage();
    },

    // [NOVO] Handler para os novos botões do Painel Abidos
    runAbidusShortcut(type) {
        const input = document.getElementById('chat-input');
        const shortcuts = {
            hero: "Gere uma seção Hero (Cabeçalho) HTML/Tailwind focada em conversão (Método Abidos: Promessa Clara no H1, Sub-headline atacando a dor principal, e um Botão de CTA grande para WhatsApp). Não inclua header/footer, apenas a seção.",
            social: "Gere uma seção de Prova Social seguindo boas práticas de UI para terapeutas, com cards de depoimentos impactantes e design limpo.",
            faq: "Gere um componente de FAQ em Accordion (HTML/JS) focado em quebrar as principais objeções de pacientes de TEA Adulto ou Hipnose Clínica."
        };
        
        if (shortcuts[type]) {
            input.value = shortcuts[type];
            this.sendMessage();
        }
    },

    async analyzeConversion() {
        this.addMessage("⚙️ Iniciando Auditoria Abidos CRO...", false);
        const html = document.getElementById('live-preview').innerHTML;
        const prompt = `Analise este HTML sob a ótica do Método Abidos (Conversão em Saúde). CRITIQUE: Contraste de botões, clareza da promessa e E-E-A-T. Aponte 3 melhorias código:\n\n${html}`;
        const critique = await gemini.callAPI(prompt);
        if(critique) this.addMessage(`🔍 **Crítica CRO:**\n\n${critique}`);
    },

    previewDraft() {
        if (!this.currentItemId) return alert("Salve primeiro.");
        const baseUrl = wpAPI.url.replace('/wp-json/wp/v2', '');
        window.open(`${baseUrl}/?p=${this.currentItemId}&preview=true`, '_blank');
    },

    toggleSettings() {
        const panel = document.getElementById('ai-studio-settings-panel');
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        this.addMessage("⚙️ Painel de Configurações SEO aberto. Você pode definir a URL, Título SEO e Meta Description aqui.");
    },

    async generateSEOMeta() {
        const title = document.getElementById('ai-studio-new-title').value || "Psicoterapia em Goiânia";
        const keyword = document.getElementById('ai-studio-keyword').value || "Autismo Adulto";
        
        this.addMessage("⚙️ Gerando configurações de SEO otimizadas...");

        const prompt = `Atue como um Especialista em SEO Técnico e Copywriter.
Sugerir configurações de SEO para o conteúdo: "${title}" com a keyword foco "${keyword}".
REGRAS:
1. URL (Slug): Silo geolocalizado, curta e sem acentos (ex: terapia-ansiedade-em-goiania).
2. Título SEO: Keyword nos primeiros 50 caracteres (total 50-60 carac.).
3. Meta Description: 150-160 caracteres, persuasiva, com a keyword e um CTA implícito.

RETORNE APENAS UM JSON no formato exato:
{
  "slug": "url-aqui",
  "seoTitle": "Título SEO aqui",
  "metaDesc": "Descrição aqui"
}`;

        const response = await gemini.callAPI(prompt);
        if (response) {
            try {
                // Tenta extrair JSON do texto (limpa ```json se a IA colocar)
                const jsonStr = response.replace(/```json|```/g, '').trim();
                const meta = JSON.parse(jsonStr);
                
                document.getElementById('seo-slug').value = meta.slug;
                document.getElementById('seo-title-tag').value = meta.seoTitle;
                document.getElementById('seo-meta-desc').value = meta.metaDesc;
                
                this.addMessage("✅ Configurações SEO geradas com sucesso! Verifique os campos no painel de Configurações.");
            } catch (e) {
                console.error("Erro ao processar JSON de SEO", e);
                this.addMessage("❌ Erro ao formatar sugestão de SEO. Tente novamente ou use o título sugerido.");
            }
        }
    },

    // [NOVO] Análise de Necessidades de Mídia via IA (Abidos Method)
    async analyzeMediaNeeds() {
        const html = document.getElementById('live-preview').innerHTML;
        const panel = document.getElementById('media-needs-panel');
        const list = document.getElementById('media-needs-list');
        
        if (html.includes('Crie algo novo')) {
            return this.addMessage("⚠️ Crie ou carregue algum conteúdo antes de planejar a mídia.");
        }

        this.addMessage("⚙️ NeuroEngine está mapeando oportunidades visuais no seu texto...");
        panel.style.display = 'block';
        list.innerHTML = '<p style="font-size:11px; color:#64748b;">Analisando estrutura de conversão...</p>';

        const prompt = `Atue como um Diretor de Arte e Especialista em Conversão (Método Abidos).
Analise o conteúdo HTML abaixo e identifique 3 pontos onde uma imagem aumentaria a conversão ou autoridade.
Para cada ponto, defina uma "Necessidade".

RETORNE APENAS UM JSON no formato de array:
[
  {"need": "Imagem do Consultório Goiânia", "reason": "Aumentar E-E-A-T e confiança no ambiente físico."},
  {"need": "Foto do Dr. Lawrence sorrindo", "reason": "Gerar conexão humana na seção de autoridade."},
  {"need": "Ilustração de TEA Adulto", "reason": "Representação visual da dor do Mascaramento."}
]

HTML: \n${html}`;

        const response = await gemini.callAPI(prompt);
        if (response) {
            try {
                const jsonStr = response.replace(/```json|```/g, '').trim();
                const needs = JSON.parse(jsonStr);
                list.innerHTML = '';
                
                needs.forEach(n => {
                    const row = document.createElement('div');
                    row.style.display = 'flex';
                    row.style.justifyContent = 'space-between';
                    row.style.alignItems = 'center';
                    row.style.background = '#f9fafb';
                    row.style.padding = '8px';
                    row.style.borderRadius = '5px';
                    row.style.border = '1px solid #e2e8f0';
                    
                    row.innerHTML = `
                        <div style="flex:1;">
                            <p style="font-size:12px; font-weight:bold; margin:0;">${n.need}</p>
                            <p style="font-size:10px; color:#64748b; margin:0;">${n.reason}</p>
                        </div>
                        <div style="display:flex; gap:5px;">
                            <button class="btn btn-secondary" style="font-size:10px; padding:3px 8px;" onclick="document.querySelector('[data-target=&quot;media-library&quot;]').click()">📂 Selecionar</button>
                            <button class="btn btn-primary" style="font-size:10px; padding:3px 8px; background:#6366f1;" onclick="window.chatApp.suggestBestMedia('${n.need.replace(/'/g, "\\'")}')">🪄 Sugestão IA</button>
                        </div>
                    `;
                    list.appendChild(row);
                });
            } catch (e) {
                list.innerHTML = '<p style="color:red; font-size:11px;">Erro ao mapear mídia. Tente novamente.</p>';
            }
        }
    },

    // [NOVO] Sugestão Inteligente de Mídia do Banco de Dados
    async suggestBestMedia(needText) {
        this.addMessage(`🪄 Buscando a melhor imagem para: **"${needText}"** no seu acervo WP...`);
        
        // 1. Busca lista de mídia atual do WP
        const mediaList = await wpAPI.fetchMedia();
        if (!mediaList || mediaList.length === 0) {
            return this.addMessage("❌ Sua biblioteca WP está vazia. Faça upload de imagens primeiro.");
        }

        // 2. Prepara mini-catálogo para a IA
        const catalog = mediaList.map(m => ({
            id: m.id,
            title: m.title.rendered,
            alt: m.alt_text,
            url: m.source_url
        }));

        const prompt = `Atue como Bibliotecário Estratégico do Método Abidos.
O usuário precisa de uma imagem para o seguinte objetivo: "${needText}".

Temos o seguinte acervo de mídia (ID, Título, Alt Text, URL):
${JSON.stringify(catalog)}

REGRAS:
1. Escolha a imagem que melhor se adapta à necessidade.
2. Priorize imagens com Alt Text que combine com o objetivo.
3. Se nenhuma for perfeita, escolha a "menos pior" ou mais genérica/clínica.
4. RETORNE APENAS O JSON da imagem escolhida (exatamente como fornecido no catálogo).

RETORNE APENAS O JSON, sem comentários.`;

        const response = await gemini.callAPI(prompt);
        if (response) {
            try {
                const jsonStr = response.replace(/```json|```/g, '').trim();
                const selected = JSON.parse(jsonStr);
                
                this.addMessage(`✅ **Sugestão Encontrada!**\n\nA IA escolheu: **"${selected.title}"**.\nAlt Text: *${selected.alt || 'Nenhum'}*`);
                
                // Feedback visual no chat com a imagem
                this.addMessage(`<img src="${selected.url}" style="width:100px; height:60px; object-fit:cover; border-radius:4px; border:2px solid #6366f1;"><br>
                <button class="btn" style="background:#6366f1; color:white; font-size:11px; padding:4px 10px;" onclick="navigator.clipboard.writeText('${selected.url}'); alert('URL Copiada! Basta colar no seu HTML.')">📋 Copiar Link da Imagem</button>`);
                
            } catch (e) {
                console.error("Erro ao processar sugestão de mídia", e);
                this.addMessage("❌ A IA não conseguiu decidir. Tente abrir a Biblioteca de Mídia e escolher manualmente.");
            }
        }
    }
};

// Global Helpers (Refatorado para suportar Append-Only)
window.injectCode = function(btn) {
    const code = decodeURIComponent(btn.getAttribute('data-code'));
    const preview = document.getElementById('live-preview');
    const modeSelect = btn.parentElement.querySelector('.injection-mode');
    const mode = modeSelect ? modeSelect.value : 'replace';

    // Se o preview tiver o texto placeholder, limpa antes de injetar
    if (preview.innerText.includes('Crie algo novo') || preview.innerText.includes('Comece a escrever')) {
        preview.innerHTML = '';
    }

    if (mode === 'append') {
        preview.insertAdjacentHTML('beforeend', code);
    } else if (mode === 'prepend') {
        preview.insertAdjacentHTML('afterbegin', code);
    } else {
        preview.innerHTML = code;
    }

    window.chatApp.updateAbidusScore();
};

document.addEventListener('DOMContentLoaded', () => window.chatApp.init());
