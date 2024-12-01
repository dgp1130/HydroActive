import { Action, CancelAction, Scheduler } from './scheduler.js';

/**
 * Basic {@link Scheduler} implementation using `setTimeout` for testing. We can
 * use Jasmine's mocked clock to trigger actions for testing purposes.
 */
class SetTimeoutScheduler extends Scheduler {
  public override schedule(action: Action): CancelAction {
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
          public override schedule(_action: Action): never {
            throw err;
          }
        }

        const scheduler = new BadScheduler();

        expect(() => scheduler.schedule(() => {})).toThrow(err);
      });
    });
  });
});
