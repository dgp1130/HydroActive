import { type Serializer } from './serializer.js';

/**
 * Serializes `boolean` type as either "true" or "false", case sensitive. Throws
 * an error if any other string is deserialized.
 */
export const booleanSerializer: Serializer<boolean> = {
  serialize(value: boolean): string {
    return value.toString();
  },

  deserialize(serial: string): boolean {
    switch (serial) {
      case 'false': return false;
      case 'true': return true;
      default: throw new Error(`Failed to deserialize to boolean:\n${serial}`);
    }
  },
};

/**
 * Serializes `number` type using the {@link Number} constructor and
 * {@link Number.prototype.toString}. See those functions to understand
 * edge-case behavior such as `NaN`.
 */
export const numberSerializer: Serializer<number> = {
  serialize(value: number): string {
    return value.toString();
  },

  deserialize(serial: string): number {
    return Number(serial);
  },
};

/**
 * Serializes `bigint` type using the {@link BigInt} constructor and
 * {@link BigInt.prototype.toString}. See those functions to understand
 * edge-case behavior.
 */
export const bigintSerializer: Serializer<bigint> = {
  serialize(value: bigint): string {
    return value.toString();
  },

  deserialize(serial: string): bigint {
    return BigInt(serial);
  },
};

/**
 * Serializes `string` type. Actually a no-op since string are already strings.
 */
export const stringSerializer: Serializer<string> = {
  serialize(value: string): string {
    return value;
  },

  deserialize(serial: string): string {
    return serial;
  },
};
