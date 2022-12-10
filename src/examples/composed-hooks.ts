import { Component, component, Hook } from 'hydroactive';
import { Accessor, createSignal } from 'hydroactive/signal.js';

function count(): Hook<Accessor<number>> {
  const [ value, setValue ] = createSignal(0);

  return [ value, () => {
    const id = setInterval(() => { setValue(value() + 1); }, 1_000);
    return () => { clearInterval(id); };
  }];
}

function double($: Component, initial: number): Hook<Accessor<number>> {
  const accessor = $.use(count());
  return [ () => initial + (accessor() * 2) ];
}

const ComposedHooks = component(($) => {
  const doubledCount = $.use(double($, $.hydrate('span', Number)));
  $.bind('span', doubledCount);
});

customElements.define('composed-hooks', ComposedHooks);

declare global {
  interface HTMLElementTagNameMap {
    'composed-hooks': InstanceType<typeof ComposedHooks>;
  }
}
