import { defineComponent } from 'hydroactive';
import { bind, live } from 'hydroactive/signal-accessors.js';
import { Signal } from 'hydroactive/signals.js';

/** Displays a value computed from another value in the DOM. */
export const ComputedValue = defineComponent('computed-value', (comp, host) => {
  // Create a signal for the real underlying value.
  const count = live(host.query('#count').access(), comp, Number);

  // Create a computed signal with a function wrapper that computes the negative
  // of the count.
  const negative: Signal<number> = () => -count();

  // Bind the negative version of the count to the negative label.
  bind(host.query('#negative').access(), comp, Number, () => negative());

  host.query('button').access().listen(comp, 'click', () => {
    count.set(count() + 1);
  });
});

declare global {
  interface HTMLElementTagNameMap {
    'computed-value': InstanceType<typeof ComputedValue>;
  }
}
