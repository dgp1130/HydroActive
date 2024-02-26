/** @fileoverview Defines symbols related to component definition. */

import { ComponentRef } from './component-ref.js';
import { ElementAccessor } from './element-accessor.js';
import { ElementRef } from './element-ref.js';
import { HydroActiveComponent } from './hydroactive-component.js';
import { QueryableElement } from './queryable.js';

/** The type of the lifecycle hook invoked when the component hydrates. */
export type HydrateLifecycle = (
  comp: ComponentRef,
  host: ElementAccessor<HydroActiveComponent>,
) => void;

class ComponentAccessor<Host extends HydroActiveComponent>
    extends ElementAccessor<Host> {
  public static fromComponent<Host extends HydroActiveComponent>(host: Host):
      ComponentAccessor<Host> {
    return new ComponentAccessor(host);
  }

  public override get shadow(): QueryableElement<Host> {
    if (!this.native._shadowRoot) {
      throw new Error('No shadow root!');
    }

    return QueryableElement.fromShadowRoot(this.native._shadowRoot) as
        QueryableElement<Host>;
  }
}

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
      hydrate(ref, ComponentAccessor.fromComponent(this));
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
