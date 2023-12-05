/** @fileoverview Defines an interface for scheduling work. */

/**
 * Schedules a callback to be invoked at a later time. The precise timing of
 * invocation is intentionally left as an implementation detail. Each scheduler
 * implementation may define its own algorithm for determining when an action
 * should be executed.
 */
export interface Scheduler {
  /**
   * Schedules the given `action` to be invoked.
   *
   * When invoked, the action's return value is ignored and any errors are
   * dropped.
   *
   * @returns A {@link CancelAction} function which, when called, will cancel
   *     the scheduled action and prevent it from being invoked. If the action
   *     has already been invoked, canceling it has no effect.
   */
  schedule(action: Action): CancelAction;
}

/** A side-effectful action to be scheduled and invoked. */
export type Action = () => void;

/** A function which cancels an already scheduled action. */
export type CancelAction = () => void;
