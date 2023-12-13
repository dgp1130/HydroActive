import { Action, CancelAction, Scheduler } from './scheduler.js';

let singletonScheduler: UiScheduler | undefined;

/**
 * A {@link Scheduler} implementation which schedules actions to be run on the
 * next animation frame. Does *not* batch multiple actions together into a
 * single {@link requestAnimationFrame} call. This scheduler is ideal for
 * scheduling UI operations which affect the DOM.
 */
export class UiScheduler implements Scheduler {
  private constructor() {}

  /** Provides a {@link UiScheduler}. */
  public static from(): UiScheduler {
    if (!singletonScheduler) singletonScheduler = new UiScheduler();
    return singletonScheduler;
  }

  public schedule(action: Action): CancelAction {
    const id = requestAnimationFrame(() => { action(); });

    return () => { cancelAnimationFrame(id); };
  }
}
