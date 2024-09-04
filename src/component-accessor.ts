import { Connectable } from './connectable.js';
import { ElementAccessor } from './element-accessor.js';
import { HydroActiveComponent, elementInternalsMap } from './hydroactive-component.js';
import { QueryRoot } from './query-root.js';

/**
 * Wraps a {@link HydroActiveComponent} in a convenient wrapper for querying and
 * accessing it's contents with serializers.
 */
export class ComponentAccessor<out Comp extends HydroActiveComponent>
    extends ElementAccessor<Comp> implements Connectable {
  readonly #connectable: Connectable;

  private constructor(
    comp: Comp,
    root: QueryRoot<Comp>,
    connectable: Connectable,
  ) {
    super(comp, root);

    this.#connectable = connectable;
  }

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
    const root = QueryRoot.from(
      comp,
      // Get a closed shadow root from the component's internals if present.
      () => internals?.shadowRoot ?? null,
    );

    return new ComponentAccessor(comp, root, comp._connectable);
  }

  public connected(...params: Parameters<Connectable['connected']>):
      ReturnType<Connectable['connected']> {
    return this.#connectable.connected(...params);
  }
}
