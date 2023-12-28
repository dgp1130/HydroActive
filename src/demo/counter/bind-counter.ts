import { ElementRef, defineComponent } from 'hydroactive';
import { WriteableSignal, signal } from 'hydroactive/signals.js';

/**
 * Automatically increments the count over time. Uses `comp.bind` instead of
 * `comp.live` to demonstrate the underlying primitives.
 */
export const BindCounter = defineComponent('bind-counter', (comp) => {
  // Queries the DOM for the `<span>` tag and provides an `ElementRef`, which is
  // an ergonomic wrapper around an element.
  const label: ElementRef<HTMLSpanElement> = comp.host.query('span');

  // Read the current text content of the label and interpret it as a `number`.
  const initial: number = label.read(Number);

  // Creates a signal with the given initial value.
  const count: WriteableSignal<number> = signal(initial);

  // Binds the signal back to the `<span>` tag. Anytime `count` changes, the
  // `<span>` will be automatically updated.
  comp.bind('span', () => count());

  // ^ `comp.live('span', Number)` implicitly does all of the above.

  comp.connected(() => {
    const handle = setInterval(() => {
      count.set(count() + 1);
    }, 1_000);

    return () => {
      clearInterval(handle);
    };
  });
});
