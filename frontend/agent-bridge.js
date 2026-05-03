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
            const status = await callAgent('fsm.status');
            res.json({ success: true, status });
        } catch (err) {
            res.json({ success: false, connected: false, error: err.message });
        }
    });

    app.get('/api/agent/artifacts', async (req, res) => {
        try {
            const artifacts = await callAgent('tools.invoke', { 
                toolId: 'filesystem.list_dir', 
                args: { path: 'artifacts' } // Caminho relativo ao home
            });
            res.json({ success: true, artifacts: artifacts.files || [] });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    });

    app.get('/api/agent/artifacts/:name', async (req, res) => {
        try {
            const content = await callAgent('tools.invoke', { 
                toolId: 'filesystem.read', 
                args: { path: `artifacts/${req.params.name}` }
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

        const { fs } = require('./shared');
        const eventsPath = path.join(require('os').homedir(), '.neuroengine', 'events');
        
        // Função para enviar evento
        const sendEvent = (data) => {
            res.write(`data: ${JSON.stringify(data)}\n\n`);
        };

        // Simples tail: observa o diretório de eventos
        const watcher = fs.watch(eventsPath, (eventType, filename) => {
            if (eventType === 'change') {
                // Ao mudar, poderíamos ler as últimas linhas. 
                // Por simplificação agora, enviamos um sinal de "update".
                sendEvent({ type: 'log_update', filename });
            }
        });

        req.on('close', () => {
            watcher.close();
        });
    });

    console.log('🔌 [BRIDGE] Agente Operacional: Rotas registradas em /api/agent/');
}

module.exports = { registerAgentRoutes, callAgent };
