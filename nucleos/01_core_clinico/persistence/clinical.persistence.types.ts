/**
 * TIPOS DE PERSISTÊNCIA CLÍNICA
 */

export interface PersistedPatient {
  id: string;
  name: string;
  createdAt: number;
}

export interface PersistedSession {
  id: string;
  patientId: string;
  createdAt: number;
  closedAt: number;

  transcription: string;
  notes: string;
  agentAnalyses: string[];

  summary: string;
}
