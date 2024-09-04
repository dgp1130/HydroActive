import { ElementRef } from './element-ref.js';
import { HydroActiveComponent } from './hydroactive-component.js';
import { effect } from './signals.js';
import { UiScheduler } from './signals/schedulers/ui-scheduler.js';

/**
 * The type of the function invoked on connect. May optionally return a
 * disconnect function to be invoked when the component is disconnected.
 */
export type OnConnect = () => OnDisconnect | void;

/** The type of the function invoked on disconnect. */
export type OnDisconnect = () => void;

/**
 * Provides an ergonomic API for accessing the internal content and lifecycle
 * of a HydroActive component. {@link ComponentRef} should be kept internal to
 * the component it references (not shared with other components).
 */
export class ComponentRef {
  readonly #host: ElementRef<HydroActiveComponent>;
  readonly #scheduler = UiScheduler.from();

  /** The custom element hosting the HydroActive component. */
  public get host(): ElementRef<HydroActiveComponent> { return this.#host; }

  /** All callbacks to invoke when the component is connected to the DOM. */
  readonly #connectedCallbacks: Array<OnConnect> = [];

  /**
   * All callbacks to invoke when the component is disconnected from the DOM.
   *
   * Note that these callbacks should only ever be called *once*. Subsequent
   * disconnect events should not trigger already-invoked disconnect listeners.
   */
  readonly #disconnectedCallbacks: Array<OnDisconnect> = [];

  private constructor(host: ElementRef<HydroActiveComponent>) {
    this.#host = host;
  }

  /**
   * Constructs a new {@link ComponentRef} instance.
   *
   * INTERNAL ONLY: Do not call directly. HydroActive should always provide a
   * {@link ComponentRef} to you, it should never be necessary to create one
   * manually.
   */
  public /* internal */ static _from(host: ElementRef<HydroActiveComponent>):
      ComponentRef {
    return new ComponentRef(host);
  }

  public /* internal */ _onConnect(): void {
    for (const connectedCallback of this.#connectedCallbacks) {
      this.#invokeOnConnect(connectedCallback);
    }
  }

  public /* internal */ _onDisconnect(): void {
    for (const onDisconnect of this.#disconnectedCallbacks) {
      onDisconnect();
    }

    // Clear all the disconnect listeners. They will be re-added when their
    // associated connect listeners are invoked.
    this.#disconnectedCallbacks.splice(0, this.#disconnectedCallbacks.length);
  }

  public /* internal */ async _stable(): Promise<void> {
    return await this.#scheduler.stable();
  }

  /**
   * Sets up the given handler to be invoked whenever the component is connected
   * to the DOM. If the handler returns a function, that function will be
   * invoked the next time the component is disconnected. This provides a useful
   * API for maintaining state which needs to be cleaned up while avoiding
   * memory leaks in the component.
   *
   * The connect handler may be invoked multiple times if the component is
   * disconnected and reconnected to the DOM.
   *
   * Example:
   *
   * ```typescript
   * component('my-component', (comp) => {
   *   comp.connected(() => {
   *     console.log('I am connected!');
   *
   *     // Optional cleanup work to be run on disconnect.
   *     return () => {
   *       console.log('I am disconnected!');
   *     };
   *   });
   * });
   * ```
   *
   * @param onConnect The function to invoke when the component is connected.
   */
  public connected(onConnect: OnConnect): void {
    this.#connectedCallbacks.push(onConnect);

    if (this.#host.native.isConnected) this.#invokeOnConnect(onConnect);
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
    this.connected(() => {
      return effect(callback, this.#scheduler);
    });
  }

  /**
   * Invokes the given {@link OnConnect} handler and registers its disconnect
   * callback if provided.
   */
  #invokeOnConnect(onConnect: OnConnect): void {
    const onDisconnect = onConnect();
    if (onDisconnect) this.#disconnectedCallbacks.push(onDisconnect);
  }
}
