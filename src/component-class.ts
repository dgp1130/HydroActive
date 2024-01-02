import { OnConnect } from './component-ref.js';
import { ElementRef } from './element-ref.js';
import { HydroActiveComponent } from './hydroactive-component.js';
import { QueriedElement } from './query.js';
import { SerializerToken, inferSerializer, resolveSerializer } from './serializer-tokens.js';
import { Scheduler, Signal } from './signals.js';

/** TODO */
const propertyMap = new WeakMap<Component, ReadonlyMap<
  string | symbol,
  Descriptor<unknown>
>>();

/** TODO */
export abstract class Component<State extends {} = {}>
    extends HydroActiveComponent {
  #state: State | undefined;
  protected get state(): State {
    if (!this.#doneHydrating) {
      throw new Error('`state` is not accessible during hydration.');
    }

    return this.#state!;
  }
  private set state(newState: State) {
    // Wrap `state` in a `Proxy` which automatically requests a component update
    // whenever any property is set.
    this.#state = new Proxy(newState, {
      set: (
        target: State,
        prop: string | symbol,
        newValue: any,
        receiver: any,
      ): boolean => {
        const result = Reflect.set(target, prop, newValue, receiver);
        this.requestUpdate();
        return result;
      },
    });
  }

  protected get props(): Record<string, Signal<unknown>> {
    return new Proxy(this, {
      get(target: Component<State>, prop: string | symbol): Signal<unknown> {
        const propName = typeof prop === 'symbol' ? prop.description : prop;
        const internalProp = `_${propName}`;
        return (target as any)[internalProp];
      }
    }) as unknown as Record<string, Signal<unknown>>;
  }

  #updateScheduled = false;
  protected requestUpdate(): void {
    if (this.#updateScheduled) return;

    this.comp.schedule(() => {
      this.update();
      this.#updateScheduled = false;
    });
    this.#updateScheduled = true;
  }

  #componentHostInternal?: ComponentHost;
  get #componentHost(): ComponentHost {
    if (!this.#componentHostInternal) {
      this.#componentHostInternal = Object.freeze({
        ref: this.ref as ElementRef<Component>,
        connected: this.comp.connected.bind(this.comp),
        requestUpdate: this.requestUpdate.bind(this),
        schedule: this.comp.schedule.bind(this.comp),
      });
    }

    return this.#componentHostInternal;
  }

  #doneHydrating = false;
  protected override hydrate(): void {
    const componentHost = this.#componentHost;

    const descriptors = new Map(Array.from(this.#propertyFactories.entries())
      .map(([ propName, { ctx, factory } ]) => [
        propName,
        factory(componentHost, ctx),
      ]));
    propertyMap.set(this, descriptors);

    this.state = this.onHydrate() ?? ({} as State);
    this.#doneHydrating = true;
  }

  // TODO: Disallow `void` and require implementation when `State` is defined.
  protected onHydrate(): State | void {}

  protected abstract update(): void;

  protected use<Factory extends PropertyFactory<any>>(
    factory: Factory,
  ): NormalizePropertyDescriptor<ReturnType<Factory>> {
    return normalizeDescriptor(factory(this.#componentHost)) as any;
  }

  // TODO: `static` per component?
  #propertyFactories = new Map<string | symbol, {
    ctx: ClassAccessorDecoratorContext,
    factory: PropertyFactory<unknown>,
  }>();
  public _registerPropertyFactory(
    ctx: ClassAccessorDecoratorContext,
    factory: PropertyFactory<unknown>,
  ): void {
    this.#propertyFactories.set(ctx.name, { ctx, factory });
  }
}

export type Initializer<Result> = (host: ComponentHost) => Result;
export interface ComponentHost {
  readonly ref: ElementRef<Component>;
  connected(onConnect: OnConnect): void;
  requestUpdate(): void;
  schedule(callback: () => void): void;
}

type PropertyDecorator<Comp extends Component, Value> = (
  target: ClassAccessorDecoratorTarget<Comp, Value>,
  context: ClassAccessorDecoratorContext<Comp, Value>,
) => ClassAccessorDecoratorResult<Comp, Value> | void;

// TODO: Is this too smart for its own good? Not possible at runtime to
// distinguish a `ProxyDescriptor` from a `Value` which happens to be
// `{ get: () => {}, set: () => {} }`.
type NormalizePropertyDescriptor<Desc extends Descriptor<unknown>> =
  Desc extends ValueDescriptor<infer Result>
    ? Result
    : Desc extends ProxyDescriptor<any>
      ? Desc
      : unknown | ProxyDescriptor<any>;

function normalizeDescriptor<Value>(descriptor: Descriptor<Value>):
    Value | ProxyDescriptor<Value> {
  if ('value' in descriptor) {
    return descriptor.value;
  } else {
    return descriptor;
  }
}

// TODO: Does `accessor` correctly initialize in TypeScript? Seems to not
// delete the existing property value on component upgrade, which is
// inconsistent.
/** TODO */
export function property<Comp extends Component>(): PropertyDecorator<Comp, any> {
  return (_target, ctx) => {
    let comp: Comp;
    ctx.addInitializer(function () { comp = this; });
    let value: unknown;

    return {
      init(v): unknown {
        value = v;
        return value;
      },

      get(): unknown {
        return value;
      },

      set(v: unknown): void {
        value = v;
        (comp as any).requestUpdate();
      },
    };
  };
}

// TODO: Should this be a field decorator? Would that be more generic and avoid
// an `accessor` requirement.
/** TODO */
export function query<Comp extends Component>(selector: string):
    PropertyDecorator<Comp, ElementRef<any>> {
  return use((host) => ({ value: host.ref.query(selector) }));
}

export type Descriptor<Value> = ProxyDescriptor<Value> | ValueDescriptor<Value>;

export interface ProxyDescriptor<in out Value> {
  get(): Value;
  set(value: Value): void;
}

export interface ValueDescriptor<Value> {
  value: Value;
}

export type PropertyFactory<Value> = (
  host: ComponentHost,
  ctx?: ClassAccessorDecoratorContext,
) => Descriptor<Value>;

export function use<Comp extends Component, Result>(
  propertyFactory: PropertyFactory<Result>,
): PropertyDecorator<Comp, Result> {
  return (_target, ctx) => {
    ctx.addInitializer(function (): void {
      this._registerPropertyFactory(
        ctx,
        propertyFactory as PropertyFactory<unknown>,
      );
    });

    function getProperty(comp: Comp): Descriptor<Result> {
      const properties = propertyMap.get(comp);
      if (!properties) throw new Error('TODO');

      const property = properties.get(ctx.name);
      if (!property) throw new Error('TODO');

      return property as Descriptor<Result>;
    }

    return {
      init(value): Result {
        if (value !== undefined) throw new Error('Cannot initialize.');
        return undefined as never;
      },

      get: function (this: Comp): Result {
        const prop = getProperty(this);

        if ('value' in prop) {
          return prop.value;
        } else {
          return prop.get();
        }
      },

      set: function (this: Comp, value: Result): void {
        const prop = getProperty(this);
        if (!('set' in prop)) throw new Error('TODO Cannot set value-only property');

        prop.set(value);
      },
    };
  };
}

export function bind<SelectorOrElement extends string | ElementRef<Element>>(
  selectorOrElement: SelectorOrElement,
  token?: SerializerToken<ElementOf<SelectorOrElement>>,
): PropertyDecorator<Component, any> {
  return (_target, ctx) => {
    // const el = selectorOrElement instanceof ElementRef
    //   ? selectorOrElement
    //   : host.ref.query(selectorOrElement);

    // const explicitSerializer = token ? resolveSerializer(token) : undefined;

    return {
      get: function (): unknown {
        return ctx!.access.get(this);
      },

      set: function (value: unknown): void {
        ctx!.access.set(this, value);
        // host.schedule(() => {
        //   const serializer = explicitSerializer ?? inferSerializer(value);
        //   (el as any).write(value, serializer);
        // });
      },
    };
  };
}

/**
 * Resolves an `ElementRef` or a selector string literal to the type of the
 * referenced element.
 */
type ElementOf<ElementOrSelector extends ElementRef<Element> | string> =
  ElementOrSelector extends ElementRef<infer El>
    ? El
    : ElementOrSelector extends string
      ? QueriedElement<ElementOrSelector>
      : Element
;
