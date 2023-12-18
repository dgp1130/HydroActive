/**
 * Supports serializing a deserializing between `Value` and a string.
 *
 * Invariant: Any input `value` should be equivalent to the result of
 * `serializer.deserialize(serializer.serialize(value))` (equivalent, not
 * referentially equal such as with `===`).
 *
 * No such invariant holds for
 * `serializer.deserialize(serializer.serialize(value))`, as the serialized
 * representation may be slightly different.
 */
export interface Serializer<Value> {
  /**
   * Serializes the given value to a string.
   *
   * @param value The value to serialize.
   * @returns The serialized text.
   */
  serialize(value: Value): string;

  /**
   * Deserializes the given text to a value.
   *
   * @param serial The text to deserialize.
   * @returns The deserialized value.
   */
  deserialize(serial: string): Value;
}

/**
 * Returns the serialized type wrapped by the given {@link Serializer} or
 * {@link Serializable} type.
 */
export type Serialized<
    Serial extends Serializer<unknown> | Serializable<unknown>,
> = Serial extends Serializable<infer Value>
    ? Value
    : Serial extends Serializer<infer Value>
        ? Value
        : never
;

/**
 * A symbol which maps an object to a {@link Serializer} which can serialize and
 * deserialize that type.
 */
export const toSerializer = Symbol('toSerializer');

/**
 * Serializable objects contain a {@link toSerializer} property which maps an
 * object to a {@link Serializer} which can serialize and deserialize that type.
 */
export type Serializable<Value> = { [toSerializer](): Serializer<Value> };
