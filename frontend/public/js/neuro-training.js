window.neuroTraining = {
    // ── Estado Global ──────────────────────────────────────────────────────────
    currentMode: 'text',
    isVoiceModeActive: false,
    isMuted: false,
    isManuallyMuted: false,
    recognition: null,

    // ── Inicialização ─────────────────────────────────────────────────────────
    async init() {
        console.log("🧠 Neuro-Training: Motor de Conversa Contínua v2.0 inicializado.");
        await this.loadMemory();
        this.setupLegacySTT(); // Mantém o botão de mic no chat de texto
    },

    // Botão antigo de mic para o campo de texto (modo texto)
    setupLegacySTT() {
        const btn = document.getElementById('btn-mic-stt');
        const input = document.getElementById('nt-chat-input');
        if (!btn || !input) return;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) { btn.style.display = 'none'; return; }

        const recognition = new SpeechRecognition();
        recognition.lang = 'pt-BR';
        recognition.continuous = false;

        btn.onclick = () => { recognition.start(); btn.style.color = "#ef4444"; };
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            input.value += (input.value ? ' ' : '') + transcript;
            btn.style.color = "#64748b";
        };
        recognition.onerror = () => { btn.style.color = "#64748b"; };
        recognition.onend   = () => { btn.style.color = "#64748b"; };
    },

    // ── MOTOR DE ESCUTA CONTÍNUA ───────────────────────────────────────────────
    setupContinuousVoice() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Seu navegador não suporta reconhecimento de voz nativo. Use o Google Chrome.");
            return false;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.lang = 'pt-BR';
        this.recognition.continuous = true;
        this.recognition.interimResults = false;

        this.recognition.onresult = async (event) => {
            // Se estiver no "mute automático" (IA falando), ignora eco
            if (this.isMuted) return;

            const lastIndex = event.results.length - 1;
            const transcript = event.results[lastIndex][0].transcript.trim();
            if (!transcript) return;

            // Interrupção imediata: se a IA estava falando, ela cala
            window.speechSynthesis.cancel();

            this.addMessage('user', transcript);
            this.setMuteState(true, 'processing'); // Amarelo: processando
            await this.processConversation(transcript);
        };

        // Auto-reinicia se cair por silêncio (só se o modo estiver ativo e não mutado)
        this.recognition.onend = () => {
            if (this.isVoiceModeActive && !this.isMuted) {
                try { this.recognition.start(); } catch (e) {}
            }
        };

        this.recognition.onerror = (event) => {
            // 'no-speech' é normal, não exibe erro
            if (event.error !== 'no-speech') {
                console.warn("🎙️ Speech error:", event.error);
            }
        };

        return true;
    },

    // ── GERENCIADOR DE ESTADO CENTRAL DO MICROFONE ────────────────────────────
    setMuteState(muted, reason = 'manual') {
        this.isMuted = muted;
        if (reason === 'manual') this.isManuallyMuted = muted;

        const micIcon   = document.getElementById('voice-mode-mic');
        const iconSpan  = document.getElementById('voice-mic-icon');
        const statusTxt = document.getElementById('voice-status-text');
        const btnMute   = document.getElementById('btn-mute-voice');

        if (!micIcon) return;

        if (muted) {
            if (reason === 'tts') {
                // IA está falando → Azul
                micIcon.style.background = '#3b82f6';
                micIcon.style.boxShadow  = '0 10px 25px rgba(59,130,246,0.4)';
                if (iconSpan)  iconSpan.innerText  = '🤖';
                if (statusTxt) statusTxt.innerText = 'Abidos está falando...';
            } else if (reason === 'processing') {
                // Processando → Amarelo
                micIcon.style.background = '#f59e0b';
                micIcon.style.boxShadow  = '0 10px 25px rgba(245,158,11,0.4)';
                if (iconSpan)  iconSpan.innerText  = '⚡';
                if (statusTxt) statusTxt.innerText = 'Processando...';
            } else {
                // Mudo manual → Cinza
                micIcon.style.background = '#94a3b8';
                micIcon.style.boxShadow  = 'none';
                if (iconSpan)  iconSpan.innerText  = '🔇';
                if (statusTxt) statusTxt.innerText = 'Escuta pausada';
            }
            if (btnMute) { btnMute.innerHTML = '🔊 Retomar Escuta'; btnMute.style.background = '#e2e8f0'; }
            if (this.recognition) { try { this.recognition.stop(); } catch(e) {} }
        } else {
            // Ouvindo → Vermelho pulsante
            micIcon.style.background = '#ef4444';
            micIcon.style.boxShadow  = '0 10px 25px rgba(239,68,68,0.4)';
            if (iconSpan)  iconSpan.innerText  = '🎙️';
            if (statusTxt) statusTxt.innerText = 'Ouvindo Dr. Victor...';
            if (btnMute) { btnMute.innerHTML = '🔇 Pausar Escuta'; btnMute.style.background = '#f1f5f9'; }

            if (this.recognition && this.isVoiceModeActive) {
                try { this.recognition.start(); } catch (e) {}
            }
        }
    },

    // ── BOTÃO MUTE MANUAL DA INTERFACE ────────────────────────────────────────
    toggleMute() {
        // Se a IA estiver falando, interrompe imediatamente
        if (window.speechSynthesis && window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }
        this.setMuteState(!this.isMuted, 'manual');
    },

    // ── LIGA / DESLIGA O MODO VOZ ─────────────────────────────────────────────
    toggleMode(mode) {
        const overlay = document.getElementById('voice-mode-overlay');
        if (!overlay) return;

        if (mode === 'voice') {
            overlay.style.display = 'flex';
            this.currentMode = 'voice';
            this.isVoiceModeActive = true;
            this.isManuallyMuted = false;

            if (!this.recognition) {
                const ok = this.setupContinuousVoice();
                if (!ok) { overlay.style.display = 'none'; return; }
            }

            this.setMuteState(false); // Começa ouvindo
            this.speak("O seu Gêmeo Digital está pronto. Sobre o que vamos conversar hoje, Doutor? Me conte algo que tem ocupado seus pensamentos ultimamente.");

        } else {
            overlay.style.display = 'none';
            this.currentMode = 'text';
            this.isVoiceModeActive = false;
            this.isManuallyMuted = false;
            this.isMuted = false;

            if (this.recognition) { try { this.recognition.stop(); } catch(e) {} }
            window.speechSynthesis.cancel();
        }
    },

    // ── MOTOR TTS PREMIUM (GOOGLE NEURAL) COM AUTO-MUTE ───────────────────────
    async speak(text) {
        // Interrompe áudio anterior se houver
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }

        // Auto-Mute visual: Fica azul indicando que a IA está falando
        if (!this.isManuallyMuted) this.setMuteState(true, 'tts');

        try {
            const response = await fetch('/api/neuro-training/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });

            if (!response.ok) throw new Error("Falha no servidor de voz premium");

            const blob = await response.blob();
            const audioUrl = URL.createObjectURL(blob);
            this.currentAudio = new Audio(audioUrl);

            // Quando terminar de falar, o microfone volta a ficar vermelho (ouvindo)
            this.currentAudio.onended = () => {
                if (!this.isManuallyMuted) this.setMuteState(false, 'auto');
                URL.revokeObjectURL(audioUrl);
            };

            this.currentAudio.onerror = () => {
                if (!this.isManuallyMuted) this.setMuteState(false, 'auto');
            };

            await this.currentAudio.play();

        } catch (err) {
            console.error("Erro na síntese de voz Google:", err);
            // Em caso de erro, devolve o microfone para o navegador utilizar o fallback nativo (opcional) ou apenas libera
            if (!this.isManuallyMuted) this.setMuteState(false, 'auto');
        }
    },

    // ── PROCESSAMENTO: VOZ → GEMINI → VOZ ────────────────────────────────────
    async processConversation(text) {
        try {
            const response = await fetch('/api/neuro-training/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text })
            });

            if (!response.ok) throw new Error(`Server error ${response.status}`);
            const data = await response.json();

            if (data.reply) {
                this.addMessage('ai', data.reply);
                this.speak(data.reply); // Responde em voz (aciona auto-mute blue)

                if (data.regras_extraidas && data.regras_extraidas.length > 0) {
                    this.addMessage('ai', `🧬 ${data.regras_extraidas.length} novo(s) padrão(s) de fala extraído(s).`);
                    await this.loadMemory();
                }
            }
        } catch (err) {
            console.error("Erro na orquestração de voz:", err);
            this.speak("Houve uma falha de conexão com o painel central. Tente novamente.");
            this.addMessage('ai', "⚠️ Falha de conexão com o servidor.");
        } finally {
            // Se por algum motivo a fala não disparar, volta ao vermelho
            if (!window.speechSynthesis.speaking && !this.isManuallyMuted) {
                setTimeout(() => {
                    if (!window.speechSynthesis.speaking && this.isVoiceModeActive)
                        this.setMuteState(false, 'auto');
                }, 300);
            }
        }
    },

    // ── CHAT DE TEXTO (MODO CLÁSSICO) ─────────────────────────────────────────
    async sendMessage() {
        const input = document.getElementById('nt-chat-input');
        const text  = input.value.trim();
        if (!text) return;

        this.addMessage('user', text);
        input.value = '';

        try {
            const response = await fetch('/api/neuro-training/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text })
            });
            const data = await response.json();
            if (data.reply) {
                this.addMessage('ai', data.reply);
                if (data.regras_extraidas && data.regras_extraidas.length > 0) await this.loadMemory();
            }
        } catch (err) {
            console.error(err);
            this.addMessage('ai', "⚠️ Erro ao processar mensagem.");
        }
    },

    // ── UTILITÁRIOS ───────────────────────────────────────────────────────────
    addMessage(role, text) {
        const chat = document.getElementById('nt-chat-messages');
        if (!chat) return;
        const div = document.createElement('div');
        div.className = `msg ${role}`;
        div.innerText = text;
        chat.appendChild(div);
        chat.scrollTop = chat.scrollHeight;
    },

    async loadMemory() {
        try {
            const response = await fetch('/api/neuro-training/memory');
            const data = await response.json();
            this.renderRules(data.style_rules || []);
            const lastUpdate = document.getElementById('memory-last-update');
            if (lastUpdate) lastUpdate.innerText = new Date().toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });
        } catch (err) { console.error(err); }
    },

    async deleteRule(id) {
        if (!confirm("Deseja remover este padrão de fala?")) return;
        try {
            const response = await fetch(`/api/neuro-training/memory/${id}`, { method: 'DELETE' });
            if (response.ok) await this.loadMemory();
        } catch (err) { console.error(err); }
    },

    async clearMemory() {
        if (!confirm("ATENÇÃO: Isso apagará TODOS os padrões aprendidos. Deseja continuar?")) return;
        try {
            const response = await fetch('/api/neuro-training/memory/clear', { method: 'POST' });
            if (response.ok) await this.loadMemory();
        } catch (err) { console.error(err); }
    },

    renderRules(rules) {
        const feed = document.getElementById('rules-feed');
        if (!feed) return;
        if (!rules.length) {
            feed.innerHTML = '<p style="color:#64748b;font-size:13px;text-align:center;grid-column:1/-1;padding:40px 0;">Nenhum padrão aprendido ainda. Comece a conversar!</p>';
            return;
        }
        feed.innerHTML = rules.map(r => {
            const categoria = (r.categoria || 'PADRÃO DE FALA').toUpperCase();
            const titulo    = r.titulo || r.sintese || "Padrão Detectado";
            const regra     = r.regra  || JSON.stringify(r);
            const id        = r.id;

            return `
                <div class="card" style="position:relative; background:white;border:1px solid #e2e8f0;border-left:5px solid #6366f1;padding:20px;margin-bottom:8px;border-radius:8px;animation:slideIn 0.3s ease;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
                    <button onclick="window.neuroTraining.deleteRule('${id}')" style="position:absolute; top:15px; right:15px; background:none; border:none; cursor:pointer; color:#94a3b8; font-size:14px; transition:color 0.2s;" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='#94a3b8'">🗑️</button>
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px; padding-right: 25px;">
                        <span style="background:#eef2ff;color:#6366f1;font-size:9px;font-weight:900;padding:4px 10px;border-radius:4px;letter-spacing:1px;border:1px solid #e0e7ff;">${categoria}</span>
                        <span style="font-size:10px;color:#94a3b8;">${r.data_extracao ? new Date(r.data_extracao).toLocaleDateString() : ''}</span>
                    </div>
                    <h4 style="font-size:14px;font-weight:800;color:#1e293b;margin-bottom:6px; padding-right: 20px;">${titulo}</h4>
                    <p style="font-size:13px;color:#475569;line-height:1.6;margin:0;font-weight:500;">${regra}</p>
                </div>`;
        }).join('');
    },

    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        this.addMessage('user', `📁 Enviando documento: ${file.name}`);
        this.addMessage('ai', "⌛ Analisando a estrutura do texto para mapear seu padrão de comunicação...");

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/neuro-training/upload', { method: 'POST', body: formData });
            const data = await response.json();
            if (data.success) {
                this.addMessage('ai', `✅ Li o documento "${file.name}".`);
                this.addMessage('ai', data.summary);
                await this.loadMemory();
            } else {
                this.addMessage('ai', "⚠️ Problema ao processar este arquivo.");
            }
        } catch (err) {
            console.error(err);
            this.addMessage('ai', "❌ Erro de conexão ao enviar o arquivo.");
        } finally {
            event.target.value = '';
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if (window.neuroTraining) window.neuroTraining.init();
});
