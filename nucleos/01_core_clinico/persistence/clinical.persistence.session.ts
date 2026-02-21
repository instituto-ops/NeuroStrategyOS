/**
 * PERSISTÊNCIA DE SESSÃO CLÍNICA
 */

import { PersistedSession } from "./clinical.persistence.types";
import { ensurePatientFolder, writeJSON } from "./clinical.persistence.fs";
import { ClinicalSessionBuffer } from "../runtime/clinical.session-buffer";

export function persistSession(
  patientId: string,
  sessionId: string,
  buffer: ClinicalSessionBuffer,
  summary: string
) {
  const { sessions } = ensurePatientFolder(patientId);

  const transcription = buffer
    .getByType("TRANSCRIPTION")
    .map(e => e.content)
    .join("\n");

  const notes = buffer
    .getByType("NOTE")
    .map(e => e.content)
    .join("\n");

  const agentAnalyses = buffer
    .getByType("AI_ANALYSIS")
    .map(e => e.content);

  const session: PersistedSession = {
    id: sessionId,
    patientId,
    createdAt: Date.now(),
    closedAt: Date.now(),
    transcription,
    notes,
    agentAnalyses,
    summary
  };

  writeJSON(`${sessions}/${sessionId}.json`, session);
}
