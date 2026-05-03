/**
 * agentd/src/ipc/transport.ts
 * 
 * Abstração de transporte IPC cross-platform.
 * Windows: Named Pipe (\\.\pipe\agentd)
 * POSIX: Unix domain socket (/tmp/agentd.sock)
 */

import { createServer, connect, type Server, type Socket } from 'node:net';
import { existsSync, unlinkSync } from 'node:fs';
import { config } from '../config.js';
import { logger } from '../logger/logger.js';

/**
 * Cria um servidor IPC no socket/pipe configurado.
 * Trata socket órfão no boot (unlink defensivo).
 */
export function createIPCServer(onConnection: (socket: Socket) => void): Server {
  const socketPath = config.ipc.socketPath;

  // Cleanup de socket/pipe órfão
  if (!config.isWindows && existsSync(socketPath)) {
    try {
      // Tenta conectar para ver se há alguém escutando
      const testSocket = connect({ path: socketPath });
      testSocket.on('connect', () => {
        testSocket.destroy();
        logger.error('Outro agentd já está rodando neste socket');
        process.exit(1);
      });
      testSocket.on('error', () => {
        // Ninguém escutando — socket órfão, safe to unlink
        testSocket.destroy();
        unlinkSync(socketPath);
        logger.info({ socketPath }, 'Socket órfão removido');
      });
    } catch {
      unlinkSync(socketPath);
    }
  }

  const server = createServer(onConnection);

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      logger.error({ socketPath }, 'Socket/Pipe já em uso. Outro agentd rodando?');
      process.exit(1);
    }
    logger.error({ err }, 'Erro no servidor IPC');
  });

  return server;
}

/**
 * Inicia escuta no socket/pipe.
 */
export function listenIPC(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    const socketPath = config.ipc.socketPath;
    server.listen(socketPath, () => {
      logger.info({ transport: config.isWindows ? 'Named Pipe' : 'Unix Socket', path: socketPath }, 'IPC server listening');
      resolve();
    });
    server.on('error', reject);
  });
}

/**
 * Cria um cliente IPC para comunicação com o daemon.
 */
export function createIPCClient(): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socketPath = config.ipc.socketPath;
    const client = connect({ path: socketPath }, () => {
      resolve(client);
    });
    client.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'ENOENT' || err.code === 'ECONNREFUSED') {
        reject(new Error('agentd não está rodando. Execute: agent boot'));
      } else {
        reject(err);
      }
    });
  });
}
