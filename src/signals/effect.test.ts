import { Action, CancelAction, Scheduler } from 'hydroactive/signals.js';
import { effect } from './effect.js';
import { StabilityTracker } from './schedulers/stability-tracker.js';
import { TestScheduler } from './schedulers/test-scheduler.js';
import { signal } from './signal.js';

describe('effect', () => {
  describe('effect', () => {
    it('schedules the given callback immediately', () => {
      const scheduler = TestScheduler.from();
      const action = jasmine.createSpy<() => void>('action');

      const dispose = effect(action, scheduler);
      expect(action).not.toHaveBeenCalled();

      scheduler.flush();
      expect(action).toHaveBeenCalledOnceWith();

      dispose();
    });

    it('reschedules the given callback when any dependency signal changes', () => {
      const scheduler = TestScheduler.from();
      const value = signal(1);
      const action = jasmine.createSpy<() => void>('action')
          .and.callFake(() => value());

      const dispose = effect(action, scheduler);

      scheduler.flush();
      expect(action).toHaveBeenCalledOnceWith();
      action.calls.reset();

      value.set(2);
      expect(action).not.toHaveBeenCalled();

      scheduler.flush();
      expect(action).toHaveBeenCalledOnceWith();

      dispose();
    });

    it('rerecords new dependency when a dependency signal changes', () => {
      const tracker = StabilityTracker.from();
      const testScheduler = TestScheduler.from();
      const trackedScheduler = tracker.wrap(testScheduler);
      const value1 = signal(1);
      const value2 = signal(2);

      let calls = 0;
      const action = jasmine.createSpy<() => void>('action')
          .and.callFake((): void => {
            calls++;
            switch (calls) {
              case 1: {
                value1();
                break;
              }
              case 2:
              case 3: {
                value2();
                break;
              }
              default: {
                throw new Error('Unexpected call.');
              }
            }
          });

      const dispose = effect(action, trackedScheduler);
      expect(action).not.toHaveBeenCalled();
      testScheduler.flush();
      expect(action).toHaveBeenCalledOnceWith();
      action.calls.reset();

      // Unrelated signals don't trigger the effect.
      value2.set(3);
      expect(tracker.isStable()).toBeTrue();
      expect(action).not.toHaveBeenCalled();

      // Dependency signal *does* trigger the effect.
      value1.set(4);
      expect(action).not.toHaveBeenCalled();
      expect(tracker.isStable()).toBeFalse();

      testScheduler.flush();
      expect(action).toHaveBeenCalledOnceWith();
      action.calls.reset();

      // Old dependencies don't trigger the effect.
      value1.set(5);
      expect(action).not.toHaveBeenCalled();
      expect(tracker.isStable()).toBeTrue();

      // New dependencies do trigger the effect.
      value2.set(6);
      expect(action).not.toHaveBeenCalled();
      testScheduler.flush();
      expect(action).toHaveBeenCalledOnceWith();

      dispose();
    });

    it('defaults to `MacrotaskScheduler`', () => {
      jasmine.clock().install();

      const callback = jasmine.createSpy<() => void>('callback');

      const dispose = effect(callback);
      expect(callback).not.toHaveBeenCalled();

      jasmine.clock().tick(0);
      expect(callback).toHaveBeenCalledOnceWith();

      dispose();

      jasmine.clock().uninstall();
    });

    it('does not schedule itself multiple times for multiple dependency changes', () => {
      const scheduler = TestScheduler.from();
      const value1 = signal(1);
      const value2 = signal(2);
      const action = jasmine.createSpy<() => void>('action')
          .and.callFake(() => {
            value1();
            value2();
          });

      const dispose = effect(action, scheduler);
      scheduler.flush();
      expect(action).toHaveBeenCalledOnceWith();
      action.calls.reset();

      value1.set(3);
      value2.set(4);
      scheduler.flush();
      expect(action).toHaveBeenCalledOnceWith();

      dispose();
    });

    it('handles synchronous scheduling', () => {
      const scheduler = new SyncScheduler();
      const value = signal(1);
      const action = jasmine.createSpy<() => void>('action')
          .and.callFake(() => value());

      const dispose = effect(action, scheduler);
      expect(action).toHaveBeenCalledOnceWith();
      action.calls.reset();

      value.set(2);
      expect(action).toHaveBeenCalledOnceWith();
      action.calls.reset();

      // Regression test: Dropped second+ post-init schedule operations.
      value.set(3);
      expect(action).toHaveBeenCalledOnceWith();

      dispose();
    });

    describe('dispose', () => {
      it('cleans up the effect', () => {
        const tracker = StabilityTracker.from();
        const testScheduler = TestScheduler.from();
        const trackedScheduler = tracker.wrap(testScheduler);
        const value = signal(1);
        const action = jasmine.createSpy<() => void>('action')
            .and.callFake(() => { value(); });

        const dispose = effect(action, trackedScheduler);

        // Initial record.
        testScheduler.flush();
        expect(action).toHaveBeenCalledOnceWith();
        action.calls.reset();

        dispose();

        // Should not react to signal change.
        value.set(2);
        expect(tracker.isStable()).toBeTrue();
      });

      it('cancels a pending initial call', () => {
        const tracker = StabilityTracker.from();
        const scheduler = tracker.wrap(TestScheduler.from());
        const action = jasmine.createSpy<() => void>('action');

        const dispose = effect(action, scheduler);
        expect(tracker.isStable()).toBeFalse();

        dispose();
        expect(tracker.isStable()).toBeTrue();
      });

      it('cancels a pending re-record call', () => {
        const tracker = StabilityTracker.from();
        const testScheduler = TestScheduler.from();
        const trackedScheduler = tracker.wrap(testScheduler);
        const value = signal(1);
        const action = jasmine.createSpy<() => void>('action')
            .and.callFake(() => { value(); });

        const dispose = effect(action, trackedScheduler);
        testScheduler.flush();
        expect(action).toHaveBeenCalledOnceWith();
        action.calls.reset();

        // Schedule another invocation.
        value.set(2);
        expect(tracker.isStable()).toBeFalse();

        dispose();
        expect(tracker.isStable()).toBeTrue();
      });
    });
  });
});

class SyncScheduler implements Scheduler {
  public schedule(action: Action): CancelAction {
    action();
    return () => {};
  }
}
