/** @fileoverview Defines the creation of the core signal primitive. */

import { Producer, bindProducer } from './graph.js';
import { SIGNAL, SignalKind, WriteableSignal } from './types.js';

/**
 * Creates a new {@link WriteableSignal} with the given initial value.
 *
 * @param initial The initial value to use for the signal.
 * @returns A {@link WriteableSignal} which can be read and mutated.
 */
export function signal<Value>(initial: Value, { equals = Object.is }: {
  equals?: Equals<Value>,
} = {}): WriteableSignal<Value> {
  let value = initial;
  const producer = Producer.from(() => value);

  const sig: WriteableSignal<Value> = () => {
    // On read, check if any consumer is watching the execution. If so, link it
    // to this signal's producer.
    bindProducer(producer);

    return producer.poll();
  };
  sig.set = (val: Value) => {
    // Check if the new values are equivalent, so we can skip rerunning
    // downstream computations.
    const dirty = !equals(val, value);

    // Update the current value. Even if the new value is equivalent to the old
    // one, it could still be different in observable ways, so we always want to
    // update this, even if it isn't actually "dirty".
    value = val;

    // Notify consumers only if the value has actually changed.
    if (dirty) producer.notifyConsumers();
  };
  sig.readonly = () => () => sig();
  sig[SIGNAL] = SignalKind.Signal;

  return sig as WriteableSignal<Value>;
}

/**
 * An equality comparator. Returns whether or not the two values are considered
 * "equivalent".
 *
 * The precise semantics of what "equivalent" means is up to the implementation.
 * Generally speaking "equivalent" means that the two values represent the same
 * underlying content.
 *
 * @param left The first value to compare.
 * @param right The second value to compare.
 * @returns `true` if the two values are considered "equivalent", `false`
 *     otherwise.
 */
export type Equals<Value> = (left: Value, right: Value) => boolean;
