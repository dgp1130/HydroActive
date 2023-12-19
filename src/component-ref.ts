import { ElementRef, type ResolveSerializer, type SerializerToken, resolveSerializer } from './element-ref.js';
import { HydroActiveComponent } from './hydroactive-component.js';
import { type AttrSerializer, type Serialized, bigintSerializer, booleanSerializer, numberSerializer, stringSerializer } from './serializers.js';
import { type Signal, type WriteableSignal, effect, signal } from './signals.js';
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

/** Element attributes whose content is currently bound to a reactive signal. */
const boundElementAttrs = new WeakMap<Element, Set<string>>();

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
   * Creates a live binding to an element's text content. Returns a
   * {@link WriteableSignal} initialized to the current state of the specified
   * element in the DOM and bound such that all future writes to the signal are
   * automatically propagated back to the DOM.
   *
   * *   Uses the provided element directly, or queries the component for the
   *     given selector.
   * *   Reads and binds to the text content of the provided element.
   * *   Uses the provided serializer token to serialize to and deserialize from
   *     the DOM.
   *
   * MISCONCEPTION: This is *not* a two-way binding. It is a one-way binding
   * with automatic initialization. If the bound element's text content is
   * modified outside of this binding, that change will *not* be reflected
   * automatically in the returned signal.
   *
   * @param elementOrSelector An {@link ElementRef} or a selector to look up in
   *     the component to get an element. Used to read and bind the return
   *     signal to.
   * @param token A "token" which identifiers an {@link AttrSerializer} to
   *     serialize the `signal` result to a string. A token is one of:
   *     *   A primitive serializer - {@link String}, {@link Boolean},
   *         {@link Number}, {@link BigInt}.
   *     *   An {@link AttrSerializer} object.
   *     *   A {@link Serializable} object.
   * @returns A {@link WriteableSignal} initialized to the current text content
   *     of the specified element. When the signal is mutated, the value is
   *     automatically propagated back to the DOM.
   */
  public live<Token extends SerializerToken<any>>(
    elementOrSelector: ElementRef<Element> | string,
    token: Token,
  ): WriteableSignal<Serialized<ResolveSerializer<Token>>> {
    // Query for a selector if provided.
    const element = elementOrSelector instanceof ElementRef
        ? elementOrSelector
        : this.host.query(elementOrSelector);

    // Read the initial value from the DOM.
    const initial = element.read(token);

    // Wrap the value in a reactive signal.
    const value = signal(initial);

    // Bind the signal back to the DOM to reflect future changes.
    this.bind(element, value, token);

    // Return a writeable version of the signal.
    return value;
  }


  /**
   * Creates a live binding to an element's attribute. Returns a
   * {@link WriteableSignal} initialized to the current state of the specified
   * element in the DOM and bound such that all future writes to the signal are
   * automatically propagated back to the DOM.
   *
   * *   Uses the provided element directly, or queries the component for the
   *     given selector.
   * *   Reads and binds to the named attribute of the provided element.
   * *   Uses the provided serializer token to serialize to and deserialize from
   *     the DOM.
   *
   * MISCONCEPTION: This is *not* a two-way binding. It is a one-way binding
   * with automatic initialization. If the bound element's attribute is modified
   * outside of this binding, that change will *not* be reflected automatically
   * in the returned signal.
   *
   * Note that an attribute without a value such as `<div foo></div>` will
   * return an empty string which is considered falsy.
   *
   * @param elementOrSelector An {@link ElementRef} or a selector to look up in
   *     the component to get an element. Used to read and bind the return
   *     signal to.
   * @param name The name of the attribute to bind to.
   * @param token A "token" which identifiers an {@link AttrSerializer} to
   *     serialize the `signal` result to a string. A token is one of:
   *     *   A primitive serializer - {@link String}, {@link Boolean},
   *         {@link Number}, {@link BigInt}.
   *     *   An {@link AttrSerializer} object.
   *     *   A {@link Serializable} object.
   * @returns A {@link WriteableSignal} initialized to the current value of the
   *     named attribute for the specified element. When the signal is mutated,
   *     the value is automatically propagated back to the DOM.
   */
  public liveAttr<Token extends SerializerToken<any>>(
    elementOrSelector: ElementRef<Element> | string,
    name: string,
    token: Token,
  ): WriteableSignal<Serialized<ResolveSerializer<Token>>> {
    // Query for a selector if provided.
    const element = elementOrSelector instanceof ElementRef
        ? elementOrSelector
        : this.host.query(elementOrSelector);

    // Read the initial value from the DOM.
    const initial = element.attr(name, token);

    // Wrap the value in a reactive signal.
    const value = signal(initial);

    // Bind the signal back to the DOM to reflect future changes.
    this.bindAttr(element, name, value, token);

    // Return a writeable version of the signal.
    return value;
  }

  /**
   * Invokes the given signal in a reactive context, serializes the result, and
   * renders it to the provided element's text content. Automatically re-renders
   * whenever a dependency of `signal` is modified.
   *
   * A default {@link AttrSerializer} is inferred from the return value of `signal`
   * if no token is provided.
   *
   * @param elementOrSelector The element to render to or a selector of the
   *     element to render to.
   * @param signal The signal to invoke in a reactive context.
   * @param token A "token" which identifiers an {@link AttrSerializer} to
   *     serialize the `signal` result to a string. A token is one of:
   *     *   A primitive serializer - {@link String}, {@link Boolean},
   *         {@link Number}, {@link BigInt}.
   *     *   An {@link AttrSerializer} object.
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
    this.#bindToDom(
      elementOrSelector,
      signal,
      token,
      /* boundCheck */ (element) => {
        if (boundElements.has(element)) {
          throw new Error(`Element is already bound to another signal, cannot bind it again.`);
        }
        boundElements.add(element);
      },
      /* updateDom */ (element, serialized) => {
        element.textContent = serialized;
      },
    );
  }

  /**
   * Invokes the given signal in a reactive context, serializes the result, and
   * renders it to the named attribute of the provided element. Automatically
   * re-renders whenever a dependency of `signal` is modified.
   *
   * A default {@link AttrSerializer} is inferred from the return value of `signal`
   * if no token is provided.
   *
   * @param elementOrSelector The element to render to or a selector of the
   *     element to render to.
   * @param name The name of the attribute to bind to.
   * @param signal The signal to invoke in a reactive context.
   * @param token A "token" which identifiers a {@link AttrSerializer} to
   *     serialize the `signal` result to a string. A token is one of:
   *     *   A primitive serializer - {@link String}, {@link Boolean},
   *         {@link Number}, {@link BigInt}.
   *     *   An {@link AttrSerializer} object.
   *     *   A {@link Serializable} object.
   */
  public bindAttr<Primitive extends string | number | boolean | bigint>(
    elementOrSelector: ElementRef<Element> | string,
    name: string,
    signal: Signal<Primitive>,
    token?: SerializerToken<Primitive>,
  ): void;
  public bindAttr<Value>(
    elementOrSelector: ElementRef<Element> | string,
    name: string,
    signal: Signal<Value>,
    token: SerializerToken<Value>,
  ): void;
  public bindAttr<Value>(
    elementOrSelector: ElementRef<Element> | string,
    name: string,
    signal: Signal<Value>,
    token?: SerializerToken<Value>,
  ): void {
    this.#bindToDom(
      elementOrSelector,
      signal,
      token,
      /* boundCheck */ (element) => {
        const boundAttrs = boundElementAttrs.get(element) ?? new Set();
        if (boundAttrs.has(name)) {
          throw new Error(`Element attribute (${name}) is already bound to another signal, cannot bind it again.`);
        }
        boundAttrs.add(name);
        boundElementAttrs.set(element, boundAttrs);
      },
      /* updateDom */ (element, serialized) => {
        element.setAttribute(name, serialized);
      },
    );
  }

  /**
   * Creates an effect which invokes `updateDom` with the associated element and
   * serialized value whenever the signal changes.
   *
   * Also calls `boundCheck` with the element immediately so the caller can
   * determine whether or not a binding already exists.
   */
  #bindToDom<Value>(
    elementOrSelector: ElementRef<Element> | string,
    signal: Signal<Value>,
    token: SerializerToken<Value> | undefined,
    boundCheck: (el: Element) => void,
    updateDom: (el: Element, serialized: string) => void,
  ): void {
    // Query for a selector if provided.
    const element = elementOrSelector instanceof ElementRef
        ? elementOrSelector
        : this.host.query(elementOrSelector);

    // Assert that the element is not already bound to another signal.
    boundCheck(element.native);

    // Resolve an explicit serializer immediately, since that isn't dependent on
    // the value and we don't want to do this for every invocation of effect.
    const explicitSerializer = token
        ? resolveSerializer(token) as AttrSerializer<Value>
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

      // Update the DOM with the new value.
      updateDom(element.native, serializer.serialize(value));
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
function inferSerializer(value: unknown): AttrSerializer<unknown> | undefined {
  switch (typeof value) {
    case 'string': return stringSerializer;
    case 'number': return numberSerializer;
    case 'boolean': return booleanSerializer;
    case 'bigint': return bigintSerializer;
    default: return undefined;
  }
}
