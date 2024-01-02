import { ComponentRef } from './component-ref.js';
import { ElementRef } from './element-ref.js';

/** Abstract base class for all HydroActive components. */
export abstract class HydroActiveComponent extends HTMLElement {
  /** Whether or not the component has been hydrated. */
  #hydrated = false;

  /** The associated {@link ComponentRef} for this component. */
  #comp?: ComponentRef;
  protected get comp(): ComponentRef {
    this.#initializeComponent();
    return this.#comp!;
  }

  #ref?: ElementRef<HydroActiveComponent>;
  protected get ref(): ElementRef<HydroActiveComponent> {
    this.#initializeComponent();
    return this.#ref!;
  }

  #initialized = false;
  #initializeComponent(): void {
    if (this.#initialized) return;
    this.#initialized = true;

    this.#ref = ElementRef.from(this);
    this.#comp = ComponentRef._from(this.ref);
  }

  /** User-defined lifecycle hook invoked on hydration. */
  protected abstract hydrate(): void;

  connectedCallback(): void {
    // The "connect" event triggers _before_ the "hydrate" event when they
    // happen simultaneously. `ComponentRef` should know to invoke connect
    // callbacks discovered post-connection time, such as during hydration.
    this.comp?._onConnect();

    this.#requestHydration();
  }

  disconnectedCallback(): void {
    this.comp?._onDisconnect();
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

    if (!this.comp) throw new Error('No registered `ComponentRef` after hydration.');
  }

  /**
   * Returns a {@link Promise} which resolves when this component is stable. A
   * component is "stable" when there are no pending DOM operations scheduled.
   *
   * @returns A {@link Promise} which resolves when this component is stable.
   */
  public async stable(): Promise<void> {
    if (!this.comp) throw new Error('No registered `ComponentRef`.');

    return await this.comp._stable();

  }
}
