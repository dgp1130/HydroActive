import { ComponentOptions } from './component-options.js';
import { ComponentRef } from './component-ref.js';

// A query which finds all `defer-hydration` elements which are direct children
// of the scope element. "Direct" in the sense that there is no
// `defer-hydration` element between it and the scope.
const directDeferredChildrenQuery =
    '[defer-hydration]:not(:scope [defer-hydration] [defer-hydration])';

/** Abstract base class for all HydroActive components. */
export abstract class HydroActiveComponent extends HTMLElement {
  /** Whether or not the component has been hydrated. */
  #hydrated = false;

  /** The associated {@link ComponentRef} for this component. */
  #ref?: ComponentRef;
  #options!: ComponentOptions;

  public constructor(options: ComponentOptions) {
    super();
    this.#options = options;
  }

  /** User-defined lifecycle hook invoked on hydration. */
  protected abstract hydrate(): void;

  public /* internal */ _registerComponentRef(ref: ComponentRef): void {
    if (ref.host.native !== this) throw new Error('Registered `ComponentRef` must be associated with this component.');
    if (this.#ref) throw new Error('Already registered a `ComponentRef`.');

    this.#ref = ref;
  }

  connectedCallback(): void {
    // The "connect" event triggers _before_ the "hydrate" event when they
    // happen simultaneously. `ComponentRef` should know to invoke connect
    // callbacks discovered post-connection time, such as during hydration.
    this.#ref?._onConnect();

    this.#requestHydration();
  }

  disconnectedCallback(): void {
    this.#ref?._onDisconnect();
  }

  // Trigger hydration when the `defer-hydration` attribute is removed.
  static get observedAttributes(): string[] { return ['defer-hydration']; }
  attributeChangedCallback(
    name: string,
    _oldValue: string | null,
    newValue: string | null,
  ): void {
    if (name === 'defer-hydration' && newValue === null) {
      this.#requestHydration();
    }
  }

  /** Hydrates the component if not already hydrated. Otherwise does nothing. */
  #requestHydration(): void {
    if (this.#hydrated) return;
    if (this.hasAttribute('defer-hydration')) return;

    this.#hydrated = true;
    this.hydrate();

    if (!this.#ref) throw new Error('No registered `ComponentRef` after hydration.');

    if (this.#options.autoHydrationChildren) {
      // Automatically hydrate all "direct" children which have been deferred.
      const children = [
        ...(this.shadowRoot?.querySelectorAll(directDeferredChildrenQuery) ?? []),
        ...this.querySelectorAll(directDeferredChildrenQuery),
      ];

      for (const child of children) child.removeAttribute('defer-hydration');
    }
  }

  /**
   * Returns a {@link Promise} which resolves when this component is stable. A
   * component is "stable" when there are no pending DOM operations scheduled.
   *
   * @returns A {@link Promise} which resolves when this component is stable.
   */
  public async stable(): Promise<void> {
    if (!this.#ref) throw new Error('No registered `ComponentRef`.');

    return await this.#ref._stable();

  }
}
