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

  // Stub: GA4 real implementado na Fase F (OAuth + Google Analytics Data API)
  registerHandler('google.ga4_query', async (args) => {
    return await googleSkill.getAnalytics(args as any);
  });
  
}
