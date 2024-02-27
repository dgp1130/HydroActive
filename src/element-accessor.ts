import { Dehydrated } from './dehydrated.js';
import { QueriedElement } from './query.js';
import { Queryable, query, queryAll } from './queryable.js';
import { ElementSerializerToken, ResolveSerializer, resolveSerializer } from './serializer-tokens.js';
import { Serialized, ElementSerializer, ElementSerializable } from './serializers.js';

/**
 * Wraps an element in a convenient wrapper for accessing it's contents with a
 * `Serializer`.
 */
export class ElementAccessor<El extends Element> implements Queryable<El> {
  /**
   * The underlying wrapped {@link Element object}.
   *
   * @returns The {@link Element} wrapped by this {@link ElementAccessor}.
   */
  public readonly element: El;

  protected constructor(element: El) {
    this.element = element;
  }

  /**
   * Creates a new {@link ElementAccessor}.
   *
   * @param native The native {@link Element} to wrap.
   * @returns An {@link ElementAccessor} wrapping the given element.
   */
  public static from<El extends Element>(native: El): ElementAccessor<El> {
    return new ElementAccessor(native);
  }

  /**
   * Provides the value of the text content on the underlying element.
   *
   * @param token A "token" which identifiers an {@link ElementSerializer} to
   *     deserialize the read attribute string. A token is one of:
   *     *   A primitive serializer - {@link String}, {@link Boolean},
   *         {@link Number}, {@link BigInt}.
   *     *   An {@link ElementSerializer} object.
   *     *   A {@link ElementSerializable} object.
   * @returns The value of the text content for this element deserialized based
   *     on the input token.
   */
  public read<Token extends ElementSerializerToken<any, El>>(token: Token):
      Serialized<ResolveSerializer<
        Token,
        ElementSerializer<unknown, El>,
        ElementSerializable<unknown, El>
      >> {
    const serializer = resolveSerializer<
      Token,
      ElementSerializer<unknown, El>,
      ElementSerializable<unknown, El>
    >(token);

    return serializer.deserializeFrom(this.element);
  }

  /**
   * Queries light DOM descendants for the provided selector and returns the
   * first matching element wrapped in a {@link Dehydrated}.
   *
   * @param selector The selector to query for.
   * @param options Additional options for the query.
   *     `optional` specifies what happens when an element is not found. If
   *         `optional` is `false` (default), an error is thrown. If `optional`
   *         is `true`, then `null` is returned.
   * @returns A {@link Dehydrated} which wraps the query result. Returns `null`
   *     if `optional` is `true` and no element is found.
   * @throws If no element is found and `optional` is `false` (default).
   */
  public query<Query extends string>(
    selector: Query,
    options?: { readonly optional?: false },
  ): QueryResult<Query, El>;
  public query<Query extends string>(
    selector: Query,
    options?: { readonly optional?: boolean },
  ): QueryResult<Query, El> | null;
  public query<Query extends string>(selector: Query, options?: {
    readonly optional?: boolean,
  }): QueryResult<Query, El> | null {
    const result = query(this.element, selector, options);
    if (!result) return result;

    return Dehydrated.from(result) as QueryResult<Query, El>;
  }

  /**
   * Queries light DOM descendants for the provided selector and returns all
   * matching elements, each wrapped in an {@link Dehydrated}. Always returns a
   * real {@link Array}, not a {@link NodeListOf} like
   * {@link Element.prototype.querySelectorAll}.
   *
   * @param selector The selector to query for.
   * @param options Additional options for the query.
   *     `optional` specifies what happens when no elements are found. If
   *         `optional` is `false` (default), an error is thrown. If `optional`
   *         is `true`, then an empty array is returned.
   * @returns An {@link Array} of the queried elements, each wrapped in an
   *     {@link Dehydrated}.
   * @throws If no element is found and `optional` is `false` (default).
   */
  queryAll<Selector extends string>(
    selector: Selector,
    options?: { optional?: boolean },
  ): Array<Dehydrated<QueryAllResult<Selector, El>>> {
    const result = queryAll(this.element, selector, options);
    return Array.from(result).map((el) => Dehydrated.from(el));
  }
}

// `QueriedElement` returns `null` when given a pseudo-element selector. Need to
// avoid boxing this `null` into `Dehydrated<null>`.
type QueryResult<Query extends string, Host extends Element> =
  QueriedElement<Query, Host> extends null
    ? null
    : Dehydrated<QueriedElement<Query, Host>>
;

// `QueriedElement` returns `null` when given a pseudo-element selector. Need to
// avoid boxing this `null` into `null[]`, when any such values would be
// filtered out of the result.
type QueryAllResult<Query extends string, Host extends Element> =
  QueriedElement<Query, Host> extends null
    ? Element
    : QueriedElement<Query, Host>
;
