export interface ClinicalRecord {
  patientId: string;
  content: any;
  timestamp: string;
}

export const clinicalRecords: ClinicalRecord[] = [];