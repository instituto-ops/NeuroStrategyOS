import { ClinicalEvent } from "../../core/events/eventTypes";
import { auditLog } from "./auditLog";

export function writeAudit(event: ClinicalEvent, action: string) {
  auditLog.push({
    action,
    actor: event.issuedBy,
    timestamp: event.timestamp
  });
}