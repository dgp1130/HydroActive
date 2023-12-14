import { Component } from 'hydroactive';
import { Signal, WriteableSignal } from './types.js';
import { signal } from './signal.js';

type SignalPropertyDecorator<Comp extends Component, Value> = (
  target: ClassAccessorDecoratorTarget<Comp, Value>,
  context: ClassAccessorDecoratorContext<Comp, Value>,
) => ClassAccessorDecoratorResult<Comp, Value> | void;

export function signalProp<Comp extends Component>(): SignalPropertyDecorator<Comp, any> {
  return (_target, ctx) => {
    const propName = typeof ctx.name === 'symbol' ? ctx.name.description : ctx.name;
    const internalProp = `_${propName}`;
    return {
      init(value): void {
        (this as any)[internalProp] = signal(value);
      },

      get(): unknown {
        return ((this as any)[internalProp] as Signal<unknown>)();
      },

      set(value: unknown): void {
        ((this as any)[internalProp] as WriteableSignal<unknown>).set(value);
      },
    };
  };
}
