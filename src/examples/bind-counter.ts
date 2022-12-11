import { component } from 'hydroactive';
import { createSignal, unobserved } from 'hydroactive/signal.js';

const BindCounter = component(($) => {
  // 1. Get the DOM element with `this.shadowRoot.querySelector('span')`.
  // 2. Read `.textContent` and parse to a `Number`.
  const initialCount = $.hydrate('span', Number);

  // 3. Create a signal with that initial value.
  const [ count, setCount ] = createSignal(initialCount);

  // 4. Bind any future set operations to update the `span` tag in the DOM.
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
