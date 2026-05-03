/**
 * agentd/src/skills/documents/documentSkill.ts
 * 
 * Implementação da Skill de parsing de documentos (PDF, DOCX).
 */

import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');
import mammoth from 'mammoth';

export class DocumentSkill {
  
  /**
   * Extrai texto de um arquivo PDF
   */
  async parsePdf(args: { path: string }) {
    if (!fs.existsSync(args.path)) throw new Error(`Arquivo não encontrado: ${args.path}`);
    
    const dataBuffer = fs.readFileSync(args.path);
    const data = await pdf(dataBuffer);
    
    return {
      status: 'success',
      text: data.text,
      info: data.info,
      numPages: data.numpages,
      summary: `PDF processado: ${data.numpages} páginas.`
    };
  }

  /**
   * Extrai texto de um arquivo DOCX
   */
  async parseDocx(args: { path: string }) {
    if (!fs.existsSync(args.path)) throw new Error(`Arquivo não encontrado: ${args.path}`);
    
    const dataBuffer = fs.readFileSync(args.path);
    const result = await mammoth.extractRawText({ buffer: dataBuffer });
    
    return {
      status: 'success',
      text: result.value,
      messages: result.messages,
      summary: `DOCX processado com sucesso.`
    };
  }
}

export const documentSkill = new DocumentSkill();
