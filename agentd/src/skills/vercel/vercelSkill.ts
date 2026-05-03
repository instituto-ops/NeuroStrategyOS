/**
 * agentd/src/skills/vercel/vercelSkill.ts
 * 
 * Implementação da Skill de integração com Vercel.
 */

import axios from 'axios';

export class VercelSkill {
  private token = process.env.VERCEL_TOKEN;
  private teamId = process.env.VERCEL_ORG_ID;
  
  private client = axios.create({
    baseURL: 'https://api.vercel.com',
    headers: {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    }
  });

  /**
   * Lista os últimos deployments do projeto
   */
  async listDeployments(args: { projectId: string }) {
    if (!this.token) throw new Error('VERCEL_TOKEN não configurado.');
    
    const res = await this.client.get('/v6/deployments', {
      params: { 
        projectId: args.projectId,
        teamId: this.teamId,
        limit: 5
      }
    });
    
    return {
      status: 'success',
      deployments: res.data.deployments.map((d: any) => ({
        id: d.uid,
        url: d.url,
        name: d.name,
        state: d.state,
        created: new Date(d.created).toLocaleString()
      }))
    };
  }

  /**
   * Obtém detalhes de um deployment específico
   */
  async getDeployment(args: { deploymentId: string }) {
    if (!this.token) throw new Error('VERCEL_TOKEN não configurado.');

    const res = await this.client.get(`/v13/deployments/${args.deploymentId}`, {
      params: { teamId: this.teamId }
    });

    return {
      status: 'success',
      deployment: {
        id: res.data.id,
        url: res.data.url,
        state: res.data.readyState,
        inspectorUrl: res.data.inspectorUrl
      }
    };
  }

  /**
   * Dispara um novo deploy (via Webhook se disponível ou CLI)
   */
  async triggerDeploy(args: { projectId: string }) {
     // A Vercel API exige upload de arquivos para deploys programáticos.
     // Uma forma mais simples é usar deploys via Git (já integrados no GitHub).
     return {
       status: 'info',
       message: 'Deploys são gerenciados automaticamente via GitHub Push. Use as ferramentas de git para disparar novos builds.'
     };
  }
}

export const vercelSkill = new VercelSkill();
