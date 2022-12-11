import { component } from 'hydroactive';

const InnerCounter = component(($) => {
  const [ count, setCount ] = $.live('span', Number);

  // Return the public API of this custom element. Functions are applied to the web component.
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
  // Can hydrate just a plain reference to the element, no need to parse its text.
  const innerCounter = $.hydrate('inner-counter', InnerCounter);

  // InnerCounter should hydrate first and have usable methods even at hydration time.
  // Import ordering naturally causes this behavior, but doesn't always happen.
  // Even here, `OuterCounter` can be written to *not* have an explicit dependency on `InnerCounter`
  // by using `$.query('inner-counter')`. This could hydrate out of order depending on your bundler.
  innerCounter.increment();

  $.listen($.query('#decrement'), 'click', () => { innerCounter.decrement(); });
  $.listen($.query('#increment'), 'click', () => { innerCounter.increment(); });
});

customElements.define('outer-counter', OuterCounter);

declare global {
  interface HTMLElementTagNameMap {
    'outer-counter': InstanceType<typeof OuterCounter>;
  }
}
