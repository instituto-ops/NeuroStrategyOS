export function guardSessionLock(sessionActive: boolean) {
  if (sessionActive) {
    return { allowed: false, reason: 'NAC bloqueado durante sessão clínica ativa' };
  }
  return { allowed: true };
}
