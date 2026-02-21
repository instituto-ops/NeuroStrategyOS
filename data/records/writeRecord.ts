import { ClinicalEvent } from "../../core/events/eventTypes";
import { clinicalRecords } from "./clinicalRecords";

export function writeRecord(event: ClinicalEvent) {
  clinicalRecords.push({
    patientId: event.payload.patient_id,
    content: event.payload.content,
    timestamp: event.timestamp
  });
}