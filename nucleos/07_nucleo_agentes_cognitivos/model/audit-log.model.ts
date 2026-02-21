export interface AuditLog {
  auditId: string;
  agentId: string;
  action: string;
  versionId: string;
  performedBy: string;
  performedAt: string;
}
