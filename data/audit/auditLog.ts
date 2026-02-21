export interface AuditEntry {
  action: string;
  actor: string;
  timestamp: string;
}

export const auditLog: AuditEntry[] = [];