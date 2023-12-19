/**
 * @fileoverview Defines the {@link ElementRef} class and associated utilities.
 */

import { type QueriedElement } from './query.js';
import { type Serialized, type Serializer, type Serializable, bigintSerializer, booleanSerializer, numberSerializer, stringSerializer, toSerializer } from './serializers.js';

/**
 * A wrapper class of {@link Element} which provides more ergonomic API access
 * conducive to chaining.
 */
export class ElementRef<El extends Element> {
  private constructor(public readonly native: El) {}

  /**
   * Creates a new {@link ElementRef} from the given {@link Element} object.
   *
   * @param native The native element to wrap in an {@link ElementRef}.
   * @returns A new {@link ElementRef} object wrapping the input.
   */
  public static from<El extends Element>(native: El): ElementRef<El> {
    if (native.nodeType !== Node.ELEMENT_NODE) {
      throw new Error(`Tried to create an \`ElementRef\` of \`nodeType\` ${
        native.nodeType} (see https://developer.mozilla.org/en-US/docs/Web/API/Node/nodeType).\n\n\`ElementRef\` must be created with an \`Element\`, not any other type of \`Node\`.`);
    }

    return new ElementRef(native);
  }

  /**
   * Provides the value of the text content on the underlying element.
   *
   * @param serializerToken A "token" which identifiers a {@link Serializer} to
   *     deserialize the read attribute string. A token is one of:
   *     *   A primitive serializer - {@link String}, {@link Boolean},
   *         {@link Number}, {@link BigInt}.
   *     *   A {@link Serializer} object.
   *     *   A {@link Serializable} object.
   * @returns The value of the text content for this element deserialized based
   *     on the input token.
   */
  public read<SerializerToken extends
      | PrimitiveSerializerToken
      | Serializer<unknown>
      | Serializable<unknown>
  >(serializerToken: SerializerToken):
      Serialized<ResolveSerializer<SerializerToken>> {
    const text = this.native.textContent;

    // This should only happen when the native element is a `Document` or a
    // DocType. Neither should be allowed to be constructed, but even if so, we
    // assert here to be sure.
    if (text === null) {
      throw new Error('`textContent` was `null`.');
    }

    const serializer = resolveSerializer(serializerToken);
    return serializer.deserialize(text) as any;
  }

  /**
   * Provides the value of the attribute with the given name on the underlying
   * element.
   *
   * Note that an attribute without a value such as `<div foo></div>` will
   * return an empty string which is considered falsy. The correct way to check
   * if an attribute exists is: `attr('foo') !== null`.
   *
   * @param name The name of the attribute to read.
   * @param serializerToken A "token" which identifiers a {@link Serializer} to
   *     deserialize the read attribute string. A token is one of:
   *     *   A primitive serializer - {@link String}, {@link Boolean},
   *         {@link Number}, {@link BigInt}.
   *     *   A {@link Serializer} object.
   *     *   A {@link Serializable} object.
   * @returns The value of the attribute deserialized based on the input token,
   *     or `null` if not set.
   */
  public attr<SerializerToken extends
      | PrimitiveSerializerToken
      | Serializer<unknown>
      | Serializable<unknown>
  >(
    name: string,
    serializerToken: SerializerToken,
    options: { optional: true },
  ): Serialized<ResolveSerializer<SerializerToken>> | undefined;
  public attr<SerializerToken extends
      | PrimitiveSerializerToken
      | Serializer<unknown>
      | Serializable<unknown>
  >(
    name: string,
    serializerToken: SerializerToken,
    options?: { optional?: false },
  ): Serialized<ResolveSerializer<SerializerToken>>;
  public attr<SerializerToken extends
      | PrimitiveSerializerToken
      | Serializer<unknown>
      | Serializable<unknown>
  >(
    name: string,
    serializerToken: SerializerToken,
    options?: { optional?: boolean },
  ): Serialized<ResolveSerializer<SerializerToken>> | undefined;
  public attr<SerializerToken extends
      | PrimitiveSerializerToken
      | Serializer<unknown>
      | Serializable<unknown>
  >(
    name: string,
    serializerToken: SerializerToken,
    { optional }: { optional?: boolean } = {},
  ): Serialized<ResolveSerializer<SerializerToken>> | undefined {
    const serialized = this.native.getAttribute(name);
    if (serialized === null) {
      if (optional) {
        return undefined;
      } else {
        throw new Error(`Attribute "${name}" did not exist on element. Is the name wrong, or does the attribute not exist? If it is expected that the attribute may not exist, consider calling \`attr\` with \`{ optional: true }\` to ignore this error.`);
      }
    }

    const serializer = resolveSerializer(serializerToken);
    return serializer.deserialize(serialized) as any;
  }

  /**
   * Queries light DOM descendants for the provided selector and returns the
   * first matching element wrapped in an {@link ElementRef}. Returns
   * `undefined` if no element is found.
   *
   * @param selector The selector to query for.
   * @returns An {@link ElementRef} which wraps the query result, or `null` if
   *     no element is found.
   */
  public query<Query extends string>(
    selector: Query,
    options?: { readonly optional?: false },
  ): QueryResult<Query, El>;
  public query<Query extends string>(
    selector: Query,
    options: { readonly optional: boolean },
  ): QueryResult<Query, El> | null;
  public query<Query extends string>(selector: Query, { optional = false }: {
    readonly optional?: boolean,
  } = {}): QueryResult<Query, El> | null {
    const child = this.native.querySelector(selector) as
        QueriedElement<Query, El> | null;
    if (!child) {
      if (optional) {
        return null;
      } else {
        throw new Error(`Selector "${selector}" did not resolve to an element. Is the selector wrong, or does the element not exist? If it is expected that the element may not exist, consider calling \`.query('${selector}', { optional: true })\` to ignore this error.`);
      }
    }

    return ElementRef.from(child) as QueryResult<Query, El>;
  }

  /**
   * Queries light DOM descendants for the provided selector and returns all
   * matching elements, each wrapped in an {@link ElementRef}. Always returns a
   * real {@link Array}, not a {@link NodeListOf} like
   * {@link Element.prototype.querySelectorAll}. Returns an empty array when no
   * elements match the given query.
   *
   * @param selector The selector to query for.
   * @returns An {@link Array} of the queried elements, each wrapped in an
   *     {@link ElementRef}.
   */
  public queryAll<Selector extends string>(
    selector: Selector,
    { optional = false }: { optional?: boolean } = {},
  ): Array<ElementRef<QueryAllResult<Selector, El>>> {
    const elements = this.native.querySelectorAll(selector) as
        NodeListOf<QueryAllResult<Selector, El>>;
    if (!optional && elements.length === 0) {
      throw new Error(`Selector "${selector}" did not resolve to any elements. Is the selector wrong, or do the elements not exist? If it is expected that the elements may not exist, consider calling \`.queryAll('${selector}', { optional: true })\` to ignore this error.`);
    }

    return Array.from(elements).map((el) => ElementRef.from(el));
  }
}

// `QueriedElement` returns `null` when given a pseudo-element selector. Need to
// avoid boxing this `null` into `ElementRef<null>`.
type QueryResult<Query extends string, Host extends Element> =
    QueriedElement<Query, Host> extends null
        ? null
        : ElementRef<QueriedElement<Query, Host>>
;

// `QueriedElement` returns `null` when given a pseudo-element selector. Need to
// avoid boxing this `null` into `null[]`, when any such values would be
// filtered out of the result.
type QueryAllResult<Query extends string, Host extends Element> =
    QueriedElement<Query, Host> extends null
        ? Element
        : QueriedElement<Query, Host>
;

// Tokens which reference `Serializer` objects for primitive types.
type PrimitiveSerializerToken =
    | typeof String
    | typeof Number
    | typeof Boolean
    | typeof BigInt
;

/**
 * Resolves and returns the {@link Serializer} referenced by the provided token.
 */
function resolveSerializer<SerializerToken extends
    | PrimitiveSerializerToken
    | Serializer<unknown>
    | Serializable<unknown>
>(serializerToken: SerializerToken): ResolveSerializer<typeof serializerToken> {
  switch (serializerToken) {
    case String: {
      return stringSerializer as ResolveSerializer<SerializerToken>;
    } case Number: {
      return numberSerializer as ResolveSerializer<SerializerToken>;
    } case Boolean: {
      return booleanSerializer as ResolveSerializer<SerializerToken>;
    } case BigInt: {
      return bigintSerializer as ResolveSerializer<SerializerToken>;
    } default: {
      if (toSerializer in serializerToken) {
        return (serializerToken as Serializable<unknown>)[toSerializer]() as
            ResolveSerializer<SerializerToken>;
      } else {
        // Already a serializer.
        return serializerToken as ResolveSerializer<SerializerToken>;
      }
    }
  }
}

// Computes the return type of a resolved `Serializer` object for a given token.
type ResolveSerializer<Input extends
    | Serializable<unknown>
    | Serializer<unknown>
    | PrimitiveSerializerToken
> = Input extends Serializable<unknown>
    ? ReturnType<Input[typeof toSerializer]>
    : Input extends Serializer<unknown>
        ? Input
        : Input extends typeof String
            ? typeof stringSerializer
            : Input extends typeof Number
                ? typeof numberSerializer
                : Input extends typeof Boolean
                    ? typeof booleanSerializer
                    : Input extends typeof BigInt
                        ? typeof bigintSerializer
                        : never
;
