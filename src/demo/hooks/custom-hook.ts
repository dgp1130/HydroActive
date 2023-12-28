import { ComponentRef, defineComponent } from 'hydroactive';
import { Signal, signal } from 'hydroactive/signals.js';

/** Demonstrates a custom hook for controlling the count timer. */
export const CustomHook = defineComponent('custom-hook', (comp) => {
  const initial = comp.host.query('span').read(Number);

  // Create a signal which is automatically incremented every second. Bound to
  // the component's lifecycle.
  const count = useTimer(comp, initial);

  comp.bind('span', () => count());
});

declare global {
  interface HTMLElementTagNameMap {
    'custom-hook': InstanceType<typeof CustomHook>;
  }
}

/**
 * Custom "hook" to automatically increment a signal. Can be reused across
 * multiple components. The only trick here is accepting `comp` as an input
 * parameter so it can tie into the component's lifecycle appropriately.
 */
function useTimer(comp: ComponentRef, initial: number): Signal<number> {
  const count = signal(initial);

  comp.connected(() => {
    const handle = setInterval(() => {
      count.set(count() + 1);
    }, 1_000);

    return () => {
      clearInterval(handle);
    };
  });

  // Use `.readonly` to convert the `WriteableSignal` into a readonly `Signal`.
  // This prevents anyone from accidentally calling `set` on the return value.
  return count.readonly();
}
