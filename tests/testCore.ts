import { clinicalEventDispatcher, clinicalStateMachine } from "../core";
import { ClinicalEventType } from "../core/events/eventTypes";
import { ClinicalState } from "../core/state/clinicalStates";
import { sessionRAM } from "../data/ram/sessionMemory";
import { clinicalRecords } from "../data/records/clinicalRecords";
import { auditLog } from "../data/audit/auditLog";

// util simples
function now() {
  return new Date().toISOString();
}

// 1) Abrir paciente (simulando fluxo)
console.log("Estado inicial:", clinicalStateMachine.getState());
clinicalStateMachine.transition(ClinicalState.PATIENT_OPEN);
clinicalStateMachine.transition(ClinicalState.SESSION_READY);
console.log("Estado após preparo:", clinicalStateMachine.getState());

// 2) START_SESSION
clinicalEventDispatcher.dispatch({
  type: ClinicalEventType.START_SESSION,
  issuedBy: "human",
  timestamp: now(),
  payload: {
    patient_id: "demo-001",
    session_id: "sess-001"
  }
});
clinicalStateMachine.transition(ClinicalState.SESSION_ACTIVE);
console.log("Estado após START_SESSION:", clinicalStateMachine.getState());

// 3) ANNOTATION_ADD → RAM
clinicalEventDispatcher.dispatch({
  type: ClinicalEventType.ANNOTATION_ADD,
  issuedBy: "human",
  timestamp: now(),
  payload: {
    session_id: "sess-001",
    text: "Paciente relata ansiedade matinal."
  }
});

// 4) SAVE_OUTPUT_TO_RECORD → records + audit
clinicalEventDispatcher.dispatch({
  type: ClinicalEventType.SAVE_OUTPUT_TO_RECORD,
  issuedBy: "human",
  timestamp: now(),
  payload: {
    patient_id: "demo-001",
    content: "Resumo validado manualmente.",
    consent: true
  }
});

// 5) RESULTADOS
console.log("RAM:", sessionRAM);
console.log("RECORDS:", clinicalRecords);
console.log("AUDIT:", auditLog);
