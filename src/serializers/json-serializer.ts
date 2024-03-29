import { TextContentSerializer } from './primitive-serializers.js';

/** A single value in a JSON expression. */
export type JsonValue =
  | string
  | boolean
  | number
  | null
  | JsonArray
  | { [prop: string]: JsonValue }
;
// An explicit interface is necessary to avoid an infinitely recursive type.
interface JsonArray extends Array<JsonValue> {}

/**
 * Serializes JSON content using {@link JSON.parse} and {@link JSON.stringify}.
 * See those functions to understand edge-case behavior.
 *
 * Note that `JSON.parse('null')` does return `null`. Same for `'true'`,
 * `'"test"'`, and `'123'`. The same behavior applies to `deserialize`.
 */
export const jsonSerializer =
    new class extends TextContentSerializer<JsonValue> {
  public override serialize(value: JsonValue): string {
    return JSON.stringify(value);
  }

  public override deserialize(serial: string): JsonValue {
    return JSON.parse(serial) as JsonValue;
  }
}();
