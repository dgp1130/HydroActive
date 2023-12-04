/** @fileoverview Defines symbols related to HydroActive components. */

import { ElementRef } from './element-ref.js';

/** The type of the lifecycle hook invoked when the component hydrates. */
export type HydrateLifecycle = (host: ElementRef<HTMLElement>) => void;

/**
 * Defines a component of the given tag name with the provided hydration
 * callback.
 */
export function component(tagName: string, hydrate: HydrateLifecycle):
    Class<HTMLElement> {
  const Component = class extends HydroActiveComponent {
    override hydrate(): void {
      hydrate(ElementRef.from(this));
    }
  };

  // Set `name` for improved debug-ability.
  Object.defineProperty(Component, 'name', {
    value: skewerCaseToPascalCase(tagName),
  });

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

/**
 * Analogous to `Class<T>` in Java. Represents the class object of the given
 * instance type.
 */
type Class<Instance> = { new(): Instance };

function skewerCaseToPascalCase(skewerCase: string): string {
  return skewerCase.split('-')
      .map((word) => `${word[0]?.toUpperCase() ?? ''}${word.slice(1)}`)
      .join('');
}
