/** @fileoverview Defines symbols related to signal component definition. */

import { applyDefinition, ComponentDefinition, HydroActiveComponent } from './hydroactive-component.js';
import { SignalComponentAccessor } from './signal-component-accessor.js';
import { ReactiveRootImpl } from './signals/reactive-root.js';
import { skewerCaseToPascalCase } from './utils/casing.js';
import { Class } from './utils/types.js';

/** The type of the lifecycle hook invoked when the component hydrates. */
export type SignalHydrateLifecycle<CompDef extends ComponentDefinition> =
    (host: SignalComponentAccessor<HydroActiveComponent>) => CompDef | void;

/**
 * Defines a signal component of the given tag name with the provided hydration
 * callback.
 *
 * @param tagName The tag name to use for the defined custom element.
 * @param hydrate The function to trigger when the component hydrates.
 * @returns The defined custom element class.
 */
export function defineSignalComponent<CompDef extends ComponentDefinition>(
  tagName: string,
  hydrate: SignalHydrateLifecycle<CompDef>,
): Class<HydroActiveComponent & CompDef> {
  const Component = class extends HydroActiveComponent {
    public override hydrate(): void {
      // Create an accessor for this element.
      const root = ReactiveRootImpl.from(
        this._connectable,
        this._tracker,
        this._scheduler,
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

  customElements.define(tagName, Component);

  return Component as unknown as Class<HydroActiveComponent & CompDef>;
}
