import { Dehydrated } from './dehydrated.js';
import { QueriedElement } from './query.js';
import { Queryable } from './queryable.js';

/**
 * A base implementation of {@link Queryable}, this represents a "root" node
 * which can be queried for {@link Element} objects. This provides a more
 * ergonomic API than traditional {@link Element.prototype.querySelector} by
 * asserting results are found by default and typing the result based on the
 * input query.
 */
export class QueryRoot<Root extends Element | ShadowRoot>
    implements Queryable<Root> {
  /** The root to use for queries. */
  readonly #root: Root;

  private constructor(root: Root) {
    this.#root = root;
  }

  /**
   * Creates a new {@link QueryRoot} from the provided underlying DOM element or
   * shadow root.
   *
   * @param root The root to use for queries.
   * @returns A {@link QueryRoot} which can query the provided {@link root}.
   */
  public static from<Root extends Element | ShadowRoot>(root: Root):
      QueryRoot<Root> {
    return new QueryRoot(root);
  }

  /** The root element used for queries. */
  public get root(): Root {
    return this.#root;
  }

  public query<Query extends string>(selector: Query, options?: {
    readonly optional?: false,
  }): QueryResult<Query, Root>;
  public query<Query extends string>(selector: Query, options?: {
    readonly optional?: boolean,
  }): QueryResult<Query, Root> | null;
  public query<Query extends string>(selector: Query, { optional = false }: {
    readonly optional?: boolean,
  } = {}): QueryResult<Query, Root> | null {
    const child = this.#root.querySelector(selector) as
        QueriedElement<Query, Root> | null;
    if (!child) {
      if (optional) {
        return null;
      } else {
        throw new Error(`Selector "${
          selector}" did not resolve to an element. Is the selector wrong, or does the element not exist? If it is expected that the element may not exist, consider calling \`.query('${
          selector}', { optional: true })\` to ignore this error.`);
      }
    }

    return Dehydrated.from(child) as QueryResult<Query, Root>;
  }

  public queryAll<Query extends string>(
    selector: Query,
    { optional = false }: { optional?: boolean } = {},
  ): Array<Dehydrated<QueryAllResult<Query, Root>>> {
    const elements = this.#root.querySelectorAll(selector) as
        NodeListOf<QueryAllResult<Query, Root>>;
    if (!optional && elements.length === 0) {
      throw new Error(`Selector "${
          selector}" did not resolve to any elements. Is the selector wrong, or do the elements not exist? If it is expected that the elements may not exist, consider calling \`.queryAll('${
          selector}', { optional: true })\` to ignore this error.`);
    }

    return Array.from(elements, (el) => Dehydrated.from(el));
  }
}

// `QueriedElement` returns `null` when given a pseudo-element selector. Need to
// avoid boxing this `null` into `Dehydrated<null>`.
export type QueryResult<
  Query extends string,
  Root extends Element | ShadowRoot
> = QueriedElement<Query, Root> extends null
    ? null
    : Dehydrated<QueriedElement<Query, Root>>
;

// `QueriedElement` returns `null` when given a pseudo-element selector. Need to
// avoid boxing this `null` into `null[]`, when any such values would be
// filtered out of the result.
export type QueryAllResult<
  Query extends string,
  Root extends Element | ShadowRoot
> = QueriedElement<Query, Root> extends null
    ? Element
    : QueriedElement<Query, Root>
;
