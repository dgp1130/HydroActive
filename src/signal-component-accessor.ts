import { ComponentAccessor } from './component-accessor.js';
import { Connectable } from './connectable.js';
import { HydroActiveComponent } from './hydroactive-component.js';
import { QueryRoot } from './query-root.js';
import { ReactiveRoot } from './signals.js';

/**
 * Wraps a {@link HydroActiveComponent} in a convenient wrapper for querying and
 * accessing it's contents with serializers as well as working with signals.
 */
export class SignalComponentAccessor<out Comp extends HydroActiveComponent>
    extends ComponentAccessor<Comp> implements ReactiveRoot {
  readonly #root: ReactiveRoot;

  private constructor(
    comp: Comp,
    queryRoot: QueryRoot<Comp>,
    connectable: Connectable,
    root: ReactiveRoot,
  ) {
    super(comp, queryRoot, connectable);

    this.#root = root;
  }

  /**
   * Provides a {@link SignalComponentAccessor} for the given component.
   *
   * @param comp The {@link Comp} to wrap in an accessor.
   * @param root The {@link ReactiveRoot} to use for scheduling effects.
   * @returns A {@link SignalComponentAccessor} wrapping the given component.
   */
  public static fromSignalComponent<Comp extends HydroActiveComponent>(
      comp: Comp, root: ReactiveRoot): SignalComponentAccessor<Comp> {
    return new SignalComponentAccessor(
      ...ComponentAccessor.fromComponentCtorArgs(comp),
      root,
    );
  }

  public effect(callback: () => void): void {
    this.#root.effect(callback);
  }
}
