import { Component } from 'hydroactive';
import { WriteableSignal } from './types.js';
import { signal } from './signal.js';
import { HydroActiveComponent } from 'hydroactive/hydroactive-component.js';

type SignalPropertyDecorator<Comp extends Component, Value> = (
  target: ClassAccessorDecoratorTarget<Comp, Value>,
  context: ClassAccessorDecoratorContext<Comp, Value>,
) => ClassAccessorDecoratorResult<Comp, Value> | void;

const componentPropertyMap = new WeakMap<
  HydroActiveComponent,
  Map<string | number | symbol, WriteableSignal<unknown>>
>();

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

        return componentPropertyMap.get(instance)!.get(propName)!();
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
