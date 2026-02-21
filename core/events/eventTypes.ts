export enum ClinicalEventType {
  START_SESSION = "START_SESSION",
  PAUSE_SESSION = "PAUSE_SESSION",
  RESUME_SESSION = "RESUME_SESSION",
  END_SESSION = "END_SESSION",
  ANNOTATION_ADD = "ANNOTATION_ADD",
  SAVE_OUTPUT_TO_RECORD = "SAVE_OUTPUT_TO_RECORD",
  EXECUTE_AGENT_QUERY = "EXECUTE_AGENT_QUERY"
}

export interface ClinicalEvent {
  type: ClinicalEventType;
  payload: any;
  issuedBy: "human" | "system";
  timestamp: string;
}