/**
 * agentd/src/mcp/git.ts
 *
 * MCP Git — operações git locais mediadas pelo Permission Kernel.
 * Usa terminal.run internamente (reusa o handler).
 */

import { registerHandler } from './runtime.js';
import { logger } from '../logger/logger.js';
import { spawn } from 'node:child_process';

function runGit(args: string[], cwd: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    const proc = spawn('git', args, { cwd, timeout: 30000 });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', d => { stdout += d.toString(); });
    proc.stderr.on('data', d => { stderr += d.toString(); });
    proc.on('close', code => resolve({ stdout, stderr, exitCode: code ?? 1 }));
    proc.on('error', err => reject(new Error(`Git error: ${err.message}`)));
  });
}

export function registerGitHandlers(): void {

  registerHandler('git.status', async (args) => {
    const cwd = args.cwd as string;
    const result = await runGit(['status', '--porcelain', '-b'], cwd);
    return { ...result, parsed: result.stdout.split('\n').filter(Boolean) };
  });

  registerHandler('git.diff', async (args) => {
    const cwd = args.cwd as string;
    const staged = args.staged as boolean ?? false;
    const gitArgs = staged ? ['diff', '--staged'] : ['diff'];
    return runGit(gitArgs, cwd);
  });

  registerHandler('git.add', async (args) => {
    const cwd = args.cwd as string;
    const files = args.files as string[] ?? ['.'];
    return runGit(['add', ...files], cwd);
  });

  registerHandler('git.commit', async (args) => {
    const cwd = args.cwd as string;
    const message = args.message as string;
    return runGit(['commit', '-m', message], cwd);
  });

  registerHandler('git.log', async (args) => {
    const cwd = args.cwd as string;
    const n = args.n as number ?? 10;
    return runGit(['log', `--oneline`, `-n`, String(n)], cwd);
  });

  registerHandler('git.branch', async (args) => {
    const cwd = args.cwd as string;
    return runGit(['branch', '-a'], cwd);
  });

  registerHandler('git.checkout', async (args) => {
    const cwd = args.cwd as string;
    const branch = args.branch as string;
    const create = args.create as boolean ?? false;
    const gitArgs = create ? ['checkout', '-b', branch] : ['checkout', branch];
    return runGit(gitArgs, cwd);
  });

  registerHandler('git.push', async (args) => {
    const cwd = args.cwd as string;
    const remote = (args.remote as string) ?? 'origin';
    const branch = args.branch as string;
    const force = args.force as boolean ?? false;

    // Dupla verificação de force push (o Kernel já bloqueia, mas defesa em profundidade)
    if (force) {
      throw new Error('Force push é proibido. Operação bloqueada por política de segurança.');
    }

    logger.info({ remote, branch, cwd }, 'git.push — operação irreversível aprovada via HITL');
    return runGit(['push', remote, branch], cwd);
  });

  logger.debug('Git handlers registered (status, diff, add, commit, log, branch, checkout, push)');
}
