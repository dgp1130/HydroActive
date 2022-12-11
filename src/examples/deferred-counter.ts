import { component } from 'hydroactive';

// Nothing unique about this component.
// Automatically supports deferring hydration with no effort!
const DeferredCounter = component(($) => {
  const [ count, setCount ] = $.live('span', Number);

  const decrement = $.query('button#decrement');
  $.listen(decrement, 'click', () => { setCount(count() - 1); });
  decrement.disabled = false;

  const increment = $.query('button#increment');
  $.listen(increment, 'click', () => { setCount(count() + 1); });
  increment.disabled = false;
});

customElements.define('deferred-counter', DeferredCounter);

declare global {
  interface HTMLElementTagNameMap {
    'deferred-counter': InstanceType<typeof DeferredCounter>;
  }
}
