import * as context from './context.js';
import { Context, Timeout } from './context.js';
import { Accessor, Disposer, Signal, createEffect, createSignal } from './signal.js';
import { QueriedElement } from './selector.js';

export interface ComponentDefinition {
  [prop: string]: unknown;
}

// An initializer for the component lifecycle. Runs on hydration / reconnect and returns an
// optional `Disposer` when runs on disconnect.
export type LifecycleInitializer = () => Disposer | void;

/**
 * Private element state which needs to be accessed outside the class but is internal
 * to the HydroActive library and should be hidden from users.
 */
interface ElementInternalState {
  hydrated: boolean;
  hookDisposers: Disposer[];
  propSignals: Map<string, Accessor<unknown>>;
}
const elementInternalStateMap = new WeakMap<HTMLElement, ElementInternalState>();

/**
 * Private component state which needs to be accessed outside the class but is internal
 * to the HydroActive library and should be hidden from users.
 */
interface ComponentInternalState {
  initializers: Array<LifecycleInitializer>;
}
const componentInternalStateMap = new WeakMap<Component, ComponentInternalState>();

export type ComponentDef<Props extends {} = {}, Element extends HTMLElement = HTMLElement> =
  Component<Element, Props>;

export function component<Props extends {}, Def extends ComponentDefinition>(
  tagName: `${string}-${string}`,
  hydrate: ($: ComponentDef<Props, HTMLElement>) => Def | void,
): Class<HTMLElement & Def & Partial<Props>> & InternalProps<Props> {
  // Extend the base class and close over the provided `hydrate()` function.
  const HydroActiveComponentClass = class extends HydroActiveComponent<Props, Def> {
    protected override hydrate(component: ComponentDef<Props, HTMLElement>): Def | void {
      return hydrate(component);
    }
  } as unknown as Class<HTMLElement & Def & Props> & InternalProps<Props>;

  // Overwrite the class name for debugging purposes.
  Object.defineProperty(HydroActiveComponentClass, 'name', {
    value: skewerCaseToUpperCamelCase(tagName),
  });

  // Define the custom element immediately, so HydroActive components cannot be hydrated prior
  // to being defined as long as they have a dependency on the component class.
  customElements.define(tagName, HydroActiveComponentClass);

  return HydroActiveComponentClass;
}

abstract class HydroActiveComponent<Props extends {}, Def extends ComponentDefinition>
    extends HTMLElement {
  private readonly component: ComponentDef<Props, HTMLElement>;

  constructor() {
    super();
    elementInternalStateMap.set(this, {
      hydrated: false,
      hookDisposers: [],
      propSignals: new Map(),
    });
    this.component = Component.from(this as any) as any;
  }

  static get observedAttributes() { return [ 'defer-hydration' ]; }
  attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null): void {
    // Ignore anything that isn't a removal of `defer-hydration`.
    if (name !== 'defer-hydration' || newValue !== null) return;

    this.requestHydration();

    // While we can hydrate when not connected, don't run initializers while disconnected.
    // They will be executed on `connectedCallback()`.
    if (!this.isConnected) return;

    // Execute hooks. We are already connected to the DOM, so we can't rely on
    // `connectedCallback()` because it ran prior to hydration.
    const componentState = componentInternalStateMap.get(this.component)!;
    const elementState = elementInternalStateMap.get(this)!;
    for (const initializer of componentState.initializers) {
      const disposer = initializer();
      if (disposer) elementState.hookDisposers.push(disposer);
    }
  }

  protected abstract hydrate(component: ComponentDef<Props, HTMLElement>): Def | void;

  private requestHydration(): void {
    // Don't hydrate when the `defer-hydration` attribute is set. Wait for it to be
    // removed.
    if (this.hasAttribute('defer-hydration')) return;

    // Hydrate at most once.
    const elementState = elementInternalStateMap.get(this)!;
    if (elementState.hydrated) return;

    // Call user-authored hydration function.
    const def = this.hydrate(this.component) ?? undefined;
    elementState.hydrated = true;

    if (def) {
      // Apply the returned properties to this element.
      Object.defineProperties(this, Object.getOwnPropertyDescriptors(def));
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
}

/**
 * Hydrates the given element by assigning all the given properties and then removing the
 * `defer-hydration` attribute.
 * 
 * Asserts that `defer-hydration` is present prior to removing it to ensure the element was
 * not previously hydrated.
 * Also asserts that the given element is actually an instance of the provided class.
 */
export function hydrate<Clazz extends Class<Element>>(el: Element, clazz: Clazz,
  // `props` can be omitted if the element does not have any required properties.
  ...[ props = {} as any ]: (
    {} extends GetProps<Clazz>
      ? [ props?: GetProps<Clazz> ]
      : [ props: GetProps<Clazz> ]
  )
): asserts el is InstanceType<Clazz> {
  // Assert that the element is not already hydrated. We expect `defer-hydration` to already
  // be set. We check this first to avoid unnecessary side effects if the check is failed.
  // Ignore elements in other documents, see implementation note below.
  if (!el.hasAttribute('defer-hydration') && el.ownerDocument === document) {
    throw new Error(`Expected element to be deferred, but it was already hydrated. Did you forget \`defer-hydration\`?`);
  }

  // Make sure element's in different documents are upgraded (but not hydrated).
  //
  // VERY LONG IMPLEMENTATION NOTE: Other documents are typically "inert", meaning they do
  // *not* run scripts and do *not* upgrade their custom elements. This usually happens when
  // cloning a custom element from a template. The template has a different `Document` which
  // owns the template contents. When we call `template.content.cloneNode()`, the clone is
  // still owned by the same document and thus cannot be upgraded.
  //
  // See: https://github.com/WICG/webcomponents/issues/946#issuecomment-1200377464
  //
  // To address this, we adopt the node into the main document, upgrade the element, and
  // then reattach it to its original location in its previous document. This seems to be the
  // "least surprising" solution as compared to alternatives:
  // 1.  Adopt the node but don't reattach to its original position - Confusing because
  //     `hydrate()` now modifies DOM structure in an unintuitive manner.
  // 2.  Import the node by cloning it - Confusing because we need to return a new node from
  //     `hydrate()` which only matters some of the time and users need to manually dispose of
  //     the old node as appropriate.
  // 3.  Throw an error, and tell the caller to adopt / import the node - Defers a very
  //     nuanced question to devs. They also need to make sure adopting the node doesn't
  //     trigger hydration by itself, which is easy to forget.
  //
  // Reattaching the node is wasteful from a performance perspective, since we're effectively
  // moving a node from its original document to the main document, upgrading it, then moving
  // it back to its original document, only to return to the caller who will very likely just
  // add it back again to the main document. While wasteful, this is the most intuitive
  // behavior, and particularly performance-sensitive use cases can make sure to adopt the
  // node first to skip the code path.
  if (el.ownerDocument !== document) {
    const parent = el.parentElement;
    const nextSibling = el.nextSibling;

    // Set `defer-hydration` to make sure that upgrading the component does not automatically
    // hydrate it.
    el.setAttribute('defer-hydration', '');

    // Adopt the node into the current document, removing it from its existing document.
    document.adoptNode(el);

    // Upgrade the custom element. Does *not* hydrate because of `defer-hydration`.
    customElements.upgrade(el);

    // Reattach to its original position in the original document.
    if (parent) parent.insertBefore(el, nextSibling);
  }

  // Assert class instance to make sure we were given the right class for this element.
  // This is not very useful itself, however it requires that the user imports the component's
  // class, meaning it is very likely (though notably not guaranteed) to to be defined.
  // We can't do this until *after* the element has been upgraded, so if the caller gives the
  // wrong class, there is still a visible side effect from the hydration attempt. Considering
  // this likely reveals a programming mistake rather than an expected failure, this side
  // effect will hopefully not cause too many issues.
  if (!(el instanceof clazz)) {
    throw new Error(`Expected element to be an instance of \`${
      clazz.name}\`, but got an instance of \`${(el as Element).constructor.name}\` instead.`);
  }

  // Assign all the provided props values.
  for (const [ key, value ] of Object.entries(props)) {
    (el as unknown as Record<string, unknown>)[key] = value;
  }

  // Hydrate the element.
  el.removeAttribute('defer-hydration');
}

// Store props types on the component class so we can use them for type inference.
type InternalProps<Props extends {}> = { __internalHydroActivePropsType_doNotUseOrElse__?: Props };
type GetProps<Clazz extends Class<Element> & InternalProps<{}>> =
  Clazz extends InternalProps<infer Props> ? Props : never;

type Accessed<Signal> = Signal extends Accessor<infer T> ? T : never;
type AccessedArray<Signals extends unknown[]> = Signals extends [ infer Head, ...infer Tail ]
  ? [ Accessed<Head>, ...AccessedArray<Tail> ]
  : [];
type AsyncEffect<Accessors extends Accessor<unknown>[]> = (
  ...args: [ ...values: AccessedArray<Accessors>, signal: AbortSignal ]
) => Promise<void>;

function proxyProps(host: HTMLElement, elementState: ElementInternalState): {} {
  return new Proxy({}, {
    get: (_target: {}, prop: string, _receiver: unknown): unknown => {
      const signal = elementState.propSignals.get(prop);
      if (signal) return signal;
      
      const [ value, setValue ] = createSignal((host as any)[prop]);
      elementState.propSignals.set(prop, value);

      Object.defineProperty(host, prop, {
        get() { return value(); },
        set(value) { setValue(value); },
      });

      return value;
    },
  });
}

type SignalsOf<Props extends {}> = { [Key in keyof Props]-?: Accessor<Props[Key]> };
class Component<
  Host extends HTMLElement = HTMLElement,
  Props extends {} = {},
> {
  public readonly host: Host & Partial<Props>;

  // `$.props` always includes `undefined`, because the component can be created outside of
  // any HydroActive APIs without any required parameters set.
  public readonly props: SignalsOf<Partial<Props>>;

  private constructor({ el, props }: { el: Host & Partial<Props>, props: SignalsOf<Props> }) {
    this.host = el;
    this.props = props;
    componentInternalStateMap.set(this, { initializers: [] });
  }

  public static from<
    Host extends HTMLElement,
    Props extends Record<string, Accessor<unknown>>,
  >(el: Host & Partial<Props>): Component<Host> {
    const props = proxyProps(el, elementInternalStateMap.get(el)!) as SignalsOf<Props>;
    return new Component({ el, props });
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
  public lifecycle(initializer: LifecycleInitializer): void {
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
   */
  public effect(effect: () => Disposer | void): void {
    this.lifecycle(() => {
      const dispose = createEffect(() => effect());
      return () => { dispose(); };
    });
  }

  /**
   * Schedules an async effect to be run on the component any time one of the provided
   * signals is modified. Signals must be provided in function arguments instead of accessed
   * in the callback like a typical effect. It should look like so:
   *
   * ```typescript
   * const [ value, setValue ] = createSignal(0);
   * 
   * $.asyncEffect(value, async (value, signal: AbortSignal) => {
   *   // Do something asynchronous with `value`.
   * });
   * ```
   *
   * This is because it's not possible to subscribe observe signal executions in an async
   * context, we must synchronously touch *all* the required signals, then use their results
   * to invoke the async effect when they change.
   *
   * An {@link AbortSignal} is provided as the final argument which is triggered when the
   * effect is disposed. This is useful for cancelling async tasks in an ergonomic fashion.
   */
  public asyncEffect<Accessors extends Accessor<unknown>[]>(...args: [
    ...accessors: Accessors,
    effect: AsyncEffect<Accessors>,
  ]): void {
    const accessors = args.slice(0, -1) as Accessor<unknown>[];

    // Ban accessors because they should be passed in as arguments. Any accessors invoked in
    // the async effect, will *not* be tracked or retrigger the effect. Accessors are banned
    // by default, meaning following any `await` they will `throw`. However the synchronous
    // part of the effect could still read (and technically track) accessors and cause
    // hard-to-follow execution dependencies. It's better to always fail for any accessor
    // invocation from an async effect.
    const effect = args.at(-1) as AsyncEffect<Accessors>;

    this.effect(() => {
      // Read all the accessors synchronously.
      const values = accessors.map((accessor) => accessor());
      const abortCtrl = new AbortController();
      effect(...values.concat([ abortCtrl.signal ]) as Parameters<AsyncEffect<Accessors>>);
      return () => { abortCtrl.abort(); };
    });
  }

  // TODO: How should `$.live('.foo', HTMLSpanElement)` work?
  public live<Selector extends string, Result = QueriedElement<Selector>, Source extends HydrateSource = ElementSource>(
    selector: Selector,
    type: HydrateConverter<Source, Result, QueriedElement<Selector>>,
    source: Source = element as Source,
  ): Signal<Result> {
    const initialValue = this.read(selector, type, source);
    const [ accessor, setter ] = createSignal(initialValue);
    this.bind(selector, accessor, source);

    return [ accessor, setter ];
  }

  // TODO: `$.read('span', HTMLDivElement)` should return an `HTMLDivElement` type?
  // TODO: Infers return type incorrectly based on usage? `wantDiv($.read('span', HTMLSpanElement))`
  public read<Selector extends string, Result = QueriedElement<Selector>, Source extends HydrateSource = ElementSource>(
    selector: Selector,
    type: HydrateConverter<Source, Result, QueriedElement<Selector>>,
    source: Source = element as Source,
  ): Result {
    const el = this.query(selector);
    const content = getSource(el, source);
    const coerce = getCoercer(type);
    const value = coerce(content);
    return value;
  }

  // TODO: Consider adding `$.hydrateChildren()`.
  public hydrate<Clazz extends Class<Element>>(
    selector: string,
    clazz: Clazz,
    // `props` is optional if the class does not have any required props.
    ...[ props = {} as any ]: {} extends GetProps<Clazz>
        ? [ props?: GetProps<Clazz> ]
        : [ props: GetProps<Clazz> ]
  ): InstanceType<Clazz> {
    const el = queryAsserted(this.host, selector);
    hydrate(el, clazz, props);
    return el;
  }

  // TODO: Require `T` be a stringifiable primitive.
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
   */
  public useContext<T>(ctx: Context<T>, initial: T, timeout: Timeout = 'task'):
      Accessor<T> {
    const [ value, setValue ] = createSignal(initial);

    this.lifecycle(() => {
      const unlisten = context.listen(this.host, ctx, (value) => { setValue(value); }, timeout);
      return () => unlisten();
    });

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

  public query<Selector extends string>(selector: Selector):
      BanCustomElementSelector<Selector, QueriedElement<Selector, HTMLElement>> {
    const el = queryAsserted(this.host, selector);

    // Assert the result does not contain a custom element, because it may not be hydrated.
    // Ignore this check for the host element because that's we're not worried about hydration
    // timing there.
    if (selector !== ':host' && el.tagName.includes('-')) {
      throw new Error(`Selector \`${selector}\` matched a custom element (\`${
          el.constructor.name}\`) which is not supported by \`$.query()\` and \`$.queryAll()\` because they don't enforce that the element is hydrated. Use \`$.hydrate('${
          selector}', ${skewerCaseToUpperCamelCase(el.tagName)})\` instead.`);
    }

    return el;
  }

  public queryAll<Selector extends string>(selector: Selector):
      OneOrMore<BanCustomElementSelector<Selector, QueriedElement<Selector, HTMLElement>>> {
    const els = queryAllAsserted(this.host, selector);

    // Skip custom element check for the host element.
    if (selector === ':host') return els;

    // Assert the results do not contain a custom element, because it may not be hydrated.
    for (const el of els) {
      if (el.tagName.includes('-')) {
        throw new Error(`Selector \`${selector}\` matched a custom element (\`${
            el.constructor.name}\`) which is not supported by \`$.query()\` and \`$.queryAll()\` because they don't enforce that the element is hydrated. Use \`$.hydrate('${
            selector}', ${skewerCaseToUpperCamelCase(el.tagName)})\` instead.`);
      }
    }

    return els;
  }

  public dispatch(event: Event): void {
    this.host.dispatchEvent(event);
  }

  public listen(target: EventTarget, event: string, handler: (evt: Event) => void): void {
    this.lifecycle(() => {
      target.addEventListener(event, handler);
      return () => target.removeEventListener(event, handler);
    });
  }
}

function queryAsserted<Selector extends string>(host: Element, selector: Selector):
    BanCustomElementSelector<Selector, QueriedElement<Selector, HTMLElement>> {
  const [ el, ...rest ] = queryAllAsserted(host, selector);

  if (rest.length !== 0) throw new Error(`Found multiple instances of selector \`${selector}\` in the shadow DOM, only one was expected.`);

  return el;
}

function queryAllAsserted<Selector extends string>(host: Element, selector: Selector):
    OneOrMore<BanCustomElementSelector<Selector, QueriedElement<Selector, HTMLElement>>> {
  type El = BanCustomElementSelector<Selector, QueriedElement<Selector, HTMLElement>>;

  if (selector === ':host') return [ host as El ];

  const els = Array.from(host.shadowRoot!.querySelectorAll(selector));
  if (els.length === 0) throw new Error(`Selector \`${selector}\` not in shadow DOM.`);

  return els as OneOrMore<BanCustomElementSelector<Selector, QueriedElement<Selector, HTMLElement>>>;
}

type OneOrMore<T> = [ T, ...T[] ];
type BanCustomElementSelector<Selector extends string, Result> =
  Selector extends `${string}-${string}`
  ? Invalid<`Don't get custom elements from \`$.query()\` or \`$.queryAll()\` as they might not be hydrated. Use \`$.hydrate('${Selector}', ${SkewerToPascalCase<Selector>})\` instead. This forces \`${SkewerToPascalCase<Selector>}\` to hydrate first.`>
  : Result;

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

type SkewerToPascalCase<Text extends string> = Join<CapitalizeAll<Split<Text, '-'>>, ''>;
type Split<Text extends string, Separator extends string> =
  Text extends `${infer Prefix}${Separator}${infer Rest}`
    ? [ Prefix, ...Split<Rest, Separator> ]
    : [ Text ];
type CapitalizeAll<List extends string[]> =
  List extends [ infer Head extends string, ...infer Tail extends string[] ]
    ? [ Capitalize<Head>, ...CapitalizeAll<Tail> ]
    : [ ];
type Join<List extends string[], Separator extends string> =
  List extends [ infer Head extends string, ...infer Tail extends string[] ]
    ? `${Head}${Separator}${Join<Tail, Separator>}`
    : ``;

// Inspired by: https://github.com/ryb73/invalid-type/blob/3ada996a6d4fe1fa7bfeb2440019540643feb54e/src/index.ts
const invalidSymbol = Symbol('Invalid type');
type Invalid<_Message extends string> = (arg: typeof invalidSymbol) => typeof invalidSymbol;

function skewerCaseToUpperCamelCase(skewerCase: string): string {
  return skewerCase.split('-')
      .filter((part) => part !== '')
      .map((part) => `${part[0]!.toUpperCase()}${part.slice(1).toLowerCase()}`)
      .join('');
}
