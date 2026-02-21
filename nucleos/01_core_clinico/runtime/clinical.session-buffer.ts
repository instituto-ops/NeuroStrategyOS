/**
 * SESSION BUFFER — MEMÓRIA VIVA DA SESSÃO
 * Vive apenas em RAM
 * É destruído ao encerrar a sessão
 */

export type SessionEntryType =
  | "NOTE"
  | "TRANSCRIPTION"
  | "AI_ANALYSIS"
  | "AI_DRAFT";

export interface SessionEntry {
  id: string;
  type: SessionEntryType;
  content: string;
  author: "THERAPIST" | "AI";
  timestamp: number;
  validated?: boolean;
}

export class ClinicalSessionBuffer {
  private entries: SessionEntry[] = [];
  private active: boolean = false;

  startSession() {
    this.entries = [];
    this.active = true;
  }

  endSession() {
    this.entries = [];
    this.active = false;
  }

  isActive(): boolean {
    return this.active;
  }

  addEntry(entry: SessionEntry) {
    if (!this.active) {
      throw new Error("Sessão não está ativa");
    }
    this.entries.push(entry);
  }

  getAll(): SessionEntry[] {
    return [...this.entries];
  }

  getByType(type: SessionEntryType): SessionEntry[] {
    return this.entries.filter(e => e.type === type);
  }
}
