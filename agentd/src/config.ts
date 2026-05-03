import { homedir, platform } from 'node:os';
import { join, dirname } from 'node:path';
import { existsSync } from 'node:fs';

const IS_WINDOWS = platform() === 'win32';

/** Diretório base de dados do agente */
const NEUROENGINE_HOME = join(homedir(), '.neuroengine');

/** Encontra a raiz do repo subindo diretórios até achar estado_atual.md */
function findRepoRoot(): string {
  const envRoot = process.env.NEUROENGINE_REPO_ROOT;
  if (envRoot && existsSync(join(envRoot, 'estado_atual.md'))) return envRoot;

  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    if (existsSync(join(dir, 'estado_atual.md'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd(); // fallback
}

const REPO_ROOT = findRepoRoot();

export const config = {
  /** SO atual */
  platform: platform(),
  isWindows: IS_WINDOWS,

  /** Paths */
  paths: {
    home: NEUROENGINE_HOME,
    repoRoot: REPO_ROOT,
    sessions: join(NEUROENGINE_HOME, 'sessions'),
    fsm: join(NEUROENGINE_HOME, 'fsm'),
    events: join(NEUROENGINE_HOME, 'events'),
    audit: join(NEUROENGINE_HOME, 'audit'),
    artifacts: join(NEUROENGINE_HOME, 'artifacts'),
    backups: join(NEUROENGINE_HOME, 'backups'),
    hitl: join(NEUROENGINE_HOME, 'hitl'),
    pidFile: join(NEUROENGINE_HOME, 'agentd.pid'),
    tools: join(process.cwd(), 'registry', 'tools'),
    /** estado_atual.md — resolvido pela raiz do repo */
    estadoAtual: join(REPO_ROOT, 'estado_atual.md'),
  },

  /** IPC Transport */
  ipc: {
    /** Named Pipe (Windows) ou Unix socket (POSIX) */
    socketPath: IS_WINDOWS
      ? '\\\\.\\pipe\\agentd'
      : '/tmp/agentd.sock',
  },

  /** Daemon defaults */
  daemon: {
    name: 'agentd',
    version: '0.1.0',
  },
} as const;

export type Config = typeof config;
