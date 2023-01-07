import { component } from 'hydroactive';

// Define a new custom element.
// `$` provides HydroActive APIs for hydrating the component and adding interactivity.
export const LiveCounter = component('live-counter', ($) => {
  // Apply hydration logic.

  // `$.live()` creates a "live binding" to a particular DOM element.
  // 1. Get the DOM element with `this.shadowRoot.querySelector('span')`.
  // 2. Read `.textContent` and parse to a `Number`.
  // 3. Create a signal with that initial value.
  // 4. Bind any future set operations to update the `span` tag in the DOM.
  // 5. Returns the signal.
  const [ count, setCount ] = $.live('span', Number);

  // This has a memory leak, but we'll fix it later.
  setInterval(() => {
    setCount(count() + 1);
  }, 1_000);
});

// Link `live-counter` selector to `LiveCounter` type for better type inference.
declare global {
  interface HTMLElementTagNameMap {
    'live-counter': InstanceType<typeof LiveCounter>;
  }
}
