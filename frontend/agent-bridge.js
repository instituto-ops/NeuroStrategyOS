/**
 * frontend/agent-bridge.js
 * 
 * Bridge entre o Studio (HTTP/WebSocket) e o agentd (Named Pipe IPC).
 */

const net = require('net');
const path = require('path');

// Caminho do pipe (Windows default)
const SOCKET_PATH = '\\\\.\\pipe\\agentd';

/**
 * Envia um comando RPC para o agentd.
 */
function callAgent(method, params = {}) {
    return new Promise((resolve, reject) => {
        const client = net.connect(SOCKET_PATH);
        const id = Date.now();
        
        const request = JSON.stringify({
            jsonrpc: '2.0',
            method,
            params,
            id
        }) + '\n';

        let responseData = '';

        client.on('connect', () => {
            client.write(request);
        });

        client.on('data', (data) => {
            responseData += data.toString();
            if (responseData.endsWith('\n')) {
                client.end();
            }
        });

        client.on('end', () => {
            try {
                const response = JSON.parse(responseData);
                if (response.error) {
                    reject(new Error(response.error.message || 'Erro RPC'));
                } else {
                    resolve(response.result);
                }
            } catch (err) {
                reject(new Error('Resposta inválida do agentd: ' + responseData));
            }
        });

        client.on('error', (err) => {
            reject(new Error('Falha na conexão com agentd (está rodando?): ' + err.message));
        });

        // Timeout de 10 segundos
        client.setTimeout(10000, () => {
            client.destroy();
            reject(new Error('Timeout na resposta do agentd'));
        });
    });
}

/**
 * Registra as rotas da bridge no Express app.
 */
function registerAgentRoutes(app) {
    app.post('/api/agent/rpc', async (req, res) => {
        const { method, params } = req.body;
        try {
            const result = await callAgent(method, params);
            res.json({ success: true, result });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });

    app.get('/api/agent/status', async (req, res) => {
        try {
            // agent.status retorna pid, uptime, fsm state, sessionId, etc.
            const status = await callAgent('agent.status');
            res.json({ success: true, status, connected: true });
        } catch (err) {
            res.json({ success: false, connected: false, error: err.message });
        }
    });

    app.get('/api/agent/artifacts', async (req, res) => {
        try {
            const artifacts = await callAgent('tool.invoke', {   // FIX: era 'tools.invoke'
                toolId: 'filesystem.list_dir',
                args: { path: path.join(require('os').homedir(), '.neuroengine', 'artifacts') }
            });
            res.json({ success: true, artifacts: artifacts.files || [] });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });

    app.get('/api/agent/artifacts/:name', async (req, res) => {
        try {
            const artifactPath = path.join(require('os').homedir(), '.neuroengine', 'artifacts', req.params.name);
            const content = await callAgent('tool.invoke', {    // FIX: era 'tools.invoke'
                toolId: 'filesystem.read_file',
                args: { path: artifactPath }
            });
            res.json({ success: true, content: content.content });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });

    app.get('/api/agent/events', (req, res) => {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        const fsNode = require('fs');
        const os = require('os');
        const eventsPath = path.join(os.homedir(), '.neuroengine', 'events');

        const sendEvent = (data) => {
            res.write(`data: ${JSON.stringify(data)}\n\n`);
        };

        // Heartbeat para manter conexão viva (30s)
        const heartbeat = setInterval(() => {
            res.write(': heartbeat\n\n');
        }, 30000);

        // Último arquivo processado — evita reprocessar o mesmo evento
        let lastProcessed = '';

        const tryReadLatestEvent = (filename) => {
            if (!filename || filename === lastProcessed) return;
            lastProcessed = filename;
            try {
                const fullPath = path.join(eventsPath, filename);
                const raw = fsNode.readFileSync(fullPath, 'utf8');
                // Eventos são JSONL — pegar última linha não vazia
                const lines = raw.trim().split('\n').filter(Boolean);
                const lastLine = lines[lines.length - 1];
                if (!lastLine) return;
                const event = JSON.parse(lastLine);
                // Normalizar para formato esperado pelo agent-workspace.js
                sendEvent({
                    type:    event.type || 'info',
                    message: event.message || event.msg || JSON.stringify(event),
                    ts:      event.ts || event.timestamp || new Date().toISOString(),
                    data:    event
                });
            } catch (_e) {
                // Arquivo ainda sendo escrito ou inválido — ignorar
            }
        };

        // Observar diretório de eventos
        let watcher;
        try {
            fsNode.mkdirSync(eventsPath, { recursive: true });
            watcher = fsNode.watch(eventsPath, (eventType, filename) => {
                if (eventType === 'rename' || eventType === 'change') {
                    tryReadLatestEvent(filename);
                }
            });
        } catch (_e) {
            sendEvent({ type: 'info', message: 'Diretório de eventos não encontrado — aguardando agentd.', ts: new Date().toISOString() });
        }

        req.on('close', () => {
            clearInterval(heartbeat);
            watcher?.close();
        });
    });

    console.log('🔌 [BRIDGE] Agente Operacional: Rotas registradas em /api/agent/');
}

module.exports = { registerAgentRoutes, callAgent };
