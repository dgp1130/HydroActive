import { Queryable } from './queryable.js';
import { ElementAccessor } from './element-accessor.js';
import { PropsOf, hydrate, isHydrated } from './hydration.js';
import { isCustomElement, isUpgraded } from './custom-elements.js';
import { QueryAllResult, QueryResult, QueryRoot } from './query-root.js';
import { Class } from './utils/types.js';

/**
 * Represents a "dehydrated" reference to an element. The element is *not*
 * assumed to be hydrated and as such its features are inaccessible by default
 * because they cannot be guaranteed to work like a typical custom element.
 * Instead, users of this class must explicitly "unbox" the underlying element
 * from this type in a way which implicitly hydrates it, validates that it is
 * already hydrated, or validates that it does not need to be hydrated.
 *
 * This prevents unintentional usage of elements which have not yet been
 * hydrated.
 */
export class Dehydrated<out El extends Element> implements Queryable<El> {
  readonly #native: El;
  readonly #root: QueryRoot<El>;

  private constructor(native: El, root: QueryRoot<El>) {
    this.#native = native;
    this.#root = root;
  }

  /**
   * Creates a new {@link Dehydrated} from the provided underlying DOM element.
   *
   * @param native The underlying DOM element to wrap. May or may not already be
   *     hydrated.
   * @param getClosedShadowRoot A function to get the closed shadow root of the
   *     given root element. If the element does not have a closed shadow root
   *     and will never receive one, this can be left `undefined`. Open shadow
   *     root are automatically handled and do not require any additional input.
   * @returns A {@link Dehydrated} wrapper which ensures that future accesses to
   *     the element properly hydrate it.
   */
  public static from<El extends Element>(
    native: El,
    getClosedShadowRoot?: () => ShadowRoot | null,
  ): Dehydrated<El> {
    return new Dehydrated(native, QueryRoot.from(native, getClosedShadowRoot));
  }

  /**
   * Returns the underlying wrapped element directly without doing any
   * validation on its state.
   *
   * WARNING: The returned element is *not* guaranteed to be defined, upgraded,
   * or hydrated. Any custom element returned may not function as it typically
   * would due to not being defined or hydrated.
   *
   * This method is intended specifically as an escape hatch for specific
   * situations where a developer needs to access an element before it has
   * hydrated. Be careful when using it!
   *
   * This method intentionally returns {@link Element} instead of {@link El}
   * because the element may not be upgraded or hydrated and not yet support any
   * of the features typically provided by {@link El}. Explicitly cast the
   * result to {@link El} only when you know it is safe to do so.
   *
   * @returns The {@link Element} wrapped by this {@link Dehydrated}.
   */
  public get unvalidatedElement(): Element {
    return this.#native;
  }

  /**
   * Returns the underlying {@link El} wrapped in an {@link ElementAccessor}
   * object. Does *not* hydrate the element, but also asserts that the element
   * does not *need* to be hydrated.
   *
   * @param elementClass The class of the underlying. Only necessary if wrapping
   *     a custom element. This helps ensure the element is consistently
   *     hydrated.
   * @returns The underlying element wrapped in an {@link ElementAccessor}
   *     object.
   * @throws If the element is not hydrated or is not an instance of the
   *     provided class.
   */
  public access(): ElementAccessor<El>;
  public access<AccessEl extends El>(elementClass: { new(): AccessEl }):
      ElementAccessor<AccessEl>;
  public access<AccessEl extends El>(elementClass?: { new(): AccessEl }):
      ElementAccessor<AccessEl> {
    if (isCustomElement(this.#native)) {
      if (!elementClass) {
        throw new Error(`Custom element \`${
            this.#native.tagName.toLowerCase()}\` requires an element class.`);
      }

      if (!(this.#native instanceof elementClass)) {
        throw new Error(`Custom element \`${
            (this.#native as Element).tagName.toLowerCase()}\` does not extend \`${
            elementClass.name}\`. Did you provide the wrong class or is the element not defined?`);
      }

      if (!isUpgraded(this.#native)) {
        throw new Error(`Custom element \`${
          this.#native.tagName.toLowerCase()}\` is either not defined or the element has not been upgraded.`);
      }

      if (!isHydrated(this.#native)) {
        throw new Error(`Custom element \`${
          this.#native.tagName.toLowerCase()}\` has not been hydrated.`);
      }
    }

    return ElementAccessor.from(this.#native as AccessEl);
  }

  /**
   * Hydrates the underlying {@link El} and returns it wrapped in an
   * {@link ElementAccessor} object.
   *
   * @param elementClass The class of the element to hydrate. This helps ensure
   *     that the custom element has been evaluated and defined.
   * @param props Properties to assign to the element during hydration.
   * @returns The underlying element, hydrated and wrapped in an
   *     {@link ElementAccessor} object.
   * @throws If the element does not extend the provided class.
   * @throws If the element is a custom element, but not upgraded.
   * @throws If the element is already hydrated.
   */
  public hydrate<Clazz extends Class<El>>(
    elementClass: Clazz,
    ...[ props ]: {} extends PropsOf<InstanceType<Clazz>>
      ? [ props?: PropsOf<InstanceType<Clazz>> ]
      : [ props: PropsOf<InstanceType<Clazz>> ]
  ): ElementAccessor<InstanceType<Clazz>> {
    hydrate(this.#native, elementClass, props);
    return ElementAccessor.from(this.#native);
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
    return this.#root.query(selector, options);
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
  public queryAll<Selector extends string>(
    selector: Selector,
    options?: { optional?: boolean },
  ): Array<Dehydrated<QueryAllResult<Selector, El>>> {
    return this.#root.queryAll(selector, options);
  }

  public get shadow(): QueryRoot<ShadowRoot> {
    return this.#root.shadow;
  }
}
