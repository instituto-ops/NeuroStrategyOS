/**
 * TRANSCRIÇÃO EM TEMPO REAL (RAM)
 * Conteúdo bruto, não editado
 */

import { ClinicalSessionBuffer } from "./clinical.session-buffer";

export class ClinicalTranscriptionRuntime {
  constructor(private buffer: ClinicalSessionBuffer) {}

  append(text: string) {
    this.buffer.addEntry({
      id: crypto.randomUUID(),
      type: "TRANSCRIPTION",
      content: text,
      author: "AI",
      timestamp: Date.now()
    });
  }
}
