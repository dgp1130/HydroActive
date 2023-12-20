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
export interface AttrSerializer<Value> {
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
 * Returns the serialized type wrapped by the given {@link AttrSerializer} or
 * {@link AttrSerializable} type.
 */
export type Serialized<
    Serial extends AttrSerializer<unknown> | AttrSerializable<unknown>,
> = Serial extends AttrSerializable<infer Value>
    ? Value
    : Serial extends AttrSerializer<infer Value>
        ? Value
        : never
;

/**
 * A symbol which maps an object to an {@link AttrSerializer} which can
 * serialize and deserialize that type.
 */
export const toSerializer = Symbol('toSerializer');

/**
 * Serializable objects contain a {@link toSerializer} property which maps an
 * object to an {@link AttrSerializer} which can serialize and deserialize that
 * type.
 */
export type AttrSerializable<Value> = {
  [toSerializer](): AttrSerializer<Value>,
};
