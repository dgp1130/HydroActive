/** @fileoverview Defines an interface for scheduling work. */

/**
 * Schedules a callback to be invoked at a later time. The precise timing of
 * invocation is intentionally left as an implementation detail. Each scheduler
 * implementation may define its own algorithm for determining when an action
 * should be executed.
 */
export interface Scheduler {
  /**
   * Schedules the given action to be invoked. Returns a {@link CancelAction}
   * function which cancels the scheduled action.
   *
   * Multiple calls to the returned {@link CancelAction} function have no
   * effect. Calling the returned {@link CancelAction} function after
   * {@link action} was executed has no effect.
   *
   * @param action The {@link Action} to schedule.
   * @returns A callback which, when invoked, cancels {@link action} from ever
   *     being executed.
   */
  schedule(action: Action): CancelAction;
}

/** A side-effectful action to be scheduled and invoked. */
export type Action = () => void;

/** A function which cancels an already scheduled action. */
export type CancelAction = () => void;
