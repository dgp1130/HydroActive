import { component } from 'hydrator';

const InnerCounter = component(($) => {
  const [ count, setCount ] = $.live('span', Number);

  return {
    decrement(): void {
      setCount(count() - 1);
    },

    increment(): void {
      setCount(count() + 1);
    },
  };
});

customElements.define('inner-counter', InnerCounter);

declare global {
  interface HTMLElementTagNameMap {
    'inner-counter': InstanceType<typeof InnerCounter>;
  }
}

const OuterCounter = component(($) => {
  const innerCounter = $.hydrate('inner-counter');

  innerCounter.increment(); // Should be a valid reference at hydration time.

  $.listen($.query('#decrement'), 'click', () => { innerCounter.decrement(); });
  $.listen($.query('#increment'), 'click', () => { innerCounter.increment(); });
});

customElements.define('outer-counter', OuterCounter);

declare global {
  interface HTMLElementTagNameMap {
    'outer-counter': InstanceType<typeof OuterCounter>;
  }
}
