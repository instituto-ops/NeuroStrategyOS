/**
 * agentd/src/boot.ts
 * Boot orchestrator do daemon.
 */

import { mkdirSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { config } from './config.js';
import { logger } from './logger/logger.js';
import { Machine } from './fsm/machine.js';
import { readEstadoAtual } from './state/estadoAtualReader.js';
import { TaskQueue } from './queue/taskQueue.js';
import { createIPCServer, listenIPC } from './ipc/transport.js';
import { handleConnection } from './ipc/server.js';
import { registerCoreMethods } from './ipc/methods.js';

/** FSM instance — acessível após boot */
export let machine: Machine | null = null;

export async function boot(): Promise<void> {
  logger.info({ version: config.daemon.version, platform: config.platform }, '🚀 agentd booting...');

  // Garantir diretórios
  for (const dir of [config.paths.home, config.paths.sessions, config.paths.fsm, config.paths.events, config.paths.audit, config.paths.artifacts, config.paths.backups, config.paths.hitl]) {
    mkdirSync(dir, { recursive: true });
  }

  // Ler estado atual
  const estado = readEstadoAtual();
  if (estado) {
    logger.info({ verdades: estado.verdadeAtual.length, plano: estado.filaAtiva.plano }, '📋 Estado carregado');
  } else {
    logger.warn('⚠️ estado_atual.md não encontrado — operando sem contexto');
  }

  // Task queue stub
  const _queue = new TaskQueue();

  // FSM
  machine = new Machine();
  logger.info({ state: machine.current().state, sessionId: machine.current().sessionId }, '🔄 FSM inicializada');

  // Registrar métodos IPC e iniciar servidor
  registerCoreMethods();
  const server = createIPCServer(handleConnection);
  await listenIPC(server);

  // PID file
  writeFileSync(config.paths.pidFile, process.pid.toString());
  logger.info({ pid: process.pid }, '✅ agentd pronto');

  // Cleanup
  const cleanup = () => {
    server.close();
    if (existsSync(config.paths.pidFile)) unlinkSync(config.paths.pidFile);
    if (!config.isWindows && existsSync(config.ipc.socketPath)) unlinkSync(config.ipc.socketPath);
  };
  process.on('SIGINT', () => { cleanup(); process.exit(0); });
  process.on('SIGTERM', () => { cleanup(); process.exit(0); });
}
