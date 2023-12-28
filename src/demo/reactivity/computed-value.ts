import { defineComponent } from 'hydroactive';
import { Signal } from 'hydroactive/signals.js';

/** Displays a value computed from another value in the DOM. */
export const ComputedValue = defineComponent('computed-value', (comp) => {
  // Create a signal for the real underlying value.
  const count = comp.live('#count', Number);

  // Create a computed signal with a function wrapper that computes the negative
  // of the count.
  const negative: Signal<number> = () => -count();

  // Bind the negative version of the count to the negative label.
  comp.bind('#negative', () => negative());

  comp.listen('button', 'click', () => { count.set(count() + 1); });
});

declare global {
  interface HTMLElementTagNameMap {
    'computed-value': InstanceType<typeof ComputedValue>;
  }
}
