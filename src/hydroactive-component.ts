import { ComponentRef } from './component-ref.js';

/** Abstract base class for all HydroActive components. */
export abstract class HydroActiveComponent extends HTMLElement {
  /** Whether or not the component has been hydrated. */
  #hydrated = false;

  /** The associated {@link ComponentRef} for this component. */
  #ref?: ComponentRef;

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
}
