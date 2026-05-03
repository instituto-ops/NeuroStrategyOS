/**
 * agentd/src/ipc/server.ts
 * 
 * Servidor JSON-RPC 2.0 sobre IPC.
 * Roteia métodos registrados, retorna erros tipados.
 */

import type { Socket } from 'node:net';
import { logger } from '../logger/logger.js';

/** JSON-RPC 2.0 Request */
export interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
  id: string | number | null;
}

/** JSON-RPC 2.0 Response */
export interface JsonRpcResponse {
  jsonrpc: '2.0';
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
  id: string | number | null;
}

/** Method handler */
export type MethodHandler = (params: Record<string, unknown>) => Promise<unknown> | unknown;

/** Registry de métodos */
const methods = new Map<string, MethodHandler>();

/**
 * Registra um método JSON-RPC.
 */
export function registerMethod(name: string, handler: MethodHandler): void {
  methods.set(name, handler);
  logger.debug({ method: name }, 'IPC method registered');
}

/**
 * Processa uma requisição JSON-RPC recebida.
 */
async function processRequest(request: JsonRpcRequest): Promise<JsonRpcResponse> {
  const { method, params, id } = request;

  const handler = methods.get(method);
  if (!handler) {
    return {
      jsonrpc: '2.0',
      error: { code: -32601, message: `Method not found: ${method}` },
      id,
    };
  }

  try {
    const result = await handler(params ?? {});
    return { jsonrpc: '2.0', result, id };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    logger.error({ err, method }, 'IPC method error');
    return {
      jsonrpc: '2.0',
      error: { code: -32603, message },
      id,
    };
  }
}

/**
 * Handler de conexão para sockets IPC.
 * Parseia JSON-RPC line-delimited do socket.
 */
export function handleConnection(socket: Socket): void {
  let buffer = '';

  socket.on('data', async (data) => {
    buffer += data.toString();

    // Processa linhas completas (line-delimited JSON)
    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);

      if (!line) continue;

      try {
        const request = JSON.parse(line) as JsonRpcRequest;

        if (request.jsonrpc !== '2.0' || !request.method) {
          const errorResponse: JsonRpcResponse = {
            jsonrpc: '2.0',
            error: { code: -32600, message: 'Invalid JSON-RPC 2.0 request' },
            id: request.id ?? null,
          };
          socket.write(JSON.stringify(errorResponse) + '\n');
          continue;
        }

        const response = await processRequest(request);

        // Notifications (id=null) don't get a response
        if (request.id !== null && request.id !== undefined) {
          socket.write(JSON.stringify(response) + '\n');
        }
      } catch {
        const errorResponse: JsonRpcResponse = {
          jsonrpc: '2.0',
          error: { code: -32700, message: 'Parse error' },
          id: null,
        };
        socket.write(JSON.stringify(errorResponse) + '\n');
      }
    }
  });

  socket.on('error', (err) => {
    logger.debug({ err: err.message }, 'IPC socket error (client disconnected)');
  });
}
