import './testing/noop-component.js';

import { SignalComponentAccessor } from './signal-component-accessor.js';
import { ReactiveRootImpl } from './signals/reactive-root.js';
import { TestScheduler } from './signals/schedulers/test-scheduler.js';

describe('signal-component-accessor', () => {
  describe('SignalComponentAccessor', () => {
    afterAll(() => {
      for (const el of document.body.children) el.remove();
    });

    describe('fromSignalComponent', () => {
      it('provides a `SignalComponentAccessor`', () => {
        const el = document.createElement('noop-component');
        const root = ReactiveRootImpl.from(
            el._connectable, TestScheduler.from());

        expect(SignalComponentAccessor.fromSignalComponent(el, root))
            .toBeInstanceOf(SignalComponentAccessor);
      });
    });

    describe('effect', () => {
      it('schedules an effect on the provided `ReactiveRoot`', () => {
        const el = document.createElement('noop-component');
        document.body.append(el);

        const scheduler = TestScheduler.from();
        const root = ReactiveRootImpl.from(el._connectable, scheduler);

        const effect = jasmine.createSpy<() => void>('effect');

        root.effect(effect);
        expect(scheduler.isStable()).toBeFalse();
        expect(effect).not.toHaveBeenCalled();

        scheduler.flush();
        expect(effect).toHaveBeenCalledOnceWith();
      });
    });
  });
});
