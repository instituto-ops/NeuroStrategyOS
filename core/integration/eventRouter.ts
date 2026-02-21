import { ClinicalEvent, ClinicalEventType } from "../events/eventTypes";
import { sessionRAM } from "../../data/ram/sessionMemory";
import { clinicalRecords } from "../../data/records/clinicalRecords";
import { auditLog } from "../../data/audit/auditLog";

export function routeEvent(event: ClinicalEvent) {
  switch (event.type) {
    case ClinicalEventType.ANNOTATION_ADD:
    case ClinicalEventType.EXECUTE_AGENT_QUERY: {
      const sessionId = event.payload?.session_id;
      if (!sessionId) return;

      if (!sessionRAM[sessionId]) {
        sessionRAM[sessionId] = { sessionId, buffers: {} };
      }

      sessionRAM[sessionId].buffers[event.type] = event.payload;
      break;
    }

    case ClinicalEventType.SAVE_OUTPUT_TO_RECORD:
      clinicalRecords.push({
        patientId: event.payload.patient_id,
        content: event.payload.content,
        timestamp: event.timestamp
      });

      auditLog.push({
        action: "PERSISTENCE",
        actor: event.issuedBy,
        timestamp: event.timestamp
      });
      break;

    default:
      auditLog.push({
        action: "IGNORED_EVENT",
        actor: event.issuedBy,
        timestamp: event.timestamp
      });
      break;
  }
}
