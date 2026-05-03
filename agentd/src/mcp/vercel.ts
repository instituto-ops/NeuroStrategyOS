/**
 * agentd/src/mcp/vercel.ts
 * 
 * Handlers MCP para a Skill Vercel.
 */

import { registerHandler } from './runtime.js';
import { vercelSkill } from '../skills/vercel/vercelSkill.js';

export function registerVercelHandlers(): void {
  
  registerHandler('vercel.list_deployments', async (args) => {
    return await vercelSkill.listDeployments(args as any);
  });

  registerHandler('vercel.get_deployment', async (args) => {
    return await vercelSkill.getDeployment(args as any);
  });

  registerHandler('vercel.trigger_deploy', async (args) => {
    return await vercelSkill.triggerDeploy(args as any);
  });
  
}
