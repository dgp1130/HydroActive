import { QueriedElement } from './query.js';

/**
 * Represents an element which can query its descendants for those matching a
 * provided CSS selector.
 */
export interface Queryable<El extends Element> {
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
  ): QueryResult<Query, El>;
  query<Query extends string>(
    selector: Query,
    options?: { readonly optional?: boolean },
  ): QueryResult<Query, El> | null;
  query<Query extends string>(selector: Query, options?: {
    readonly optional?: boolean,
  }): QueryResult<Query, El> | null;

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
  ): Array<Queryable<QueryAllResult<Selector, El>>>;
}

/**
 * Queries light DOM descendants for the provided element with the selector and
 * returns the first matching element.
 *
 * @param root The element to query descendants of.
 * @param selector The selector to query for.
 * @param optional Specifies what happens when an element is not found. If
 *     `optional` is `false` (default), an error is thrown. If `optional` is
 *     `true`, then `null` is returned.
 * @returns The first element found by the query. Returns `null` if `optional`
 *     is `true` and no element is found.
 * @throws If no element is found and `optional` is `false` (default).
 */
export function query<Query extends string, El extends Element>(
  root: El,
  selector: Query,
  { optional = false }: { readonly optional?: boolean } = {},
): QueriedElement<Query, El> | null {
  const child = root.querySelector(selector) as
      QueriedElement<Query, El> | null;
  if (!child) {
    if (optional) {
      return null;
    } else {
      throw new Error(`Selector "${
        selector}" did not resolve to an element. Is the selector wrong, or does the element not exist? If it is expected that the element may not exist, consider calling \`.query('${
        selector}', { optional: true })\` to ignore this error.`);
    }
  }

  return child;
}

/**
 * Queries light DOM descendants for the provided selector and returns all
 * matching elements.
 *
 * @param selector The selector to query for.
 * @param optional Specifies what happens when no elements are found. If
 *     `optional` is `false` (default), an error is thrown. If `optional` is
 *     `true`, then an empty array is returned.
 * @returns An {@link Array} of the queried elements.
 * @throws If no element is found and `optional` is `false` (default).
 */
export function queryAll<Query extends string, El extends Element>(
  root: El,
  selector: Query,
  { optional }: { optional?: boolean } = {},
): NodeListOf<QueryAllResult<Query, El>> {
  const elements = root.querySelectorAll(selector) as
    NodeListOf<QueryAllResult<Query, El>>;
  if (!optional && elements.length === 0) {
    throw new Error(`Selector "${
        selector}" did not resolve to any elements. Is the selector wrong, or do the elements not exist? If it is expected that the elements may not exist, consider calling \`.queryAll('${
        selector}', { optional: true })\` to ignore this error.`);
  }

  return elements;
}

// `QueriedElement` returns `null` when given a pseudo-element selector. Need to
// avoid boxing this `null` into `Queryable<null>`.
type QueryResult<Query extends string, Host extends Element> =
  QueriedElement<Query, Host> extends null
    ? null
    : Queryable<QueriedElement<Query, Host>>
;

// `QueriedElement` returns `null` when given a pseudo-element selector. Need to
// avoid boxing this `null` into `null[]`, when any such values would be
// filtered out of the result.
type QueryAllResult<Query extends string, Host extends Element> =
  QueriedElement<Query, Host> extends null
    ? Element
    : QueriedElement<Query, Host>
;
