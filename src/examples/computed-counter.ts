import { component } from 'hydroactive';

const ComputedCounter = component('computed-counter', ($) => {
  const [ count, setCount ] = $.live('#count', Number);

  $.listen($.query('#decrement'), 'click', () => { setCount(count() - 1); });
  $.listen($.query('#increment'), 'click', () => { setCount(count() + 1); });

  // Bind a computed signal.
  $.bind('#parity', () => count() % 2 === 0 ? 'even' : 'odd');
});

declare global {
  interface HTMLElementTagNameMap {
    'computed-counter': InstanceType<typeof ComputedCounter>;
  }
}
