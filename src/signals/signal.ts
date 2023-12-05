/** @fileoverview Defines the creation of the core signal primitive. */

import { Producer, getCurrentConsumer } from './graph.js';
import { WriteableSignal } from './types.js';

/**
 * Creates a new {@link WriteableSignal} with the given initial value.
 *
 * @param initial The initial value to use for the signal.
 * @returns A {@link WriteableSignal} which can be read and mutated.
 */
export function signal<Value>(initial: Value): WriteableSignal<Value> {
  let value = initial;
  const producer = Producer.from(() => value);

  const sig: WriteableSignal<Value> = () => {
    // On read, check if any consumer is watching the execution. If so, link it
    // to this signal's producer.
    const consumer = getCurrentConsumer();
    if (consumer) {
      producer.addConsumer(consumer);
      consumer.addProducer(producer);
    }

    return producer.poll();
  };
  sig.set = (val: Value) => {
    // On write, update the value and notify all consumers that the value has
    // changed.
    value = val;
    producer.notifyConsumers();
  };
  sig.readonly = () => () => sig();

  return sig as WriteableSignal<Value>;
}
