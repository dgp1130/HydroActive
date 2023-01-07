import * as context from 'hydroactive/context.js';
import { attr, component } from 'hydroactive';
import { Accessor, createSignal } from 'hydroactive/signal.js';

const ctx = context.create<number>(Symbol('count'));

const ContextReceiver = component('context-receiver', ($) => {
  // Read context from the parent element returns a `Promise`.
  const count: Promise<Accessor<number>> = $.waitContext(ctx);

  // Bind is compatible with `Promises` so this mostly just works.
  $.bind('span', count);

  // `$.waitContext()` returns a `Promise` because the context may be provided *after* it is
  // requested (if the provider hydrates after the provider). Waiting returns a
  // `Promise<Accessor<T>>`.

  // Alternatively we could use `$.useContext()`, however that requires an initial value.
  // const count: Accessor<number> = $.useContext(ctx, 0 /* initial value */);
});

declare global {
  interface HTMLElementTagNameMap {
    'context-receiver': InstanceType<typeof ContextReceiver>;
  }
}

const ContextProvider = component('context-provider', ($) => {
  const [ count, setCount ] = createSignal($.read(':host', Number, attr('count')));
  $.listen($.query('#decrement'), 'click', () => { setCount(count() - 1); });
  $.listen($.query('#increment'), 'click', () => { setCount(count() + 1); });

  // Provide the current count as injectable context.
  // Automatically updated when the signal changes.
  $.provideContext(ctx, count);
});

declare global {
  interface HTMLElementTagNameMap {
    'context-provider': InstanceType<typeof ContextProvider>;
  }
}
