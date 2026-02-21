import { ClinicalEvent } from "../events/eventTypes";

export class GuardAutorHumano {
  static check(event: ClinicalEvent) {
    if (event.issuedBy !== "human") {
      throw new Error("Evento clínico não autorizado por IA.");
    }
  }
}