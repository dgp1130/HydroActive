import { defineSignalComponent } from 'hydroactive';
import { live } from 'hydroactive/signal-accessors.js';

/**
 * Displays the current count and provides `decrement` and `increment` methods
 * for modifying the count.
 */
export const CounterDisplay = defineSignalComponent(
  'counter-display',
  (host) => {
    // The `count` state lives within `counter-display`.
    const count = live(host.query('span').access(), host, Number);

    // These functions are exposed on the `counter-display` custom element.
    return {
      decrement(): void {
        count.set(count() - 1);
      },

      increment(): void {
        count.set(count() + 1);
      },
    };
  },
);

declare global {
  interface HTMLElementTagNameMap {
    'counter-display': InstanceType<typeof CounterDisplay>;
  }
}

/**
 * Controls an underlying `counter-display` by incrementing and decrementing it
 * based on button clicks.
 */
export const CounterController = defineSignalComponent(
  'counter-controller',
  (host) => {
    // Get a reference to the underlying `counter-display` element.
    const inner = host.query('counter-display').access(CounterDisplay).element;

    // Bind the button clicks to modifying the counter.
    host.query('button#decrement').access().listen(host, 'click', () => {
      inner.decrement();
    });
    host.query('button#increment').access().listen(host, 'click', () => {
      inner.increment();
    });
  },
);

declare global {
  interface HTMLElementTagNameMap {
    'counter-controller': InstanceType<typeof CounterController>;
  }
}
