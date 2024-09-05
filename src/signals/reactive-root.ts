import { Connectable } from '../connectable.js';
import { effect } from './effect.js';
import { Scheduler } from './schedulers/scheduler.js';

/**
 * Represents the "root" of reactive effects. This manages starting and
 * stopping effects based on a component being attached to / detached from the
 * document.
 */
export interface ReactiveRoot {
  /**
   * Create an effect which executes the given callback. The effect is
   * automatically enabled / disabled when the associated component attaches to
   * / disconnects from the document.
   *
   * @param callback The callback to invoke which executes a signal-based side
   *     effect.
   */
  effect(callback: () => void): void;
}

/**
 * Represents the "root" of reactive effects. This manages starting and
 * stopping effects based on a component being attached to / detached from the
 * document.
 *
 * We need this class to be independent of the interface because otherwise ES
 * private variables leak into the type.
 */
export class ReactiveRootImpl implements ReactiveRoot {
  readonly #connectable: Connectable;
  readonly #scheduler: Scheduler;

  private constructor(connectable: Connectable, scheduler: Scheduler) {
    this.#connectable = connectable;
    this.#scheduler = scheduler;
  }

  /**
   * Provides a new {@link ReactiveRootImpl}.
   *
   * @param connectable The {@link Connectable} which tracks connectivity of the
   *     component these effects will be scheduled with.
   * @param scheduler The {@link Scheduler} which will schedule effects.
   * @returns A {@link ReactiveRootImpl}.
   */
  public static from(connectable: Connectable, scheduler: Scheduler):
      ReactiveRootImpl {
    return new ReactiveRootImpl(connectable, scheduler);
  }

  public effect(callback: () => void): void {
    this.#connectable.connected(() => {
      return effect(callback, this.#scheduler);
    });
  }
}
