import * as context from 'hydroactive/context.js';
import { attr, component } from 'hydroactive';
import { createSignal } from 'hydroactive/signal.js';

const ctx = context.create<number>(Symbol('count'));

const ContextReceiver = component(($) => {
  // `$.waitContext()` returns a `Promise` because the context may (actually is in this
  // case) be provided *after* it is requested. Waiting returns a `Promise<Accessor<T>>`
  // but this is compatible with `$.bind()`.
  // Alternatively we could use `$.useContext()`, however that requires an initial value
  // and writes it to the DOM immediately on bind, which I don't want to do here.
  const count = $.waitContext(ctx);
  $.bind('span', count);
});

customElements.define('context-receiver', ContextReceiver);

declare global {
  interface HTMLElementTagNameMap {
    'context-receiver': InstanceType<typeof ContextReceiver>;
  }
}

const ContextProvider = component(($) => {
  const [ count, setCount ] = createSignal($.hydrate(':host', Number, attr('count')));

  $.provideContext(ctx, () => count());

  $.listen($.query('#decrement'), 'click', () => { setCount(count() - 1); });
  $.listen($.query('#increment'), 'click', () => { setCount(count() + 1); });
});

customElements.define('context-provider', ContextProvider);

declare global {
  interface HTMLElementTagNameMap {
    'context-provider': InstanceType<typeof ContextProvider>;
  }
}
