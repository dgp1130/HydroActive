/**
 * @fileoverview Defines the signal graph consisting of producers and consumers.
 *     Producers produce new values while consumers record an execution and
 *     depend on producers. A producer notifies all its consumers when its value
 *     changes so they can recompute as necessary. Consumers "record" all
 *     producers in an execution by maintaining a stack of active consumers.
 *     When signals are read, they check this consumer stack and mark the
 *     current consumer as dependent on their producer.
 */

/**
 * Tracks active {@link Consumer} objects watching this execution. The first
 * {@link Consumer} is the outermost observer (the first to call
 * {@link observe}) and the last {@link Consumer} is the innermost observer (the
 * last to call {@link observe}).
 */
const consumerStack: Consumer[] = [];

/**
 * Gets the current (innermost) {@link Consumer} observing the current
 * execution.
 *
 * @returns Returns the {@link Consumer} observing the current execution or
 *     `undefined` if no {@link Consumer} is observing.
 */
export function getCurrentConsumer(): Consumer | undefined {
  return consumerStack.at(-1);
}

/**
 * Configures `consumer` to observe the execution of `cb` and be notified if any
 * {@link Producer} objects are used.
 *
 * @param consumer The {@link Consumer} to observe the execution.
 * @param cb A callback function to invoke and observe.
 * @returns The value returned by `cb`.
 */
export function observe<Value>(consumer: Consumer, cb: () => Value): Value {
  consumerStack.push(consumer);
  try {
    return cb();
  } finally {
    consumerStack.pop();
  }
}

/**
 * Produces a value and notifies {@link Consumer} objects when that value
 * changes.
 */
export class Producer<Value> {
  /** Set of consumers to notify when the produced value changes. */
  readonly #consumers: Set<Consumer> = new Set();

  private constructor(public readonly poll: () => Value) {}

  /**
   * Constructs a new {@link Producer} which will produce the value returned by
   * the provided `poll` function.
   *
   * @returns A new {@link Producer} which produces the given value.
   */
  public static from<Value>(poll: () => Value): Producer<Value> {
    return new Producer(poll);
  }

  /**
   * Adds a {@link Consumer} to be notified when the value produced by this
   * {@link Producer} changes.
   *
   * @param consumer The {@link Consumer} to notify when the produced value
   *     changes.
   */
  public addConsumer(consumer: Consumer): void {
    this.#consumers.add(consumer);
  }

  /**
   * Stops notifying the given {@link Consumer} when the value produced by this
   * {@link Producer} changes.
   *
   * @param consumer The {@link Consumer} to stop notifying.
   */
  public removeConsumer(consumer: Consumer): void {
    this.#consumers.delete(consumer);
  }

  /**
   * Notifies all consumers that they are dirty because the value of this
   * {@link Producer} has changed.
   */
  public notifyConsumers(): void {
    for (const consumer of this.#consumers) consumer.notifyListeners();
  }
}

/**
 * Depends on a set of {@link Producer} objects and notifies listeners when any
 * {@link Producer} changes.
 */
export class Consumer {
  /**
   * Set of {@link Producer} objects which are used by this {@link Consumer}.
   */
  readonly #producers: Set<Producer<unknown>> = new Set();

  private constructor() {}

  /** Constructs a new {@link Consumer}. */
  public static from(): Consumer {
    return new Consumer();
  }

  /**
   * Records all signal reads in the given callback. Signals will pick up this
   * {@link Consumer} and add their {@link Producer} objects to it as
   * dependencies.
   *
   * @param cb The callback to invoke and record.
   * @returns The value returned by `cb`.
   */
  public record<Value>(cb: () => Value): Value {
    this.#clearProducers();
    return observe(this, cb);
  }

  /** Listeners to invoke when any {@link Producer} changes. */
  readonly #listeners: Set<() => void> = new Set();

  /**
   * Registers the given callback to be invoked whenever an associated
   * {@link Producer} changes.
   */
  public listen(cb: () => void): void {
    this.#listeners.add(cb);
  }

  /** Invokes all listeners that a {@link Producer} has changed. */
  public notifyListeners(): void {
    for (const listener of this.#listeners) listener();
  }

  /**
   * Tracks the given {@link Producer} as a dependency on this {@link Consumer}.
   *
   * @param producer The {@link Producer} to add as a dependency.
   */
  public addProducer(producer: Producer<unknown>): void {
    this.#producers.add(producer);
  }

  /**
   * Clears all associated {@link Producer} objects and notifies them to drop
   * this {@link Consumer}.
   */
  #clearProducers(): void {
    for (const producer of this.#producers) producer.removeConsumer(this);
    this.#producers.clear();
  }

  /**
   * Unsubscribes all listeners and {@link Producer} objects so this
   * {@link Consumer} can be garbage collected.
   */
  public destroy(): void {
    this.#listeners.clear();
    this.#clearProducers();
  }
}
