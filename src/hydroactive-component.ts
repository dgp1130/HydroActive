import { ComponentRef } from './component-ref.js';

/**
 * A map of {@link HydroActiveComponent} elements to their associated
 * {@link ElementInternals}. This mapping can be imported internally within
 * HydroActive without making the internals accessible outside the component
 * (such as on an `_internals` property).
 *
 * We really only care about a closed shadow root on this type, however a closed
 * shadow root can be attached at any time, not just on custom element
 * construction. Therefore, we keep a reference to the entire
 * {@link ElementInternals} object in case a closed shadow root is attached in
 * the future and appears on this object.
 */
const internalsMap =
    new WeakMap<HydroActiveComponent, ElementInternals>();

/** Export the type as readonly so no one else messes with the contents. */
export const elementInternalsMap =
    internalsMap as ReadonlyWeakMap<HydroActiveComponent, ElementInternals>;
export type ReadonlyWeakMap<Key extends object, Value> =
    Pick<WeakMap<Key, Value>, 'get' | 'has'>;

/** Abstract base class for all HydroActive components. */
export abstract class HydroActiveComponent extends HTMLElement {
  /** Whether or not the component has been hydrated. */
  #hydrated = false;

  /** The associated {@link ComponentRef} for this component. */
  #ref?: ComponentRef;

  constructor() {
    super();

    internalsMap.set(this, this.attachInternals());
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
