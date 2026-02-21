export function guardAgentLoaded(agentId?: string) {
  if (!agentId) {
    return { allowed: false, reason: 'Nenhum agente carregado' };
  }
  return { allowed: true };
}
