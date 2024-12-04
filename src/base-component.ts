import { ComponentAccessor } from './component-accessor.js';
import { applyDefinition, ComponentDefinition, HydroActiveComponent } from './hydroactive-component.js';
import { skewerCaseToPascalCase } from './utils/casing.js';
import { createDefine, Defineable } from './utils/on-demand-definitions.js';
import { Class } from './utils/types.js';
import type { component } from './index.js'; // For JSDoc links.

/** The type of the lifecycle hook invoked when the component hydrates. */
export type BaseHydrateLifecycle<CompDef extends ComponentDefinition> =
    (host: ComponentAccessor<HydroActiveComponent>) => CompDef | void;

/**
 * Declares a base component of the given tag name with the provided hydration
 * callback.
 *
 * Base components do not depend on or support signal APIs. This makes them
 * lighter-weight than their {@link component} counterparts at the cost of
 * reduced functionality.
 *
 * This does *not* define the element (doesn't call `customElements.define`) to
 * preserve tree-shakability of the component. Call the static `.define` method
 * on the returned class to define the custom element if necessary.
 *
 * ```typescript
 * const MyElement = defineBaseComponent('my-element', () => {});
 * MyElement.define();
 * ```
 *
 * @param tagName The tag name to use for the custom element.
 * @param hydrate The function to trigger when the component hydrates.
 * @returns The custom element class.
 */
export function baseComponent<CompDef extends ComponentDefinition>(
  tagName: string,
  hydrate: BaseHydrateLifecycle<CompDef>,
): Class<HydroActiveComponent & CompDef> & Defineable {
  const Component = class extends HydroActiveComponent {
    // Implement the on-demand definitions community protocol.
    static define = createDefine(tagName, this);

    public override hydrate(): void {
      // Hydrate this element.
      const compDef = hydrate(ComponentAccessor.fromComponent(this));

      // Apply the component definition to this element.
      if (compDef) applyDefinition(this, compDef);
    }
  }

  Object.defineProperty(Component, 'name', {
    value: skewerCaseToPascalCase(tagName),
  });

  return Component as unknown as
      Class<HydroActiveComponent & CompDef> & Defineable;
}
