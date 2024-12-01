/** @fileoverview Defines an interface for scheduling work. */

/**
 * Schedules a callback to be invoked at a later time. The precise timing of
 * invocation is intentionally left as an implementation detail. Each scheduler
 * implementation may define its own algorithm for determining when an action
 * should be executed.
 */
export abstract class Scheduler {
  /**
   * Implements the scheduler by scheduling the given action to be invoked.
   * Returns a `cancel` function which cancels the scheduled action.
   *
   * @param action The {@link Action} to schedule.
   * @returns A callback which, when invoked, cancels `action` from ever being
   *     executed.
   */
  protected abstract scheduleAction(action: Action): CancelAction;

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
  public schedule(action: Action): CancelAction {
    return this.scheduleAction(action);
  }
}

/** A side-effectful action to be scheduled and invoked. */
export type Action = () => void;

/** A function which cancels an already scheduled action. */
export type CancelAction = () => void;
