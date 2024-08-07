import { QueriedElement } from './query.js';

/**
 * Represents an element or shadow root which can query its descendants for
 * those matching a provided CSS selector.
 */
export interface Queryable<Root extends Element | ShadowRoot> {
  /**
   * Queries light DOM descendants for the provided selector and returns the
   * first matching element wrapped in a {@link Queryable}.
   *
   * @param selector The selector to query for.
   * @param options Additional options for the query.
   *     `optional` specifies what happens when an element is not found. If
   *         `optional` is `false` (default), an error is thrown. If `optional`
   *         is `true`, then `null` is returned.
   * @returns A {@link Queryable} which wraps the query result. Returns `null`
   *     if `optional` is `true` and no element is found.
   * @throws If no element is found and `optional` is `false` (default).
   */
  query<Query extends string>(
    selector: Query,
    options?: { readonly optional?: false },
  ): QueryResult<Query, Root>;
  query<Query extends string>(
    selector: Query,
    options?: { readonly optional?: boolean },
  ): QueryResult<Query, Root> | null;
  query<Query extends string>(selector: Query, options?: {
    readonly optional?: boolean,
  }): QueryResult<Query, Root> | null;

  /**
   * Queries light DOM descendants for the provided selector and returns all
   * matching elements, each wrapped in an {@link Queryable}. Always returns a
   * real {@link Array}, not a {@link NodeListOf} like
   * {@link Element.prototype.querySelectorAll}.
   *
   * @param selector The selector to query for.
   * @param options Additional options for the query.
   *     `optional` specifies what happens when no elements are found. If
   *         `optional` is `false` (default), an error is thrown. If `optional`
   *         is `true`, then an empty array is returned.
   * @returns An {@link Array} of the queried elements, each wrapped in an
   *     {@link Queryable}.
   * @throws If no element is found and `optional` is `false` (default).
   */
  queryAll<Selector extends string>(
    selector: Selector,
    options?: { optional?: boolean },
  ): Array<Queryable<QueryAllResult<Selector, Root>>>;

  /**
   * Returns the root element's {@link ShadowRoot} wrapped in a
   * {@link Queryable}. This allows subsequent queries to be scoped to the
   * {@link ShadowRoot}.
   *
   * @returns A {@link Queryable} wrapping the {@link ShadowRoot} which of the
   *     root element.
   * @throws If this element does not have a shadow root or if the shadow root
   *     is closed and not provided to the {@link Queryable}.
   */
  get shadow(): Queryable<ShadowRoot>;
}

// `QueriedElement` returns `null` when given a pseudo-element selector. Need to
// avoid boxing this `null` into `Queryable<null>`.
type QueryResult<Query extends string, Root extends Element | ShadowRoot> =
  QueriedElement<Query, Root> extends null
    ? null
    : Queryable<QueriedElement<Query, Root>>
;

// `QueriedElement` returns `null` when given a pseudo-element selector. Need to
// avoid boxing this `null` into `null[]`, when any such values would be
// filtered out of the result.
type QueryAllResult<Query extends string, Root extends Element | ShadowRoot> =
  QueriedElement<Query, Root> extends null
    ? Element
    : QueriedElement<Query, Root>
;
