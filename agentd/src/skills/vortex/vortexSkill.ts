/**
 * agentd/src/skills/vortex/vortexSkill.ts
 * 
 * Implementação da Skill Vórtex.
 * Faz a ponte entre as solicitações de ferramentas do agente e o servidor do Vórtex Studio.
 */

import axios from 'axios';
import { PageSchema, VortexPage } from './schema';

const VORTEX_API_BASE = 'http://localhost:3000/api/vortex';
const API_KEY = process.env.VORTEX_API_KEY || '';

export class VortexSkill {
  private client = axios.create({
    baseURL: VORTEX_API_BASE,
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  /**
   * Invoca a geração de conteúdo do Vórtex
   */
  async generate(args: { prompt: string; model?: string; context?: string }) {
    const res = await this.client.post('/generate', args);
    return res.data;
  }

  /**
   * Valida conteúdo contra regras Abidos/CFP
   */
  async audit(args: { code: string }) {
    const res = await this.client.post('/audit-draft', args);
    return res.data;
  }

  /**
   * Salva um arquivo localmente no workspace do site
   */
  async saveDraft(args: { filename: string; content: string }) {
    const res = await this.client.post('/save-local', args);
    return res.data;
  }

  /**
   * Realiza commit no GitHub (Gatilho de HITL no Kernel)
   */
  async publish(args: { filename: string; content: string; message: string }) {
    const res = await this.client.post('/commit', args);
    return res.data;
  }

  /**
   * Busca mídia no banco Abidos
   */
  async listMedia(args: { category?: string }) {
    const res = await this.client.get('/media', { params: args });
    return res.data;
  }
}

export const vortexSkill = new VortexSkill();
