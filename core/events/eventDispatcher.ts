import { ClinicalEvent } from "./eventTypes";
import { StateMachine } from "../state/stateMachine";
import { GuardEstado } from "../guards/GuardEstado";
import { GuardAutorHumano } from "../guards/GuardAutorHumano";
import { routeEvent } from "../integration/eventRouter";

export class EventDispatcher {
  constructor(
    private stateMachine: StateMachine
  ) {}

  dispatch(event: ClinicalEvent) {
    // Guards estruturais
    GuardAutorHumano.check(event);
    GuardEstado.check(event, this.stateMachine.getState());

    // Roteamento autorizado (RAM / records / audit)
    routeEvent(event);

    return true;
  }
}
