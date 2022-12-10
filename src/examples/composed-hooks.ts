import { Component, component } from 'hydroactive';
import { Accessor, createSignal } from 'hydroactive/signal.js';
import { _$LE } from 'lit';

function count($: Component): Accessor<number> {
  const [ value, setValue ] = createSignal(0);

  $.lifecycle(() => {
    const id = setInterval(() => { setValue(value() + 1); }, 1_000);
    return () => { clearInterval(id); };
  });

  return value;
}

function double($: Component, initial: number): Accessor<number> {
  const accessor = count($);
  return () => initial + (accessor() * 2);
}

const ComposedHooks = component(($) => {
  const doubledCount = double($, $.hydrate('span', Number));
  $.bind('span', doubledCount);
});

customElements.define('composed-hooks', ComposedHooks);

declare global {
  interface HTMLElementTagNameMap {
    'composed-hooks': InstanceType<typeof ComposedHooks>;
  }
}
