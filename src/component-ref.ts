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
   * Creates an event listener for the given event which invokes the provided
   * handler callback function. This listener is automatically created and
   * removed as the component is connected and disconnected from the DOM,
   * meaning the listener does not leak memory and does not need to be manually
   * cleaned up.
   *
   * @param elementOrSelector An {@link ElementRef} or selector string to query
   *     inside the component. This element holds the created event listener,
   *     meaning only events on this element or its descendants will trigger the
   *     listener.
   * @param event The name of the event to listen for.
   * @param handler The event handler to invoke whenever an associated event is
   *     dispatched.
   * @param capture [See `capture` documentation for `addEventListener`.](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#capture)
   * @param passive [See `passive` documentation for `addEventListener`.](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#passive)
   */
  // Type `HTMLElement` events for improved autocompletion.
  public listen<EventName extends keyof AllElementsEventMap>(
    elementOrSelector: ElementRef<Element> | string,
    event: EventName,
    handler: (event: AllElementsEventMap[EventName]) => void,
    options?: { capture?: boolean, passive?: boolean },
  ): void;

  // Overload with generic `string` types so we don't disallow custom events.
  public listen(
    elementOrSelector: ElementRef<Element> | string,
    event: string,
    handler: (event: Event) => void,
    options?: { capture?: boolean, passive?: boolean },
  ): void;

  public listen(
    elementOrSelector: ElementRef<Element> | string,
    event: string,
    handler: (event: Event) => void,
    { capture, passive }: { capture?: boolean, passive?: boolean } = {},
  ): void {
    const element = elementOrSelector instanceof ElementRef
        ? elementOrSelector
        : this.host.query(elementOrSelector);

    this.connected(() => {
      element.native.addEventListener(event, handler, { capture, passive });

      return () => {
        element.native.removeEventListener(event, handler, { capture })
      };
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

// An attempt to capture all the event maps a user might reasonably encounter
// in an element discovered by an element query inside a component. Almost
// certainly not exhaustive.
type AllElementsEventMap =
  & HTMLElementEventMap
  & SVGElementEventMap
  & SVGSVGElementEventMap
  & MathMLElementEventMap
  & HTMLVideoElementEventMap
  & HTMLMediaElementEventMap
  & HTMLFrameSetElementEventMap
;
