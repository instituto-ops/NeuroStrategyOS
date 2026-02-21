export function guardVersionIntegrity(isCreatingNewVersion: boolean) {
  if (!isCreatingNewVersion) {
    return { allowed: false, reason: 'Edição direta de versão é proibida' };
  }
  return { allowed: true };
}
