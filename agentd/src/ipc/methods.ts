/**
 * agentd/src/ipc/methods.ts
 * 
 * Métodos JSON-RPC disponíveis na Fase 2.
 * - agent.status: PID, uptime, versão, estado FSM (stub IDLE)
 * - agent.state: conteúdo parseado do estado_atual.md
 * - agent.shutdown: encerra o daemon gracefully
 */

import { registerMethod } from './server.js';
import { readEstadoAtual } from '../state/estadoAtualReader.js';
import { config } from '../config.js';

const bootTime = Date.now();

export function registerCoreMethods(): void {

  registerMethod('agent.status', () => {
    return {
      pid: process.pid,
      uptime: Math.floor((Date.now() - bootTime) / 1000),
      version: config.daemon.version,
      name: config.daemon.name,
      platform: config.platform,
      fsm: 'IDLE', // Stub — será substituído pela FSM real na Fase 3
      transport: config.isWindows ? 'Named Pipe' : 'Unix Socket',
    };
  });

  registerMethod('agent.state', () => {
    const estado = readEstadoAtual();
    if (!estado) {
      throw new Error('estado_atual.md não encontrado ou inválido');
    }
    return estado;
  });

  registerMethod('agent.shutdown', () => {
    setTimeout(() => {
      process.exit(0);
    }, 100);
    return { message: 'Shutting down...', pid: process.pid };
  });

  registerMethod('agent.ping', () => {
    return { pong: true, timestamp: new Date().toISOString() };
  });
}
