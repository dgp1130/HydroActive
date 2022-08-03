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

type InstanceOf<Type extends HydrateType> =
  Type extends NumberConstructor
    ? number
    : Type extends StringConstructor
      ? string
      : Type extends new () => infer Result
        ? Result
        : never;

const initMap = new WeakMap<object /* host */, Map<symbol, InitMetadata>>();
export function init<Type extends HydrateType>(
  self: HydratableElement,
  selector: string,
  type: Type,
  source: HydrateSource = element,
): InstanceOf<Type> {
  if (!initMap.has(self)) {
    initMap.set(self, new Map<symbol, InitMetadata>);
  }
  const placeholderMap = initMap.get(self)!;

  const placeholder = Symbol('uninitialized');
  const coerce = getCoercer(type);
  const meta = { selector, coerce, source } as InitMetadata;

  placeholderMap.set(placeholder, meta);

  // Lie about the return type.
  return placeholder as unknown as InstanceOf<Type>;
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

export function idom<El extends HydratableElement>(updater: (el: El) => void) {
  return (target: any, propertyKey: string) => {
    // `target` is actually the prototype of the `HydratableElement` subclass (`MyCounter.prototype`).
    // For some reason this apparently passes an `instanceof HydratableElement` check?
    // https://twitter.com/develwoutacause/status/1554656153497243648?s=20&t=xkluFM0LUyzrh_YRUXLOfQ
    if (!(target instanceof HydratableElement)) {
      throw new Error(`Can only define \`@idom\` on \`HydratableElement\`, but got \`${target.constructor.name}\`.`);
    }

    Object.defineProperty(target, propertyKey, {
      get: function(): unknown {
        return (propertyMap.get(this) ?? {})[propertyKey];
      },
      set: function(value: unknown): void {
        if (!propertyMap.has(this)) propertyMap.set(this, {});
        (propertyMap.get(this) as any)[propertyKey] = value;
        scheduleUpdate(this as El /* TODO: unsafe */, updater);
      },
    });
  }
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
    for (const { el, event, cb } of this.eventBindings) {
      el.addEventListener(event, cb);
    }
  }

  disconnectedCallback(): void {
    // Unbind event listeners found during user hydration.
    for (const { el, event, cb } of this.eventBindings) {
      el.removeEventListener(event, cb);
    }
  }

  static get observedAttributes() { return [ 'defer-hydration' ]; }
  attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null): void {
    // Ignore anything that isn't a removal of `defer-hydration`.
    if (name !== 'defer-hydration' || newValue !== null) return;

    // Synchronously hydrate.
    this.requestHydration();

    // Bind event listeners from previous hydration.
    for (const { el, event, cb } of this.eventBindings) {
      el.addEventListener(event, cb);
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

    // Initialize `init()` properties.
    const placeholderMap = initMap.get(this) ?? new Map<symbol, InitMetadata>();
    for (const proto of prototypeChain(this)) {
      for (const prop in Object.getOwnPropertyDescriptors(proto)) {
        const possiblePlaceholder = (this as any)[prop];
        const initMeta = placeholderMap.get(possiblePlaceholder);
        if (!initMeta) continue;

        const { selector, coerce, source } = initMeta;
        const el = query(this, selector);
        const content = getSource(el, source);
        const value = coerce(content);
        (this as any)[prop] = value;

        if (value instanceof Element) {
          childElements.push(value);
        }
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
  protected bind(selector: string, event: string, cb: (evt: Event) => void): void {
    if (this.hydrated) throw new Error('Already hydrated, too late to bind.');
    const el = this.shadowRoot!.querySelector(selector)!;
    this.eventBindings.push({ el, event, cb });
  }
}

interface EventBinding {
  el: Element;
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
