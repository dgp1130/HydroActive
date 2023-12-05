import { Action, CancelAction, Scheduler } from './scheduler.js';

let singletonScheduler: MacrotaskScheduler | undefined;

/**
 * A {@link Scheduler} implementation which schedules actions to be run on the
 * next macrotask. Does *not* batch multiple actions together into a single
 * macrotask.
 */
export class MacrotaskScheduler implements Scheduler {
  private constructor() {}

  /** Provides a {@link MacrotaskScheduler}. */
  public static from(): MacrotaskScheduler {
    if (!singletonScheduler) singletonScheduler = new MacrotaskScheduler();
    return singletonScheduler;
  }

  public schedule(callback: Action): CancelAction {
    const id = setTimeout(() => { callback(); });

    return () => { clearInterval(id); };
  }
}
