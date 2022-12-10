import * as context from './context.js';
import { Context, Timeout } from './context.js';
import { Accessor, Disposer, Signal, createEffect, createSignal, Setter } from './signal.js';
import { QueriedElement } from './selector.js';

export interface ComponentDefinition {
  update?(): void;
  [prop: string]: unknown;
}

// Returns a type identical to `T` but without the index signature.
type OmitIndexSignature<T> = {
  [K in keyof T as string extends K ? never : number extends K ? never : K]: T[K];
};

// TODO: Test host-specific hooks.
// TODO: Rename to align with when each function runs.
/**
 * A `Hook` is a value to be returned to callers combined with an initializer function which
 * is called on `connectedCallback()` and which returns an optional `Disposer` which is
 * invoked on `disconnectedCallback()`. This provides an opportunity to configure logic with
 * cleanup steps to avoid leaking memory. Note that a hook may be executed multiple times if
 * a component is removed and reattached to the DOM.
 */
export type Hook<T> = [ T, HookInitializer? ];
export type HookInitializer = () => Disposer | void;

/**
 * Private element state which needs to be accessed outside the class but is internal
 * to the HydroActive library and should be hidden from users.
 */
interface ElementInternalState {
  hydrated: boolean;
  hookDisposers: Disposer[];
}
const elementInternalStateMap = new WeakMap<HTMLElement, ElementInternalState>();

/**
 * Private component state which needs to be accessed outside the class but is internal
 * to the HydroActive library and should be hidden from users.
 */
interface ComponentInternalState {
  initializers: Array<HookInitializer>;
}
const componentInternalStateMap = new WeakMap<Component, ComponentInternalState>();

export function component<Def extends ComponentDefinition>(
  hydrate: ($: Component<HTMLElement>) => Def | void,
): Class<HTMLElement & OmitIndexSignature<Def>> {
  return class extends HTMLElement implements HTMLElement {
    private readonly component: Component<HTMLElement & OmitIndexSignature<Def>>;
    private def?: ComponentDefinition;

    constructor() {
      super();
      this.component = Component.from(this) as any;
      elementInternalStateMap.set(this, {
        hydrated: false,
        hookDisposers: [],
      });
    }

    static get observedAttributes() { return [ 'defer-hydration' ]; }
    attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null): void {
      // Ignore anything that isn't a removal of `defer-hydration`.
      if (name !== 'defer-hydration' || newValue !== null) return;

      // Ignore removal of `defer-hydration` when disconnected, because we don't support
      // hydration when disconnected from the DOM. Hydration will be triggered by
      // `connectedCallback()` when the element is attached.
      if (!this.isConnected) return;

      this.requestHydration();

      // Execute hooks. We can't rely on `connectedCallback()` because it ran prior to
      // hydration.
      const componentState = componentInternalStateMap.get(this.component)!;
      const elementState = elementInternalStateMap.get(this)!;
      for (const initializer of componentState.initializers) {
        const disposer = initializer();
        if (disposer) elementState.hookDisposers.push(disposer);
      }
    }

    private requestHydration(): void {
      // Don't hydrate when the `defer-hydration` attribute is set. Wait for it to be
      // removed.
      if (this.hasAttribute('defer-hydration')) return;

      // Hydrate any deferred child nodes before hydrating this node.
      const deferredChildren = this.shadowRoot!.querySelectorAll('[defer-hydration]');
      for (const child of deferredChildren) {
        child.removeAttribute('defer-hydration');
      }

      // Hydrate at most once.
      const elementState = elementInternalStateMap.get(this)!;
      if (elementState.hydrated) return;

      // Call user-authored hydration function.
      this.def = hydrate(this.component) ?? undefined;
      if (this.def?.update) {
        const update = this.def.update.bind(undefined);
        this.component.effect(() => { update(); });
      }
      elementState.hydrated = true;

      if (this.def) {
        // Apply the returned properties to this element.
        Object.defineProperties(this, Object.getOwnPropertyDescriptors(this.def));
      }
    }

    connectedCallback(): void {
      this.requestHydration();

      // Invoke all hooks and schedule their disposers.
      // Effects are implemented as hooks and are also invoked here.
      const componentState = componentInternalStateMap.get(this.component)!;
      const elementState = elementInternalStateMap.get(this)!;
      for (const initializer of componentState.initializers) {
        const disposer = initializer();
        if (disposer) elementState.hookDisposers.push(disposer);
      }
    }

    disconnectedCallback(): void {
      // Dispose any active hooks. Drop the disposers afterwards because when the hooks
      // rerun on the next `connectedCallback()`, they will generate new disposers.
      const elementState = elementInternalStateMap.get(this)!;
      for (const dispose of elementState.hookDisposers) dispose();
      elementState.hookDisposers.splice(0, elementState.hookDisposers.length);
    }
  } as unknown as Class<HTMLElement & Def>;
}

export class Component<Host extends HTMLElement = HTMLElement> {
  public readonly host: Host;

  private constructor({ el }: { el: Host }) {
    this.host = el;
    componentInternalStateMap.set(this, { initializers: [] });
  }

  public static from<Host extends HTMLElement>(el: Host): Component<Host> {
    return new Component({ el });
  }

  /**
   * Schedules a hook to be run on the component. The initializer callback is invoked during
   * hydration / `connectedCallback()`. It may optionally return a `Disposer` which is
   * invoked on `disconnectedCallback()`.
   */
  public use<T>([ value, initializer ]: Hook<T>): T {
    if (initializer) this.lifecycle(initializer);
    return value;
  }

  /**
   * Schedules the lifecycle function to be executed for this component. The initializer
   * callback is invoked when the component is hydrated / connected to the DOM. It may
   * optionally return a `Disposer` which is invoked when the component is disconnected.
   * 
   * Use this function to run operations at hydration but which require a cleanup
   * operation when the component is not in use. Note that the initializer can be called
   * multiple times if the component is disconnected from and then reconnected to the
   * document.
   * 
   * In particular, this function does *not* have any knowledge of signals and will not
   * rerun when they change. If that is what you want, use {@link effect}.
   */
  public lifecycle(initializer: HookInitializer): void {
    // Remember the hook so `connectedCallback()` can invoke it later.
    componentInternalStateMap.get(this)!.initializers.push(initializer);
    const { hydrated, hookDisposers } = elementInternalStateMap.get(this.host)!;

    // If we already hydrated, run the hook immediately and clean up on disconnect.
    // This allows hooks to be defined late and still work with the component lifecycle.
    if (hydrated && this.host.isConnected) {
      const disposer = initializer();
      if (disposer) hookDisposers.push(disposer);
    }
  }

  /**
   * Schedules an effect to be run on the component. An effect is a side-effectful
   * function which uses signals. It run immediately during hydration, and then again
   * any time one of its signals have changed.
   * 
   * Use this function to run reactive operations which should rerun when any used
   * signal changes.
   * TODO: $.use($, effect(() => { ... }))?
   */
  public effect(effect: () => void, dispose?: () => void): void {
    this.use(effectHook(this, effect, dispose));
  }

  public live<Selector extends string, Result = QueriedElement<Selector>, Source extends HydrateSource = ElementSource>(
    selector: Selector,
    type: HydrateConverter<Source, Result, QueriedElement<Selector>> = HTMLElement as any,
    source: Source = element as Source,
  ): Signal<Result> {
    const initialValue = this.hydrate(selector, type, source);
    const [ accessor, setter ] = createSignal(initialValue);
    this.bind(selector, accessor, source);

    return [ accessor, setter ];
  }

  public hydrate<Selector extends string, Result = QueriedElement<Selector>, Source extends HydrateSource = ElementSource>(
    selector: Selector,
    type: HydrateConverter<Source, Result, QueriedElement<Selector>> = HTMLElement as any,
    source: Source = element as Source,
  ): Result {
    const el = this.query(selector);
    const content = getSource(el, source);
    const coerce = getCoercer(type);
    const value = coerce(content);
    return value;
  }

  public bind<T>(
    selector: string,
    signal: Accessor<T> | Promise<Accessor<T>>,
    source: HydrateSource = element,
  ): void {
    const el = this.query(selector);
    const setDom = getSetter(source);

    const bindValue = (accessor: Accessor<T>): void => {
      this.effect(() => {
        setDom(el, safeToString(accessor()));
      });
    };

    // Only call `.then()` if actually given a `Promise`. Skipping `Promise.resolve()`
    // or `await 0` in the synchronous case avoids an unnecessary microtask tick.
    if (signal instanceof Promise) {
      signal.then((accessor) => bindValue(accessor));
    } else {
      bindValue(signal);
    }
  }

  public provideContext<T>(ctx: Context<T>, signal: Accessor<T>): void {
    this.effect(() => {
      context.provide(this.host, ctx, signal());
      return () => context.remove(this.host, ctx);
    });
  }

  /**
   * Returns a signal accessor which updates whenever the given context changes.
   * Requires an initial value, but also accepts a timeout which will emit an error if
   * a context is not received in time.
   * 
   * See {@link waitContext} for an asynchronous version which does *not* require an
   * initial value.
   * TODO: $.use($, ctxHook(...))?
   */
  public useContext<T>(ctx: Context<T>, initial: T, timeout: Timeout = 'task'):
      Accessor<T> {
    const [ value, setValue ] = createSignal(initial);

    this.use(ctxHook(this, ctx, setValue, timeout));

    return value;
  }

  /**
   * Returns a `Promise` which resolves with a signal of the given context when
   * available. This allows us to more easily work with context values which may be
   * provided *after* initial hydration while still treating them as signals. Signals
   * *require* an initial value so they are never in an invalid state. This function
   * avoids creating the signal until a context value is available.
   * 
   * See {@link useContext} for a synchronous version which requires an initial value.
   */
  public async waitContext<T>(ctx: Context<T>, timeout: Timeout = 'task'):
      Promise<Accessor<T>> {
    const initial = await context.wait(this.host, ctx, timeout);

    // Already got an initial value, no timeout needed anymore.
    return this.useContext(ctx, initial, 'forever');
  }

  public query<Selector extends string>(selector: Selector): QueriedElement<Selector, HTMLElement> {
    if (selector === ':host') return this.host as QueriedElement<Selector, HTMLElement>;

    const node = this.host.shadowRoot!.querySelector(selector);
    if (!node) throw new Error(`Selector \`${selector}\` not in shadow DOM.`);

    return node as QueriedElement<Selector, HTMLElement>;
  }

  public queryAll<Selector extends string>(selector: Selector): QueriedElement<Selector, HTMLElement>[] {
    if (selector === ':host') return [ this.host as QueriedElement<Selector, HTMLElement> ];

    const nodes = Array.from(this.host.shadowRoot!.querySelectorAll(selector));
    if (nodes.length === 0) throw new Error(`Selector \`${selector}\` not in shadow DOM.`);
    return nodes as QueriedElement<Selector, HTMLElement>[];
  }

  public dispatch(event: Event): void {
    this.host.dispatchEvent(event);
  }

  // TODO: $.use($, listenHook(...))?
  public listen(target: EventTarget, event: string, handler: (evt: Event) => void): void {
    this.use(listenHook(this, target, event, handler));
  }
}

function effectHook($: Component, effect: () => void, dispose?: Disposer): Hook<void> {
  return [ undefined, () => {
    const disposeEffect = createEffect(() => { effect(); });
    return () => {
      disposeEffect();
      dispose?.();
    };
  }];
}

function ctxHook<T>($: Component, ctx: Context<T>, setValue: Setter<T>, timeout: Timeout): Hook<void> {
  return [ undefined, () => {
    const unlisten = context.listen(
      $.host,
      ctx,
      (value) => { setValue(value); },
      timeout,
    );

    return () => unlisten();
  }];
}

function listenHook(
  $: Component,
  target: EventTarget,
  event: string,
  handler: (evt: Event) => void,
): Hook<void> {
  return [ undefined, () => {
    target.addEventListener(event, handler);
    return () => target.removeEventListener(event, handler);
  }];
}

type HydrateSetter = (el: Element, content: string) => void;

function getSetter(source: HydrateSource): HydrateSetter {
  switch (source.kind) {
    case 'element': return (el, content) => { el.textContent = content; };
    case 'attr': return (el, content) => { el.setAttribute(source.name, content); };
    default: assertNever(source);
  }
}

function safeToString(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  } else if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'bigint') {
    return value.toString();
  } else {
    throw new Error(`Cannot serialize non-primitive type \`${typeof value}\` with value:\n${value}`);
  }
}

type HydrateConverter<Source extends HydrateSource, Result, El extends Element = never> =
  | Source extends ElementSource
    ? ElementConverter<El, Result>
    : Source extends AttrSource
      ? AttributeConverter<Result>
      : unknown;

type ElementConverter<El extends Element, Result = Element> =
  // It is allowed to use `String` or `Number` and these are supported built-ins.
  // However, including them in this union results in
  // `(value: any) => string | (el: El) => unknown`.
  // This breaks type inference, since it resolves to `(value: any) => unknown`
  // so explicitly authored lambdas can't infer `El`.
  // | StringConstructor
  // | NumberConstructor
  | Class<Element>
  | ((el: El) => Result);

type AttributeConverter<Result> =
  // It is allowed to use `String` or `Number` and these are supported built-ins.
  // However, including them in this union results in
  // `(value: any) => string | (el: El) => unknown`.
  // This breaks type inference, since it resolves to `(value: any) => unknown`
  // so explicitly authored lambdas can't infer `El`.
  // | StringConstructor
  // | NumberConstructor
  | ((attr: string) => Result);

interface ElementSource {
  kind: 'element',
}
export const element = { kind: 'element' } as ElementSource;

interface AttrSource {
  kind: 'attr',
  name: string;
}
export function attr(name: string): AttrSource {
  return { kind: 'attr', name };
}

type HydrateSource = ElementSource | AttrSource;

function getSource(el: Element, source: HydrateSource): HydrateContent {
  switch (source.kind) {
    case 'element': return el;
    case 'attr':
      const attr = el.getAttribute(source.name);
      if (!attr) throw new Error(`No attribute \`${source.name}\` on element.`);
      return attr;
    default: assertNever(source);
  }
}

type HydrateContent = Element | string;
type Coercer<T> = (content: HydrateContent) => T;

const coerceToString: Coercer<string> = (content) => {
  if (content instanceof Element) {
    return content.textContent!;
  } else {
    return content; // TODO: `undefined`?
  }
};
const coerceToNumber: Coercer<number> = (content) => {
  const str = content instanceof Element ? content.textContent! : content;
  return Number(str); // TODO: `undefined`?
}
function assertElement<El extends Element>(
  content: HydrateContent,
  type: HydrateConverter<HydrateSource, unknown /* Result */, El>,
): El {
  if (!(content instanceof Element)) {
    throw new Error(`Expected an element of type \`${
      type}\`, but got a \`string\`. Are you reading from an attribute but expecting an element?`);
  }

  if (!(content instanceof type)) {
    throw new Error(`Expected an element of type \`${
      type}\`, but got an element of type ${content.constructor.name}`);
  }

  return content as El;
}

function getCoercer<Source extends HydrateSource, Result, El extends Element>(
  type: HydrateConverter<Source, Result, El>,
): Coercer<Result> {
  if (type === String) {
    return coerceToString as unknown as Coercer<Result>;
  } else if (type === Number) {
    return coerceToNumber as unknown as Coercer<Result>;
  } else if (classExtends(type, Element)) {
    return (content): Result => {
      return assertElement(content, type) as unknown as Result;
    };
  } else {
    return type as Coercer<Result>;
  }
}

type Class<T> = new (...args: unknown[]) => T;
function classExtends(child: unknown, parent: Class<unknown>): child is Class<unknown> {
  if (typeof child !== 'function') return false;

  for (const prototype of prototypeChain(child as Class<unknown>)) {
    if (prototype === parent) return true;
  }
  return false;
}

function* prototypeChain(obj: Class<unknown>): Generator<object, void, void> {
  yield obj;
  const proto = Object.getPrototypeOf(obj);
  if (proto !== null) yield* prototypeChain(proto);
}

function assertNever(value: never): never {
  throw new Error(`Unexpected call to \`assertNever()\` with value: ${value}`);
}
