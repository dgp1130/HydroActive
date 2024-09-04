import { Dehydrated, ElementAccessor, defineComponent } from 'hydroactive';
import { bind } from 'hydroactive/signal-accessors.js';
import { WriteableSignal, signal } from 'hydroactive/signals.js';

/**
 * Automatically increments the count over time. Uses `comp.bind` instead of
 * `comp.live` to demonstrate the underlying primitives.
 */
export const BindCounter = defineComponent('bind-counter', (host, comp) => {
  // Queries the DOM for the `<span>` tag.
  const span: Dehydrated<HTMLSpanElement> = host.query('span');

  // Verifies that the element does not need to be hydrated and returns an
  // `ElementAccessor`, a convenient wrapper with methods to easily interact
  // with the element.
  const label: ElementAccessor<HTMLSpanElement> = span.access();

  // Reads the current text content of the label and interprets it as a
  // `number`.
  const initial: number = label.read(Number);

  // Creates a signal with the given initial value.
  const count: WriteableSignal<number> = signal(initial);

  // Binds the signal back to the `<span>` tag. Anytime `count` changes, the
  // `<span>` will be automatically updated.
  bind(label, comp, Number, () => count());

  // ^ `live(label, comp, Number)` implicitly does all of the above.

  comp.connected(() => {
    const handle = setInterval(() => {
      count.set(count() + 1);
    }, 1_000);

    return () => {
      clearInterval(handle);
    };
  });
});
