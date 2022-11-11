import { component } from 'hydrator';

const HydratingCounter = component(($) => {
  const [ count, setCount ] = $.live('span', Number);

  const decrement = $.query('button#decrement');
  $.listen(decrement, 'click', () => { setCount(count() - 1); });
  decrement.disabled = false;

  const increment = $.query('button#increment');
  $.listen(increment, 'click', () => { setCount(count() + 1); });
  increment.disabled = false;

  const label = document.createElement('div');
  label.textContent = 'Hi, I\'m CSR\'d! These buttons are also disabled until their event listeners are loaded.';
  $.host.shadowRoot!.append(label);
});

customElements.define('hydrating-counter', HydratingCounter);

declare global {
  interface HTMLElementTagNameMap {
    'hydrating-counter': InstanceType<typeof HydratingCounter>;
  }
}
