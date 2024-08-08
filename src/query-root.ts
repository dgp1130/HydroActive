import { Dehydrated } from './dehydrated.js';
import { QueriedElement } from './query.js';
import { Queryable } from './queryable.js';

/** TODO */
export class QueryRoot<El extends Element> implements Queryable<El> {
  readonly #root: El;

  private constructor(root: El) {
    this.#root = root;
  }

  /**
   * Creates a new {@link QueryRoot} from the provided underlying DOM element.
   *
   * @param root TODO
   * @returns TODO
   */
  public static from<El extends Element>(root: El): QueryRoot<El> {
    return new QueryRoot(root);
  }

  /** TODO */
  public get root(): El {
    return this.#root;
  }

  public query<Query extends string>(selector: Query, options?: {
    readonly optional?: false,
  }): QueryResult<Query, El>;
  public query<Query extends string>(selector: Query, options?: {
    readonly optional?: boolean,
  }): QueryResult<Query, El> | null;
  public query<Query extends string>(selector: Query, { optional = false }: {
    readonly optional?: boolean,
  } = {}): QueryResult<Query, El> | null {
    const child = this.#root.querySelector(selector) as
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

    return Dehydrated.from(child) as QueryResult<Query, El>;
  }

  public queryAll<Query extends string>(
    selector: Query,
    { optional = false }: { optional?: boolean } = {},
  ): Array<Dehydrated<QueryAllResult<Query, El>>> {
    const elements = this.#root.querySelectorAll(selector) as
        NodeListOf<QueryAllResult<Query, El>>;
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
