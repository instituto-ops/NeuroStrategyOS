/**
 * RUNTIME CONTROLLER
 * Orquestra memória viva da sessão
 */

import { ClinicalSessionBuffer } from "./clinical.session-buffer";
import { ClinicalTranscriptionRuntime } from "./clinical.transcription.runtime";
import { ClinicalNotesRuntime } from "./clinical.notes.runtime";
import { ClinicalAIRuntime } from "./clinical.ai.runtime";

export class ClinicalRuntimeController {
  readonly buffer = new ClinicalSessionBuffer();

  readonly transcription = new ClinicalTranscriptionRuntime(this.buffer);
  readonly notes = new ClinicalNotesRuntime(this.buffer);
  readonly ai = new ClinicalAIRuntime(this.buffer);

  startSession() {
    this.buffer.startSession();
  }

  endSession() {
    this.buffer.endSession();
  }

  snapshot() {
    return this.buffer.getAll();
  }
}
