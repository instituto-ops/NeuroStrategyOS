export class ClinicalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClinicalError";
  }
}