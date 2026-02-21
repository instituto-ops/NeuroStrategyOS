export interface SessionMemory {
  sessionId: string;
  buffers: Record<string, any>;
}

export const sessionRAM: Record<string, SessionMemory> = {};