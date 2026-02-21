/**
 * CONTROLLER DE PERSISTÊNCIA
 * Chamado SOMENTE após END_SESSION
 */

import { ClinicalSessionBuffer } from "../runtime/clinical.session-buffer";
import { persistSession } from "./clinical.persistence.session";

export class ClinicalPersistenceController {
  constructor(private buffer: ClinicalSessionBuffer) {}

  persistClosedSession(
    patientId: string,
    sessionId: string,
    summary: string
  ) {
    persistSession(patientId, sessionId, this.buffer, summary);
  }
}
