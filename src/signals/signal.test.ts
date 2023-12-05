import { signal } from './signal.js';
import { Consumer, observe } from './graph.js';

describe('signal', () => {
  describe('signal', () => {
    it('creates a signal', () => {
      const value = signal(1);
      expect(value()).toBe(1);

      value.set(2);
      expect(value()).toBe(2);
    });

    it('links the current consumer on read', () => {
      const consumer = Consumer.from();
      spyOn(consumer, 'addProducer');

      const sig = signal(1);
      observe(consumer, () => { sig(); });

      expect(consumer.addProducer).toHaveBeenCalled();
    });

    it('notifies consumers on write', () => {
      const consumer = Consumer.from();
      spyOn(consumer, 'notifyListeners');

      const sig = signal(1);
      observe(consumer, () => { sig(); });
      expect(consumer.notifyListeners).not.toHaveBeenCalled();

      sig.set(2);
      expect(consumer.notifyListeners).toHaveBeenCalled();
    });
  });

  describe('WriteableSignal', () => {
    describe('set', () => {
      it('writes to the signal', () => {
        const value = signal(1);
        expect(value()).toBe(1);

        value.set(2);
        expect(value()).toBe(2);
      });
    });

    describe('readonly', () => {
      it('returns a readonly version of the signal', () => {
        const value = signal(1);

        const get = value.readonly();

        expect(get()).toBe(1);

        value.set(2);
        expect(get()).toBe(2);
      });

      it('is not typed as writeable', () => {
        // Type-only test, only needs to compile, not execute.
        expect().nothing();
        () => {
          const get = signal(1).readonly();

          // @ts-expect-error `set` should not be available.
          get.set(2);

          // @ts-expect-error `readonly` should not be available.
          get.readonly();
        };
      });

      it('is not actually writeable', () => {
          const get = signal(1).readonly() as unknown as {
            set: unknown,
            readonly: unknown,
          };

          expect(get.set).toBeUndefined();
          expect(get.readonly).toBeUndefined();
      });
    });
  });
});
