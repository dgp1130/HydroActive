import { Action, CancelAction, Scheduler } from './scheduler.js';

/**
 * A {@link Scheduler} implementation which schedules actions to be run on the
 * next animation frame. Does *not* batch multiple actions together into a
 * single {@link requestAnimationFrame} call. This scheduler is ideal for
 * scheduling UI operations which affect the DOM.
 */
export class UiScheduler implements Scheduler {
  /** Provides a {@link UiScheduler}. */
  public static from(): UiScheduler {
    return new UiScheduler();
  }

  public schedule(action: Action): CancelAction {
    const handle = requestAnimationFrame(() => { action(); });

    return () => { cancelAnimationFrame(handle); };
  }
}
