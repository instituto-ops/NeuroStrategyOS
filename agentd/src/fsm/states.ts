/**
 * agentd/src/fsm/states.ts
 * 
 * Estados e eventos tipados do ciclo CSA.
 * 8 estados, 10 tipos de eventos.
 */

/** Os 8 estados do ciclo cognitivo CSA */
export enum State {
  IDLE = 'IDLE',
  DIALOGUE = 'DIALOGUE',
  DIAGNOSIS = 'DIAGNOSIS',
  PLANNING = 'PLANNING',
  EXECUTING = 'EXECUTING',
  TESTING = 'TESTING',
  REPORTING = 'REPORTING',
  AWAITING_APPROVAL = 'AWAITING_APPROVAL',
}

/** Eventos que disparam transições */
export enum EventType {
  UserInput = 'UserInput',
  DiagnosisDone = 'DiagnosisDone',
  PlanReady = 'PlanReady',
  ExecutionStep = 'ExecutionStep',
  ExecutionDone = 'ExecutionDone',
  TestResult = 'TestResult',
  ReportEmitted = 'ReportEmitted',
  ApprovalGranted = 'ApprovalGranted',
  ApprovalDenied = 'ApprovalDenied',
  Reset = 'Reset',
}

/** Evento estruturado para o log */
export interface FSMEvent {
  timestamp: string;
  sessionId: string;
  from: State;
  to: State;
  event: EventType;
  context?: Record<string, unknown>;
  hash: string;
  prevHash: string;
}
