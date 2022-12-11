import { component } from 'hydroactive';

// Nothing unique about this component.
// Automatically supports deferring hydration with no effort!
const DeferredInnerCounter = component(($) => {
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

customElements.define('deferred-inner-counter', DeferredInnerCounter);

declare global {
  interface HTMLElementTagNameMap {
    'deferred-inner-counter': InstanceType<typeof DeferredInnerCounter>;
  }
}

// Nothing unique about this component.
// Automatically supports deferring hydration with no effort!
const DeferredOuterCounter = component(($) => {
  const innerCounter = $.hydrate('deferred-inner-counter', DeferredInnerCounter);

  // Child elements are hydrated first, so this is already loaded and works!
  // Note that HydroActive cannot force the custom element classes to be loaded for all its
  // children, so if `deferred-outer-counter` is defined *before* `deferred-inner-counter`, you're
  // gonna have a bad time.
  innerCounter.increment();

  const decrement = $.query('button#decrement');
  $.listen(decrement, 'click', () => { innerCounter.decrement(); });
  decrement.disabled = false;

  const increment = $.query('button#increment');
  $.listen(increment, 'click', () => { innerCounter.increment(); });
  increment.disabled = false;
});

customElements.define('deferred-outer-counter', DeferredOuterCounter);

declare global {
  interface HTMLElementTagNameMap {
    'deferred-outer-counter': InstanceType<typeof DeferredOuterCounter>;
  }
}
