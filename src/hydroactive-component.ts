/** Abstract base class for all HydroActive components. */
export abstract class HydroActiveComponent extends HTMLElement {
  /** Whether or not the component has been hydrated. */
  #hydrated = false;

  /** Listeners to invoke when connected to the DOM. */
  readonly #connectListeners: Array<() => void> = [];

  /** Listeners to invoke when disconnected from the DOM. */
  readonly #disconnectListeners: Array<() => void> = [];

  /** User-defined lifecycle hook invoked on hydration. */
  protected abstract hydrate(): void;

  public /* internal */ _registerLifecycleHooks({ onConnect, onDisconnect }: {
    onConnect?: () => void,
    onDisconnect?: () => void,
  }): void {
    if (onConnect) this.#connectListeners.push(onConnect);
    if (onDisconnect) this.#disconnectListeners.push(onDisconnect);
  }

  connectedCallback(): void {
    // The "connect" event triggers _before_ the "hydrate" event when they
    // happen simultaneously. Listeners should know to invoke connect callbacks
    // discovered post-connection time, such as during hydration.
    for (const listener of this.#connectListeners) listener();

    this.#requestHydration();
  }

  disconnectedCallback(): void {
    for (const listener of this.#disconnectListeners) listener();
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
