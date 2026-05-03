/**
 * agentd/src/mcp/documents.ts
 * 
 * Handlers MCP para a Skill de Documentos.
 */

import { registerHandler } from './runtime.js';
import { documentSkill } from '../skills/documents/documentSkill.js';

export function registerDocumentHandlers(): void {
  
  registerHandler('documents.parse_pdf', async (args) => {
    return await documentSkill.parsePdf(args as any);
  });

  registerHandler('documents.parse_docx', async (args) => {
    return await documentSkill.parseDocx(args as any);
  });
  
}
