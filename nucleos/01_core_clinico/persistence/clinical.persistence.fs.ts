/**
 * FILE SYSTEM ACCESS — NODE / ELECTRON
 */

import fs from "fs";
import path from "path";

const DATA_ROOT = path.resolve(process.cwd(), "data", "patients");

export function ensurePatientFolder(patientId: string) {
  const base = path.join(DATA_ROOT, patientId);
  const sessions = path.join(base, "sessions");

  if (!fs.existsSync(base)) fs.mkdirSync(base, { recursive: true });
  if (!fs.existsSync(sessions)) fs.mkdirSync(sessions, { recursive: true });

  return { base, sessions };
}

export function writeJSON(filePath: string, data: any) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}
