/**
 * The type of the function invoked on connect. May optionally return a
 * disconnect function to be invoked when the component is disconnected.
 */
export type OnConnect = () => OnDisconnect | void;

/** The type of the function invoked on disconnect. */
export type OnDisconnect = () => void;

/**
 * Represents a component lifecycle associated with connecting to and
 * disconnecting from the document which can be leveraged to acquire and release
 * resources.
 */
export interface Connectable {
  /**
   * Sets up the given handler to be invoked whenever the underlying element is
   * connected to the DOM. If the handler returns a function, that function will
   * be invoked the next time the component is disconnected. This provides a
   * useful API for maintaining state which needs to be cleaned up while
   * avoiding * memory leaks in the component.
   *
   * The connect handler may be invoked multiple times if the component is
   * disconnected and reconnected to the DOM. Any returned disconnect function
   * is called at most once.
   *
   * Example:
   *
   * ```typescript
   * defineComponent('my-component', (host) => {
   *   host.connected(() => {
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
  connected(onConnect: OnConnect): void;
}

/**
 * A {@link Connectable} implementation which allows users to directly control
 * when the associated component connects to or disconnects from the document.
 */
export class Connector implements Connectable {
  readonly #connectedCallbacks: OnConnect[] = [];
  readonly #disconnectedCallbacks: OnDisconnect[] = [];
  readonly #isConnected: () => boolean;

  private constructor(isConnected: () => boolean) {
    this.#isConnected = isConnected;
  }

  /**
   * Provides a {@link Connector} from the given input.
   *
   * @param isConnected A function which returns whether or not the associated
   *     component is currently connected to the document.
   * @returns A {@link Connector} for the associated component.
   */
  public static from(isConnected: () => boolean): Connector {
    return new Connector(isConnected);
  }

  public connected(onConnect: OnConnect): void {
    this.#connectedCallbacks.push(onConnect);

    if (this.#isConnected()) this.#invokeOnConnect(onConnect);
  }

  /** Trigger the {@link connected} callbacks. */
  public connect(): void {
    for (const connectedCallback of this.#connectedCallbacks) {
      this.#invokeOnConnect(connectedCallback);
    }
  }

  /** Trigger any registered disconnect callbacks. */
  public disconnect(): void {
    for (const onDisconnect of this.#disconnectedCallbacks) {
      onDisconnect();
    }

    // Clear all the disconnect listeners. They will be re-added when their
    // associated connect listeners are invoked.
    this.#disconnectedCallbacks.splice(0, this.#disconnectedCallbacks.length);
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
