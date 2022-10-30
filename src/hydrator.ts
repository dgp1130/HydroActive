import * as ctx from './context.js';
import { Timeout, Context } from './context.js';

interface HydrateMetadata {
  prop: string;
  selector: string;
  coerce: Coercer<unknown>,
  source: HydrateSource,
}

type HydrateType<Source extends HydrateSource, El extends Element = never> =
  | Source extends ElementSource
    ? ElementConverter<El>
    : Source extends AttrSource
      ? AttributeConverter
      : unknown;

type ElementConverter<El extends Element> =
  // It is allowed to use `String` or `Number` and these are supported built-ins.
  // However, including them in this union results in
  // `(value: any) => string | (el: El) => unknown`.
  // This breaks type inference, since it resolves to `(value: any) => unknown`
  // so explicitly authored lambdas can't infer `El`.
  // | StringConstructor
  // | NumberConstructor
  | (new () => HTMLElement)
  | ((el: El) => unknown);

type AttributeConverter =
  // It is allowed to use `String` or `Number` and these are supported built-ins.
  // However, including them in this union results in
  // `(value: any) => string | (el: El) => unknown`.
  // This breaks type inference, since it resolves to `(value: any) => unknown`
  // so explicitly authored lambdas can't infer `El`.
  // | StringConstructor
  // | NumberConstructor
  | ((attr: string) => unknown);

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

export function live<
  Selector extends string,
  Source extends HydrateSource = ElementSource
>(
  selector: Selector,
  type: HydrateType<Source, QueriedElement<Selector>> = HTMLElement as any,
  source: Source = element as Source,
): PropertyDecorator {
  const hydrateDecorator = hydrate(selector, type, source);
  const bindDecorator = bind(selector, source);
  
  // Note: This is called *once per `@live()` usage in a class definition*, not *once per instantiated object*.
  return (target: Object, propertyKey: string | symbol) => {
    // Compose the `@hydrate()` and `@bind()` decorators.
    hydrateDecorator(target, propertyKey);
    bindDecorator(target, propertyKey);
  };
}

export function bind(
  selector: string,
  source: HydrateSource = element,
): PropertyDecorator {
  // Note: This is called *once per `@bind()` usage in a class definition*, not *once per instantiated object*.
  return (target: Object, propertyKey: string | symbol): void => {
    // `target` is actually the prototype of the `HydratableElement` subclass (`MyCounter.prototype`).
    // For some reason this apparently passes an `instanceof HydratableElement` check?
    // https://twitter.com/develwoutacause/status/1554656153497243648?s=20&t=xkluFM0LUyzrh_YRUXLOfQ
    if (!(target instanceof HydratableElement)) {
      throw new Error(`Can only define \`@property\` on \`HydratableElement\`, but got \`${target.constructor.name}\`.`);
    }

    const setter = getSetter(source);
    Object.defineProperty(target, propertyKey, {
      get: function(): unknown {
        return (propertyMap.get(this) ?? {})[propertyKey];
      },
      set: function(value: unknown): void {
        if (!propertyMap.has(this)) propertyMap.set(this, {});
        (propertyMap.get(this) as any)[propertyKey] = value;

        const el = query(this, selector);
        const content = safeToString(value);
        setter(el, content);
      },
    });
  };
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

type HydrateSetter = (el: HTMLElement, content: string) => void;

function getSetter(source: HydrateSource): HydrateSetter {
  switch (source.kind) {
    case 'element': return (el, content) => { el.textContent = content; };
    case 'attr': return (el, content) => { el.setAttribute(source.name, content); };
    default: assertNever(source);
  }
}

/**
 * Map of `HydratableElement` subclasses (not instances) to the set of `@hydrate()`
 * metadata containing information on how to hydrate each property.
 */
const hydrateMap = new WeakMap<Class<HydratableElement>, Set<HydrateMetadata>>();

export function hydrate<
  Selector extends string,
  Source extends HydrateSource = ElementSource
>(
  selector: Selector,
  type: HydrateType<Source, QueriedElement<Selector>> = HTMLElement as any,
  source: Source = element as Source,
): PropertyDecorator {
  return (target: Object, propertyKey: string | symbol): void => {
    // `target` is actually the prototype of the `HydratableElement` subclass (`MyCounter.prototype`).
    // For some reason this apparently passes an `instanceof HydratableElement` check?
    // https://twitter.com/develwoutacause/status/1554656153497243648?s=20&t=xkluFM0LUyzrh_YRUXLOfQ
    if (!(target instanceof HydratableElement)) {
      throw new Error(`Can only define \`@hydrate\` on \`HydratableElement\`, but got \`${target.constructor.name}\`.`);
    }
    const clazz = target.constructor as unknown as Class<HydratableElement>;

    const metaSet = hydrateMap.get(clazz) ?? new Set<HydrateMetadata>();
    hydrateMap.set(clazz, metaSet);

    const coerce = getCoercer(type);
    const meta = { prop: propertyKey, selector, coerce, source } as HydrateMetadata;
    metaSet.add(meta);
  };
}

const propertyMap = new WeakMap<object /* host */, Record<string | symbol /* prop */, unknown /* value */>>();
// Note: This is called *once per `@property` usage in a class definition*, not *once per instantiated object*.
export const property: PropertyDecorator =
    (target: Object, propertyKey: string | symbol): void => {
  // `target` is actually the prototype of the `HydratableElement` subclass (`MyCounter.prototype`).
  // For some reason this apparently passes an `instanceof HydratableElement` check?
  // https://twitter.com/develwoutacause/status/1554656153497243648?s=20&t=xkluFM0LUyzrh_YRUXLOfQ
  if (!(target instanceof HydratableElement)) {
    throw new Error(`Can only define \`@property\` on \`HydratableElement\`, but got \`${target.constructor.name}\`.`);
  }

  Object.defineProperty(target, propertyKey, {
    get: function(): unknown {
      return (propertyMap.get(this) ?? {})[propertyKey];
    },
    set: function(value: unknown): void {
      if (!propertyMap.has(this)) propertyMap.set(this, {});
      (propertyMap.get(this) as any)[propertyKey] = value;
      scheduleUpdate(this);
    },
  });
};

const scheduledComponents = new WeakSet<HydratableElement>();
async function scheduleUpdate<El extends HydratableElement>(
  target: El,
  updater?: (el: El) => void,
): Promise<void> {
  // TODO: Should we fail if the user modifies an `@property` before the component is
  // hydrated?
  if (!target.hydrated) return;

  if (scheduledComponents.has(target)) return; // Already scheduled, do nothing.
  scheduledComponents.add(target);

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => { resolve(); });
  });
  if (updater) {
    updater(target);
  } else {
    (target as any).update();
  }
  // Definitely not property renaming compatible.
  scheduledComponents.delete(target);
}

function query(el: HydratableElement, selector: string): HTMLElement {
  if (selector === ':host') return el;
  return el.shadowRoot!.querySelector(selector)!;
}

interface RegisteredContext<T> {
  ctx: Context<T>;
  property: string | symbol;
  timeout?: Timeout;
}

/**
 * Map of `HydratableElement` subclasses (not instances) to their registered
 * `@context()` invocations.
 */
const ctxRegistrationMap = new WeakMap<
  Class<HydratableElement>,
  Set<RegisteredContext<unknown>>
>();

/** Decorator to register a given property to receive a value from context. */
export function context<T>(ctx: Context<T>, timeout?: Timeout): PropertyDecorator {
  return (target: Object, property: string | symbol): void => {
    // `target` is actually the prototype of the `HydratableElement` subclass (`MyCounter.prototype`).
    // For some reason this apparently passes an `instanceof HydratableElement` check?
    // https://twitter.com/develwoutacause/status/1554656153497243648?s=20&t=xkluFM0LUyzrh_YRUXLOfQ
    if (!(target instanceof HydratableElement)) {
      throw new Error(`Can only define \`@context\` on \`HydratableElement\`, but got \`${target.constructor.name}\`.`);
    }
    const clazz = target.constructor as unknown as Class<HydratableElement>;

    // Add it to the registration map.
    const registeredCtxs = ctxRegistrationMap.get(clazz)
        ?? new Set<RegisteredContext<unknown>>();
    ctxRegistrationMap.set(clazz, registeredCtxs);
    registeredCtxs.add({ ctx, property, timeout });
  }
}

/**
 * Map of `HydratableElement` instances to a map of their `@context()` properties
 * mapped to their current value.
 */
const provideMap = new WeakMap<
  HydratableElement,
  Map<string | symbol /* property */, unknown /* value */>
>();
export function provide<T>(context: Context<T>): PropertyDecorator {
  return (target: Object, property: string | symbol): void => {
    // `target` is actually the prototype of the `HydratableElement` subclass (`MyCounter.prototype`).
    // For some reason this apparently passes an `instanceof HydratableElement` check?
    // https://twitter.com/develwoutacause/status/1554656153497243648?s=20&t=xkluFM0LUyzrh_YRUXLOfQ
    if (!(target instanceof HydratableElement)) {
      throw new Error(`Can only define \`@context\` on \`HydratableElement\`, but got \`${target.constructor.name}\`.`);
    }

    // Define the `@context()` property to proxy its value in the global map.
    // The setter implements a side effect of providing the value as context.
    Object.defineProperty(target, property, {
      get: function(): T {
        return (provideMap.get(this) ?? new Map<string, unknown>()).get(property) as T;
      },
      set: function(value: T): void {
        // Update existing value in the global map.
        const providerMap = provideMap.get(this) ?? new Map<string, unknown>();
        provideMap.set(this, providerMap);
        providerMap.set(property, value);

        // Side effect: Provide this value as context to all descendants of the element.
        ctx.provide(this, context, value);
      },
    });
  }
}

export abstract class HydratableElement extends HTMLElement {
  public hydrated = false;
  private contextBindings: ContextBinding<unknown>[] = [];
  private eventBindings = [] as EventBinding[];

  connectedCallback(): void {
    if (!this.hasAttribute('defer-hydration')) {
      // Immediately hydrate.
      this.requestHydration();
    }

    // Bind event listeners from previous hydration, whether that just happened
    // or happened the previous time this component has connected to the DOM.
    for (const { target, event, cb, options } of this.eventBindings) {
      target.addEventListener(event, cb, options);
    }

    // Bind context listeners.
    for (const binding of this.contextBindings) {
      const stopListening = ctx.listen(this, binding.ctx, (value) => {
        (this as any)[binding.property] = value;
      });
      binding.stopListening = stopListening;
    }
  }

  disconnectedCallback(): void {
    // Unbind event listeners found during user hydration.
    for (const { target, event, cb, options } of this.eventBindings) {
      target.removeEventListener(event, cb, options);
    }

    // Unbind context listeners.
    for (const binding of this.contextBindings) {
      if (!binding.stopListening) throw new Error(`No \`stopListening\` property for context \`${binding.ctx.name.toString()}\`.`);

      binding.stopListening();
      binding.stopListening = undefined;
    }
  }

  static get observedAttributes() { return [ 'defer-hydration' ]; }
  attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null): void {
    // Ignore anything that isn't a removal of `defer-hydration`.
    if (name !== 'defer-hydration' || newValue !== null) return;

    // Ignore removal of `defer-hydration` when disconnected, because we don't support
    // hydration when disconnected from the DOM. Hydration will be triggered by
    // `connectedCallback()` when the element is attached.
    if (!this.isConnected) return;

    // Synchronously hydrate.
    this.requestHydration();

    // Bind event listeners from previous hydration.
    if (this.isConnected) {
      for (const { target, event, cb, options } of this.eventBindings) {
        target.addEventListener(event, cb, options);
      }
    }
  }

  private requestHydration(): void {
    // We disallow disconnected hydrations because it's never done in the context of
    // `Hydrator`, it's value is questionable at best, the contract for user code is
    // confusing, and the interplay with `@context()` timeout is confusing.
    if (!this.isConnected) throw new Error(`Can't hydrate unless connected to the DOM.`);

    // Only hydrate once at most.
    if (this.hydrated) return;

    // Force children to hydrate before hydrating this element.
    const deferredShadowChildren = this.shadowRoot!.querySelectorAll('[defer-hydration]');
    const deferredLightChildren = this.querySelectorAll('[defer-hydration]');
    for (const child of [ ...deferredShadowChildren, ...deferredLightChildren ]) {
      child.removeAttribute('defer-hydration');
    }

    const clazz = this.constructor as Class<HydratableElement>;

    // Initialize `@hydrate` properties.
    const metaSet = hydrateMap.get(clazz) ?? new Set<HydrateMetadata>();
    for (const { prop, selector, coerce, source } of metaSet) {
      const el = query(this, selector);
      const content = getSource(el, source);
      const value = coerce(content);
      (this as any)[prop] = value;
    }

    // Bind `@context()` properties.
    const ctxBindings = ctxRegistrationMap.get(clazz)
        ?? new Set<RegisteredContext<unknown>>();
    for (const { ctx: context, property, timeout } of ctxBindings) {
      // Set the property if context already exists.
      const currentCtxResult = ctx.peek(this, context);
      if (currentCtxResult.success) (this as any)[property] = currentCtxResult.value;

      // Start listening for any changes to the context.
      let receivedContext = false;
      const stopListening = ctx.listen(this, context, (value) => {
        (this as any)[property] = value;
        receivedContext = true;
      });

      // Recording the context binding so it can be paused and restarted when the
      // component is disconnected and reconnected to the DOM.
      this.contextBindings.push({ ctx: context, property, stopListening });

      // Start a timeout to emit an error if context is not provided in time.
      getTimeout(timeout ?? 'task').then(() => {
        if (receivedContext) return; // Context was provided, no issues.

        stopListening();
        console.error(`\`@context()\` for context \`${
            context.name.toString()}\` was not provided before the timeout.`);
      });
    }

    // Invoke one-time user hydration logic.
    try {
      this.hydrate();
    } finally {
      // Don't hydrate again, even if disconnected and reconnected to the DOM.
      this.hydrated = true;
    }
  }

  /**
   * Called once just before the first update. It's an opportunity to do one-time
   * hydration work such as rendering additional content only possible on the client.
   * TODO: Is "hydration" a synchronous operation?
   */
  protected hydrate() { /* Empty body by default */ }

  /**
   * Called shortly after an `@property` value is modified. It's an opportunity to
   * update the existing DOM with any new changes.
   */
  protected update() { /* Empty body by default */ };

  protected query<Selector extends string>(selector: Selector):
      QueriedElement<Selector> {
    const el = this.shadowRoot!.querySelector(selector) as QueriedElement<Selector> | null;
    if (!el) throw new Error(`Selector \`${selector}\` not in shadow DOM.`);

    return el;
  }

  protected queryAll<Selector extends string>(selector: Selector):
      Array<QueriedElement<Selector>> {
    const els = this.shadowRoot!.querySelectorAll(selector) as NodeListOf<QueriedElement<Selector>>;
    if (els.length === 0) throw new Error(`Selector \`${selector}\` not in shadow DOM.`);

    return Array.from(els);
  }

  protected listen(
    target: EventTarget,
    event: string,
    cb: (evt: Event) => void,
    options?: boolean | AddEventListenerOptions,
  ): void {
    if (this.hydrated) throw new Error('Already hydrated, too late to bind a new listener.');

    this.eventBindings.push({ target: target, event, cb, options });
  }
}

interface EventBinding {
  target: EventTarget;
  event: string;
  cb: (evt: Event) => void;
  options?: boolean | AddEventListenerOptions;
}

interface ContextBinding<T> {
  ctx: Context<T>,
  property: string | symbol;
  stopListening?: () => void;
}

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

function coerceToString(content: HydrateContent): string | undefined {
  if (content instanceof Element) {
    return content.textContent!;
  } else {
    return content; // TODO: `undefined`?
  }
}
function coerceToNumber(content: HydrateContent): number | undefined {
  const str = content instanceof Element ? content.textContent! : content;
  return Number(str); // TODO: `undefined`?
}
function assertElement(
  content: HydrateContent,
  type: HydrateType<HydrateSource, Element>,
): Element {
  if (!(content instanceof Element)) {
    throw new Error(`Expected an element of type ${type}, but got a \`string\`. Are you reading from an attribute but expecting an element?`);
  }

  if (!(content instanceof type)) {
    throw new Error(`Expected an element of type ${type}, but got an element of type ${
        content.constructor.name}`);
  }

  return content;
}

function getCoercer<Source extends HydrateSource, El extends Element>(
  type: HydrateType<Source, El>,
): Coercer<unknown> {
  if (type === String) {
    return coerceToString;
  } else if (type === Number) {
    return coerceToNumber;
  } else if (classExtends(type as Class<unknown>, HTMLElement)) {
    return (content) => assertElement(content, type as (el: Element) => unknown);
  } else {
    return type as Coercer<unknown>;
  }
}

type Class<T> = new (...args: unknown[]) => T;
function classExtends(child: Class<unknown>, parent: Class<unknown>): boolean {
  for (const prototype of prototypeChain(child)) {
    if (prototype === parent) return true;
  }
  return false;
}

function* prototypeChain(obj: object): Generator<object, void, void> {
  yield obj;
  const proto = Object.getPrototypeOf(obj);
  if (proto !== null) yield* prototypeChain(proto);
}

function assertNever(value: never): never {
  throw new Error(`Unexpected call to \`assertNever()\` with value: ${value}`);
}

function getTimeout(timeout: Timeout): Promise<void> {
  switch (timeout) {
    case 'task':
      return new Promise<void>((resolve) => {
        queueMicrotask(() => { resolve(); });
      });
    case 'forever':
      return new Promise<void>(() => {});
    default:
      return new Promise<void>((resolve) => {
        setTimeout(() => { resolve(); }, timeout);
      });
  }
}
