import { TrainingEntry } from '../model/training-entry.model';

export function createTrainingEntry(
  agentId: string,
  baseVersionId: string,
  instruction: string,
  createdBy: string
): TrainingEntry {
  return {
    trainingId: crypto.randomUUID(),
    agentId,
    baseVersionId,
    instruction,
    createdAt: new Date().toISOString(),
    createdBy,
  };
}
