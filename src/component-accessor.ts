import { ElementAccessor } from './element-accessor.js';
import { HydroActiveComponent, elementInternalsMap } from './hydroactive-component.js';
import { QueryRoot } from './query-root.js';

/**
 * Wraps a {@link HydroActiveComponent} in a convenient wrapper for querying and
 * accessing it's contents with serializers.
 */
export class ComponentAccessor<Comp extends HydroActiveComponent>
    extends ElementAccessor<Comp> {
  /**
   * Provides a {@link ComponentAccessor} for the given component.
   *
   * @param native The {@link HydroActiveComponent} to wrap.
   * @returns An {@link ElementAccessor} wrapping the given element.
   */
  public static fromComponent<Comp extends HydroActiveComponent>(comp: Comp):
      ComponentAccessor<Comp> {
    // It might be tempting to delete `comp` from `elementInternalsMap`, but we
    // can't because multiple `ComponentAccessors` might be created from the
    // same component and should have the same behavior.
    const internals = elementInternalsMap.get(comp);

    return new ComponentAccessor(comp, QueryRoot.from(
      comp,
      // Get a closed shadow root from the component's internals if present.
      () => internals?.shadowRoot ?? null,
    ));
  }
}
