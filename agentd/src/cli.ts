/**
 * agentd/src/cli.ts
 * CLI via commander — subcomandos boot, status, state, stop, ping.
 */

import { Command } from 'commander';
import { boot } from './boot.js';
import { createIPCClient } from './ipc/transport.js';
import { config } from './config.js';

const program = new Command();

program
  .name('agent')
  .description('NeuroEngine Agent Daemon CLI')
  .version(config.daemon.version);

/** Envia um JSON-RPC request ao daemon e retorna a resposta */
async function rpcCall(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
  const client = await createIPCClient();
  const request = JSON.stringify({ jsonrpc: '2.0', method, params, id: Date.now() }) + '\n';

  return new Promise((resolve, reject) => {
    let buffer = '';
    client.on('data', (data) => {
      buffer += data.toString();
      const nl = buffer.indexOf('\n');
      if (nl !== -1) {
        const line = buffer.slice(0, nl);
        client.destroy();
        try {
          const response = JSON.parse(line);
          if (response.error) {
            reject(new Error(`[${response.error.code}] ${response.error.message}`));
          } else {
            resolve(response.result);
          }
        } catch { reject(new Error('Invalid response from daemon')); }
      }
    });
    client.on('error', reject);
    client.write(request);
  });
}

program
  .command('boot')
  .description('Inicia o daemon agentd')
  .action(async () => {
    try {
      await boot();
    } catch (err) {
      console.error('❌ Falha no boot:', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Status do daemon (PID, uptime, FSM)')
  .action(async () => {
    try {
      const result = await rpcCall('agent.status');
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      console.error('❌', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program
  .command('state')
  .description('Estado atual (parseado de estado_atual.md)')
  .action(async () => {
    try {
      const result = await rpcCall('agent.state');
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      console.error('❌', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program
  .command('stop')
  .description('Encerra o daemon gracefully')
  .action(async () => {
    try {
      const result = await rpcCall('agent.shutdown');
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      console.error('❌', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program
  .command('ping')
  .description('Verifica se o daemon está respondendo')
  .action(async () => {
    try {
      const result = await rpcCall('agent.ping');
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      console.error('❌', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program.parse();
