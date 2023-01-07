import { component } from 'hydroactive';

const EffectCounter = component('effect-counter', ($) => {
  const [ count, setCount ] = $.live('span', Number);
  $.listen($.query('button'), 'click', () => { setCount(count() + 1); });

  // Since this is the "hydration" function and hydration is fundamentally side-effectful, there's
  // nothing wrong with adding one-time side effects.
  console.log('effect-counter: Hydrated!');

  // Watch out for side effects which need to be reverted when this component is no longer needed.
  // `$.host.addEventListener('...', () => { /* ... */ });` - Use `$.listen()`.
  // `setInterval(() => { /* ... */ });` - Use `$.lifecycle()`.

  // For side effects dependent on signals, use `$.effect()`. Re-runs whenever a signal changes.
  $.effect(() => {
    console.log(`effect-counter: The current count is ${count()}.`);
  });
});

declare global {
  interface HTMLElementTagNameMap {
    'effect-counter': InstanceType<typeof EffectCounter>;
  }
}
