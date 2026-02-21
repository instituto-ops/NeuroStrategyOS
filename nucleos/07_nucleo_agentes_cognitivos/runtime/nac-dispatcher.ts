import { NACState } from '../state/nac.states';
import { guardSessionLock } from '../guards/guard-session-lock';
import { guardNACState } from '../guards/guard-nac-state';
import { guardAgentLoaded } from '../guards/guard-agent-loaded';
import { guardVersionIntegrity } from '../guards/guard-version-integrity';
import { guardTraining } from '../guards/guard-training';
import { guardSimulation } from '../guards/guard-simulation';
import { guardAudit } from '../guards/guard-audit';
import { guardLanguage } from '../guards/guard-language';
import { guardPersistence } from '../guards/guard-persistence';

export type NACDispatchContext = {
  sessionActive: boolean;
  currentState: NACState;
  event: string;
  agentId?: string;
  isCreatingNewVersion?: boolean;
  trainingText?: string;
  simulationPersistAttempt?: boolean;
  simulationExportAttempt?: boolean;
  auditMutationAttempt?: boolean;
  languageText?: string;
  persistenceTarget?: 'NAC' | 'CLINICAL' | 'SIMULATION';
};

export function dispatchNAC(context: NACDispatchContext) {
  const guards = [
    guardSessionLock(context.sessionActive),
    guardNACState(context.currentState, context.event),
    guardAgentLoaded(context.agentId),
    guardVersionIntegrity(!!context.isCreatingNewVersion),
    guardTraining(context.currentState, context.trainingText),
    guardSimulation(
      !!context.simulationPersistAttempt,
      !!context.simulationExportAttempt
    ),
    guardAudit(!!context.auditMutationAttempt),
    guardLanguage(context.languageText),
    guardPersistence(context.persistenceTarget || 'NAC'),
  ];

  for (const result of guards) {
    if (!result.allowed) {
      return {
        allowed: false,
        reason: result.reason || 'Evento bloqueado por guard do NAC',
      };
    }
  }

  // ⚠️ Importante:
  // O dispatcher do NAC NÃO executa ações.
  // Ele apenas valida se o evento pode prosseguir.
  return {
    allowed: true,
  };
}
