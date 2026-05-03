import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Content } from '@google/generative-ai';

export interface AgentSession {
  id: string;
  task: string;
  startedAt: string;
  endedAt?: string;
  history: Content[];
  activeSkill: string;
  iterationCount: number;
  status: 'active' | 'awaiting_hitl' | 'completed' | 'failed';
  lastError?: string;
  summary?: string;
}

export class SessionManager {
  constructor(private sessionsDir: string) {}

  async start(task: string, skill = 'vortex'): Promise<AgentSession> {
    await mkdir(this.sessionsDir, { recursive: true });
    const session: AgentSession = {
      id: randomUUID(),
      task,
      startedAt: new Date().toISOString(),
      history: [{ role: 'user', parts: [{ text: task }] }],
      activeSkill: skill,
      iterationCount: 0,
      status: 'active',
    };
    await this.write(session);
    return session;
  }

  async get(id: string): Promise<AgentSession | null> {
    try {
      const raw = await readFile(this.pathFor(id), 'utf-8');
      return JSON.parse(raw) as AgentSession;
    } catch {
      return null;
    }
  }

  async update(id: string, delta: Partial<AgentSession>): Promise<void> {
    const session = await this.get(id);
    if (!session) throw new Error(`Sessao nao encontrada: ${id}`);
    await this.write({ ...session, ...delta });
  }

  async end(id: string, outcome: 'success' | 'failure', summary?: string): Promise<void> {
    const session = await this.get(id);
    if (!session) throw new Error(`Sessao nao encontrada: ${id}`);
    await this.write({
      ...session,
      status: outcome === 'success' ? 'completed' : 'failed',
      endedAt: new Date().toISOString(),
      summary,
    });
  }

  async listActive(): Promise<AgentSession[]> {
    await mkdir(this.sessionsDir, { recursive: true });
    const files = await readdir(this.sessionsDir);
    const sessions = await Promise.all(
      files
        .filter((file) => file.endsWith('.json'))
        .map((file) => readFile(join(this.sessionsDir, file), 'utf-8')
          .then((raw) => JSON.parse(raw) as AgentSession)
          .catch(() => null)),
    );
    return sessions.filter((session): session is AgentSession =>
      Boolean(session && (session.status === 'active' || session.status === 'awaiting_hitl')),
    );
  }

  private async write(session: AgentSession): Promise<void> {
    await mkdir(this.sessionsDir, { recursive: true });
    await writeFile(this.pathFor(session.id), JSON.stringify(session, null, 2), 'utf-8');
  }

  private pathFor(id: string): string {
    return join(this.sessionsDir, `${id}.json`);
  }
}

