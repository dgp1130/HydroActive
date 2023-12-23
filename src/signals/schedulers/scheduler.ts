/** @fileoverview Defines an interface for scheduling work. */

/**
 * Schedules a callback to be invoked at a later time. The precise timing of
 * invocation is intentionally left as an implementation detail. Each scheduler
 * implementation may define its own algorithm for determining when an action
 * should be executed.
 */
export abstract class Scheduler {
  /**
   * How many actions are "pending" (scheduled and not yet executed or
   * canceled.)
   */
  #pendingActions = 0;
  private get pendingActions(): number {
    return this.#pendingActions;
  }
  private set pendingActions(value: number) {
    this.#pendingActions = value;

    // If the scheduler just became stable, resolve any open promises waiting
    // for the scheduler to become stable.
    if (this.isStable()) this.#resolveStablePromise?.();
  }

  /**
   * A {@link Promise} which will resolve when the scheduler becomes "stable"
   * (no currently scheduled actions).
   */
  #stablePromise?: Promise<void>;

  /** The `resolve` function of `#stablePromise`. */
  #resolveStablePromise?: () => void;

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
    let finalized = false;
    const finalize = (): void => {
      // Only finalize an action once.
      if (finalized) return;
      finalized = true;

      // Action is no longer pending, check if we need to resolve any open
      // stability promises.
      this.pendingActions--;
    };

    this.pendingActions++;
    const cancel = this.scheduleAction(() => {
      try {
        action();
      } finally {
        finalize();
      }
    });

    return () => {
      cancel();
      finalize();
    };
  }

  /**
   * Returns whether or not this {@link Scheduler} is stable. A
   * {@link Scheduler} is considered "stable" if there are no currently
   * scheduled actions which have not yet been executed or canceled.
   *
   * @returns Whether or not the scheduler is stable.
   */
  public isStable(): boolean {
    return this.#pendingActions === 0;
  }

  /**
   * Returns a {@link Promise} which resolves when the scheduler becomes stable.
   * A {@link Scheduler} is considered "stable" if there are no currently
   * scheduled actions which have not yet been executed or canceled.
   *
   * @returns A {@link Promise} which resolves when the scheduler becomes
   *     stable.
   */
  public async stable(): Promise<void> {
    // Check if the scheduler is already stable.
    if (this.isStable()) return;

    // Create a new `Promise` to track stability if one doesn't already exist.
    if (!this.#stablePromise) {
      this.#stablePromise = new Promise<void>((resolve) => {
        this.#resolveStablePromise = () => {
          resolve();
          this.#stablePromise = undefined;
          this.#resolveStablePromise = undefined;
        };
      });
    }

    // Wait until the schedule is stable.
    await this.#stablePromise!;

    // If the last action executed happens to queue a microtask, then that
    // microtask will execute *after* `this.stablePromise` is resolved, but
    // before `await this.stablePromise` resumes. Normally that's fine, but if
    // the microtask also happens to *schedule* a new action on this scheduler,
    // we may end up resolving a `scheduler.stable()` promise when the scheduler
    // has already become unstable again.
    //
    // To address this, we double check stability to be sure and recursively
    // re-await if a new action was added.
    if (!this.isStable()) await this.stable();
  }
}

/** A side-effectful action to be scheduled and invoked. */
export type Action = () => void;

/** A function which cancels an already scheduled action. */
export type CancelAction = () => void;
