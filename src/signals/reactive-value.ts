import { ReactiveValue } from 'hydroactive/reactive-value.js';
import { SIGNAL, SignalKind, WriteableSignal } from './types.js';
import { bindProducer, Consumer, Producer, untracked } from './graph.js';

/** TODO */
export function toSignal<Value>(reactive: ReactiveValue<Value>):
    WriteableSignal<Value> {
  const get = reactive.get.bind(reactive);
  const producer = Producer.from(get);

  const sig: WriteableSignal<Value> = () => {
    bindProducer(producer);

    return producer.poll();
  };
  sig.set = reactive.set.bind(reactive);
  sig.readonly = () => get;
  sig[SIGNAL] = SignalKind.Signal;

  producer.observed(() => {
    return reactive.listen(() => {
      producer.notifyConsumers();
    });
  });

  return sig;
}

/** TODO */
export function fromSignal<Value>(sig: WriteableSignal<Value>):
    ReactiveValue<Value> {
  const reactive = ReactiveValue.from({
    get: () => untracked(sig),
    set: sig.set.bind(sig),
    notify: (notify) => {
      const throwOnUnsetDeferReadOrig = globalThis.throwOnUnsetDeferRead;
      globalThis.throwOnUnsetDeferRead = false;

      // deferredEffect(sig, notify, syncScheduler);
      const consumer = Consumer.from();
      consumer.listen(notify);
      consumer.record(sig);

      globalThis.throwOnUnsetDeferRead = throwOnUnsetDeferReadOrig;
    },
  });

  return reactive;
}
