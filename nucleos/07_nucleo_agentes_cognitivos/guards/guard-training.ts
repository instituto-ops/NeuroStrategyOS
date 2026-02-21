import { NACState } from '../state/nac.states';

export function guardTraining(currentState: NACState, instructionText?: string) {
  if (currentState !== NACState.TRAINING_MODE) {
    return { allowed: false, reason: 'Treinamento fora do modo permitido' };
  }
  if (!instructionText || instructionText.trim().length === 0) {
    return { allowed: false, reason: 'Instrução de treino ausente' };
  }
  return { allowed: true };
}
