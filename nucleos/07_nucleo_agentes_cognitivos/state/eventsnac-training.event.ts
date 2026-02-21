export type NACTrainingEvent = {
  type: 'NAC_TRAINING_VALIDATE';
  agentId: string;
  instruction: string;
  createdBy: string;
};
