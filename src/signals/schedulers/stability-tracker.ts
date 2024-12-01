import { Action, CancelAction, Scheduler } from './scheduler.js';

/**
 * Tracks stability based on whether any pending actions are waiting to be
 * executed from any wrapped {@link Scheduler} objects.
 *
 * Provides a {@link StabilityTracker.prototype.wrap} function which wraps a
 * {@link Scheduler} into a new one which is tracked by the wrapping
 * {@link StabilityTracker}. Reports stability based on any pending actions.
 */
export class StabilityTracker {
  private constructor() {}

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

  /** Provides an {@link StabilityTracker}. */
  public static from(): StabilityTracker {
    return new StabilityTracker();
  }

  /** A cache of {@link Scheduler} objects which have already been wrapped. */
  readonly #wrapperCache = new WeakMap<Scheduler, WrappedScheduler>();

  /**
   * Wraps the given {@link Scheduler} by creating a new {@link Scheduler} tied
   * to this {@link StabilityTracker}. When the resulting {@link Scheduler}
   * schedules an action, this {@link StabilityTracker} tracks its state and
   * reports stability.
   *
   * Example:
   *
   * ```typescript
   * const tracker = StabilityTracker.from();
   * const scheduler = tracker.wrap(new SomeScheduler());
   *
   * tracker.isStable(); // `true`, nothing scheduled.
   *
   * let executed = false;
   * scheduler.schedule(() => {
   *   executed = true;
   * });
   * tracker.isStable(); // `false`, something scheduled.
   *
   * await tracker.stable();
   * executed; // `true`, waited for action.
   * ```
   */
  public wrap(scheduler: Scheduler): Scheduler {
    const cached = this.#wrapperCache.get(scheduler);
    if (cached) return cached;

    const wrapped = this.#createWrappedScheduler(scheduler);
    this.#wrapperCache.set(scheduler, wrapped);
    return wrapped;
  }

  /** Creates a {@link WrappedScheduler} from the given {@link Scheduler}. */
  #createWrappedScheduler(scheduler: Scheduler): WrappedScheduler {
    return WrappedScheduler.from(scheduler, (schedule) => {
      return (action) => {
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
        const cancel = schedule(() => {
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
      };
    });
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
    this.#stablePromise ??= new Promise<void>((resolve) => {
      this.#resolveStablePromise = () => {
        resolve();
        this.#stablePromise = undefined;
        this.#resolveStablePromise = undefined;
      };
    });

    // Wait until the schedule is stable.
    await this.#stablePromise;

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

/** Schedule an action and return a function to cancel it. */
type Schedule = (action: Action) => CancelAction;

/** Transform a {@link Schedule} function into another implementation. */
type ScheduleTransform = (schedule: Schedule) => Schedule;

/**
 * A {@link Scheduler} which wraps another {@link Scheduler} by proxying the
 * {@link Scheduler.prototype.schedule} function.
 */
class WrappedScheduler implements Scheduler {
  readonly #schedule: Schedule;

  private constructor(schedule: Schedule) {
    this.#schedule = schedule;
  }

  /**
   * Returns a {@link WrappedScheduler} which wraps the provided
   * {@link Scheduler} using {@link transformSchedule}. Does not modify
   * {@link wrapped}.
   *
   * @param wrapped The {@link Scheduler} to wrap.
   * @param transformSchedule A {@link ScheduleTransform} which transforms the
   *     {@link Scheduler.prototype.schedule} function of {@link wrapped}.
   * @returns A {@link WrappedScheduler} which wraps the input
   *     {@link Scheduler}.
   */
  public static from(
    wrapped: Scheduler,
    transformSchedule: ScheduleTransform,
  ): WrappedScheduler {
    // Transform the `schedule` method of the input `Scheduler`.
    const schedule = transformSchedule(wrapped.schedule.bind(wrapped));
    return new WrappedScheduler(schedule);
  }

  public schedule(action: Action): CancelAction {
    return this.#schedule(action);
  }
}
