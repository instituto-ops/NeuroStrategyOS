/**
 * agentd/src/memory/indexer.ts
 *
 * ETL Pipeline: Chunking e Indexação de arquivos para Memória Factual.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { MemoryManager } from './memoryManager.js';
import { logger } from '../logger/logger.js';

export class RepoIndexer {
  constructor(private memory: MemoryManager) {}

  /**
   * Indexa um diretório recursivamente.
   */
  async indexDirectory(dirPath: string, extensions: string[] = ['.md', '.ts', '.yaml']): Promise<{ files: number; chunks: number }> {
    let fileCount = 0;
    let chunkCount = 0;

    const walk = async (current: string) => {
      const entries = readdirSync(current, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(current, entry.name);
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;

        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (extensions.includes(extname(entry.name))) {
          const content = readFileSync(fullPath, 'utf-8');
          const chunks = this.chunkText(content, 1000); // ~500 tokens
          
          for (const chunk of chunks) {
            await this.memory.remember('factual', chunk, {
              source: fullPath,
              type: 'file_content',
              ext: extname(entry.name)
            });
            chunkCount++;
          }
          fileCount++;
          logger.debug({ file: entry.name, chunks: chunks.length }, 'Arquivo indexado');
        }
      }
    };

    await walk(dirPath);
    return { files: fileCount, chunks: chunkCount };
  }

  /**
   * Divide o texto em chunks respeitando quebras de linha.
   */
  private chunkText(text: string, size: number): string[] {
    const lines = text.split('\n');
    const chunks: string[] = [];
    let currentChunk = '';

    for (const line of lines) {
      if ((currentChunk.length + line.length) > size && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      currentChunk += line + '\n';
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }
}
