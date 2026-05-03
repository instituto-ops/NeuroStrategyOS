/**
 * agentd/src/mcp/terminal.ts
 *
 * MCP Terminal — execução de comandos shell mediada pelo Permission Kernel.
 * OS detection, blocklist, spawn com timeout, stream output.
 */

import { spawn } from 'node:child_process';
import { platform } from 'node:os';
import { registerHandler } from './runtime.js';
import { logger } from '../logger/logger.js';

const IS_WINDOWS = platform() === 'win32';

/** Comandos destrutivos que devem ser bloqueados antes do Kernel */
const BLOCKLIST_PATTERNS = [
  /rm\s+-rf\s+\//,
  /format\s+c:/i,
  /mkfs\./,
  /dd\s+if=/,
  /:\(\)\s*\{\s*:\|:\s*\}/,     // fork bomb
  /del\s+\/s\s+\/q\s+c:\\/i,   // Windows recursive delete
  /shutdown\s+\/s/i,
  /taskkill\s+\/f\s+\/im\s+\*/i,
];

/**
 * Verifica se o comando está na blocklist.
 */
function isBlocked(command: string): string | null {
  for (const pattern of BLOCKLIST_PATTERNS) {
    if (pattern.test(command)) {
      return `Comando bloqueado por segurança: ${pattern.source}`;
    }
  }
  return null;
}

/**
 * Executa um comando shell e retorna stdout/stderr.
 */
function runShell(command: string, cwd?: string, timeoutMs = 60000): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    const shell = IS_WINDOWS ? 'powershell.exe' : '/bin/bash';
    const shellArgs = IS_WINDOWS ? ['-NoProfile', '-Command', command] : ['-c', command];

    const proc = spawn(shell, shellArgs, {
      cwd: cwd || process.cwd(),
      timeout: timeoutMs,
      env: { ...process.env, PAGER: 'cat' },
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      resolve({ stdout: stdout.slice(0, 50000), stderr: stderr.slice(0, 10000), exitCode: code ?? 1 });
    });

    proc.on('error', (err) => {
      reject(new Error(`Shell error: ${err.message}`));
    });
  });
}

export function registerTerminalHandlers(): void {

  registerHandler('terminal.run', async (args) => {
    const command = args.command as string;
    const cwd = args.cwd as string | undefined;
    const timeoutMs = (args.timeout_ms as number) ?? 60000;

    // Pre-kernel blocklist check
    const blocked = isBlocked(command);
    if (blocked) {
      throw new Error(blocked);
    }

    logger.info({ command: command.slice(0, 100), cwd }, 'Executando comando shell');
    const result = await runShell(command, cwd, timeoutMs);
    logger.info({ exitCode: result.exitCode, stdoutLen: result.stdout.length }, 'Comando concluído');

    return result;
  });
}
