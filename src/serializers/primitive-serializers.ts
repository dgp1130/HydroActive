import { type AttrSerializer, type ElementSerializer } from './serializer.js';

/**
 * Provides a basic implementation of `serializeTo` and `deserializeFrom` by
 * wrapping the implementations of `serialize` and `deserialize` with the
 * element's text content.
 *
 * @internal
 */
export abstract class TextContentSerializer<Value>
    implements ElementSerializer<Value, Element>, AttrSerializer<Value> {
  public serializeTo(value: Value, element: Element): void {
    element.textContent = this.serialize(value);
  }

  public deserializeFrom(element: Element): Value {
    return this.deserialize(element.textContent!);
  }

  public abstract serialize(value: Value): string;
  public abstract deserialize(serial: string): Value;
}

/**
 * Serializes `boolean` type as either "true" or "false", case sensitive. Throws
 * an error if any other string is deserialized.
 */
export const booleanSerializer =
    new class extends TextContentSerializer<boolean> {
  public override serialize(value: boolean): string {
    return value.toString();
  }

  public override deserialize(serial: string): boolean {
    switch (serial) {
      case 'false': return false;
      case 'true': return true;
      default: throw new Error(`Failed to deserialize to boolean:\n${serial}`);
    }
  }
}();

/**
 * Serializes `number` type using the {@link Number} constructor and
 * {@link Number.prototype.toString}. See those functions to understand
 * edge-case behavior such as `NaN`.
 */
export const numberSerializer =
    new class extends TextContentSerializer<number> {
  public override serialize(value: number): string {
    return value.toString();
  }

  public override deserialize(serial: string): number {
    return Number(serial);
  }
}();

/**
 * Serializes `bigint` type using the {@link BigInt} constructor and
 * {@link BigInt.prototype.toString}. See those functions to understand
 * edge-case behavior.
 */
export const bigintSerializer =
    new class extends TextContentSerializer<bigint> {
  public override serialize(value: bigint): string {
    return value.toString();
  }

  public override deserialize(serial: string): bigint {
    return BigInt(serial);
  }
}();

/**
 * Serializes `string` type. Actually a no-op since string are already strings.
 */
export const stringSerializer =
    new class extends TextContentSerializer<string> {
  public override serialize(value: string): string {
    return value;
  }

  public override deserialize(serial: string): string {
    return serial;
  }
}();

/** TODO */
export const elementSerializer: ElementSerializer<Element, Element> = {
  serializeTo(newElement: Element, oldElement: Element): void {
    oldElement.replaceWith(newElement);
  },

  deserializeFrom(element: Element): Element {
    return element;
  },
};
