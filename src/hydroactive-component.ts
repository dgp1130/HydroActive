/** Abstract base class for all HydroActive components. */
export abstract class HydroActiveComponent extends HTMLElement {
  /** Whether or not the component has been hydrated. */
  #hydrated = false;

  /** User-defined lifecycle hook invoked on hydration. */
  protected abstract hydrate(): void;

  connectedCallback(): void {
    this.#requestHydration();
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
  }
}
