/**
 * agentd/src/mcp/google.ts
 * 
 * Handlers MCP para a Skill Google.
 */

import { registerHandler } from './runtime.js';
import { googleSkill } from '../skills/google/googleSkill.js';

export function registerGoogleHandlers(): void {
  
  registerHandler('google.search', async (args) => {
    return await googleSkill.search(args as any);
  });

  registerHandler('google.analytics', async (args) => {
    return await googleSkill.getAnalytics(args as any);
  });
  
}
