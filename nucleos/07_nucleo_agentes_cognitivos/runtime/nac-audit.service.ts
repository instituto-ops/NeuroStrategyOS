import { AuditLog } from '../model/audit-log.model';

export function createAuditLog(
  agentId: string,
  action: string,
  versionId: string,
  performedBy: string
): AuditLog {
  return {
    auditId: crypto.randomUUID(),
    agentId,
    action,
    versionId,
    performedBy,
    performedAt: new Date().toISOString(),
  };
}
