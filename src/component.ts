/** @fileoverview Defines symbols related to component definition. */

import { ComponentAccessor } from './component-accessor.js';
import { ComponentRef } from './component-ref.js';
import { HydroActiveComponent } from './hydroactive-component.js';
import { ReactiveRoot } from './signals.js';
import { ReactiveRootImpl } from './signals/reactive-root.js';
import { UiScheduler } from './signals/schedulers/ui-scheduler.js';

/** The type of the lifecycle hook invoked when the component hydrates. */
export type HydrateLifecycle = (
  host: ComponentAccessor<HydroActiveComponent>,
  root: ReactiveRoot,
) => void;

/**
 * Defines a component of the given tag name with the provided hydration
 * callback.
 */
export function defineComponent(tagName: string, hydrate: HydrateLifecycle):
    Class<HydroActiveComponent> {
  const Component = class extends HydroActiveComponent {
    public override hydrate(): void {
      const scheduler = UiScheduler.from();
      const accessor = ComponentAccessor.fromComponent(this);
      const root = ReactiveRootImpl.from(accessor, scheduler);
      const ref = ComponentRef._from(root, scheduler);
      this._registerComponentRef(ref);
      hydrate(accessor, root);
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
