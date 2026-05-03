import { homedir, platform } from 'node:os';
import { join, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import dotenv from 'dotenv';

// Encontrar .env — tenta process.cwd(), depois sobe até achar estado_atual.md (raiz do repo)
function findEnvFile(): string {
  // 1. Tenta cwd/.env
  const cwdEnv = join(process.cwd(), '.env');
  if (existsSync(cwdEnv)) return cwdEnv;
  // 2. Sobe até 5 níveis buscando estado_atual.md como âncora do repo root
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    const candidate = join(dir, '.env');
    if (existsSync(join(dir, 'estado_atual.md')) && existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return cwdEnv; // fallback silencioso
}

dotenv.config({ path: findEnvFile() });

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
    rules: join(process.cwd(), 'registry', 'rules'),
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
    // Aceita tanto GEMINI_API_KEY (nome no .env raiz) quanto GOOGLE_GENAI_API_KEY
    apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || '',
    // Modelo LLM: MODEL_NAVIGATION > GEMINI_MODEL > fallback gemini-2.5-flash
    modelId: process.env.MODEL_NAVIGATION || process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  },
} as const;

export type Config = typeof config;
