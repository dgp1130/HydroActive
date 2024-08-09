import { ElementAccessor } from './element-accessor.js';
import { HydroActiveComponent } from './hydroactive-component.js';
import { QueryRoot } from './query-root.js';

/** TODO */
export class ComponentAccessor<Comp extends HydroActiveComponent>
    extends ElementAccessor<Comp> {
  readonly #comp: HydroActiveComponent;

  private constructor(element: Comp, root: QueryRoot<Comp>, comp: HydroActiveComponent) {
    super(element, root);
    this.#comp = comp;
  }

  /** TODO */
  public static fromComponent<Comp extends HydroActiveComponent>(comp: Comp):
      ComponentAccessor<Comp> {
    return new ComponentAccessor(
      /* element */ comp,
      /* root */ QueryRoot.from(
        comp,
        () => comp._elementInternals.shadowRoot,
      ),
      /* component */ comp,
    );
  }

  /** TODO */
  public override get shadow(): QueryRoot<ShadowRoot> {
    const root = this.#comp._elementInternals.shadowRoot;
    if (!root) {
      throw new Error('The element does not have a shadow root.');
    }

    return QueryRoot.from(root);
  }
}
