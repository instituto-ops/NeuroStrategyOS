/**
 * agentd/src/memory/store.ts
 *
 * Base Vector Store usando SQLite + Cosine Similarity em JS.
 * Armazena texto, metadados e o vetor de embedding.
 */

import Database from 'better-sqlite3';
import { join } from 'node:path';
import { logger } from '../logger/logger.js';

export interface MemoryEntry {
  id?: number;
  content: string;
  metadata: Record<string, unknown>;
  embedding: number[];
  timestamp: string;
}

export class SemanticStore {
  private db: Database.Database;

  constructor(dbPath: string, private tableName: string) {
    this.db = new Database(dbPath);
    this.init();
  }

  private init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT NOT NULL,
        metadata TEXT NOT NULL,
        embedding BLOB NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_${this.tableName}_ts ON ${this.tableName}(timestamp)`);
    logger.debug({ table: this.tableName }, 'Semantic store initialized');
  }

  /**
   * Insere uma nova entrada na memória.
   */
  insert(entry: MemoryEntry): void {
    const stmt = this.db.prepare(`
      INSERT INTO ${this.tableName} (content, metadata, embedding, timestamp)
      VALUES (?, ?, ?, ?)
    `);
    
    // Armazenamos o embedding como Float32Array em um Buffer (BLOB)
    const vectorBuffer = Buffer.from(new Float32Array(entry.embedding).buffer);
    
    stmt.run(
      entry.content,
      JSON.stringify(entry.metadata),
      vectorBuffer,
      entry.timestamp || new Date().toISOString()
    );
  }

  /**
   * Busca as top-K entradas mais similares.
   */
  query(queryVector: number[], k: number = 5): (MemoryEntry & { score: number })[] {
    const rows = this.db.prepare(`SELECT * FROM ${this.tableName}`).all() as any[];
    
    const results = rows.map(row => {
      const entryVector = Array.from(new Float32Array(row.embedding.buffer, row.embedding.byteOffset, row.embedding.byteLength / 4));
      const score = this.cosineSimilarity(queryVector, entryVector);
      return {
        id: row.id,
        content: row.content,
        metadata: JSON.parse(row.metadata),
        embedding: entryVector,
        timestamp: row.timestamp,
        score
      };
    });

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }

  /**
   * Busca exata por tempo ou metadados simples (via JSON search se disponível ou scan).
   */
  list(limit: number = 20): MemoryEntry[] {
    const rows = this.db.prepare(`SELECT * FROM ${this.tableName} ORDER BY timestamp DESC LIMIT ?`).all(limit) as any[];
    return rows.map(row => ({
      id: row.id,
      content: row.content,
      metadata: JSON.parse(row.metadata),
      embedding: Array.from(new Float32Array(row.embedding.buffer, row.embedding.byteOffset, row.embedding.byteLength / 4)),
      timestamp: row.timestamp
    }));
  }

  private cosineSimilarity(v1: number[], v2: number[]): number {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    for (let i = 0; i < v1.length; i++) {
      dotProduct += v1[i] * v2[i];
      norm1 += v1[i] * v1[i];
      norm2 += v2[i] * v2[i];
    }
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  close() {
    this.db.close();
  }
}
