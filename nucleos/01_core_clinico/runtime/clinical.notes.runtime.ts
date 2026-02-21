/**
 * ANOTAÇÕES DO TERAPEUTA (RAM)
 * Escrita humana direta
 */

import { ClinicalSessionBuffer } from "./clinical.session-buffer";

export class ClinicalNotesRuntime {
  constructor(private buffer: ClinicalSessionBuffer) {}

  write(text: string) {
    this.buffer.addEntry({
      id: crypto.randomUUID(),
      type: "NOTE",
      content: text,
      author: "THERAPIST",
      timestamp: Date.now(),
      validated: true
    });
  }
}
