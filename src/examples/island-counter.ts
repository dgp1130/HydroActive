import { component } from 'hydroactive';

const IslandCounter = component('island-counter', ($) => {
  const [ count, setCount ] = $.live('span', Number);

  const decrement = $.query('button#decrement');
  $.listen(decrement, 'click', () => { setCount(count() - 1); });
  decrement.disabled = false;

  const increment = $.query('button#increment');
  $.listen(increment, 'click', () => { setCount(count() + 1); });
  increment.disabled = false;
});

declare global {
  interface HTMLElementTagNameMap {
    'island-counter': InstanceType<typeof IslandCounter>;
  }
}
