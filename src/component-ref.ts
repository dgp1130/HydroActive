import { Connectable } from './connectable.js';
import { effect } from './signals.js';
import { UiScheduler } from './signals/schedulers/ui-scheduler.js';

/**
 * Provides an ergonomic API for accessing the internal content and lifecycle
 * of a HydroActive component. {@link ComponentRef} should be kept internal to
 * the component it references (not shared with other components).
 */
export class ComponentRef {
  readonly #scheduler = UiScheduler.from();
  readonly #connectable: Connectable;

  private constructor(connectable: Connectable) {
    this.#connectable = connectable;
  }

  /**
   * Constructs a new {@link ComponentRef} instance.
   *
   * INTERNAL ONLY: Do not call directly. HydroActive should always provide a
   * {@link ComponentRef} to you, it should never be necessary to create one
   * manually.
   *
   * @param isConnected Returns whether or not the associated component is
   *     currently connected to a document.
   */
  public /* internal */ static _from(connectable: Connectable): ComponentRef {
    return new ComponentRef(connectable);
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
    this.#connectable.connected(() => {
      return effect(callback, this.#scheduler);
    });
  }
}
