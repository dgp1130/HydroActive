import { HydroActiveComponent, defineSignalComponent } from 'hydroactive';
import { ComponentAccessor } from 'hydroactive/component-accessor.js';
import { bind } from 'hydroactive/signal-accessors.js';
import { Signal, signal } from 'hydroactive/signals.js';

/** Demonstrates a custom hook for controlling the count timer. */
export const CustomHook = defineSignalComponent('custom-hook', (host) => {
  const initial = host.query('span').access().read(Number);

  // Create a signal which is automatically incremented every second. Bound to
  // the component's lifecycle.
  const count = useTimer(host, initial);

  bind(host.query('span').access(), host, Number, () => count());
});

declare global {
  interface HTMLElementTagNameMap {
    'custom-hook': InstanceType<typeof CustomHook>;
  }
}

/**
 * Custom "hook" to automatically increment a signal. Can be reused across
 * multiple components. The only trick here is accepting `host` as an input
 * parameter so it can tie into the component's lifecycle appropriately.
 */
function useTimer(
  host: ComponentAccessor<HydroActiveComponent>,
  initial: number,
): Signal<number> {
  const count = signal(initial);

  host.connected(() => {
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
