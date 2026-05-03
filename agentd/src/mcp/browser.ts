/**
 * agentd/src/mcp/browser.ts
 * 
 * Handlers MCP para a Skill de Browser.
 */

import { registerHandler } from './runtime.js';
import { browserSkill } from '../skills/browser/browserSkill.js';

export function registerBrowserHandlers(): void {
  
  registerHandler('browser.open', async (args) => {
    return await browserSkill.open(args as any);
  });

  registerHandler('browser.click', async (args) => {
    return await browserSkill.click(args as any);
  });

  registerHandler('browser.type', async (args) => {
    return await browserSkill.type(args as any);
  });

  registerHandler('browser.screenshot', async (args) => {
    return await browserSkill.screenshot(args as any);
  });

  registerHandler('browser.get_content', async () => {
    return await browserSkill.getContent();
  });

  registerHandler('browser.close', async () => {
    return await browserSkill.close();
  });
  
}
