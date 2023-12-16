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

    describe('equals', () => {
      it('does not notify consumers when set with an equivalent object per the custom equality operator', () => {
        const consumer = Consumer.from();
        spyOn(consumer, 'notifyListeners');

        const sig = signal(1, { equals: () => true });
        observe(consumer, () => { sig(); });
        expect(consumer.notifyListeners).not.toHaveBeenCalled();

        sig.set(2);
        expect(consumer.notifyListeners).not.toHaveBeenCalled();
      });

      it('does not notify consumers when set with an equivalent primitive by default', () => {
        // Number
        {
          const consumer = Consumer.from();
          spyOn(consumer, 'notifyListeners');

          const sig = signal(1);
          observe(consumer, () => { sig(); });
          expect(consumer.notifyListeners).not.toHaveBeenCalled();

          sig.set(1);
          expect(consumer.notifyListeners).not.toHaveBeenCalled();
        }

        // String
        {
          const consumer = Consumer.from();
          spyOn(consumer, 'notifyListeners');

          const sig = signal('test');
          observe(consumer, () => { sig(); });
          expect(consumer.notifyListeners).not.toHaveBeenCalled();

          sig.set('test');
          expect(consumer.notifyListeners).not.toHaveBeenCalled();
        }

        // Boolean
        {
          const consumer = Consumer.from();
          spyOn(consumer, 'notifyListeners');

          const sig = signal(true);
          observe(consumer, () => { sig(); });
          expect(consumer.notifyListeners).not.toHaveBeenCalled();

          sig.set(true);
          expect(consumer.notifyListeners).not.toHaveBeenCalled();
        }

        // BigInt
        {
          const consumer = Consumer.from();
          spyOn(consumer, 'notifyListeners');

          const sig = signal(1n);
          observe(consumer, () => { sig(); });
          expect(consumer.notifyListeners).not.toHaveBeenCalled();

          sig.set(1n);
          expect(consumer.notifyListeners).not.toHaveBeenCalled();
        }

        // Symbol
        {
          const consumer = Consumer.from();
          spyOn(consumer, 'notifyListeners');

          const sig = signal(Symbol.for('test'));
          observe(consumer, () => { sig(); });
          expect(consumer.notifyListeners).not.toHaveBeenCalled();

          sig.set(Symbol.for('test'));
          expect(consumer.notifyListeners).not.toHaveBeenCalled();
        }

        // undefined
        {
          const consumer = Consumer.from();
          spyOn(consumer, 'notifyListeners');

          const sig = signal(undefined);
          observe(consumer, () => { sig(); });
          expect(consumer.notifyListeners).not.toHaveBeenCalled();

          sig.set(undefined);
          expect(consumer.notifyListeners).not.toHaveBeenCalled();
        }

        // null
        {
          const consumer = Consumer.from();
          spyOn(consumer, 'notifyListeners');

          const sig = signal(null);
          observe(consumer, () => { sig(); });
          expect(consumer.notifyListeners).not.toHaveBeenCalled();

          sig.set(null);
          expect(consumer.notifyListeners).not.toHaveBeenCalled();
        }
      });

      it('does not notify consumers when set with the same reference by default', () => {
        // Object
        {
          const consumer = Consumer.from();
          spyOn(consumer, 'notifyListeners');

          const obj = {};
          const sig = signal(obj);
          observe(consumer, () => { sig(); });
          expect(consumer.notifyListeners).not.toHaveBeenCalled();

          sig.set(obj);
          expect(consumer.notifyListeners).not.toHaveBeenCalled();
        }

        // Array
        {
          const consumer = Consumer.from();
          spyOn(consumer, 'notifyListeners');

          const array: unknown[] = [];
          const sig = signal(array);
          observe(consumer, () => { sig(); });
          expect(consumer.notifyListeners).not.toHaveBeenCalled();

          sig.set(array);
          expect(consumer.notifyListeners).not.toHaveBeenCalled();
        }
      });

      it('updates the value even when custom equality operator returns true', () => {
        const consumer = Consumer.from();
        spyOn(consumer, 'notifyListeners');

        const sig = signal(1, { equals: () => true });
        observe(consumer, () => { sig(); });
        sig.set(2);

        expect(sig()).toBe(2);
      });
    });
  });
});
