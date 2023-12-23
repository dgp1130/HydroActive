import { Action, CancelAction, Scheduler } from './scheduler.js';

/**
 * Basic {@link Scheduler} implementation using `setTimeout` for testing. We can
 * use Jasmine's mocked clock to trigger actions for testing purposes.
 */
class SetTimeoutScheduler extends Scheduler {
  protected override scheduleAction(action: Action): CancelAction {
    const handle = setTimeout(action);
    return () => { clearTimeout(handle); };
  }
}

describe('scheduler', () => {
  describe('Scheduler', () => {
    describe('schedule', () => {
      beforeEach(() => { jasmine.clock().install(); });
      afterEach(() => { jasmine.clock().uninstall(); });

      it('schedules actions and executes them', () => {
        const scheduler = new SetTimeoutScheduler();

        const action = jasmine.createSpy<Action>('action');

        scheduler.schedule(action);
        expect(action).not.toHaveBeenCalled();

        jasmine.clock().tick(0);

        expect(action).toHaveBeenCalledOnceWith();
      });

      it('does not schedule an action multiple times', () => {
        const scheduler = new SetTimeoutScheduler();

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

      it('schedules multiple independent actions at the same time', () => {
        const scheduler = new SetTimeoutScheduler();

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

      it('schedules multiple independent actions sequentially', () => {
        const scheduler = new SetTimeoutScheduler();

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

      it('ignores errors from an action', async () => {
        // Jasmine clock is very sensitive to errors and fails the test if a
        // `setTimeout` callback throws. Need a real clock for this test.
        jasmine.clock().uninstall();

        try {
          await jasmine.spyOnGlobalErrorsAsync(async (globalErrorSpy) => {
            const scheduler = new SetTimeoutScheduler();

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

      it('cancels an action when the cancel callback is invoked', () => {
        const scheduler = new SetTimeoutScheduler();

        const action = jasmine.createSpy<Action>('action');

        const cancel = scheduler.schedule(action);
        cancel();
        expect(action).not.toHaveBeenCalled();

        jasmine.clock().tick(0);
        expect(action).not.toHaveBeenCalled();
      });

      it('cancels actions independently', () => {
        const scheduler = new SetTimeoutScheduler();

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

      it('ignores canceling actions which have already executed', () => {
        const scheduler = new SetTimeoutScheduler();
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

      it('ignores canceling actions which have already been canceled', () => {
        const scheduler = new SetTimeoutScheduler();
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

      it('throws if the underlying `scheduleAction` throws', () => {
        const err = new Error('Oh noes!');
        class BadScheduler extends Scheduler {
          protected override scheduleAction(): never {
            throw err;
          }
        }

        const scheduler = new BadScheduler();

        expect(() => scheduler.schedule(() => {})).toThrow(err);
      });
    });

    describe('isStable', () => {
      beforeEach(() => { jasmine.clock().install(); });
      afterEach(() => { jasmine.clock().uninstall(); });

      it('returns true before any actions are scheduled', () => {
        const scheduler = new SetTimeoutScheduler();

        expect(scheduler.isStable()).toBeTrue();
      });

      it('returns whether the scheduler is stable', () => {
        const scheduler = new SetTimeoutScheduler();

        scheduler.schedule(() => {});
        expect(scheduler.isStable()).toBeFalse();

        jasmine.clock().tick(0);
        expect(scheduler.isStable()).toBeTrue();
      });

      it('returns true when stable after a canceled action', () => {
        const scheduler = new SetTimeoutScheduler();

        const cancel = scheduler.schedule(() => {});
        expect(scheduler.isStable()).toBeFalse();

        cancel();
        expect(scheduler.isStable()).toBeTrue();
      });

      it('handles actions which are both executed *and* canceled', async () => {
        const scheduler = new SetTimeoutScheduler();

        const action = jasmine.createSpy<Action>('action');

        const cancel = scheduler.schedule(() => {});
        expect(scheduler.isStable()).toBeFalse();

        jasmine.clock().tick(0); // Executes action.
        expect(scheduler.isStable()).toBeTrue();

        cancel(); // Canceled after execution.
        expect(scheduler.isStable()).toBeTrue();

        // Stability should not be corrupted.
        scheduler.schedule(action);
        expect(scheduler.isStable()).toBeFalse();

        jasmine.clock().tick(0);
        expect(scheduler.isStable()).toBeTrue();
        expect(action).toHaveBeenCalled();
      });

      it('handles actions which are canceled multiple times', async () => {
        const scheduler = new SetTimeoutScheduler();

        const action = jasmine.createSpy<Action>('action');

        const cancel = scheduler.schedule(() => {});
        expect(scheduler.isStable()).toBeFalse();

        // *Incorrectly* cancel the action twice.
        cancel();
        expect(scheduler.isStable()).toBeTrue();

        cancel();
        expect(scheduler.isStable()).toBeTrue();

        // Stability should not be corrupted.
        scheduler.schedule(action);
        expect(scheduler.isStable()).toBeFalse();
        jasmine.clock().tick(0);
        expect(scheduler.isStable()).toBeTrue();
        expect(action).toHaveBeenCalled();
      });
    });

    describe('stable', () => {
      it('resolves immediately when no actions are pending', async () => {
        const scheduler = new SetTimeoutScheduler();

        await expectAsync(scheduler.stable()).toBeResolved();
      });

      it('waits and resolves once pending actions have executed', async () => {
        const scheduler = new SetTimeoutScheduler();

        scheduler.schedule(() => {});

        const stable = scheduler.stable();
        await expectAsync(stable).toBePending(); // Should be initially pending.

        await expectAsync(stable).toBeResolved();
      });

      it('waits and resolves once pending actions are canceled', async () => {
        const scheduler = new SetTimeoutScheduler();

        const action = jasmine.createSpy<Action>('action');

        const cancel = scheduler.schedule(action);

        const stable = scheduler.stable();
        await expectAsync(stable).toBePending(); // Should be initially pending.

        cancel();
        await expectAsync(stable).toBeResolved();
        expect(action).not.toHaveBeenCalled();
      });

      it('waits for actions scheduled in an action callback', async () => {
        const scheduler = new SetTimeoutScheduler();

        const action = jasmine.createSpy<Action>('action');

        scheduler.schedule(() => {
          scheduler.schedule(action);
        });

        await scheduler.stable();
        expect(action).toHaveBeenCalled();
      });

      // If this last action queues a microtask which schedules a new action,
      // then that microtask would be executed *after* the scheduler decides it
      // is stable but before `await scheduler.stable()` can resume, meaning the
      // scheduler might still be unstable even after the `await`. This test
      // exercises this exact case.
      it('waits for actions scheduled in microtasks from an action', async () => {
        const scheduler = new SetTimeoutScheduler();

        const action = jasmine.createSpy<Action>('action');

        scheduler.schedule(() => {
          queueMicrotask(() => {
            scheduler.schedule(action);
          });
        });

        await scheduler.stable();
        expect(action).toHaveBeenCalled();
      });

      // Replicate the previous test case multiple times in a row to verify that
      // the scheduler correctly waits each time it happens consecutively.
      it('continuously waits for actions scheduled in microtasks from an action', async () => {
        const scheduler = new SetTimeoutScheduler();

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

        await scheduler.stable();
        expect(action).toHaveBeenCalled();
      });

      it('handles actions which are both executed *and* canceled', async () => {
        const scheduler = new SetTimeoutScheduler();

        const action = jasmine.createSpy<Action>('action');

        const cancel = scheduler.schedule(() => {});
        await scheduler.stable(); // Executes action.
        cancel(); // Canceled after execution.

        scheduler.schedule(action);

        // Stability should not be corrupted.
        await scheduler.stable();
        expect(action).toHaveBeenCalled();
      });

      it('handles actions which are canceled multiple times', async () => {
        const scheduler = new SetTimeoutScheduler();

        const action = jasmine.createSpy<Action>('action');

        // Schedule an action and *incorrectly* cancel it twice.
        const cancel = scheduler.schedule(() => {});
        cancel();
        cancel();

        // Stability should not be corrupted.
        scheduler.schedule(action);
        await scheduler.stable();
        expect(action).toHaveBeenCalled();
      });
    });
  });
});
