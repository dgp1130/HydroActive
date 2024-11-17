/** @fileoverview Defines core signal types. */

/** TODO */
export const SIGNAL = Symbol('Signal');

/** TODO */
export function isSignal(value: unknown): value is WriteableSignal<unknown> {
  return typeof value === 'function' && value !== null && SIGNAL in value;
}

/**
 * A readonly signal which returns type `Value` and can be observed to trigger
 * events when the underlying value changes.
 */
export type Signal<Value> = () => Value;

/**
 * A read/write signal which holds type `Value` and can be observed to trigger
 * events when modified.
 */
export interface WriteableSignal<Value> extends Signal<Value> {
  /**
   * Updates the current value and notifies any observers that the signal has
   * changed.
   *
   * @param value The value to set the signal to.
   */
  set(value: Value): void;

  /**
   * Provides a readonly accessor of this signal.
   *
   * @returns A readonly accessor of this signal.
   */
  readonly(): Signal<Value>;

  /** TODO */
  [SIGNAL]: SignalKind;
}

/** TODO */
export enum SignalKind {
  Signal = 'signal',
  Deferred = 'deferred',
  Property = 'property',
}
