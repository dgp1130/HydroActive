import { bindProducer, Consumer, observe, Producer, untracked } from './graph.js';
import { signal } from './signal.js';

describe('graph', () => {
  describe('bindProducer', () => {
    it('does nothing when invoked outside of `observe`', () => {
      const producer = Producer.from(() => undefined);
      spyOn(producer, 'addConsumer');

      bindProducer(producer);
      expect(producer.addConsumer).not.toHaveBeenCalled();

      observe(Consumer.from(), () => {});

      bindProducer(producer);
      expect(producer.addConsumer).not.toHaveBeenCalled();
    });

    it('binds to the observing consumer', () => {
      const consumer = Consumer.from();
      spyOn(consumer, 'addProducer');

      const producer = Producer.from(() => undefined);
      spyOn(producer, 'addConsumer');

      observe(consumer, () => { bindProducer(producer); });

      expect(consumer.addProducer).toHaveBeenCalledOnceWith(producer);
      expect(producer.addConsumer).toHaveBeenCalledOnceWith(consumer);
    });

    it('binds to the most nested observing consumer', () => {
      const consumer1 = Consumer.from();
      spyOn(consumer1, 'addProducer');
      const consumer2 = Consumer.from();
      spyOn(consumer2, 'addProducer');
      const consumer3 = Consumer.from();
      spyOn(consumer3, 'addProducer');

      const producer1 = Producer.from(() => undefined);
      spyOn(producer1, 'addConsumer');
      const producer2 = Producer.from(() => undefined);
      spyOn(producer2, 'addConsumer');
      const producer3 = Producer.from(() => undefined);
      spyOn(producer3, 'addConsumer');

      observe(consumer1, () => {
        bindProducer(producer1);
        observe(consumer2, () => {
          bindProducer(producer2);
          observe(consumer3, () => {
            bindProducer(producer3);
          });
        });
      });

      expect(consumer1.addProducer).toHaveBeenCalledOnceWith(producer1);
      expect(producer1.addConsumer).toHaveBeenCalledOnceWith(consumer1);

      expect(consumer2.addProducer).toHaveBeenCalledOnceWith(producer2);
      expect(producer2.addConsumer).toHaveBeenCalledOnceWith(consumer2);

      expect(consumer3.addProducer).toHaveBeenCalledOnceWith(producer3);
      expect(producer3.addConsumer).toHaveBeenCalledOnceWith(consumer3);
    });
  });

  describe('observe', () => {
    it('returns the value returned in the callback', () => {
      const observed = observe(Consumer.from(), () => 'test');

      expect(observed).toBe('test');
    });
  });

  describe('untracked', () => {
    it('ignores producer reads inside the callback', () => {
      const consumer = Consumer.from();

      const listener = jasmine.createSpy<() => void>('listener');
      consumer.listen(listener);

      const foo = signal('foo');
      const bar = signal('bar');
      consumer.record(() => `${untracked(() => foo())} - ${bar()}`);

      expect(listener).not.toHaveBeenCalled();
      foo.set('foo2');
      expect(listener).not.toHaveBeenCalled();
      bar.set('bar2');
      expect(listener).toHaveBeenCalledTimes(1);

      consumer.destroy();
    });

    it('propagates errors', () => {
      const err = new Error('Untrack this!');

      expect(() => untracked(() => { throw err; })).toThrow(err);
    });

    it('resets the consumer on error', () => {
      const consumer = Consumer.from();

      const listener = jasmine.createSpy<() => void>('listener');
      consumer.listen(listener);

      const foo = signal('foo');
      const bar = signal('bar');
      consumer.record(() => {
        try {
          untracked(() => {
            foo(); // `foo` still untracked.
            throw new Error('Untrack this!');
          });
        } catch {}

        // `bar` should not be affected by above error.
        return bar();
      });

      expect(listener).not.toHaveBeenCalled();
      foo.set('foo2');
      expect(listener).not.toHaveBeenCalled();
      bar.set('bar2');
      expect(listener).toHaveBeenCalledTimes(1);

      consumer.destroy();
    });
  });

  describe('Producer', () => {
    describe('poll', () => {
      it('invokes the constructor parameter', () => {
        const producer = Producer.from(() => 1);

        expect(producer.poll()).toBe(1);
      });
    });

    it('tracks consumers and notifies active consumers', () => {
      const producer = Producer.from(() => 1);

      const consumer1 = Consumer.from();
      const consumer2 = Consumer.from();

      spyOn(consumer1, 'notifyListeners');
      spyOn(consumer2, 'notifyListeners');

      producer.addConsumer(consumer1);
      producer.addConsumer(consumer2);
      producer.removeConsumer(consumer2); // Should *not* be notified.

      expect(consumer1.notifyListeners).not.toHaveBeenCalled();
      expect(consumer2.notifyListeners).not.toHaveBeenCalled();

      producer.notifyConsumers();

      expect(consumer1.notifyListeners).toHaveBeenCalledOnceWith();
      expect(consumer2.notifyListeners).not.toHaveBeenCalled();
    });
  });

  describe('Consumer', () => {
    describe('record', () => {
      it('tracks signal reads in a callback and invokes listeners when it changes', () => {
        const consumer = Consumer.from();
        const value = signal(1);

        const listener = jasmine.createSpy<() => void>('listener');

        consumer.record(() => { value(); });

        consumer.listen(listener);
        expect(listener).not.toHaveBeenCalled();

        value.set(2);
        expect(listener).toHaveBeenCalledOnceWith();
      });

      it('tracks new dependencies on second execution', () => {
        const consumer = Consumer.from();
        const value1 = signal(1);
        const value2 = signal(2);

        const listener = jasmine.createSpy<() => void>('listener');

        consumer.record(() => { value1(); });
        consumer.record(() => { value2(); });

        consumer.listen(listener);
        expect(listener).not.toHaveBeenCalled();

        value1.set(3);
        expect(listener).not.toHaveBeenCalled();

        value2.set(4);
        expect(listener).toHaveBeenCalledOnceWith();
      });

      it('cleans up references in producers on new record', () => {
        const consumer = Consumer.from();
        const producer = Producer.from(() => 1);
        spyOn(producer, 'removeConsumer');

        consumer.addProducer(producer);

        consumer.record(() => {});
        expect(producer.removeConsumer).toHaveBeenCalledOnceWith(consumer);
      });
    });

    describe('notifyListeners', () => {
      it('notifies all listeners', () => {
        const listener1 = jasmine.createSpy<() => void>('listener1');
        const listener2 = jasmine.createSpy<() => void>('listener2');

        const consumer = Consumer.from();
        consumer.listen(listener1);
        consumer.listen(listener2);

        consumer.notifyListeners();
        expect(listener1).toHaveBeenCalledOnceWith();
        expect(listener2).toHaveBeenCalledOnceWith();
      });
    });

    describe('destroy', () => {
      it('removes all producers', () => {
        const consumer = Consumer.from();

        const producer = Producer.from(() => 1);
        spyOn(producer, 'removeConsumer');
        consumer.addProducer(producer);

        consumer.destroy();
        expect(producer.removeConsumer).toHaveBeenCalledOnceWith(consumer);
      });

      it('removes all listeners', () => {
        const consumer = Consumer.from();

        const listener = jasmine.createSpy<() => void>('listener');
        consumer.listen(listener);

        consumer.notifyListeners();
        expect(listener).toHaveBeenCalled();
        listener.calls.reset();

        consumer.destroy();

        consumer.notifyListeners();
        expect(listener).not.toHaveBeenCalled();
      });
    });
  });
});
