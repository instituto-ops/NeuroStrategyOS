export function guardPersistence(targetScope: 'NAC' | 'CLINICAL' | 'SIMULATION') {
  if (targetScope !== 'NAC') {
    return { allowed: false, reason: 'Persistência fora do escopo NAC é proibida' };
  }
  return { allowed: true };
}
