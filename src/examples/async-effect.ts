import { component } from 'hydroactive';

const AsyncEffect = component(($) => {
  const [ countAccessor, setCount ] = $.live('span', Number);
  $.listen($.query('button'), 'click', () => { setCount(countAccessor() + 1); });

  // `$.asyncEffect()` is like `$.effect()` with 3 important differences.
  // 1. It takes an `async` callback because that's the point.
  // 2. Signals can't be used directly, but instead must be passed through the effect parameters.
  // 3. An `AbortSignal` is automatically provided as the last argument.
  $.asyncEffect(countAccessor, async (countValue, abortSignal: AbortSignal) => {
    try {
      // Send a network request on any change to count.
      // Can't use `countAccessor()` here, because HydroActive wouldn't be able to associate it with
      // the effect to know what to rerun on change. Throws an error if you try.
      // This is why we needed `unobserved()` early, it tells any signals not to throw.
      const res = await fetch(`/?count=${countValue}`, {
        // Pass the `AbortSignal` into any async APIs. They will automatically be aborted whenever
        // the effect is re-executed.
        signal: abortSignal,
      });

      // Slow down the network request for demo purposes (500ms long).
      await new Promise<void>((resolve) => {
        setTimeout(() => { resolve(); }, 500);
      });
      const text = await res.text();

      console.log(`async-effect: Sent count \`${countValue}\` and got "${text.split('\n')[0]}".`);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log(`async-effect: Aborted count \`${countValue}\`.`);
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
