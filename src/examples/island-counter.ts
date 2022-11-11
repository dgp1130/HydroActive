import { component } from 'hydrator';

const IslandCounter = component(($) => {
  const [ count, setCount ] = $.live('span', Number);

  const decrement = $.query('button#decrement');
  $.listen(decrement, 'click', () => { setCount(count() - 1); });
  decrement.disabled = false;

  const increment = $.query('button#increment');
  $.listen(increment, 'click', () => { setCount(count() + 1); });
  increment.disabled = false;
});

customElements.define('island-counter', IslandCounter);

declare global {
  interface HTMLElementTagNameMap {
    'island-counter': InstanceType<typeof IslandCounter>;
  }
}
