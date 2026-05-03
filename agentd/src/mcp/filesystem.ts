/**
 * agentd/src/mcp/filesystem.ts
 *
 * MCP Filesystem — operações de arquivo mediadas pelo Permission Kernel.
 * read, write (com backup), list, search (glob)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { registerHandler } from './runtime.js';
import { config } from '../config.js';
import { logger } from '../logger/logger.js';

/** Cria backup antes de sobrescrever */
function backupFile(filePath: string): string | null {
  if (!existsSync(filePath)) return null;
  mkdirSync(config.paths.backups, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = join(config.paths.backups, `${basename(filePath)}.${ts}.bak`);
  copyFileSync(filePath, backupPath);
  logger.debug({ original: filePath, backup: backupPath }, 'Backup criado');
  return backupPath;
}

export function registerFilesystemHandlers(): void {

  registerHandler('filesystem.read_file', async (args) => {
    const path = args.path as string;
    if (!existsSync(path)) throw new Error(`Arquivo não encontrado: ${path}`);
    const content = readFileSync(path, 'utf-8');
    const stats = statSync(path);
    return { content, size: stats.size, path };
  });

  registerHandler('filesystem.write_file', async (args) => {
    const path = args.path as string;
    const content = args.content as string;

    // Backup defensivo
    const backupPath = backupFile(path);

    // Garantir diretório pai
    const dir = dirname(path);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    writeFileSync(path, content, 'utf-8');
    return { path, written: content.length, backup: backupPath };
  });

  registerHandler('filesystem.list_dir', async (args) => {
    const path = args.path as string;
    if (!existsSync(path)) throw new Error(`Diretório não encontrado: ${path}`);
    const entries = readdirSync(path, { withFileTypes: true });
    return entries.map(e => ({
      name: e.name,
      type: e.isDirectory() ? 'directory' : 'file',
      path: join(path, e.name),
    }));
  });

  registerHandler('filesystem.search', async (args) => {
    const dir = args.path as string;
    const pattern = args.pattern as string;
    const regex = new RegExp(pattern, 'i');
    const results: string[] = [];

    function walk(currentDir: string, depth: number): void {
      if (depth > 5) return; // max depth
      try {
        const entries = readdirSync(currentDir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = join(currentDir, entry.name);
          if (entry.name === 'node_modules' || entry.name === '.git') continue;
          if (regex.test(entry.name)) results.push(fullPath);
          if (entry.isDirectory() && results.length < 100) walk(fullPath, depth + 1);
        }
      } catch { /* permission denied, skip */ }
    }

    walk(dir, 0);
    return { pattern, matches: results.slice(0, 100) };
  });
}
