import { defineComponent } from 'hydroactive';

/** Automatically increments the count over time. */
export const AutoCounter = defineComponent('auto-counter', (comp) => {
  // Create a "live" binding of the `<span>` element's text content, but
  // interpreted as a `number`. Automatically parses the value.
  const count = comp.live('span', Number);

  // This is the `hydrate` function, it is only called once per-component
  // instance on hydration.

  // Run some code when the component is connected to or disconnected from the
  // document. This can be used to clean up resources which might cause the
  // component to leak memory when not in use.
  comp.connected(() => {
    // Executed when the component is connected to the DOM (or on hydration if
    // already connected). Create a timer to automatically update the count
    // every second.
    const handle = setInterval(() => {
      count.set(count() + 1);
    }, 1_000);

    // Executed when the component is disconnected from the DOM. Used to clean
    // up resources created above.
    return () => {
      // Disable the timer so the component stops incrementing and allow the
      // component to be garbage collected if no longer in use.
      clearInterval(handle);
    };
  });
});

declare global {
  interface HTMLElementTagNameMap {
    'auto-counter': InstanceType<typeof AutoCounter>;
  }
}
