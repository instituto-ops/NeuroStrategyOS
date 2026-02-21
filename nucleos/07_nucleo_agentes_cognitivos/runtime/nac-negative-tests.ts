import { dispatchNAC } from './nac-dispatcher';
import { NACState } from '../state/nac.states';

function assertBlocked(result: any, label: string) {
  if (result.allowed) {
    throw new Error(`❌ TESTE FALHOU: ${label}`);
  }
  console.log(`✅ BLOQUEADO CORRETAMENTE: ${label}`);
}

/**
 * TESTE 1 — NAC durante sessão clínica ativa
 */
assertBlocked(
  dispatchNAC({
    sessionActive: true,
    currentState: NACState.NAC_IDLE,
    event: 'NAC_ENTER',
  }),
  'NAC não pode operar durante sessão clínica'
);

/**
 * TESTE 2 — Evento inválido para estado atual
 */
assertBlocked(
  dispatchNAC({
    sessionActive: false,
    currentState: NACState.NAC_IDLE,
    event: 'NAC_TRAINING_VALIDATE',
  }),
  'Treino não permitido fora do TRAINING_MODE'
);

/**
 * TESTE 3 — Treino sem agente carregado
 */
assertBlocked(
  dispatchNAC({
    sessionActive: false,
    currentState: NACState.TRAINING_MODE,
    event: 'NAC_TRAINING_VALIDATE',
    trainingText: 'Teste',
  }),
  'Treino sem agente carregado'
);

/**
 * TESTE 4 — Treino sem instrução
 */
assertBlocked(
  dispatchNAC({
    sessionActive: false,
    currentState: NACState.TRAINING_MODE,
    event: 'NAC_TRAINING_VALIDATE',
    agentId: 'erickson',
  }),
  'Treino sem instrução explícita'
);

/**
 * TESTE 5 — Tentativa de persistir simulação
 */
assertBlocked(
  dispatchNAC({
    sessionActive: false,
    currentState: NACState.SIMULATION_MODE,
    event: 'NAC_SIMULATION_RUN',
    agentId: 'erickson',
    simulationPersistAttempt: true,
  }),
  'Simulação não pode persistir'
);

/**
 * TESTE 6 — Tentativa de exportar simulação
 */
assertBlocked(
  dispatchNAC({
    sessionActive: false,
    currentState: NACState.SIMULATION_MODE,
    event: 'NAC_SIMULATION_RUN',
    agentId: 'erickson',
    simulationExportAttempt: true,
  }),
  'Simulação não pode exportar'
);

/**
 * TESTE 7 — Tentativa de alterar auditoria
 */
assertBlocked(
  dispatchNAC({
    sessionActive: false,
    currentState: NACState.AUDIT_ONLY,
    event: 'NAC_ROLLBACK_VERSION',
    agentId: 'erickson',
    auditMutationAttempt: true,
  }),
  'Auditoria é imutável'
);

/**
 * TESTE 8 — Linguagem proibida
 */
assertBlocked(
  dispatchNAC({
    sessionActive: false,
    currentState: NACState.TRAINING_MODE,
    event: 'NAC_TRAINING_VALIDATE',
    agentId: 'erickson',
    trainingText: 'Este diagnóstico deve ser aplicado',
    isCreatingNewVersion: true,
  }),
  'Linguagem clínica proibida'
);

/**
 * TESTE 9 — Persistência fora do escopo NAC
 */
assertBlocked(
  dispatchNAC({
    sessionActive: false,
    currentState: NACState.AGENT_SELECTED,
    event: 'NAC_SAVE_IDENTITY',
    agentId: 'erickson',
    persistenceTarget: 'CLINICAL',
  }),
  'NAC não pode persistir fora do seu escopo'
);

console.log('🟢 TODOS OS TESTES NEGATIVOS DO NAC PASSARAM');
