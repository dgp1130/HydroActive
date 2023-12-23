import { Action, CancelAction, Scheduler } from './scheduler.js';

/**
 * A {@link Scheduler} implementation for use in testing. Does not ever
 * automatically invoke a scheduled task, but instead waits to be manually
 * flushed during a test.
 */
export class TestScheduler extends Scheduler {
  /** Queue of actions to be invoked. */
  readonly #queue: Array<Action> = [];

  private constructor() {
    super();
  }

  /** Constructs a new {@link TestScheduler}. */
  public static from(): TestScheduler {
    return new TestScheduler();
  }

  protected scheduleAction(action: Action): CancelAction {
    this.#queue.push(action);

    return () => {
      const index = this.#queue.findIndex((a) => a === action);
      if (index === -1) return; // Already executed.

      this.#queue.splice(index, 1);
    }
  }

  /** Executes all pending actions. */
  public flush(): void {
    const errors: unknown[] = [];
    for (const action of this.#queue) {
      try {
        action();
      } catch (err) {
        errors.push(err);
      }
    }

    this.#queue.splice(0, this.#queue.length);

    if (errors.length !== 0) {
      throw new AggregateError(errors, 'One or more scheduled actions threw.');
    }
  }
}
