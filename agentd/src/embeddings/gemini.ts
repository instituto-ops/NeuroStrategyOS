/**
 * agentd/src/embeddings/gemini.ts
 *
 * Wrapper para Gemini Embeddings API (text-embedding-004).
 * Gera vetores de 768 dimensões.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../logger/logger.js';

export class GeminiEmbeddings {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
  }

  /**
   * Gera o embedding para um texto.
   */
  async embed(text: string): Promise<number[]> {
    try {
      const result = await this.model.embedContent(text);
      return result.embedding.values;
    } catch (err) {
      logger.error({ err, text: text.slice(0, 50) }, 'Falha ao gerar embedding');
      throw err;
    }
  }

  /**
   * Gera embeddings em lote (batch).
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    try {
      const result = await this.model.batchEmbedContents({
        requests: texts.map(t => ({ content: { role: 'user', parts: [{ text: t }] } }))
      });
      return result.embeddings.map((e: any) => e.values);
    } catch (err) {
      logger.error({ err, count: texts.length }, 'Falha ao gerar lote de embeddings');
      throw err;
    }
  }
}
