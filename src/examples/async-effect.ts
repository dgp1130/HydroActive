import { component } from 'hydroactive';

const AsyncEffect = component(($) => {
  const [ countAccessor, setCount ] = $.live('span', Number);

  $.listen($.query('button'), 'click', () => { setCount(countAccessor() + 1); });

  // Must pass in any signals explicitly, and receive their results in the callback.
  $.asyncEffect(countAccessor, async (countValue, signal) => {
    // Make a slow network request (500ms long) with the provided `AbortSignal`. If a new
    // request is triggered, the old one is aborted.
    try {
      const res = await fetch(`/?count=${countValue}`, { signal });
      await new Promise<void>((resolve) => {
        setTimeout(() => { resolve(); }, 500);
      });
      const text = await res.text();
      console.log(`async-effect: Read "${text.split('\n')[0]}"`);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('async-effect: Aborted request.');
      } else {
        throw err; // Rethrow unknown error.
      }
    }
  });
});

customElements.define('async-effect', AsyncEffect);

declare global {
  interface HTMLElementTagNameMap {
    'async-effect': InstanceType<typeof AsyncEffect>;
  }
}
