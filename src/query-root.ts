import { Dehydrated } from './dehydrated.js';
import { QueriedElement } from './query.js';
import { Queryable } from './queryable.js';

/** TODO */
export class QueryRoot<Root extends Element | ShadowRoot>
    implements Queryable<Root> {
  /** TODO */
  readonly #root: Root;

  /** TODO */
  readonly #getShadowRoot?: () => ShadowRoot | null;

  private constructor(
    root: Root,
    getShadowRoot?: () => ShadowRoot | null,
  ) {
    this.#root = root;
    this.#getShadowRoot = getShadowRoot;
  }

  /**
   * Creates a new {@link QueryRoot} from the provided underlying DOM element or
   * shadow root.
   *
   * @param root TODO
   * @param getShadowRoot TODO
   * @returns TODO
   */
  public static from<El extends Element>(
    root: El,
    getShadowRoot?: () => ShadowRoot | null,
  ): QueryRoot<El>;
  public static from(root: ShadowRoot): QueryRoot<ShadowRoot>;
  public static from<Root extends Element | ShadowRoot>(
    root: Root,
    getShadowRoot?: () => ShadowRoot | null,
  ): QueryRoot<Root> {
    if (root instanceof ShadowRoot && getShadowRoot) {
      throw new Error('`getShadowRoot` can only be provided when an element is given, not another shadow root.');
    }

    return new QueryRoot(root, getShadowRoot);
  }

  /** TODO */
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

    // If we found an element, return it wrapped in a `Dehydrated`.
    if (child) return Dehydrated.from(child) as QueryResult<Query, Root>;

    // If did not find an element and that's not an error, just return `null`.
    if (!child && optional) return null;

    // Element was not found and will throw an error. Check if we were querying
    // the light DOM but the element exists in the shadow DOM, as this might be
    // indicative of forgetting to call `.shadow` so we can give a more accurate
    // error message.
    if (this.#root instanceof Element) {
      const shadow = this.#getAndValidateShadowRoot();
      const shadowChild = shadow && QueryRoot.from(shadow).query(
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

    // Fall back to a generic error message.
    throw new Error(`Selector "${
        selector}" did not resolve to an element. Is the selector wrong, or does the element not exist? If it is expected that the element may not exist, consider calling \`.query('${
        selector}', { optional: true })\` to ignore this error.`);

  }

  public queryAll<Query extends string>(
    selector: Query,
    options: { optional?: boolean } = {},
  ): Array<Dehydrated<QueryAllResult<Query, Root>>> {
    const { optional = false } = options;

    const elements = this.#root.querySelectorAll(selector) as
        NodeListOf<QueryAllResult<Query, Root>>;

    // If we found any elements, wrap them in `Dehydrated`.
    if (elements.length > 0) {
      return Array.from(elements, (el) => Dehydrated.from(el));
    }

    // If did not find any elements and that's not an error, just return `null`.
    if (optional) return [];

    // No elements were not found and will throw an error. Check if we were
    // querying the light DOM but any elements exist in the shadow DOM, as this
    // might be indicative of forgetting to call `.shadow` so we can give a more
    // accurate error message.
    if (this.#root instanceof Element) {
      const shadow = this.#getAndValidateShadowRoot();
      const shadowChild = shadow && QueryRoot.from(shadow).query(
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

    // Fall back to a generic error message.
    throw new Error(`Selector "${
        selector}" did not resolve to any elements. Is the selector wrong, or do the elements not exist? If it is expected that the elements may not exist, consider calling \`.queryAll('${
        selector}', { optional: true })\` to ignore this error.`);
  }

  public get shadow(): QueryRoot<ShadowRoot> {
    if (this.#root instanceof ShadowRoot) {
      throw new Error('The element is already scoped to its shadow root, no' +
          ' need to call `shadow` again.');
    }

    const shadow = this.#getAndValidateShadowRoot();
    if (!shadow) {
      throw new Error('The element either does not have a shadow root, or its' +
          ' shadow root is closed and was not provided to this `QueryRoot`.');
    }

    return QueryRoot.from(shadow);
  }

  #getAndValidateShadowRoot(): ShadowRoot | null {
    // This method is intended to get the shadow root of the current `Element`.
    // If the root *is* a `ShadowRoot`, then there's no `.shadowRoot` to check.
    if (this.#root instanceof ShadowRoot) return null;

    // Check if a closed shadow root was provided.
    const internalRoot = this.#getShadowRoot?.();
    if (internalRoot) {
      if (internalRoot.host !== this.#root) {
        throw new Error('Shadow root does not belong to the associated element.');
      } else {
        return internalRoot;
      }
    }

    // Fall back to checking for an open shadow root.
    return this.#root.shadowRoot;
  }
}

// `QueriedElement` returns `null` when given a pseudo-element selector. Need to
// avoid boxing this `null` into `Dehydrated<null>`.
export type QueryResult<Query extends string, Root extends Element | ShadowRoot> =
  QueriedElement<Query, Root> extends null
    ? null
    : Dehydrated<QueriedElement<Query, Root>>
;

// `QueriedElement` returns `null` when given a pseudo-element selector. Need to
// avoid boxing this `null` into `null[]`, when any such values would be
// filtered out of the result.
export type QueryAllResult<Query extends string, Root extends Element | ShadowRoot> =
  QueriedElement<Query, Root> extends null
    ? Element
    : QueriedElement<Query, Root>
;
