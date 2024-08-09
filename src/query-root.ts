import { Dehydrated } from './dehydrated.js';
import { QueriedElement } from './query.js';
import { Queryable, query, queryAll } from './queryable.js';

/**
 * A base implementation of {@link Queryable}, this represents a "root" node
 * which can be queried for {@link Element} objects. This provides a more
 * ergonomic API than traditional {@link Element.prototype.querySelector} by
 * asserting results are found by default and typing the result based on the
 * input query.
 */
export class QueryRoot<El extends Element> implements Queryable<El> {
  /** The root to use for queries. */
  readonly #root: El;

  private constructor(root: El) {
    this.#root = root;
  }

  /**
   * Creates a new {@link QueryRoot} from the provided underlying DOM element.
   *
   * @param root The root to use for queries.
   * @returns A {@link QueryRoot} which can query the provided {@link root}.
   */
  public static from<El extends Element>(root: El): QueryRoot<El> {
    return new QueryRoot(root);
  }

  /** The root element used for queries. */
  public get root(): El {
    return this.#root;
  }

  public query<Query extends string>(selector: Query, options?: {
    readonly optional?: false,
  }): QueryResult<Query, El>;
  public query<Query extends string>(selector: Query, options?: {
    readonly optional?: boolean,
  }): QueryResult<Query, El> | null;
  public query<Query extends string>(selector: Query, options: {
    readonly optional?: boolean,
  } = {}): QueryResult<Query, El> | null {
    const child = query(this.#root as El, selector, options);
    if (!child) return null;

    return Dehydrated.from(child) as QueryResult<Query, El>;
  }

  public queryAll<Query extends string>(
    selector: Query,
    options: { optional?: boolean } = {},
  ): Array<Dehydrated<QueryAllResult<Query, El>>> {
    const elements = queryAll(this.#root as El, selector, options);
    return Array.from(elements, (el) => Dehydrated.from(el));
  }
}

// `QueriedElement` returns `null` when given a pseudo-element selector. Need to
// avoid boxing this `null` into `Dehydrated<null>`.
export type QueryResult<Query extends string, Host extends Element> =
  QueriedElement<Query, Host> extends null
    ? null
    : Dehydrated<QueriedElement<Query, Host>>
;

// `QueriedElement` returns `null` when given a pseudo-element selector. Need to
// avoid boxing this `null` into `null[]`, when any such values would be
// filtered out of the result.
export type QueryAllResult<Query extends string, Host extends Element> =
  QueriedElement<Query, Host> extends null
    ? Element
    : QueriedElement<Query, Host>
;
