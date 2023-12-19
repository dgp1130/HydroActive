import { ElementRef, resolveSerializer, type SerializerToken } from './element-ref.js';
import { HydroActiveComponent } from './hydroactive-component.js';
import { bigintSerializer, booleanSerializer, numberSerializer, stringSerializer, type Serializer } from './serializers.js';
import { type Signal, effect } from './signals.js';
import { UiScheduler } from './signals/schedulers/ui-scheduler.js';

/**
 * The type of the function invoked on connect. May optionally return a
 * disconnect function to be invoked when the component is disconnected.
 */
export type OnConnect = () => OnDisconnect | void;

/** The type of the function invoked on disconnect. */
export type OnDisconnect = () => void;

const scheduler = UiScheduler.from();

/** Elements whose text content is currently bound to a reactive signal. */
const boundElements = new WeakSet<Element>();

/**
 * Provides an ergonomic API for accessing the internal content and lifecycle
 * of a HydroActive component. {@link ComponentRef} should be kept internal to
 * the component it references (not shared with other components).
 */
export class ComponentRef {
  readonly #host: ElementRef<HydroActiveComponent>;

  /** The custom element hosting the HydroActive component. */
  public get host(): ElementRef<HTMLElement> { return this.#host; }

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
    const ref = new ComponentRef(host);

    ref.#host.native._registerLifecycleHooks({
      onConnect: () => {
        for (const onConnect of ref.#connectedCallbacks) {
          ref.#invokeOnConnect(onConnect);
        }
      },

      onDisconnect: () => {
        for (const onDisconnect of ref.#disconnectedCallbacks) {
          onDisconnect();
        }

        // Clear all the disconnect listeners. They will be re-added when their
        // associated connect listeners are invoked.
        ref.#disconnectedCallbacks.splice(0, ref.#disconnectedCallbacks.length);
      },
    });

    return ref;
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
      return effect(callback, scheduler);
    });
  }

  /**
   * Invokes the given callback in a reactive context, serializes the result,
   * and renders it to the provided element's text content. Automatically
   * re-renders whenever a dependency of `signal` is modified.
   *
   * A default {@link Serializer} is inferred from the return value of
   * `signal` if no token is provided.
   *
   * @param elementOrSelector The element to render to or a selector of the
   *     element to render to.
   * @param signal The signal to invoke in a reactive context.
   * @param token A "token" which identifiers a {@link Serializer} to
   *     serialize the `signal` result to a string. A token is one of:
   *     *   A primitive serializer - {@link String}, {@link Boolean},
   *         {@link Number}, {@link BigInt}.
   *     *   A {@link Serializer} object.
   *     *   A {@link Serializable} object.
   */
  public bind<Primitive extends string | number | boolean | bigint>(
    elementOrSelector: ElementRef<Element> | string,
    signal: Signal<Primitive>,
    token?: SerializerToken<Primitive>,
  ): void;
  public bind<Value>(
    elementOrSelector: ElementRef<Element> | string,
    signal: Signal<Value>,
    token: SerializerToken<Value>,
  ): void;
  public bind<Value>(
    elementOrSelector: ElementRef<Element> | string,
    signal: Signal<Value>,
    token?: SerializerToken<Value>,
  ): void {
    // Query for a selector if provided.
    const element = elementOrSelector instanceof ElementRef
        ? elementOrSelector
        : this.host.query(elementOrSelector);

    // Assert that the element is not already bound to another signal.
    if (boundElements.has(element.native)) {
      throw new Error(`Element is already bound to another signal, cannot bind it again.`);
    }
    boundElements.add(element.native);

    // Resolve an explicit serializer immediately, since that isn't dependent on
    // the value and we don't want to do this for every invocation of effect.
    const explicitSerializer = token
        ? resolveSerializer(token) as Serializer<Value>
        : undefined;

    this.effect(() => {
      // Invoke the user-defined callback in a reactive context.
      const value = signal();

      // Infer a default serializer if necessary.
      const serializer = explicitSerializer ?? inferSerializer(value);
      if (!serializer) {
        throw new Error(`No default serializer for type "${
            typeof value}". Either provide a primitive type (string, number, boolean, bigint) or provide an explicit serializer.`);
      }

      // Render the new value.
      element.native.textContent = serializer.serialize(value);
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

/**
 * Given the type of the provided value, returns a serializer which can
 * serialize it or `undefined` if no serializer can.
 */
function inferSerializer(value: unknown): Serializer<unknown> | undefined {
  switch (typeof value) {
    case 'string': return stringSerializer;
    case 'number': return numberSerializer;
    case 'boolean': return booleanSerializer;
    case 'bigint': return bigintSerializer;
    default: return undefined;
  }
}
