import { component } from 'hydroactive';

const SafeCounter = component('safe-counter', ($) => {
  const [ count, setCount ] = $.live('span', Number);

  // Same as before, but no memory leak!
  $.lifecycle(() => {
    // Run on hydration and reconnect.
    const id = setInterval(() => {
      setCount(count() + 1);
    }, 1_000);

    // Run on disconnect.
    return () => { clearInterval(id); };
  });
});

declare global {
  interface HTMLElementTagNameMap {
    'safe-counter': InstanceType<typeof SafeCounter>;
  }
}
