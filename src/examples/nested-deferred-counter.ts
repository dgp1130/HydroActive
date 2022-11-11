import { component } from 'hydrator';

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

const DeferredOuterCounter = component(($) => {
  const innerCounter = $.hydrate('deferred-inner-counter');

  // Child elements are hydrated first, so this is already loaded and works!
  // Note that Hydrator cannot force the custom element classes to be loaded for all its
  // children, so if `functional-deferred-outer-counter` is defined *before*
  // `deferred-inner-counter`, you're gonna have a bad time. `$.hydrate()` naturally
  // requires this anyways because it needs a reference to the child component class
  // which forces it to be defined first.
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
