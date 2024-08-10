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
export class QueryRoot<out Root extends Element | ShadowRoot>
    implements Queryable<Root> {
  /** The root to use for queries. */
  readonly #root: Root;

  /**
   * Returns the shadow root for the element. Only set if the root is an
   * {@link Element}, not already a {@link ShadowRoot}.
   */
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
   * @param root The root to use for queries.
   * @param getClosedShadowRoot A function to get the closed shadow root of the
   *     given root element. If the element does not have a closed shadow root
   *     and will never receive one, this can be left `undefined`. Open shadow
   *     root are automatically handled and do not require any additional input.
   * @returns A {@link QueryRoot} which can query the provided {@link root}.
   */
  public static from<El extends Element>(
    root: El,
    getClosedShadowRoot?: () => ShadowRoot | null,
  ): QueryRoot<El>;
  public static from(root: ShadowRoot): QueryRoot<ShadowRoot>;
  public static from<Root extends Element | ShadowRoot>(
    root: Root,
    getClosedShadowRoot?: () => ShadowRoot | null,
  ): QueryRoot<Root> {
    if (root instanceof ShadowRoot && getClosedShadowRoot) {
      throw new Error('`getShadowRoot` can only be provided when an element is given, not another shadow root.');
    }

    // Default to `.shadowRoot` to support open shadow roots naturally.
    const getShadowRoot = root instanceof Element
        ? validateShadowRootOnRead(
          root,
          getClosedShadowRoot ?? (() => root.shadowRoot),
        )
        : undefined;

    return new QueryRoot(root, getShadowRoot);
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

    // If we found an element, return it wrapped in a `Dehydrated`.
    if (child) return Dehydrated.from(child) as QueryResult<Query, Root>;

    // If did not find an element and that's not an error, just return `null`.
    if (!child && optional) return null;

    // Element was not found and will throw an error. Check if we were querying
    // the light DOM but the element exists in the shadow DOM, as this might be
    // indicative of forgetting to call `.shadow` so we can give a more accurate
    // error message.
    if (this.#root instanceof Element) {
      const shadow = this.#getShadowRoot?.();
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
      const shadow = this.#getShadowRoot?.();
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
    // Verify we're not already scoped to a `ShadowRoot`. It won't have another
    // `ShadowRoot` under it.
    if (this.#root instanceof ShadowRoot) {
      throw new Error('The element is already scoped to its shadow root, no' +
          ' need to call `shadow` again.');
    }

    // Grab the `ShadowRoot` of this element.
    const shadowRoot = this.#getShadowRoot?.();
    if (!shadowRoot) {
      throw new Error('The element either does not have a shadow root, or its' +
          ' shadow root is closed and was not provided to this `QueryRoot`.');
    }

    return QueryRoot.from(shadowRoot);
  }
}

/**
 * This decorates the given {@link getShadowRoot} by validating the shadow root
 * whenever it is read. Decorating the function like this ensures that is never
 * accidentally read and used in an unvalidated state.
 *
 * We need to validate on read rather than initialization because shadow roots
 * can be attached at any time, even after the {@link QueryRoot} for an element
 * is created. Therefore {@link getShadowRoot} might return `null` at one time
 * and a {@link ShadowRoot} another time.
 *
 * We close over the {@link root} rather than accepting it or the
 * {@link QueryRoot} as an input because doing so would put the {@link root}
 * into a contravariant position as a function parameter on a property of
 * {@link QueryRoot}. The root type is already covariant so this would make the
 * entire type invariant and much harder to work with as a result.
 */
function validateShadowRootOnRead<Root extends Element | ShadowRoot>(
  root: Root,
  getShadowRoot: () => ShadowRoot | null,
): () => ShadowRoot | null {
  return () => {
    // This method is intended to get the shadow root of the current `Element`.
    // If the root *is* a `ShadowRoot`, then there's no `.shadowRoot` to check.
    if (root instanceof ShadowRoot) return null;

    // Check if a shadow root is accessible.
    const shadowRoot = getShadowRoot() ?? null;
    if (shadowRoot && shadowRoot.host !== root) {
      throw new Error('Shadow root does not belong to the associated element.');
    }

    return shadowRoot;
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
