import { Consumer, Producer, bindProducer } from './graph.js';
import { Signal } from './types.js';

/**
 * Creates a computed {@link Signal} whose result is cached.
 *
 * @param callback The callback to invoke to compute the value of this signal
 *     based on other signals. The result of this callback is cached.
 * @returns The result of the callback, or the cached value of a previous
 *     execution of the callback if nothing has changed.
 */
export function cached<Value>(callback: () => Value): Signal<Value> {
  let value: Value;
  let dirty = true;

  // The consumer which is notified when any dependency signals change.
  const consumer = Consumer.from();

  // The producer which produces the result of the `cached` signal.
  const producer = Producer.from(() => {
    // Only invoke the callback if dirty, otherwise reuse the cached value.
    if (dirty) {
      value = consumer.record(callback);
      dirty = false;
    }

    return value;
  });

  // When a dependency changes, assume the `cached` is dirty and notify
  // downstream consumers. We actually might not have changed as a result of the
  // modified dependency, however we won't know that until the first consumer
  // re-invokes this `cached` signal.
  consumer.listen(() => {
    dirty = true;
    producer.notifyConsumers();
  });

  return () => {
    // On read, check if any consumer is watching the execution. If so, link it
    // to this signal's provider.
    bindProducer(producer);

    return producer.poll();
  };
}
