import 'reflect-metadata';

const hydrateKey = Symbol('hydrate');

interface HydrateMetadata {
  prop: string;
  selector: string;
  coerce: Coercer<unknown>,
  source: HydrateSource,
}

type HydrateType = typeof String | typeof Number | (new () => HTMLElement);

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

export function live(selector: string, type: HydrateType = HTMLElement, source: HydrateSource = element) {
  const hydrateDecorator = hydrate(selector, type, source);
  const bindDecorator = bind(selector, source);
  
  // Note: This is called *once per `@live()` usage in a class definition*, not *once per instantiated object*.
  return (target: any, propertyKey: string) => {
    // Compose the `@hydrate()` and `@bind()` decorators.
    hydrateDecorator(target, propertyKey);
    bindDecorator(target, propertyKey);
  };
}

export function bind(selector: string, source: HydrateSource = element) {
  // Note: This is called *once per `@bind()` usage in a class definition*, not *once per instantiated object*.
  return (target: any, propertyKey: string) => {
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

export function hydrate(
  selector: string,
  type: HydrateType = HTMLElement,
  source: HydrateSource = element,
) {
  return (target: any, propertyKey: string) => {
    let metaList = Reflect.getMetadata(hydrateKey, target);
    if (!metaList) {
        metaList = [];
        Reflect.defineMetadata(hydrateKey, metaList, target);
    }

    const coerce = getCoercer(type);
    const meta = { prop: propertyKey, selector, coerce, source } as HydrateMetadata;
    metaList.push(meta);
  };
}

interface InitMetadata {
  selector: string;
  coerce: Coercer<unknown>;
  source: HydrateSource;
}

const propertyMap = new WeakMap<object /* host */, Record<string /* prop */, unknown /* value */>>();
// Note: This is called *once per `@property` usage in a class definition*, not *once per instantiated object*.
export function property(target: any, propertyKey: string): void {
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
}

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

function* prototypeChain(obj: object): Generator<object, void, void> {
  yield obj;
  const proto = Object.getPrototypeOf(obj);
  if (proto !== null) yield* prototypeChain(proto);
}

export abstract class HydratableElement extends HTMLElement {
  public hydrated = false;

  // TODO: Can't put event listeners in `connectedCallback()` because `defer-hydration`
  // may defer until later.
  connectedCallback(): void {
    if (!this.hasAttribute('defer-hydration')) {
      // Immediately hydrate.
      this.requestHydration();
    }

    // Bind event listeners from previous hydration, whether that just happened
    // or happened the previous time this component has connected to the DOM.
    for (const { elements, event, cb } of this.eventBindings) {
      for (const element of elements) {
        element.addEventListener(event, cb);
      }
    }
  }

  disconnectedCallback(): void {
    // Unbind event listeners found during user hydration.
    for (const { elements, event, cb } of this.eventBindings) {
      for (const element of elements) {
        element.removeEventListener(event, cb);
      }
    }
  }

  static get observedAttributes() { return [ 'defer-hydration' ]; }
  attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null): void {
    // Ignore anything that isn't a removal of `defer-hydration`.
    if (name !== 'defer-hydration' || newValue !== null) return;

    // Synchronously hydrate.
    this.requestHydration();

    // Bind event listeners from previous hydration.
    for (const { elements, event, cb } of this.eventBindings) {
      for (const element of elements) {
        element.addEventListener(event, cb);
      }
    }
  }

  private requestHydration(): void {
    // Only hydrate once at most.
    if (this.hydrated) return;

    const childElements = [] as Element[];

    // Initialize `@hydrate` properties.
    const metaList = Reflect.getMetadata(hydrateKey, this) ?? [] as HydrateMetadata[];
    for (const { prop, selector, coerce, source } of metaList) {
      const el = query(this, selector);
      const content = getSource(el, source);
      const value = coerce(content);
      (this as any)[prop] = value;

      if (value instanceof Element) {
        childElements.push(value);
      }
    }

    for (const child of childElements) {
      child.removeAttribute('defer-hydration');
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

  private eventBindings = [] as EventBinding[];
  protected listen(selector: string, event: string, cb: (evt: Event) => void): void {
    if (this.hydrated) throw new Error('Already hydrated, too late to bind a new listener.');
    const elements = Array.from(this.shadowRoot!.querySelectorAll(selector));
    this.eventBindings.push({ elements, event, cb });
  }
}

interface EventBinding {
  elements: Element[];
  event: string;
  cb: (evt: Event) => void;
}

function getSource(el: Element, source: HydrateSource): HydrateContent {
  switch (source.kind) {
    case 'element': return el;
    case 'attr': return el.getAttribute(source.name) ?? undefined;
    default: assertNever(source);
  }
}

type HydrateContent = Element | string | undefined;
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
function assertElement(content: HydrateContent, type: HydrateType): Element {
  if (!(content instanceof Element)) {
    throw new Error(`Expected an element of type ${type}, but got a \`string\`. Are you reading from an attribute but expecting an element?`);
  }

  if (!(content instanceof type)) {
    throw new Error(`Expected an element of type ${type}, but got an element of type ${
        content.constructor.name}`);
  }

  return content;
}

function getCoercer(type: HydrateType): Coercer<unknown> {
  if (type === String) {
    return coerceToString;
  } else if (type === Number) {
    return coerceToNumber;
  } else {
    return (content) => assertElement(content, type);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unexpected call to \`assertNever()\` with value: ${value}`);
}
