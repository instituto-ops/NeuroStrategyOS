/**
 * IA CLÍNICA — RUNTIME CONTROLADO
 * Nunca escreve conteúdo oficial
 */

import { ClinicalSessionBuffer } from "./clinical.session-buffer";

export class ClinicalAIRuntime {
  constructor(private buffer: ClinicalSessionBuffer) {}

  suggestAnalysis(text: string) {
    this.buffer.addEntry({
      id: crypto.randomUUID(),
      type: "AI_ANALYSIS",
      content: text,
      author: "AI",
      timestamp: Date.now(),
      validated: false
    });
  }

  draftText(text: string) {
    this.buffer.addEntry({
      id: crypto.randomUUID(),
      type: "AI_DRAFT",
      content: text,
      author: "AI",
      timestamp: Date.now(),
      validated: false
    });
  }
}
