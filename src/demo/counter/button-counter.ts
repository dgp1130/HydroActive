import { defineComponent } from 'hydroactive';

/**
 * A counter which increments and decrements the count based on button clicks.
 */
export const ButtonCounter = defineComponent('button-counter', (comp) => {
  const count = comp.live('span', Number);

  // Listen for click events and update the count accordingly. Event listeners
  // are automatically removed when the component is disconnected from the DOM,
  // no need to manually remove them.
  comp.listen('#decrement', 'click', () => { count.set(count() - 1); });
  comp.listen('#increment', 'click', () => { count.set(count() + 1); });
});

declare global {
  interface HTMLElementTagNameMap {
    'button-counter': InstanceType<typeof ButtonCounter>;
  }
}
