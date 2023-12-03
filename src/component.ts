/** @fileoverview Defines symbols related to HydroActive components. */

/** The type of the lifecycle hook invoked when the component hydrates. */
export type HydrateLifecycle = () => void;

/**
 * Defines a component of the given tag name with the provided hydration
 * callback.
 */
export function component(tagName: string, hydrate: HydrateLifecycle):
    Class<HTMLElement> {
  const Component = class extends HydroActiveComponent {
    override hydrate = hydrate.bind(undefined /* strip `this` value */);
  }

  customElements.define(tagName, Component);

  return Component;
}

/** Abstract base class for all HydroActive components. */
abstract class HydroActiveComponent extends HTMLElement {
  /** Whether or not the component has been hydrated. */
  #hydrated = false;

  /** User-defined lifecycle hook invoked on hydration. */
  protected abstract hydrate(): void;

  connectedCallback(): void {
    this.#requestHydration();
  }

  /** Hydrates the component if not already hydrated. Otherwise does nothing. */
  #requestHydration(): void {
    if (this.#hydrated) return;

    this.#hydrated = true;
    this.hydrate();
  }
}

/**
 * Analogous to `Class<T>` in Java. Represents the class object of the given
 * instance type.
 */
type Class<Instance> = { new(): Instance };
