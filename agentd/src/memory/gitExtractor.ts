/**
 * agentd/src/memory/gitExtractor.ts
 *
 * Extrator de histórico Git para Memória Estilística.
 */

import { spawn } from 'node:child_process';
import { MemoryManager } from './memoryManager.js';
import { logger } from '../logger/logger.js';

export class GitExtractor {
  constructor(private memory: MemoryManager) {}

  /**
   * Extrai os últimos N commits para aprender o estilo de escrita e decisões.
   */
  async extractHistory(cwd: string, n: number = 50): Promise<number> {
    return new Promise((resolve, reject) => {
      // Formato: hash|data|subject|body
      const git = spawn('git', ['log', `-n`, String(n), `--pretty=format:%h|%ad|%s|%b`, `--date=short`], { cwd });
      
      let output = '';
      git.stdout.on('data', d => { output += d.toString(); });
      
      git.on('close', async (code) => {
        if (code !== 0) {
          logger.error('Falha ao rodar git log para extração');
          return resolve(0);
        }

        const commits = output.split('\n').filter(Boolean);
        for (const commit of commits) {
          const [hash, date, subject, body] = commit.split('|');
          const content = `Commit: ${subject}\nDate: ${date}\nDescription: ${body || 'N/A'}`;
          
          await this.memory.remember('stylistic', content, {
            hash,
            type: 'git_commit',
            date
          });
        }
        
        logger.info({ count: commits.length }, 'Histórico Git indexado na memória estilística');
        resolve(commits.length);
      });

      git.on('error', reject);
    });
  }
}
