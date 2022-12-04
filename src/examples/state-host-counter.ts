import { component } from 'hydroactive';
import { createSignal } from 'hydroactive/signal.js';

const CounterDisplay = component(($) => {
  const [ count, setCount ] = $.live('span', Number);

  return {
    // Expose the hydrated count.
    get count() { return count(); },

    // Allow parent components to decide when and how the count changes.
    set count(value) { setCount(value); },
  };
});

customElements.define('counter-display', CounterDisplay);

declare global {
  interface HTMLElementTagNameMap {
    'counter-display': InstanceType<typeof CounterDisplay>;
  }
}

const StateHostCounter = component(($) => {
  // Initialize the outer component with state hydrated from the inner component.
  const counterDisplay = $.query('counter-display');
  const [ count, setCount ] = createSignal(counterDisplay.count);

  $.listen($.query('#decrement'), 'click', () => { setCount(count() - 1); });
  $.listen($.query('#increment'), 'click', () => { setCount(count() + 1); });

  return {
    update(): void {
      counterDisplay.count = count();
    },
  };
});

customElements.define('state-host-counter', StateHostCounter);

declare global {
  interface HTMLElementTagNameMap {
    'state-host-counter': InstanceType<typeof StateHostCounter>;
  }
}
