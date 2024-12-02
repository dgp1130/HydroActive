import { Connectable } from '../connectable.js';
import { effect } from './effect.js';
import { StabilityTracker } from './schedulers/stability-tracker.js';
import { Scheduler } from './schedulers/scheduler.js';

/**
 * Represents the "root" of reactive effects. This manages starting and
 * stopping effects based on a component being attached to / detached from the
 * document.
 */
export interface ReactiveRoot {
  /**
   * Create an effect which executes the given callback. The effect is
   * automatically enabled / disabled when the associated component attaches to
   * / disconnects from the document.
   *
   * @param callback The callback to invoke which executes a signal-based side
   *     effect.
   * @param scheduler A scheduler to use for invoking the effect callback. If no
   *     scheduler is provided, a default is used.
   */
  effect(callback: () => void, scheduler?: Scheduler): void;
}

/**
 * Represents the "root" of reactive effects. This manages starting and
 * stopping effects based on a component being attached to / detached from the
 * document.
 *
 * We need this class to be independent of the interface because otherwise ES
 * private variables leak into the type.
 */
export class ReactiveRootImpl implements ReactiveRoot {
  readonly #connectable: Connectable;
  readonly #tracker: StabilityTracker;
  readonly #defaultScheduler: Scheduler;

  private constructor(
    connectable: Connectable,
    tracker: StabilityTracker,
    defaultScheduler: Scheduler,
  ) {
    this.#connectable = connectable;
    this.#tracker = tracker;
    this.#defaultScheduler = defaultScheduler;
  }

  /**
   * Provides a new {@link ReactiveRootImpl}.
   *
   * @param connectable The {@link Connectable} which tracks connectivity of the
   *     component these effects will be scheduled with.
   * @param tracker A {@link StabilityTracker} to track stability of the root.
   * @param scheduler A default {@link Scheduler} to use when scheduling
   *     effects.
   * @returns A {@link ReactiveRootImpl}.
   */
  public static from(
    connectable: Connectable,
    tracker: StabilityTracker,
    scheduler: Scheduler,
  ): ReactiveRootImpl {
    return new ReactiveRootImpl(connectable, tracker, scheduler);
  }

  public effect(
    callback: () => void,
    scheduler: Scheduler = this.#defaultScheduler,
  ): void {
    this.#connectable.connected(() => {
      const wrappedScheduler = this.#tracker.wrap(scheduler);
      return effect(callback, wrappedScheduler);
    });
  }
}
