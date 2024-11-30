import { Component } from 'hydroactive';
import { untracked } from './graph.js';
import { SIGNAL, SignalKind, WriteableSignal } from './types.js';
import { signal } from './signal.js';
import { HydroActiveComponent } from 'hydroactive/hydroactive-component.js';
import { fromSignal } from './reactive-value.js';

type SignalPropertyDecorator<Comp extends Component, Value> = (
  target: ClassAccessorDecoratorTarget<Comp, Value>,
  context: ClassAccessorDecoratorContext<Comp, Value>,
) => ClassAccessorDecoratorResult<Comp, Value> | void;

const componentPropertyMap = new WeakMap<
  HydroActiveComponent,
  Map<string | number | symbol, WriteableSignal<unknown>>
>();

declare global {
  var throwOnUnsetDeferRead: boolean | undefined;
}

/** TODO */
export function deferredSignal<Value>(): WriteableSignal<Value> {
  // Unsound: Sneak an `undefined` into the signal.
  const sig = signal(undefined as Value);

  let hasBeenSet = false;
  const wrapper: WriteableSignal<Value> = () => {
    // TODO: Remove global.
    const throwOnUnsetDeferRead = globalThis.throwOnUnsetDeferRead ?? true;
    if (throwOnUnsetDeferRead && !hasBeenSet) throw new Error('`deferredSignal` must be set before it is read. Was it properly initialized?');
    return sig();
  };
  wrapper.set = (val: Value) => {
    hasBeenSet = true;
    return sig.set(val);
  };
  wrapper.readonly = sig.readonly;
  wrapper[SIGNAL] = SignalKind.Deferred;

  return wrapper;
}

/** TODO */
export function propFromSignal<Value>(sig: WriteableSignal<Value>): Value {
  return fromSignal(sig) as Value;
}

/** TODO */
export function isPropertySignal(value: unknown): value is WriteableSignal<unknown> {
  return typeof value === 'function'
      && SIGNAL in value
      && value[SIGNAL] === SignalKind.Property
  ;
}

/** TODO */
export function property<Comp extends Component>(): SignalPropertyDecorator<Comp, any> {
  return () => {
    let sig: WriteableSignal<unknown>;
    return {
      init(value: unknown): WriteableSignal<unknown> {
        if (!isPropertySignal(value)) {
          throw new Error('Expected a `propFromSignal` value.');
        }

        sig = value;
        return value;
      },

      get(): unknown {
        return untracked(sig);
      },

      set(value: unknown): void {
        sig.set(value);
      },
    };
  };
}

export function reactiveProp<Comp extends Component>(): SignalPropertyDecorator<Comp, any> {
  return (target, ctx) => {
    const propName = ctx.name;
    let instance: Comp;
    return {
      init(value): void {
        instance = this;
        const propertyMap = componentPropertyMap.get(instance) ?? new Map();
        componentPropertyMap.set(instance, propertyMap);
        propertyMap.set(propName, signal(value));
      },

      get(): unknown {
        // Call through to any composed decorators. They might be observing this
        // `get` operation. Unfortunately the returned value needs to be
        // intentionally dropped, because the source of truth for this property
        // is inside the signal, not the class property value.
        target.get.call(this);

        return untracked(() => {
          return componentPropertyMap.get(instance)!.get(propName)!();
        });
      },

      set(value: unknown): void {
        componentPropertyMap.get(instance)!.get(propName)!.set(value);

        // Call through to any composed decorators. They might be observing this
        // `set` operation.
        target.set.call(this, value);
      },
    };
  };
}
