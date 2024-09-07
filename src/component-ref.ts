import { Scheduler } from './signals.js';

/**
 * Provides an ergonomic API for accessing the internal content and lifecycle
 * of a HydroActive component. {@link ComponentRef} should be kept internal to
 * the component it references (not shared with other components).
 */
export class ComponentRef {
  readonly #scheduler: Scheduler;

  private constructor(scheduler: Scheduler) {
    this.#scheduler = scheduler;
  }

  /**
   * Constructs a new {@link ComponentRef} instance.
   *
   * INTERNAL ONLY: Do not call directly. HydroActive should always provide a
   * {@link ComponentRef} to you, it should never be necessary to create one
   * manually.
   *
   * @param scheduler The {@link Scheduler} to check stability on. This *must*
   *     be the same scheduler used by {@link root}.
   * @returns A {@link ComponentRef} for scheduling effects.
   */
  public /* internal */ static _from(scheduler: Scheduler):
      ComponentRef {
    return new ComponentRef(scheduler);
  }

  public /* internal */ async _stable(): Promise<void> {
    return await this.#scheduler.stable();
  }
}
