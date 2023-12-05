import { Consumer, getCurrentConsumer, observe, Producer } from './graph.js';
import { signal } from './signal.js';

describe('graph', () => {
  describe('consumer stack', () => {
    it('returns no current consumers when none is observing', () => {
      expect(getCurrentConsumer()).toBeUndefined();

      observe(Consumer.from(), () => {});

      expect(getCurrentConsumer()).toBeUndefined();
    });

    it('tracks the current consumer', () => {
      const consumer = Consumer.from();

      const observedConsumer = observe(consumer, () => getCurrentConsumer());

      expect(observedConsumer).toBe(consumer);
    });

    it('tracks nested consumers', () => {
      const consumer1 = Consumer.from();
      const consumer2 = Consumer.from();
      const consumer3 = Consumer.from();

      let observedConsumer1: Consumer | undefined;
      let observedConsumer2: Consumer | undefined;
      let observedConsumer3: Consumer | undefined;

      observe(consumer1, () => {
        observedConsumer1 = getCurrentConsumer();
        observe(consumer2, () => {
          observedConsumer2 = getCurrentConsumer();
          observe(consumer3, () => {
            observedConsumer3 = getCurrentConsumer();
          });
        });
      });

      expect(observedConsumer1).toBe(consumer1);
      expect(observedConsumer2).toBe(consumer2);
      expect(observedConsumer3).toBe(consumer3);
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
