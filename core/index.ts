import { StateMachine } from "./state/stateMachine";
import { EventDispatcher } from "./events/eventDispatcher";

export const clinicalStateMachine = new StateMachine();
export const clinicalEventDispatcher = new EventDispatcher(
  clinicalStateMachine
);