/** @fileoverview Defines symbols related to component definition. */

import { ComponentOptions } from './component-options.js';
import { ComponentRef } from './component-ref.js';
import { ElementRef } from './element-ref.js';
import { HydroActiveComponent } from './hydroactive-component.js';

/** The type of the lifecycle hook invoked when the component hydrates. */
export type HydrateLifecycle = (host: ComponentRef) => void;

const defaultComponentOptions: ComponentOptions = {
  autoHydrationChildren: true,
};

/**
 * Defines a component of the given tag name with the provided hydration
 * callback.
 */
export function defineComponent(
  tagName: string,
  hydrate: HydrateLifecycle,
  options: Partial<ComponentOptions> = defaultComponentOptions,
): Class<HydroActiveComponent> {
  const normalizedOptions = {...defaultComponentOptions, ...options};
  const Component = class extends HydroActiveComponent {
    public constructor() {
      super(normalizedOptions);
    }

    override hydrate(): void {
      const ref = ComponentRef._from(
        ElementRef.from(this, Component),
        normalizedOptions,
      );
      this._registerComponentRef(ref);
      hydrate(ref);
    }
  };

  // Set `name` for improved debug-ability.
  Object.defineProperty(Component, 'name', {
    value: skewerCaseToPascalCase(tagName),
  });

  customElements.define(tagName, Component);

  return Component;
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
