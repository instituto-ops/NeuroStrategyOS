/**
 * agentd/src/ipc/methods.ts
 * 
 * Métodos JSON-RPC — Fase 2 (agent.*) + Fase 3 (fsm.*)
 */

import { registerMethod } from './server.js';
import { readEstadoAtual } from '../state/estadoAtualReader.js';
import { config } from '../config.js';
import { machine } from '../boot.js';
import { EventType } from '../fsm/states.js';

const bootTime = Date.now();

export function registerCoreMethods(): void {

  // === Agent core (Fase 2) ===

  registerMethod('agent.status', () => {
    const fsm = machine?.current();
    return {
      pid: process.pid,
      uptime: Math.floor((Date.now() - bootTime) / 1000),
      version: config.daemon.version,
      name: config.daemon.name,
      platform: config.platform,
      fsm: fsm?.state ?? 'UNKNOWN',
      sessionId: fsm?.sessionId ?? null,
      transport: config.isWindows ? 'Named Pipe' : 'Unix Socket',
    };
  });

  registerMethod('agent.state', () => {
    const estado = readEstadoAtual();
    if (!estado) throw new Error('estado_atual.md não encontrado ou inválido');
    return estado;
  });

  registerMethod('agent.shutdown', () => {
    setTimeout(() => process.exit(0), 100);
    return { message: 'Shutting down...', pid: process.pid };
  });

  registerMethod('agent.ping', () => {
    return { pong: true, timestamp: new Date().toISOString() };
  });

  // === FSM (Fase 3) ===

  registerMethod('fsm.current', () => {
    if (!machine) throw new Error('FSM não inicializada');
    return machine.current();
  });

  registerMethod('fsm.transition', (params) => {
    if (!machine) throw new Error('FSM não inicializada');
    const event = params.event as string;
    if (!Object.values(EventType).includes(event as EventType)) {
      throw new Error(`Evento inválido: ${event}. Válidos: ${Object.values(EventType).join(', ')}`);
    }
    const context = params.context as Record<string, unknown> | undefined;
    return machine.dispatch(event as EventType, context);
  });

  registerMethod('fsm.history', (params) => {
    if (!machine) throw new Error('FSM não inicializada');
    const limit = typeof params.limit === 'number' ? params.limit : 50;
    return machine.history(limit);
  });

  registerMethod('fsm.verify', () => {
    if (!machine) throw new Error('FSM não inicializada');
    return machine.verify();
  });

  registerMethod('fsm.reset', () => {
    if (!machine) throw new Error('FSM não inicializada');
    machine.reset();
    return machine.current();
  });
}
