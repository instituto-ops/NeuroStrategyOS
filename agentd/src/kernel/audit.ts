/**
 * agentd/src/kernel/audit.ts
 *
 * Audit log append-only com hash-chain SHA-256.
 * Registra cada veredicto do Kernel para auditoria forense.
 */

import { appendFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import type { KernelVerdict } from './types.js';
import { config } from '../config.js';

interface AuditEntry {
  verdict: KernelVerdict;
  hash: string;
  prevHash: string;
}

let lastAuditHash = '0'.repeat(64);

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/**
 * Registra um veredicto no audit log.
 */
export function auditLog(verdict: KernelVerdict): AuditEntry {
  mkdirSync(config.paths.audit, { recursive: true });

  const filePath = join(config.paths.audit, 'kernel.jsonl');

  // Recuperar último hash se necessário
  if (lastAuditHash === '0'.repeat(64) && existsSync(filePath)) {
    const content = readFileSync(filePath, 'utf-8').trim();
    if (content) {
      const lines = content.split('\n');
      try {
        const last = JSON.parse(lines[lines.length - 1]) as AuditEntry;
        lastAuditHash = last.hash;
      } catch { /* ignore */ }
    }
  }

  const entry: AuditEntry = {
    verdict,
    prevHash: lastAuditHash,
    hash: '', // será preenchido
  };

  entry.hash = sha256(lastAuditHash + JSON.stringify(verdict));
  lastAuditHash = entry.hash;

  appendFileSync(filePath, JSON.stringify(entry) + '\n');
  return entry;
}

/**
 * Verifica integridade da hash-chain do audit log.
 */
export function verifyAuditChain(): { valid: boolean; entries: number; brokenAt?: number } {
  const filePath = join(config.paths.audit, 'kernel.jsonl');
  if (!existsSync(filePath)) return { valid: true, entries: 0 };

  const content = readFileSync(filePath, 'utf-8').trim();
  if (!content) return { valid: true, entries: 0 };

  const lines = content.split('\n');
  let prevHash = '0'.repeat(64);

  for (let i = 0; i < lines.length; i++) {
    const entry = JSON.parse(lines[i]) as AuditEntry;
    if (entry.prevHash !== prevHash) return { valid: false, entries: lines.length, brokenAt: i };
    const expected = sha256(prevHash + JSON.stringify(entry.verdict));
    if (entry.hash !== expected) return { valid: false, entries: lines.length, brokenAt: i };
    prevHash = entry.hash;
  }

  return { valid: true, entries: lines.length };
}
