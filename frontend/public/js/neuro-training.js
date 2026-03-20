window.neuroTraining = {
    mediaRecorder: null,
    audioChunks: [],
    isRecording: false,
    currentMode: 'text', // 'text' ou 'voice'

    async init() {
        console.log("🧠 Neuro-Training: Chatbot Mode initialized.");
        await this.loadMemory();
        this.setupSTT();
    },

    setupSTT() {
        const btn = document.getElementById('btn-mic-stt');
        const input = document.getElementById('nt-chat-input');
        if (!btn || !input) return;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return btn.style.display = 'none';

        const recognition = new SpeechRecognition();
        recognition.lang = 'pt-BR';
        recognition.continuous = false;

        btn.onclick = () => {
            recognition.start();
            btn.style.color = "#ef4444";
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            input.value += (input.value ? ' ' : '') + transcript;
            btn.style.color = "#64748b";
        };

        recognition.onerror = () => { btn.style.color = "#64748b"; };
        recognition.onend = () => { btn.style.color = "#64748b"; };
    },

    toggleMode(mode) {
        const overlay = document.getElementById('voice-mode-overlay');
        if (mode === 'voice') {
            overlay.style.display = 'flex';
            this.currentMode = 'voice';
            this.startRecording();
        } else {
            overlay.style.display = 'none';
            this.currentMode = 'text';
            if (this.isRecording) this.stopRecording();
        }
    },

    async sendMessage() {
        const input = document.getElementById('nt-chat-input');
        const text = input.value.trim();
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
                if (data.insights && data.insights.length > 0) {
                    await this.loadMemory();
                }
            }
        } catch (err) {
            console.error(err);
            this.addMessage('ai', "⚠️ Erro ao processar mensagem.");
        }
    },

    addMessage(role, text) {
        const chat = document.getElementById('nt-chat-messages');
        const div = document.createElement('div');
        div.className = `msg ${role}`;
        div.innerText = text;
        chat.appendChild(div);
        chat.scrollTop = chat.scrollHeight;
    },

    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];
            this.isRecording = true;

            const micIcon = document.getElementById('voice-mode-mic');
            if (micIcon) micIcon.style.background = "#ef4444";

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) this.audioChunks.push(event.data);
            };

            this.mediaRecorder.onstop = async () => {
                if (this.currentMode === 'voice') await this.processVoiceSession();
            };

            this.mediaRecorder.start();
        } catch (err) {
            console.error(err);
            alert("Erro ao acessar microfone.");
            this.toggleMode('text');
        }
    },

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            const micIcon = document.getElementById('voice-mode-mic');
            if (micIcon) micIcon.style.background = "#6366f1";
        }
    },

    async processVoiceSession() {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', audioBlob);

        try {
            const response = await fetch('/api/neuro-training/analyze-dna', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (data.success) {
                this.addMessage('ai', "🎙️ Entendi seus padrões. DNA clínico atualizado.");
                this.addMessage('ai', data.summary);
                await this.loadMemory();
            }
        } catch (err) {
            console.error(err);
        }
    },

    async loadMemory() {
        try {
            const response = await fetch('/api/neuro-training/memory');
            const data = await response.json();
            this.renderRules(data.style_rules || []);
        } catch (err) {
            console.error(err);
        }
    },

    renderRules(rules) {
        const feed = document.getElementById('rules-feed');
        if (!feed) return;

        feed.innerHTML = rules.map(r => {
            const categoria = (r.categoria || 'DNA').toUpperCase();
            const titulo = r.titulo || r.sintese || "Padrão Detectado";
            const regra = r.regra || JSON.stringify(r);
            
            return `
                <div class="card" style="background: white; border: 1px solid #e2e8f0; border-left: 5px solid #6366f1; padding: 20px; margin-bottom: 8px; border-radius: 8px; animation: slideIn 0.3s ease; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                        <span style="background: #eef2ff; color: #6366f1; font-size: 9px; font-weight: 900; padding: 4px 10px; border-radius: 4px; letter-spacing: 1px; border: 1px solid #e0e7ff;">
                            ${categoria}
                        </span>
                        <span style="font-size: 10px; color: #94a3b8;">${r.data_extracao ? new Date(r.data_extracao).toLocaleDateString() : ''}</span>
                    </div>
                    <h4 style="font-size: 14px; font-weight: 800; color: #1e293b; margin-bottom: 6px;">${titulo}</h4>
                    <p style="font-size: 13px; color: #475569; line-height: 1.6; margin: 0; font-weight: 500;">
                        ${regra}
                    </p>
                </div>
            `;
        }).join('');
    },

    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        this.addMessage('user', `📁 Enviando documento: ${file.name}`);
        this.addMessage('ai', "⌛ Analisando seu material técnico para extrair padrões de DNA clínico...");

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/neuro-training/upload', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (data.success) {
                this.addMessage('ai', `✅ Li o documento "${file.name}".`);
                this.addMessage('ai', data.summary);
                await this.loadMemory();
            } else {
                this.addMessage('ai', "⚠️ Houve um problema ao processar este arquivo.");
            }
        } catch (err) {
            console.error(err);
            this.addMessage('ai', "❌ Erro de conexão ao enviar o arquivo.");
        } finally {
            event.target.value = ''; // Reset input
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if (window.neuroTraining) window.neuroTraining.init();
});
