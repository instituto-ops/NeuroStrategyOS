import { dispatchNAC } from './nac-dispatcher';
import { NACState } from '../state/nac.states';
import { createTrainingEntry } from './nac-training.service';
import { createNewAgentVersion } from './nac-version.service';
import { saveAgentVersion, saveAuditLog } from './nac-storage.service';

export function runTrainingFlow(context: {
  sessionActive: boolean;
  agentId: string;
  instruction: string;
  baseVersionId: string;
  createdBy: string;
}) {
  const guardResult = dispatchNAC({
    sessionActive: context.sessionActive,
    currentState: NACState.TRAINING_MODE,
    event: 'NAC_TRAINING_VALIDATE',
    agentId: context.agentId,
    trainingText: context.instruction,
    isCreatingNewVersion: true,
    persistenceTarget: 'NAC',
  });

  if (!guardResult.allowed) {
    throw new Error(guardResult.reason);
  }

  const newVersion = createNewAgentVersion(
    context.agentId,
    'training'
  );

  const trainingEntry = createTrainingEntry(
    context.agentId,
    context.baseVersionId,
    context.instruction,
    context.createdBy
  );

  // 🔒 Persistência local NAC
  saveAgentVersion(newVersion);
  saveAuditLog({
    agentId: context.agentId,
    action: 'TRAINING',
    versionId: newVersion.versionId,
    performedBy: context.createdBy,
    performedAt: new Date().toISOString(),
  });

  return {
    newVersion,
    trainingEntry,
  };
}
