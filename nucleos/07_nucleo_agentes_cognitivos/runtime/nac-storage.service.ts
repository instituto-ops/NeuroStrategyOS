import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(__dirname, '../../../../data/nac');
const AGENTS_FILE = path.join(DATA_DIR, 'agents.json');
const AUDIT_FILE = path.join(DATA_DIR, 'audit.json');

function ensureStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(AGENTS_FILE)) {
    fs.writeFileSync(AGENTS_FILE, JSON.stringify([], null, 2));
  }

  if (!fs.existsSync(AUDIT_FILE)) {
    fs.writeFileSync(AUDIT_FILE, JSON.stringify([], null, 2));
  }
}

export function saveAgentVersion(entry: any) {
  ensureStorage();
  const data = JSON.parse(fs.readFileSync(AGENTS_FILE, 'utf-8'));
  data.push(entry);
  fs.writeFileSync(AGENTS_FILE, JSON.stringify(data, null, 2));
}

export function saveAuditLog(entry: any) {
  ensureStorage();
  const data = JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf-8'));
  data.push(entry);
  fs.writeFileSync(AUDIT_FILE, JSON.stringify(data, null, 2));
}

export function readAgentVersions() {
  ensureStorage();
  return JSON.parse(fs.readFileSync(AGENTS_FILE, 'utf-8'));
}

export function readAuditLogs() {
  ensureStorage();
  return JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf-8'));
}
