import { Component, component } from 'hydroactive';
import { Accessor, createSignal, unobserved } from 'hydroactive/signal.js';

// Hook that returns a signal which increments every second.
function count($: Component): Accessor<number> {
  const [ value, setValue ] = createSignal(0);

  $.lifecycle(() => {
    const id = setInterval(unobserved(() => { setValue(value() + 1); }), 1_000);
    return () => { clearInterval(id); };
  });

  return value;
}

// Hook that returns a signal which increments by 2 every second.
function countBy2($: Component, initial: number): Accessor<number> {
  // Compose the existing hook.
  const accessor = count($);

  // Double it.
  return () => initial + (accessor() * 2);
}

const ComposedHooks = component(($) => {
  const doubledCount = countBy2($, $.hydrate('span', Number));
  $.bind('span', doubledCount);
});

customElements.define('composed-hooks', ComposedHooks);

declare global {
  interface HTMLElementTagNameMap {
    'composed-hooks': InstanceType<typeof ComposedHooks>;
  }
}
