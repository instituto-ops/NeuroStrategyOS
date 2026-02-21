import { emitUIEvent } from "../ui-adapter";
import { ClinicalEventType } from "../core/events/eventTypes";
import { clinicalStateMachine } from "../core";
import { ClinicalState } from "../core/state/clinicalStates";
import { sessionRAM } from "../data/ram/sessionMemory";
import { clinicalRecords } from "../data/records/clinicalRecords";
import { auditLog } from "../data/audit/auditLog";

// util simples
function now() {
  return new Date().toISOString();
}

// 🔹 PREPARO DO ESTADO (simula fluxo real da UI)
clinicalStateMachine.transition(ClinicalState.PATIENT_OPEN);
clinicalStateMachine.transition(ClinicalState.SESSION_READY);

// 1) UI inicia sessão (AGORA permitido)
emitUIEvent({
  type: ClinicalEventType.START_SESSION,
  payload: {
    patient_id: "demo-002",
    session_id: "sess-002",
    timestamp: now()
  }
});

// 2) UI adiciona anotação (RAM)
emitUIEvent({
  type: ClinicalEventType.ANNOTATION_ADD,
  payload: {
    session_id: "sess-002",
    text: "UI enviou anotação via adaptador.",
    timestamp: now()
  }
});

// 3) UI solicita persistência explícita
emitUIEvent({
  type: ClinicalEventType.SAVE_OUTPUT_TO_RECORD,
  payload: {
    patient_id: "demo-002",
    content: "Persistido por evento vindo da UI.",
    consent: true,
    timestamp: now()
  }
});

// 4) RESULTADOS
console.log("RAM:", sessionRAM);
console.log("RECORDS:", clinicalRecords);
console.log("AUDIT:", auditLog);
