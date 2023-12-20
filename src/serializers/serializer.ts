/** @fileoverview Defines types related to DOM serialization. */

/**
 * Supports serializing and deserializing between `Value` and an element in the
 * DOM.
 *
 * Invariant: Any input `value` should be equivalent to the result of
 * serializing and deserializing it:
 *
 * ```typescript
 * const el = // ...
 * const oldValue: Value = // ...
 * serializer.serializeTo(oldValue, el);
 * const newValue: Value = serializer.deserializeFrom(el);
 *
 * // Should be true for some reasonable definition of `equals`.
 * equals(oldValue, newValue);
 * ```
 *
 * These values should be _equivalent_, not necessarily referentially equal
 * (`===`).
 *
 * No such invariant holds for `deserializeFrom` -> `serializeTo`, as the
 * serialized representation may be slightly different between equivalent
 * objects.
 */
export interface ElementSerializer<Value, in El extends Element> {
  /**
   * Serializes the value and applies it to the provided DOM element.
   *
   * @param value The value to serialize.
   * @param element The element to serialize to.
   */
  serializeTo(value: Value, element: El): void;

  /**
   * Deserializes the given element to a value.
   *
   * @param element The element to deserialize from.
   * @returns The deserialized value.
   */
  deserializeFrom(element: El): Value;
}

/**
 * Supports serializing and deserializing between `Value` and a string for use
 * in element attributes.
 *
 * Invariant: Any input `value` should be equivalent to the result of
 * serializing and deserializing it:
 *
 * ```typescript
 * const oldValue: Value = // ...
 * const serial: string = serializer.serialize(oldValue);
 * const newValue: Value = serializer.deserialize(serial);
 *
 * // Should be true for some reasonable definition of `equals`.
 * equals(oldValue, newValue);
 * ```
 *
 * These values should be _equivalent_, not necessarily referentially equal
 * (`===`).
 *
 * No such invariant holds for `deserialize` -> `serialize`, as the serialized
 * representation may be slightly different between equivalent objects.
 */
export interface AttrSerializer<Value> {
  /**
   * Serializes the given value to a string.
   *
   * @param value The value to serialize.
   * @returns The serialized attribute text.
   */
  serialize(value: Value): string;

  /**
   * Deserializes the given text to a value.
   *
   * @param attr The attribute text to deserialize.
   * @returns The deserialized value.
   */
  deserialize(attr: string): Value;
}

/**
 * Returns the serialized type wrapped by the given {@link AttrSerializer} or
 * {@link AttrSerializable} type.
 */
export type Serialized<
  Serial extends
    | ElementSerializer<unknown, any>
    | ElementSerializable<unknown, any>
    | AttrSerializer<unknown>
    | AttrSerializable<unknown>,
> = Serial extends AttrSerializable<infer Value>
  ? Value
  : Serial extends ElementSerializable<infer Value, Element>
    ? Value
    : Serial extends ElementSerializer<infer Value, Element>
      ? Value
      : Serial extends AttrSerializer<infer Value>
        ? Value
        : never
;

/**
 * A symbol which maps an object to a {@link AttrSerializer} which can serialize and
 * deserialize that type.
 */
export const toSerializer = Symbol('toSerializer');

/**
 * Serializable objects contain a {@link toSerializer} property which maps an
 * object to an {@link AttrSerializer} which can serialize and deserialize that
 * type.
 */
export type ElementSerializable<Value, El extends Element> = {
  [toSerializer](): ElementSerializer<Value, El>,
};

/**
 * Serializable objects contain a {@link toSerializer} property which maps an
 * object to a {@link AttrSerializer} which can serialize and deserialize that type.
 */
export type AttrSerializable<Value> = {
  [toSerializer](): AttrSerializer<Value>,
};
