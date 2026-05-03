/**
 * agentd/src/memory/memoryManager.ts
 *
 * Orquestrador da Memória RAG do Agente.
 * Gerencia os 3 silos: Factual, Stylistic e Morgue.
 */

import { SemanticStore, type MemoryEntry } from './store.js';
import { GeminiEmbeddings } from '../embeddings/gemini.ts';
import { join } from 'node:path';
import { config } from '../config.js';
import { logger } from '../logger/logger.js';

export class MemoryManager {
  private stores: {
    factual: SemanticStore;
    stylistic: SemanticStore;
    morgue: SemanticStore;
  };
  private embedder: GeminiEmbeddings;

  constructor(apiKey: string) {
    const dbPath = join(config.paths.home, 'memory.db');
    this.embedder = new GeminiEmbeddings(apiKey);
    
    this.stores = {
      factual: new SemanticStore(dbPath, 'factual_memory'),
      stylistic: new SemanticStore(dbPath, 'stylistic_memory'),
      morgue: new SemanticStore(dbPath, 'morgue_memory'),
    };
    logger.info('Memory Manager initialized with 3 stores');
  }

  /**
   * Adiciona uma lembrança a um silo específico.
   */
  async remember(silo: keyof typeof this.stores, content: string, metadata: Record<string, unknown> = {}): Promise<void> {
    const embedding = await this.embedder.embed(content);
    this.stores[silo].insert({
      content,
      metadata,
      embedding,
      timestamp: new Date().toISOString()
    });
    logger.debug({ silo, length: content.length }, 'Memory stored');
  }

  /**
   * Recupera memórias similares de um silo.
   */
  async recall(silo: keyof typeof this.stores, query: string, k: number = 5) {
    const queryVector = await this.embedder.embed(query);
    return this.stores[silo].query(queryVector, k);
  }

  /**
   * Busca em todos os silos simultaneamente.
   */
  async search(query: string, k: number = 3) {
    const queryVector = await this.embedder.embed(query);
    return {
      factual: this.stores.factual.query(queryVector, k),
      stylistic: this.stores.stylistic.query(queryVector, k),
      morgue: this.stores.morgue.query(queryVector, k),
    };
  }

  close() {
    this.stores.factual.close();
    this.stores.stylistic.close();
    this.stores.morgue.close();
  }
}
