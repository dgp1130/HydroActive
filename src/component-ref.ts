import { ReactiveRoot, Scheduler } from './signals.js';

/**
 * Provides an ergonomic API for accessing the internal content and lifecycle
 * of a HydroActive component. {@link ComponentRef} should be kept internal to
 * the component it references (not shared with other components).
 */
export class ComponentRef {
  readonly #root: ReactiveRoot;
  readonly #scheduler: Scheduler;

  private constructor(root: ReactiveRoot, scheduler: Scheduler) {
    this.#root = root;
    this.#scheduler = scheduler;
  }

  /**
   * Constructs a new {@link ComponentRef} instance.
   *
   * INTERNAL ONLY: Do not call directly. HydroActive should always provide a
   * {@link ComponentRef} to you, it should never be necessary to create one
   * manually.
   *
   * @param root The {@link ReactiveRoot} to register effects to.
   * @param scheduler The {@link Scheduler} to check stability on. This *must*
   *     be the same scheduler used by {@link root}.
   * @returns A {@link ComponentRef} for scheduling effects.
   */
  public /* internal */ static _from(root: ReactiveRoot, scheduler: Scheduler):
      ComponentRef {
    return new ComponentRef(root, scheduler);
  }

  public /* internal */ async _stable(): Promise<void> {
    return await this.#scheduler.stable();
  }

  /**
   * Schedules the side-effectful callback to be invoked and tracks signal usage
   * within it. When any dependency signal changes, the effect is re-run on the
   * next animation frame.
   *
   * The effect is disabled when the component is removed from the DOM, and
   * re-enabled when the component is re-attached.
   *
   * @param callback The side-effectful callback to be invoked.
   */
  public effect(callback: () => void): void {
    this.#root.effect(callback);
  }
}
