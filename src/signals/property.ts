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
  return (_target, ctx) => {
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
        return componentPropertyMap.get(instance)!.get(propName)!();
      },

      set(value: unknown): void {
        componentPropertyMap.get(instance)!.get(propName)!.set(value);
      },
    };
  };
}
