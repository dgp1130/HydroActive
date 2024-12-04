/** @fileoverview Defines symbols related to signal component definition. */

import { applyDefinition, ComponentDefinition, HydroActiveComponent } from './hydroactive-component.js';
import { SignalComponentAccessor } from './signal-component-accessor.js';
import { ReactiveRootImpl } from './signals/reactive-root.js';
import { skewerCaseToPascalCase } from './utils/casing.js';
import { createDefine, Defineable } from './utils/on-demand-definitions.js';
import { Class } from './utils/types.js';
import type { baseComponent } from './base-component.js'; // For JSDoc link.

/** The type of the lifecycle hook invoked when the component hydrates. */
export type SignalHydrateLifecycle<CompDef extends ComponentDefinition> =
    (host: SignalComponentAccessor<HydroActiveComponent>) => CompDef | void;

/**
 * Declares a signal component of the given tag name with the provided hydration
 * callback.
 *
 * Signal components depend on signal APIs. This makes them more powerful than
 * their {@link baseComponent} counterparts at the cost of a slightly larger
 * overall bundle size.
 *
 * This does *not* define the element (doesn't call `customElements.define`) to
 * preserve tree-shakability of the component. Call the static `.define` method
 * on the returned class to define the custom element if necessary.
 *
 * ```typescript
 * const MyElement = defineSignalComponent('my-element', () => {});
 * MyElement.define();
 * ```
 *
 * @param tagName The tag name to use for the custom element.
 * @param hydrate The function to trigger when the component hydrates.
 * @returns The custom element class.
 */
export function signalComponent<CompDef extends ComponentDefinition>(
  tagName: string,
  hydrate: SignalHydrateLifecycle<CompDef>,
): Class<HydroActiveComponent & CompDef> & Defineable {
  const Component = class extends HydroActiveComponent {
    // Implement the on-demand definitions community protocol.
    static define = createDefine(tagName, this);

    public override hydrate(): void {
      // Create an accessor for this element.
      const root = ReactiveRootImpl.from(
        this._connectable,
        this._tracker,
        this._defaultScheduler,
      );
      const accessor = SignalComponentAccessor.fromSignalComponent(this, root);

      // Hydrate this element.
      const compDef = hydrate(accessor);

      // Apply the component definition to this element.
      if (compDef) applyDefinition(this, compDef);
    }
  };

  // Set `name` for improved debug-ability.
  Object.defineProperty(Component, 'name', {
    value: skewerCaseToPascalCase(tagName),
  });

  return Component as unknown as
      Class<HydroActiveComponent & CompDef> & Defineable;
}
