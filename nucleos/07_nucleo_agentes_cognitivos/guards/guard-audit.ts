export function guardAudit(mutationAttempt: boolean) {
  if (mutationAttempt) {
    return { allowed: false, reason: 'Auditoria é imutável' };
  }
  return { allowed: true };
}
