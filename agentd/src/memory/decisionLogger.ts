/**
 * agentd/src/memory/decisionLogger.ts
 *
 * Registra decisões importantes tanto na memória factual quanto como ADRs (Markdown).
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { MemoryManager } from './memoryManager.js';
import { config } from '../config.js';
import { logger } from '../logger/logger.js';

export class DecisionLogger {
  constructor(private memory: MemoryManager) {}

  /**
   * Registra uma decisão.
   */
  async logDecision(title: string, context: string, decision: string, rationale: string): Promise<string> {
    const ts = new Date().toISOString();
    const id = `ADR-${Date.now()}`;
    const content = `
# ADR: ${title}
**Status**: Decidido ✅
**Data**: ${ts}

## Contexto
${context}

## Decisão
${decision}

## Racional
${rationale}
`.trim();

    // 1. Salvar na Memória Factual
    await this.memory.remember('factual', content, {
      type: 'decision',
      title,
      id,
      timestamp: ts
    });

    // 2. Salvar como arquivo Markdown em CSA/3_Engenharia_e_Arquitetura/adr/
    const adrDir = join(config.paths.repoRoot || process.cwd(), 'CSA', '3_Engenharia_e_Arquitetura', 'adr');
    try {
      mkdirSync(adrDir, { recursive: true });
      const filename = `${id}-${title.toLowerCase().replace(/\s+/g, '-')}.md`;
      const filePath = join(adrDir, filename);
      writeFileSync(filePath, content, 'utf-8');
      logger.info({ id, filePath }, 'Decisão registrada (Memória + ADR)');
      return id;
    } catch (err) {
      logger.error({ err }, 'Falha ao salvar arquivo ADR Markdown');
      return id;
    }
  }
}
