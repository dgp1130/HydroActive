import { StabilityTracker } from './stability-tracker.js';
import { Action, CancelAction, Scheduler } from './scheduler.js';

/**
 * Basic {@link Scheduler} implementation using `setTimeout` for testing. We can
 * use Jasmine's mocked clock to trigger actions for testing purposes.
 */
class SetTimeoutScheduler extends Scheduler {
  readonly #timeout: number;

  public constructor(timeout: number = 0) {
    super();

    this.#timeout = timeout;
  }

  public override schedule(action: Action): CancelAction {
    const handle = setTimeout(action, this.#timeout);
    return () => { clearTimeout(handle); };
  }
}

describe('stability-tracker', () => {
  describe('StabilityTracker', () => {
    beforeEach(() => { jasmine.clock().install(); });
    afterEach(() => { jasmine.clock().uninstall(); });

    describe('wrap', () => {
      it('returns a scheduler which schedules actions and executes them', () => {
        const tracker = StabilityTracker.from();
        const scheduler = tracker.wrap(new SetTimeoutScheduler());

        const action = jasmine.createSpy<Action>('action');

        scheduler.schedule(action);
        expect(action).not.toHaveBeenCalled();

        jasmine.clock().tick(0);

        expect(action).toHaveBeenCalledOnceWith();
      });

      it('returns a scheduler which does not schedule an action multiple times', () => {
        const tracker = StabilityTracker.from();
        const scheduler = tracker.wrap(new SetTimeoutScheduler());

        const action = jasmine.createSpy<Action>('action');

        scheduler.schedule(action);
        expect(action).not.toHaveBeenCalled();

        // Lots of time passes.
        jasmine.clock().tick(1);
        jasmine.clock().tick(2);
        jasmine.clock().tick(3);

        // Still only called once.
        expect(action).toHaveBeenCalledOnceWith();
      });

      it('returns a scheduler which schedules multiple independent actions at the same time', () => {
        const tracker = StabilityTracker.from();
        const scheduler = tracker.wrap(new SetTimeoutScheduler());

        const action1 = jasmine.createSpy<Action>('action1');
        const action2 = jasmine.createSpy<Action>('action2');

        scheduler.schedule(action1);
        scheduler.schedule(action2);
        expect(action1).not.toHaveBeenCalled();
        expect(action2).not.toHaveBeenCalled();

        jasmine.clock().tick(0);

        expect(action1).toHaveBeenCalledOnceWith();
        expect(action2).toHaveBeenCalledOnceWith();
      });

      it('returns a scheduler which schedules multiple independent actions sequentially', () => {
        const tracker = StabilityTracker.from();
        const scheduler = tracker.wrap(new SetTimeoutScheduler());

        const action1 = jasmine.createSpy<Action>('action1');
        const action2 = jasmine.createSpy<Action>('action2');

        scheduler.schedule(action1);
        expect(action1).not.toHaveBeenCalled();

        jasmine.clock().tick(0);
        expect(action1).toHaveBeenCalledOnceWith();
        action1.calls.reset();

        scheduler.schedule(action2);
        expect(action2).not.toHaveBeenCalled();

        jasmine.clock().tick(0);
        expect(action1).not.toHaveBeenCalled();
        expect(action2).toHaveBeenCalledOnceWith();
      });

      it('returns a scheduler which ignores errors from an action', async () => {
        // Jasmine clock is very sensitive to errors and fails the test if a
        // `setTimeout` callback throws. Need a real clock for this test.
        jasmine.clock().uninstall();

        try {
          await jasmine.spyOnGlobalErrorsAsync(async (globalErrorSpy) => {
            const tracker = StabilityTracker.from();
            const scheduler = tracker.wrap(new SetTimeoutScheduler());

            // WTR will log this uncaught error to the console, even though it
            // is expected to be uncaught. Just give it a clear name and drop
            // the stack to make it less noisy.
            const err = new Error('Expected this error to be uncaught.');
            delete err.stack;

            const action1 = jasmine.createSpy<Action>('action1')
                .and.throwError(err);

            scheduler.schedule(action1);

            await new Promise<void>((resolve) => {
              setTimeout(() => { resolve(); });
            });
            expect(action1).toHaveBeenCalledOnceWith();

            // Assert `setTimeout` callback throws, essentially an uncaught
            // error.
            expect(globalErrorSpy).toHaveBeenCalledOnceWith(err);

            const action2 = jasmine.createSpy<Action>('action2');
            scheduler.schedule(action2);
            expect(action2).not.toHaveBeenCalled();

            await new Promise<void>((resolve) => {
              setTimeout(() => { resolve(); });
            });
            expect(action2).toHaveBeenCalledOnceWith();
          });
        } finally {
          jasmine.clock().install(); // Re-install the clock for other tests.
        }
      });

      it('returns a scheduler which cancels an action when the cancel callback is invoked', () => {
        const tracker = StabilityTracker.from();
        const scheduler = tracker.wrap(new SetTimeoutScheduler());

        const action = jasmine.createSpy<Action>('action');

        const cancel = scheduler.schedule(action);
        cancel();
        expect(action).not.toHaveBeenCalled();

        jasmine.clock().tick(0);
        expect(action).not.toHaveBeenCalled();
      });

      it('returns a scheduler which cancels actions independently', () => {
        const tracker = StabilityTracker.from();
        const scheduler = tracker.wrap(new SetTimeoutScheduler());

        const action1 = jasmine.createSpy<Action>('action1');
        const action2 = jasmine.createSpy<Action>('action2');

        const cancel1 = scheduler.schedule(action1);
        scheduler.schedule(action2);

        cancel1();
        expect(action1).not.toHaveBeenCalled();
        expect(action2).not.toHaveBeenCalled();

        jasmine.clock().tick(0);

        expect(action1).not.toHaveBeenCalled();
        expect(action2).toHaveBeenCalledOnceWith();
      });

      it('returns a scheduler which ignores canceling actions which have already executed', () => {
        const tracker = StabilityTracker.from();
        const scheduler = tracker.wrap(new SetTimeoutScheduler());
        const action1 = jasmine.createSpy<Action>('action1');
        const action2 = jasmine.createSpy<Action>('action2');

        const cancel = scheduler.schedule(action1);

        jasmine.clock().tick(0);
        expect(action1).toHaveBeenCalledOnceWith();
        action1.calls.reset();

        expect(() => cancel()).not.toThrow();
        expect(action1).not.toHaveBeenCalled();

        scheduler.schedule(action2);

        jasmine.clock().tick(0);
        expect(action1).not.toHaveBeenCalledOnceWith();
        expect(action2).toHaveBeenCalledOnceWith();
      });

      it('returns a scheduler which ignores canceling actions which have already been canceled', () => {
        const tracker = StabilityTracker.from();
        const scheduler = tracker.wrap(new SetTimeoutScheduler());
        const action1 = jasmine.createSpy<Action>('action1');
        const action2 = jasmine.createSpy<Action>('action2');

        const cancel = scheduler.schedule(action1);

        cancel(); // Cancel the action.
        expect(() => cancel()).not.toThrow(); // Extra `cancel` call.
        expect(action1).not.toHaveBeenCalled();

        scheduler.schedule(action2);

        jasmine.clock().tick(0);
        expect(action1).not.toHaveBeenCalledOnceWith();
        expect(action2).toHaveBeenCalledOnceWith();
      });

      it('returns a scheduler which throws if the underlying `scheduleAction` throws', () => {
        const err = new Error('Oh noes!');
        class BadScheduler extends Scheduler {
          public override schedule(): never {
            throw err;
          }
        }

        const tracker = StabilityTracker.from();
        const scheduler = tracker.wrap(new BadScheduler());

        expect(() => scheduler.schedule(() => {})).toThrow(err);
      });

      it('ignores actions scheduled on the input `Scheduler`', () => {
        const tracker = StabilityTracker.from();
        const inputScheduler = new SetTimeoutScheduler();
        tracker.wrap(inputScheduler);

        inputScheduler.schedule(() => {});
        expect(tracker.isStable()).toBeTrue(); // Ignores `inputScheduler`.

        jasmine.clock().tick(0);
      });

      it('caches wrapped schedulers', () => {
        const tracker = StabilityTracker.from();
        const scheduler = new SetTimeoutScheduler();
        const wrapped1 = tracker.wrap(scheduler);
        const wrapped2 = tracker.wrap(scheduler);

        // Should reuse first wrapped scheduler.
        expect(wrapped1).toBe(wrapped2);
      });

      it('does not cache different schedulers', () => {
        const tracker = StabilityTracker.from();
        const scheduler1 = tracker.wrap(new SetTimeoutScheduler());
        const scheduler2 = tracker.wrap(new SetTimeoutScheduler());

        expect(scheduler1).not.toBe(scheduler2);
      });
    });

    describe('isStable', () => {
      it('returns true before any actions are scheduled', () => {
        const tracker = StabilityTracker.from();

        expect(tracker.isStable()).toBeTrue();
      });

      it('returns whether the scheduler is stable', () => {
        const tracker = StabilityTracker.from();
        const scheduler = tracker.wrap(new SetTimeoutScheduler());

        scheduler.schedule(() => {});
        expect(tracker.isStable()).toBeFalse();

        jasmine.clock().tick(0);
        expect(tracker.isStable()).toBeTrue();
      });

      it('manages stability across multiple schedulers', () => {
        const tracker = StabilityTracker.from();
        const scheduler1 = tracker.wrap(new SetTimeoutScheduler());
        const scheduler2 = tracker.wrap(new SetTimeoutScheduler(1));

        const action1 = jasmine.createSpy<Action>('action1');
        scheduler1.schedule(action1);
        const action2 = jasmine.createSpy<Action>('action2');
        scheduler2.schedule(action2);

        expect(tracker.isStable()).toBeFalse();

        jasmine.clock().tick(0);
        expect(action1).toHaveBeenCalled();
        expect(action2).not.toHaveBeenCalled();
        expect(tracker.isStable()).toBeFalse(); // Still waiting for `action2`.

        jasmine.clock().tick(1);
        expect(action2).toHaveBeenCalled();
        expect(tracker.isStable()).toBeTrue();
      });

      it('returns true when stable after a canceled action', () => {
        const tracker = StabilityTracker.from();
        const scheduler = tracker.wrap(new SetTimeoutScheduler());

        const cancel = scheduler.schedule(() => {});
        expect(tracker.isStable()).toBeFalse();

        cancel();
        expect(tracker.isStable()).toBeTrue();
      });

      it('returns false when unstable after a canceled action', () => {
        const tracker = StabilityTracker.from();
        const scheduler1 = tracker.wrap(new SetTimeoutScheduler());
        const scheduler2 = tracker.wrap(new SetTimeoutScheduler());

        const action1 = jasmine.createSpy<Action>('action1');
        const cancel = scheduler1.schedule(action1);

        const action2 = jasmine.createSpy<Action>('action2');
        scheduler2.schedule(action2);

        expect(tracker.isStable()).toBeFalse();

        cancel();
        expect(tracker.isStable()).toBeFalse();

        jasmine.clock().tick(0);
        expect(action1).not.toHaveBeenCalled();
        expect(action2).toHaveBeenCalled();
        expect(tracker.isStable()).toBeTrue();
      });

      it('handles actions which are both executed *and* canceled', async () => {
        const tracker = StabilityTracker.from();
        const scheduler = tracker.wrap(new SetTimeoutScheduler());

        const action = jasmine.createSpy<Action>('action');

        const cancel = scheduler.schedule(() => {});
        expect(tracker.isStable()).toBeFalse();

        jasmine.clock().tick(0); // Executes action.
        expect(tracker.isStable()).toBeTrue();

        cancel(); // Canceled after execution.
        expect(tracker.isStable()).toBeTrue();

        // Stability should not be corrupted.
        scheduler.schedule(action);
        expect(tracker.isStable()).toBeFalse();

        jasmine.clock().tick(0);
        expect(tracker.isStable()).toBeTrue();
        expect(action).toHaveBeenCalled();
      });

      it('handles actions which are canceled multiple times', async () => {
        const tracker = StabilityTracker.from();
        const scheduler = tracker.wrap(new SetTimeoutScheduler());

        const action = jasmine.createSpy<Action>('action');

        const cancel = scheduler.schedule(() => {});
        expect(tracker.isStable()).toBeFalse();

        // *Incorrectly* cancel the action twice.
        cancel();
        expect(tracker.isStable()).toBeTrue();

        cancel();
        expect(tracker.isStable()).toBeTrue();

        // Stability should not be corrupted.
        scheduler.schedule(action);
        expect(tracker.isStable()).toBeFalse();
        jasmine.clock().tick(0);
        expect(tracker.isStable()).toBeTrue();
        expect(action).toHaveBeenCalled();
      });
    });

    describe('stable', () => {
      it('resolves immediately when no actions are pending', async () => {
        const tracker = StabilityTracker.from();

        await expectAsync(tracker.stable()).toBeResolved();
      });

      it('waits and resolves once pending actions have executed', async () => {
        const tracker = StabilityTracker.from();
        const scheduler = tracker.wrap(new SetTimeoutScheduler());

        scheduler.schedule(() => {});

        const stable = tracker.stable();
        await expectAsync(stable).toBePending(); // Should be initially pending.

        jasmine.clock().tick(0);
        await expectAsync(stable).toBeResolved();
      });

      it('waits and resolves once pending actions are canceled', async () => {
        const tracker = StabilityTracker.from();
        const scheduler = tracker.wrap(new SetTimeoutScheduler());

        const action = jasmine.createSpy<Action>('action');

        const cancel = scheduler.schedule(action);

        const stable = tracker.stable();
        await expectAsync(stable).toBePending(); // Should be initially pending.

        cancel();
        await expectAsync(stable).toBeResolved();
        expect(action).not.toHaveBeenCalled();
      });

      it('waits and resolves once all pending actions have executed across multiple schedulers', async () => {
        const tracker = StabilityTracker.from();
        const scheduler1 = tracker.wrap(new SetTimeoutScheduler());
        const scheduler2 = tracker.wrap(new SetTimeoutScheduler(1));

        const action1 = jasmine.createSpy<Action>('action1');
        scheduler1.schedule(action1);
        const action2 = jasmine.createSpy<Action>('action2');
        scheduler2.schedule(action2);

        const stable = tracker.stable();
        await expectAsync(stable).toBePending(); // Should be initially pending.

        jasmine.clock().tick(0);
        expect(action1).toHaveBeenCalled();
        expect(action2).not.toHaveBeenCalled();
        await expectAsync(stable).toBePending(); // Still waiting for `action2`.

        jasmine.clock().tick(1);
        expect(action2).toHaveBeenCalled();
        await expectAsync(stable).toBeResolved();
      });

      it('waits for actions scheduled in an action callback', async () => {
        const tracker = StabilityTracker.from();
        const scheduler = tracker.wrap(new SetTimeoutScheduler());

        const action = jasmine.createSpy<Action>('action');

        scheduler.schedule(() => {
          scheduler.schedule(action);
        });

        await pollAndTrigger(tracker.stable(), () => {
          jasmine.clock().tick(2);
        });
        expect(action).toHaveBeenCalled();
      });

      // If this last action queues a microtask which schedules a new action,
      // then that microtask would be executed *after* the scheduler decides it
      // is stable but before `await tracker.stable()` can resume, meaning the
      // scheduler might still be unstable even after the `await`. This test
      // exercises this exact case.
      it('waits for actions scheduled in microtasks from an action', async () => {
        const tracker = StabilityTracker.from();
        const scheduler = tracker.wrap(new SetTimeoutScheduler());

        const action = jasmine.createSpy<Action>('action');

        scheduler.schedule(() => {
          queueMicrotask(() => {
            scheduler.schedule(action);
          });
        });

        await pollAndTrigger(tracker.stable(), async () => {
          jasmine.clock().tick(0);
          await microTask();
          jasmine.clock().tick(0);
        });
        expect(action).toHaveBeenCalled();
      });

      // Replicate the previous test case multiple times in a row to verify that
      // the scheduler correctly waits each time it happens consecutively.
      it('continuously waits for actions scheduled in microtasks from an action', async () => {
        const tracker = StabilityTracker.from();
        const scheduler = tracker.wrap(new SetTimeoutScheduler());

        const action = jasmine.createSpy<Action>('action');

        scheduler.schedule(() => {
          queueMicrotask(() => {
            scheduler.schedule(() => {
              queueMicrotask(() => {
                scheduler.schedule(action);
              });
            });
          });
        });

        await pollAndTrigger(tracker.stable(), async () => {
          jasmine.clock().tick(0);
          await microTask();
          jasmine.clock().tick(0);
          await microTask();
          jasmine.clock().tick(0);
        });
        expect(action).toHaveBeenCalled();
      });

      it('handles actions which are both executed *and* canceled', async () => {
        const tracker = StabilityTracker.from();
        const scheduler = tracker.wrap(new SetTimeoutScheduler());

        const action = jasmine.createSpy<Action>('action');

        const cancel = scheduler.schedule(() => {});
        await pollAndTrigger(tracker.stable(), () => {
          jasmine.clock().tick(0);
        });
        cancel(); // Canceled after execution.

        scheduler.schedule(action);

        // Stability should not be corrupted.
        jasmine.clock().tick(0);
        await expectAsync(tracker.stable()).toBeResolved();
        expect(action).toHaveBeenCalled();
      });

      it('handles actions which are canceled multiple times', async () => {
        const tracker = StabilityTracker.from();
        const scheduler = tracker.wrap(new SetTimeoutScheduler());

        const action = jasmine.createSpy<Action>('action');

        // Schedule an action and *incorrectly* cancel it twice.
        const cancel = scheduler.schedule(() => {});
        cancel();
        cancel();

        // Stability should not be corrupted.
        scheduler.schedule(action);
        await pollAndTrigger(tracker.stable(), () => {
          jasmine.clock().tick(0);
        });
        expect(action).toHaveBeenCalled();
      });
    });
  });
});

/**
 * Syntax sugar for taking an existing `Promise`, running an action, then
 * `await`-ing that `Promise`. Allows convenient use of `await` while ensuring
 * the `Promise` is created *before* the action occurs.
 */
function pollAndTrigger<Value>(
  promise: Promise<Value>,
  callback: () => void,
): Promise<Value> {
  callback();
  return promise;
}

/** Waits one microtask. */
function microTask(): Promise<void> {
  // `resolve` naturally waits one microtask before triggering
  // `Promise.prototype.then`.
  return new Promise<void>((resolve) => {
    resolve();
  });
}
