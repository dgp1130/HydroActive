import { Hook } from 'hydroactive/hook.js';
import { ElementSerializerToken, ResolveSerializer, resolveSerializer } from '../serializer-tokens.js';
import { Signal, WriteableSignal } from './types.js';
import { Serialized, ElementSerializer, ElementSerializable } from 'hydroactive/serializers.js';
import { signal } from './signal.js';

export { cached } from './cached.js';
export { effect } from './effect.js';
export { type Equals, signal } from './signal.js';
export { MacrotaskScheduler } from './schedulers/macrotask-scheduler.js';
export { type Action, type CancelAction, type Scheduler } from './schedulers/scheduler.js';
export { type Signal, type WriteableSignal } from './types.js';

export function live<
  El extends Element,
  Token extends ElementSerializerToken<any, El>
>(token: Token): Hook<
  El,
  WriteableSignal<Serialized<ResolveSerializer<
    Token,
    ElementSerializer<unknown, El>,
    ElementSerializable<unknown, El>
  >>>
> {
  const serializer = resolveSerializer(token);
  return (comp, el) => {
    const initial = el.read(serializer);
    const value = signal(initial);

    bind(serializer as any, () => value())(comp, el);

    return value as any /* TODO */;
  };
}

export function bind<
  Value,
  El extends Element,
  Token extends ElementSerializerToken<Value, El>
>(token: Token, signal: Signal<Value>): Hook<El, void> {
  const serializer = resolveSerializer(token) as ElementSerializer<Value, El>;
  return (comp, el) => {
    comp.effect(() => {
      const value = signal();

      serializer.serializeTo(value, el.native);
    });
  };
}
