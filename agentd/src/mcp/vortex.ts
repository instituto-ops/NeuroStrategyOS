/**
 * agentd/src/mcp/vortex.ts
 * 
 * Handlers MCP para a Skill Vórtex.
 */

import { registerHandler } from './runtime.js';
import { vortexSkill } from '../skills/vortex/vortexSkill.js';

export function registerVortexHandlers(): void {
  
  registerHandler('vortex.generate', async (args) => {
    return await vortexSkill.generate(args as any);
  });

  registerHandler('vortex.audit', async (args) => {
    return await vortexSkill.audit(args as any);
  });

  registerHandler('vortex.save_draft', async (args) => {
    return await vortexSkill.saveDraft(args as any);
  });

  registerHandler('vortex.publish', async (args) => {
    return await vortexSkill.publish(args as any);
  });

  registerHandler('vortex.list_media', async (args) => {
    return await vortexSkill.listMedia(args as any);
  });

  registerHandler('vortex.list_drafts', async (args) => {
    return await vortexSkill.listDrafts(args as any);
  });

  registerHandler('vortex.list_published', async (args) => {
    return await vortexSkill.listPublished(args as any);
  });

  registerHandler('vortex.micro_edit', async (args) => {
    return await vortexSkill.microEdit(args as any);
  });

}
