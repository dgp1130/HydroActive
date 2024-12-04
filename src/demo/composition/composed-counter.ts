import { component } from 'hydroactive';
import { live } from 'hydroactive/signal-accessors.js';

/**
 * Displays the current count and provides `decrement` and `increment` methods
 * for modifying the count.
 */
export const CounterDisplay = component('counter-display', (host) => {
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
});

// No need to call `CounterDisplay.define()` here, the component is defined
// automatically by usage in `CounterController`.
// `CounterDisplay` definition is pure and tree-shakable!

declare global {
  interface HTMLElementTagNameMap {
    'counter-display': InstanceType<typeof CounterDisplay>;
  }
}

/**
 * Controls an underlying `counter-display` by incrementing and decrementing it
 * based on button clicks.
 */
export const CounterController = component('counter-controller', (host) => {
  // Get a reference to the underlying `counter-display` element.
  // Automatically defines `CounterDisplay` if it isn't already defined.
  const inner = host.query('counter-display').access(CounterDisplay).element;

  // Bind the button clicks to modifying the counter.
  host.query('button#decrement').access().listen(host, 'click', () => {
    inner.decrement();
  });
  host.query('button#increment').access().listen(host, 'click', () => {
    inner.increment();
  });
});

CounterController.define();

declare global {
  interface HTMLElementTagNameMap {
    'counter-controller': InstanceType<typeof CounterController>;
  }
}
