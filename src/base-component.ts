import { ComponentAccessor } from './component-accessor.js';
import { HydroActiveComponent } from './hydroactive-component.js';
import { skewerCaseToPascalCase } from './utils/casing.js';
import { Class } from './utils/types.js';

/** The type of the lifecycle hook invoked when the component hydrates. */
export type BaseHydrateLifecycle =
    (host: ComponentAccessor<HydroActiveComponent>) => void;

/**
 * Defines a base component of the given tag name with the provided hydration
 * callback.
 *
 * @param tagName The tag name to use for the defined custom element.
 * @param hydrate The function to trigger when the component hydrates.
 * @returns The defined custom element class.
 */
export function defineBaseComponent(
  tagName: string,
  hydrate: BaseHydrateLifecycle,
): Class<HydroActiveComponent> {
  const Component = class extends HydroActiveComponent {
    public override hydrate(): void {
      hydrate(ComponentAccessor.fromComponent(this));
    }
  }

  Object.defineProperty(Component, 'name', {
    value: skewerCaseToPascalCase(tagName),
  });

  customElements.define(tagName, Component);

  return Component;
}
