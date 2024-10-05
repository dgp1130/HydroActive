import { WriteableSignal } from './types.js';

/**
 * TODO: Provides a getter/setter wrapper for a signal.
 *
 * The idea here is to provide synchronous access to the getter/setter functions
 * to transform/validate the data immediately. This also helps mediate use cases
 * with multiple sources of truth, such as the user input on an input element
 * and the developer calling `.set` on the signal.
 */
export function proxySignal<Value>({ get, set }: {
  get: () => Value,
  set: (value: Value) => void,
}): WriteableSignal<Value> {
  const sig: WriteableSignal<Value> = () => get();
  sig.set = set;
  sig.readonly = () => () => get();

  return sig;
}
