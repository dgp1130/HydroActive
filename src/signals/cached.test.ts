import { cached } from './cached.js';
import { Consumer, observe } from './graph.js';
import { signal } from './signal.js';

describe('cached', () => {
  describe('cached', () => {
    it('invokes the callback and returns the value', () => {
      const computed = cached(() => 1);

      expect(computed()).toBe(1);
    });

    it('caches the value between multiple invocations', () => {
      const spy = jasmine.createSpy<() => number>('callback')
          .and.callFake(() => 1);

      const computed = cached(spy);
      expect(computed()).toBe(1);
      expect(spy).toHaveBeenCalledOnceWith();
      spy.calls.reset();

      expect(computed()).toBe(1);
      expect(spy).not.toHaveBeenCalled();
    });

    it('evaluates lazily', () => {
      const spy = jasmine.createSpy<() => undefined>('callback');

      cached(spy);

      expect(spy).not.toHaveBeenCalled();
    });

    it('links the current consumer on read', () => {
      const consumer = Consumer.from();
      spyOn(consumer, 'addProducer');

      const computed = cached(() => 1);
      observe(consumer, () => { computed(); });

      expect(consumer.addProducer).toHaveBeenCalled();
    });

    it('notifies consumers when a dependency changes', () => {
      const consumer = Consumer.from();
      spyOn(consumer, 'notifyListeners');

      const sig = signal(1);
      const computed = cached(() => sig());
      observe(consumer, () => { computed(); });
      expect(consumer.notifyListeners).not.toHaveBeenCalled();

      sig.set(2);
      expect(consumer.notifyListeners).toHaveBeenCalled();
    });

    it('rerecords new dependency when a dependency signal changes', () => {
      const value1 = signal(1);
      const value2 = signal(2);

      const consumer = Consumer.from();
      const notifyListeners = spyOn(consumer, 'notifyListeners');

      let calls = 0;
      const computed = cached((): number => {
        calls++;
        switch (calls) {
          case 1: {
            return value1();
          }
          case 2:
          case 3: {
            return value2();
          }
          default: {
            throw new Error('Unexpected call.');
          }
        }
      });

      expect(observe(consumer, () => computed())).toBe(1);
      expect(notifyListeners).not.toHaveBeenCalled();

      // Unrelated signals don't notify the consumer.
      value2.set(3);
      expect(notifyListeners).not.toHaveBeenCalled();

      // Dependency signal *does* notify the consumer.
      value1.set(4);
      expect(notifyListeners).toHaveBeenCalledOnceWith();
      notifyListeners.calls.reset();

      computed(); // Invoke to re-record dependencies.

      // Old dependencies don't notify the consumer.
      value1.set(5);
      expect(notifyListeners).not.toHaveBeenCalled();

      // New dependencies do notify the consumer.
      value2.set(6);
      expect(notifyListeners).toHaveBeenCalledOnceWith();
    });
  });
});
