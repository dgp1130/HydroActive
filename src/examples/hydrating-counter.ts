import { component } from 'hydroactive';

const HydratingCounter = component('hydrating-counter', ($) => {
  const [ count, setCount ] = $.live('span', Number);

  // Inferred type from selector tag name.
  const decrement /* : HTMLButtonElement */ = $.query('button#decrement');
  $.listen(decrement, 'click', () => { setCount(count() - 1); });
  decrement.disabled = false; // Enable the button on hydration.

  const increment /* : HTMLButtonElement */ = $.query('button#increment');
  $.listen(increment, 'click', () => { setCount(count() + 1); });
  increment.disabled = false; // Enable the button on hydration.

  // Start client side rendering if desired.
  // Could initialize a React or Angular application, render a LitElement component, ...
  const label = document.createElement('div');
  label.textContent = 'Hi, I\'m CSR\'d! These buttons are also disabled until their event listeners are loaded.';
  $.host.shadowRoot!.append(label);
});

declare global {
  interface HTMLElementTagNameMap {
    'hydrating-counter': InstanceType<typeof HydratingCounter>;
  }
}
