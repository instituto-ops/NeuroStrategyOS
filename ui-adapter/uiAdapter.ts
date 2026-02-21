import { clinicalEventDispatcher } from "../core";
import { ClinicalEventType, ClinicalEvent } from "../core/events/eventTypes";

export function emitUIEvent(event: {
  type: ClinicalEventType;
  payload: any;
}) {
  const clinicalEvent: ClinicalEvent = {
    type: event.type,
    payload: event.payload,
    issuedBy: "human",
    timestamp: new Date().toISOString()
  };

  return clinicalEventDispatcher.dispatch(clinicalEvent);
}