import { effect } from './effect.js';
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
      const scheduler = TestScheduler.from();
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

      const dispose = effect(action, scheduler);
      expect(action).not.toHaveBeenCalled();
      scheduler.flush();
      expect(action).toHaveBeenCalledOnceWith();
      action.calls.reset();

      // Unrelated signals don't trigger the effect.
      value2.set(3);
      expect(scheduler.isStable()).toBeTrue();
      expect(action).not.toHaveBeenCalled();

      // Dependency signal *does* trigger the effect.
      value1.set(4);
      expect(action).not.toHaveBeenCalled();
      expect(scheduler.isStable()).toBeFalse();

      scheduler.flush();
      expect(action).toHaveBeenCalledOnceWith();
      action.calls.reset();

      // Old dependencies don't trigger the effect.
      value1.set(5);
      expect(action).not.toHaveBeenCalled();
      expect(scheduler.isStable()).toBeTrue();

      // New dependencies do trigger the effect.
      value2.set(6);
      expect(action).not.toHaveBeenCalled();
      scheduler.flush();
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

    describe('dispose', () => {
      it('cleans up the effect', () => {
        const scheduler = TestScheduler.from();
        const value = signal(1);
        const action = jasmine.createSpy<() => void>('action')
            .and.callFake(() => { value(); });

        const dispose = effect(action, scheduler);

        // Initial record.
        scheduler.flush();
        expect(action).toHaveBeenCalledOnceWith();
        action.calls.reset();

        dispose();

        // Should not react to signal change.
        value.set(2);
        expect(scheduler.isStable()).toBeTrue();
      });

      it('cancels a pending initial call', () => {
        const scheduler = TestScheduler.from();
        const action = jasmine.createSpy<() => void>('action');

        const dispose = effect(action, scheduler);
        expect(scheduler.isStable()).toBeFalse();

        dispose();
        expect(scheduler.isStable()).toBeTrue();
      });

      it('cancels a pending re-record call', () => {
        const scheduler = TestScheduler.from();
        const value = signal(1);
        const action = jasmine.createSpy<() => void>('action')
            .and.callFake(() => { value(); });

        const dispose = effect(action, scheduler);
        scheduler.flush();
        expect(action).toHaveBeenCalledOnceWith();
        action.calls.reset();

        // Schedule another invocation.
        value.set(2);
        expect(scheduler.isStable()).toBeFalse();

        dispose();
        expect(scheduler.isStable()).toBeTrue();
      });
    });
  });
});
