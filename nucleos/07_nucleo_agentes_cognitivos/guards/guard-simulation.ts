export function guardSimulation(persistAttempt: boolean, exportAttempt: boolean) {
  if (persistAttempt || exportAttempt) {
    return { allowed: false, reason: 'Simulação não pode persistir ou exportar' };
  }
  return { allowed: true };
}
