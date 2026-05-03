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

    console.log('🔌 [BRIDGE] Agente Operacional: Rotas registradas em /api/agent/');
}

module.exports = { registerAgentRoutes, callAgent };
