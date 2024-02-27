import { AttrSerializerToken, ResolveSerializer, resolveSerializer } from './serializer-tokens.js';
import { Serialized, AttrSerializer, AttrSerializable } from './serializers.js';

/**
 * Wraps an attribute of an element in a convenient wrapper for accessing it's
 * contents with a `Serializer`.
 */
export class AttrAccessor {
  readonly #native: Element;
  readonly #name: string;

  private constructor(native: Element, name: string) {
    this.#native = native;
    this.#name = name;
  }

  /**
   * Creates a new {@link AttrAccessor}.
   *
   * @param native The native {@link Element} to wrap.
   * @param name The name of the attribute to wrap.
   * @returns An {@link AttrAccessor} wrapping the given element and attribute.
   */
  public static from(native: Element, name: string): AttrAccessor {
    return new AttrAccessor(native, name);
  }

  /**
   * Returns whether or not the attribute is currently present on the element.
   * If the attribute is an empty string, returns `true` (just like
   * {@link Element.prototype.hasAttribute}).
   *
   * @returns Whether or not the attribute is currently present on the element.
   */
  public exists(): boolean {
    return this.#native.hasAttribute(this.#name);
  }

  /**
   * Reads the underlying attribute by deserializing it with the
   * {@link AttrSerializer} referenced by the provided token.
   *
   * @param token A token which resolves to an {@link AttrSerializer} to
   *     deserialize the attribute value with.
   * @param options Additional options.
   *     `optional` specifies what happens when the attribute is not present. If
   *         `optional` is `false` (default), an error is thrown. If `optional`
   *         is `true`, then `null` is returned.
   * @returns The deserialized value read from the attribute. Returns `null` if
   *     `optional` is `true` and the attribute is not present.
   * @throws If the attribute is not present and `optional` is `false` (default).
   */
  public read<Token extends AttrSerializerToken<any>>(token: Token, options?: {
    optional?: false,
  }): Serialized<ResolveSerializer<
    Token,
    AttrSerializer<unknown>,
    AttrSerializable<unknown>
  >>;
  public read<Token extends AttrSerializerToken<any>>(token: Token, options?: {
    optional?: boolean,
  }): Serialized<ResolveSerializer<
    Token,
    AttrSerializer<unknown>,
    AttrSerializable<unknown>
  >> | null;
  public read<Token extends AttrSerializerToken<any>>(
    token: Token,
    { optional }: { optional?: boolean } = {},
  ): Serialized<ResolveSerializer<
    Token,
    AttrSerializer<unknown>,
    AttrSerializable<unknown>
  >> | null {
    // Validate that the attribute exists.
    const serialized = this.#native.getAttribute(this.#name);
    if (serialized === null) {
      if (optional) {
        return null;
      } else {
        throw new Error(`Failed to read attribute "${
            this.#name}" because it was not set on the element.`);
      }
    }

    const serializer = resolveSerializer<
      Token,
      AttrSerializer<unknown>,
      AttrSerializable<unknown>
    >(token);
    return serializer.deserialize(serialized);
  }
}
