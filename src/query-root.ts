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
  public query<Query extends string>(selector: Query, options: {
    readonly optional?: boolean,
  } = {}): QueryResult<Query, Root> | null {
    const { optional = false } = options;

    const child = this.#root.querySelector(selector) as
        QueriedElement<Query, Root> | null;
    if (!child) {
      if (optional) {
        return null;
      } else {
        // Element was not found and will throw an error. Check if we were
        // querying the light DOM but the element exists in the shadow DOM, as
        // this might be indicative of forgetting to call `.shadow` so we can
        // give a more accurate error message.
        //
        // We prefer `this.#root.shadowRoot` over `this.shadow` as the latter
        // would throw if there is no shadow root.
        if (this.#root instanceof Element && this.#root.shadowRoot) {
          const shadowChild = QueryRoot.from(this.#root.shadowRoot).query(
            selector,
            {
              ...options,
              optional: true,
            },
          );

          if (shadowChild) {
            throw new Error(`Selector "${
                selector}" did not resolve to an element, however the same selector was found in the shadow root. Did you mean to call \`.shadow.query(...)\`, is the selector wrong, or does the element not exist? If it is expected that the element may not exist, consider calling \`.query('${
                selector}', { optional: true })\` to ignore this error.`);
          }
        }

        throw new Error(`Selector "${
            selector}" did not resolve to an element. Is the selector wrong, or does the element not exist? If it is expected that the element may not exist, consider calling \`.query('${
            selector}', { optional: true })\` to ignore this error.`);
      }
    }

    return Dehydrated.from(child) as QueryResult<Query, Root>;
  }

  public queryAll<Query extends string>(
    selector: Query,
    options: { optional?: boolean } = {},
  ): Array<Dehydrated<QueryAllResult<Query, Root>>> {
    const { optional = false } = options;

    const elements = this.#root.querySelectorAll(selector) as
        NodeListOf<QueryAllResult<Query, Root>>;
    if (!optional && elements.length === 0) {
      // Element was not found and will throw an error. Check if we were
      // querying the light DOM but the element exists in the shadow DOM, as
      // this might be indicative of forgetting to call `.shadow` so we can
      // give a more accurate error message.
      //
      // We prefer `this.#root.shadowRoot` over `this.shadow` as the latter
      // would throw if there is no shadow root.
      if (this.#root instanceof Element && this.#root.shadowRoot) {
        const shadowChild = QueryRoot.from(this.#root.shadowRoot).query(
          selector,
          {
            ...options,
            optional: true,
          },
        );

        if (shadowChild) {
          throw new Error(`Selector "${
              selector}" did not resolve to any elements, however the same selector was found in the shadow root. Did you mean to call \`.shadow.queryAll(...)\`, is the selector wrong, or do the elements not exist? If it is expected that the elements may not exist, consider calling \`.queryAll('${
              selector}', { optional: true })\` to ignore this error.`);
        }
      }

      throw new Error(`Selector "${
          selector}" did not resolve to any elements. Is the selector wrong, or do the elements not exist? If it is expected that the elements may not exist, consider calling \`.queryAll('${
          selector}', { optional: true })\` to ignore this error.`);
    }

    return Array.from(elements, (el) => Dehydrated.from(el));
  }

  public get shadow(): QueryRoot<ShadowRoot> {
    // Verify we're not already scoped to a `ShadowRoot`. It won't have another
    // `ShadowRoot` under it.
    if (this.#root instanceof ShadowRoot) {
      throw new Error('The element is already scoped to its shadow root, no' +
          ' need to call `shadow` again.');
    }

    // Grab the `ShadowRoot` of this element.
    const shadowRoot = this.#root.shadowRoot;
    if (!shadowRoot) {
      throw new Error('The element either does not have a shadow root, or its' +
          ' shadow root is closed.');
    }

    return QueryRoot.from(shadowRoot);
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
