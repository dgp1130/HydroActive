/** @fileoverview Defines symbols related to signal component definition. */

import { HydroActiveComponent } from './hydroactive-component.js';
import { SignalComponentAccessor } from './signal-component-accessor.js';
import { ReactiveRootImpl } from './signals/reactive-root.js';
import { skewerCaseToPascalCase } from './utils/casing.js';
import { Class } from './utils/types.js';

/** The type of the lifecycle hook invoked when the component hydrates. */
export type SignalHydrateLifecycle =
    (host: SignalComponentAccessor<HydroActiveComponent>) => void;

/**
 * Defines a signal component of the given tag name with the provided hydration
 * callback.
 *
 * @param tagName The tag name to use for the defined custom element.
 * @param hydrate The function to trigger when the component hydrates.
 * @returns The defined custom element class.
 */
export function defineSignalComponent(
  tagName: string,
  hydrate: SignalHydrateLifecycle,
): Class<HydroActiveComponent> {
  const Component = class extends HydroActiveComponent {
    public override hydrate(): void {
      const root = ReactiveRootImpl.from(this._connectable, this._scheduler);
      const accessor = SignalComponentAccessor.fromSignalComponent(this, root);
      hydrate(accessor);
    }
  };

  // Set `name` for improved debug-ability.
  Object.defineProperty(Component, 'name', {
    value: skewerCaseToPascalCase(tagName),
  });

  customElements.define(tagName, Component);

  return Component;
}
