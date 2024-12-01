import { Connector } from '../connectable.js';
import { ReactiveRootImpl } from './reactive-root.js';
import { StabilityTracker } from './schedulers/stability-tracker.js';
import { TestScheduler } from './schedulers/test-scheduler.js';
import { signal } from './signal.js';

describe('reactive-root', () => {
  describe('ReactiveRootImpl', () => {
    describe('from', () => {
      it('provides a `ReactiveRootImpl`', () => {
        const connectable = Connector.from(() => false);
        const tracker = StabilityTracker.from();
        const scheduler = TestScheduler.from();

        expect(ReactiveRootImpl.from(connectable, tracker, scheduler))
            .toBeInstanceOf(ReactiveRootImpl);
      });
    });

    describe('effect', () => {
      it('schedules the effect', () => {
        const connector = Connector.from(() => false);
        const tracker = StabilityTracker.from();
        const scheduler = TestScheduler.from();
        const root = ReactiveRootImpl.from(connector, tracker, scheduler);

        const effect = jasmine.createSpy<() => void>('effect');

        root.effect(effect);
        expect(tracker.isStable()).toBeTrue();
        expect(effect).not.toHaveBeenCalled();

        connector.connect();
        expect(tracker.isStable()).toBeFalse();
        expect(effect).not.toHaveBeenCalled();

        scheduler.flush();
        expect(effect).toHaveBeenCalledOnceWith();
      });

      it('reruns the effect when a signal changes', () => {
        const connector = Connector.from(() => true);
        const tracker = StabilityTracker.from();
        const scheduler = TestScheduler.from();
        const root = ReactiveRootImpl.from(connector, tracker, scheduler);

        const value = signal(1);
        const effect = jasmine.createSpy<() => void>('effect')
            .and.callFake(() => { value(); });

        root.effect(effect);
        scheduler.flush();
        expect(effect).toHaveBeenCalled();
        effect.calls.reset();

        expect(tracker.isStable()).toBeTrue();

        value.set(2);
        expect(tracker.isStable()).toBeFalse();
        expect(effect).not.toHaveBeenCalled(); // Scheduled but not invoked yet.

        scheduler.flush();
        expect(effect).toHaveBeenCalledOnceWith();
      });

      it('does not initialize the effect until connected', () => {
        const connector = Connector.from(() => false);
        const tracker = StabilityTracker.from();
        const scheduler = TestScheduler.from();
        const root = ReactiveRootImpl.from(connector, tracker, scheduler);

        const effect = jasmine.createSpy<() => void>('effect');

        // Not scheduled when disconnected.
        root.effect(effect);
        scheduler.flush();
        expect(effect).not.toHaveBeenCalled();

        // Scheduled when connected.
        connector.connect();
        scheduler.flush();
        expect(effect).toHaveBeenCalledOnceWith();
      });

      it('pauses the effect while disconnected', () => {
        const connector = Connector.from(() => true);
        const tracker = StabilityTracker.from();
        const scheduler = TestScheduler.from();
        const root = ReactiveRootImpl.from(connector, tracker, scheduler);

        const value = signal(1);
        const effect = jasmine.createSpy<() => void>('effect')
            .and.callFake(() => { value(); });

        root.effect(effect);
        scheduler.flush();
        expect(effect).toHaveBeenCalledOnceWith();
        effect.calls.reset();

        // Don't really need to assert this, just making sure `value` is used
        // correctly in this test.
        value.set(2);
        scheduler.flush();
        expect(effect).toHaveBeenCalledOnceWith();
        effect.calls.reset();

        connector.disconnect();
        expect(tracker.isStable()).toBeTrue();
        expect(effect).not.toHaveBeenCalled();

        value.set(3);
        expect(tracker.isStable()).toBeTrue();
        expect(effect).not.toHaveBeenCalled();
      });

      // Effects *must* be re-executed when reconnected to the DOM. This is
      // because signal dependencies might have changed while the effect was
      // disabled. The alternative is to continue subscribing to signal changes,
      // but doing so would prevent an unused component from being garbage
      // collected.
      it('resumes the effect when reconnected', () => {
        const connector = Connector.from(() => true);
        const tracker = StabilityTracker.from();
        const scheduler = TestScheduler.from();
        const root = ReactiveRootImpl.from(connector, tracker, scheduler);

        const effect = jasmine.createSpy<() => void>('effect');

        root.effect(effect);
        scheduler.flush();
        expect(effect).toHaveBeenCalledOnceWith();
        effect.calls.reset();

        connector.disconnect();
        expect(effect).not.toHaveBeenCalled();

        // Even though no dependencies changed, effect should be re-invoked just
        // to check if they have.
        connector.connect();
        scheduler.flush();
        expect(effect).toHaveBeenCalledOnceWith();
      });
    });
  });
});
