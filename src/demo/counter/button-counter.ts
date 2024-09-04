import { defineComponent } from 'hydroactive';
import { live } from 'hydroactive/signal-accessors.js';

/**
 * A counter which increments and decrements the count based on button clicks.
 */
export const ButtonCounter = defineComponent('button-counter', (host, comp) => {
  const count = live(host.query('span').access(), comp, Number);

  // Listen for click events and update the count accordingly. Event listeners
  // are automatically removed when the component is disconnected from the DOM,
  // no need to manually remove them.
  host.query('#decrement').access().listen(comp, 'click', () => {
    count.set(count() - 1);
  });
  host.query('#increment').access().listen(comp, 'click', () => {
    count.set(count() + 1);
  });
});

declare global {
  interface HTMLElementTagNameMap {
    'button-counter': InstanceType<typeof ButtonCounter>;
  }
}
