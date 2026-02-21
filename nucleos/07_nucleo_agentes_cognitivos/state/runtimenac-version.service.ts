import { AgentVersion } from '../model/agent-version.model';

export function createNewAgentVersion(
  agentId: string,
  reason: string
): AgentVersion {
  return {
    versionId: crypto.randomUUID(),
    agentId,
    createdAt: new Date().toISOString(),
    reason,
  };
}
