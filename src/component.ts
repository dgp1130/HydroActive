/** @fileoverview Defines symbols related to component definition. */

import { ComponentRef } from './component-ref.js';
import { ElementAccessor } from './element-accessor.js';
import { ElementRef } from './element-ref.js';
import { HydroActiveComponent } from './hydroactive-component.js';

/** The type of the lifecycle hook invoked when the component hydrates. */
export type HydrateLifecycle = (
  comp: ComponentRef,
  host: ElementAccessor<HydroActiveComponent>,
) => void;

/**
 * Defines a component of the given tag name with the provided hydration
 * callback.
 */
export function defineComponent(tagName: string, hydrate: HydrateLifecycle):
    Class<HydroActiveComponent> {
  const Component = class extends HydroActiveComponent {
    override hydrate(): void {
      const ref = ComponentRef._from(ElementRef.from(this));
      this._registerComponentRef(ref);
      hydrate(ref, ElementAccessor.from(this));
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
