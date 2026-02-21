/**
 * LEITOR DE SESSÕES PERSISTIDAS
 * SOMENTE LEITURA
 */

import fs from "fs";
import path from "path";
import { PersistedSession } from "../clinical.persistence.types";

const DATA_ROOT = path.resolve(process.cwd(), "data", "patients");

export function listSessions(patientId: string): PersistedSession[] {
  const sessionsPath = path.join(DATA_ROOT, patientId, "sessions");

  if (!fs.existsSync(sessionsPath)) return [];

  const files = fs.readdirSync(sessionsPath);

  return files
    .filter(f => f.endsWith(".json"))
    .map(file => {
      const raw = fs.readFileSync(path.join(sessionsPath, file), "utf-8");
      return JSON.parse(raw) as PersistedSession;
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function loadSession(
  patientId: string,
  sessionId: string
): PersistedSession | null {
  const filePath = path.join(
    DATA_ROOT,
    patientId,
    "sessions",
    `${sessionId}.json`
  );

  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as PersistedSession;
}
