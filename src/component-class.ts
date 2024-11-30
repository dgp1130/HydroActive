import { Connector, OnConnect } from './connectable.js';
import { ElementAccessor } from './element-accessor.js';
import { HydroActiveComponent } from './hydroactive-component.js';
import { ReactiveValue } from './reactive-value.js';
import { SignalComponentAccessor } from './signal-component-accessor.js';
import { isPropertySignal } from './signals/property.js';
import { ReactiveRootImpl } from './signals/reactive-root.js';
import { Class } from './utils/types.js';

/** TODO */
const propertyMap = new WeakMap<Component, ReadonlyMap<string | symbol, Descriptor<unknown>>>();

export function define<
  TagName extends string,
  Clazz extends Class<Component>,
>(tagName: TagName, clazz: Clazz): Clazz & {
  new(): InstanceType<Clazz> & { tagName: Uppercase<TagName> },
} {
  customElements.define(tagName, clazz);

  // TODO: Set class name?

  return clazz as any;
}

// TODO: Memory leak?
/** TODO */
export abstract class Component<TagName extends string = string>
    extends HydroActiveComponent {
  declare tagName: Uppercase<TagName>;

  readonly #host = SignalComponentAccessor.fromSignalComponent(
    this,
    ReactiveRootImpl.from(
      Connector.from(() => this.isConnected),
      this._tracker,
      this._defaultScheduler,
    ),
  );
  protected get host(): SignalComponentAccessor<this> {
    if (!this.#hydrated) {
      throw new Error('Cannot read `host` until component is hydrated. If this expression is in a class field initializer, you likely want to use `defer(() => /* ... */)` to delay execution until hydration-time.');
    }

    return this.#host;
  }

  #componentHostInternal?: ComponentHost;
  get #componentHost(): ComponentHost {
    if (!this.#componentHostInternal) {
      this.#componentHostInternal = Object.freeze({
        ref: this.#host,
        connected: this.#host.connected.bind(this.#host),
      });
    }

    return this.#componentHostInternal;
  }

  #hydrated = false;
  protected override hydrate(): void {
    this.#hydrated = true;
    const componentHost = this.#componentHost;

    const descriptors = new Map(Array.from(this.#propertyFactories.entries())
      .map(([ propName, factory ]) => [
        propName,
        factory(componentHost),
      ]));
    propertyMap.set(this, descriptors);

    for (const callback of this.#hydrationCallbacks) {
      callback();
      this.#hydrationCallbacks.delete(callback);
    }

    this.onHydrate();
  }

  protected onHydrate(): void {}

  protected use<Factory extends PropertyFactory<any>>(
    factory: Factory,
  ): NormalizePropertyDescriptor<ReturnType<Factory>> {
    return normalizeDescriptor(factory(this.#componentHost)) as any;
  }

  // TODO: `static` per component?
  #propertyFactories = new Map<string | symbol, PropertyFactory<unknown>>();
  public _registerPropertyFactory(
    propName: string | symbol,
    factory: PropertyFactory<unknown>,
  ): void {
    this.#propertyFactories.set(propName, factory);
  }

  #hydrationCallbacks = new Set<() => void>;
  public _registerHydrationCallback(callback: () => void): void {
    if (this.#hydrated) throw new Error('Already hydrated');

    this.#hydrationCallbacks.add(callback);
  }
}

export type Initializer<Result> = (host: ComponentHost) => Result;
export interface ComponentHost {
  readonly ref: SignalComponentAccessor<HydroActiveComponent>;
  connected(onConnect: OnConnect): void;
}

type PropertyDecorator<Comp extends Component, Value> = (
  target: ClassAccessorDecoratorTarget<Comp, Value>,
  context: ClassAccessorDecoratorContext<Comp, Value>,
) => ClassAccessorDecoratorResult<Comp, Value> | void;

type ClassDecorator<
  Input extends Class<unknown>,
  Output extends Class<unknown>,
> = (
  clazz: Input,
  context: ClassDecoratorContext<Input>,
) => Output;

export function customElement<
  Clazz extends Class<HTMLElement>,
  TagName extends string,
>(tagName: TagName): ClassDecorator<
  Clazz,
  Clazz & { new (): InstanceType<Clazz> & { tagName: Uppercase<TagName> } }
> {
  return (clazz) => {
    customElements.define(tagName, clazz);
    return clazz as any;
  };
}

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

export function required(): PropertyDecorator<Component, any> {
  return (target, ctx) => {
    let hasBeenSet = false;
    ctx.addInitializer(function () {
      // TODO: Is this a good idea?
      if (!this.hasAttribute('defer-hydration')) {
        throw new Error('Cannot use `@required()` without `defer-hydration`.');
      }

      this._registerHydrationCallback(() => {
        // We use an independent boolean rather than `value === undefined`
        // because the property could be directly assigned to `undefined`, which
        // would count as setting a value.
        if (!hasBeenSet) {
          throw new Error(`Required property \`${ctx.name.toString()}\` has not been set.`);
        }
      });
    });

    return {
      init(v: unknown): unknown {
        // Throw an error when `@required()` is given an initial value:
        // `@required() foo = 'test';`
        // As this indicates a logical error, there is no need for `@required()`.
        //
        // Exception: Signal properties / reactive values are proxies of signals
        // and do not actually provide a default value, therefore they are
        // exempted.
        // `@required() foo = propFromSignal(this.#foo);`
        if (v !== undefined && !isPropertySignal(v) && !(v instanceof ReactiveValue)) {
          throw new Error(`\`@required()\` was attached to a property (\`${ctx.name.toString()}\`) with an initializer, implying it is not required. Either remove the initializer or remove the \`@required()\`.`);
        }

        return v;
      },

      set(v: unknown) {
        hasBeenSet = true;
        target.set.call(this, v);
      },
    };
  };
}

// TODO: Should this be a field decorator? Would that be more generic and avoid
// an `accessor` requirement.
/** TODO */
export function query<
  Comp extends Component,
  El extends Element,
>(selector: string, clazz: Class<El>):
    PropertyDecorator<Comp, ElementAccessor<El>> {
  return use((host) => ({ value: host.ref.query(selector).access(clazz) }));
}

/** TODO */
export function access<Comp extends Component>(selector: string):
    PropertyDecorator<Comp, ElementAccessor<Element>> {
  return use((host) => ({ value: host.ref.query(selector).access() }));
}

/** TODO */
export function hydrate<Comp extends Component, El extends Element>(
  selector: string,
  clazz: Class<El>,
): PropertyDecorator<Comp, El> {
  return use((host) => ({ value: host.ref.query(selector).hydrate(clazz, {}).element }));
}

export type Descriptor<Value> = ProxyDescriptor<Value> | ValueDescriptor<Value>;

export interface ProxyDescriptor<in out Value> {
  get(): Value;
  set(value: Value): void;
}

export interface ValueDescriptor<Value> {
  value: Value;
}

export type PropertyFactory<Value> = (host: ComponentHost) => Descriptor<Value>;

export function use<Comp extends Component, Result>(
  propertyFactory: PropertyFactory<Result>,
): PropertyDecorator<Comp, Result> {
  return (_target, ctx) => {
    ctx.addInitializer(function (): void {
      this._registerPropertyFactory(
        ctx.name,
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
