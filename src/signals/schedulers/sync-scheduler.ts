import { Action, CancelAction, Scheduler } from './scheduler.js';

/**
 * A {@link Scheduler} implementation which always executes operations
 * synchronously, immediately when scheduled.
 */
class SyncScheduler implements Scheduler {
  public schedule(action: Action): CancelAction {
    action();
    return () => {};
  }
}

/** Singleton {@link SyncScheduler} for shared usage. */
export const syncScheduler = new SyncScheduler();
