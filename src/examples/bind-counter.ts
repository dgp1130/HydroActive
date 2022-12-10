import { component } from 'hydroactive';
import { createSignal, unobserved } from 'hydroactive/signal.js';

const BindCounter = component(($) => {
  // `$.live()` is equivalent to initializing a signal with `$.hydrate()` and then
  // `$.bind()`-ing it back to the DOM.
  const [ count, setCount ] = createSignal($.hydrate('span', Number));
  $.bind('span', count);

  // This has a memory leak, but we'll fix it later.
  setInterval(unobserved(() => {
    setCount(count() + 1);
  }), 1_000);
});

customElements.define('bind-counter', BindCounter);

declare global {
  interface HTMLElementTagNameMap {
    'bind-counter': InstanceType<typeof BindCounter>;
  }
}
