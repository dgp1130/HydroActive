import { component, ComponentDef } from 'hydroactive';
import { createSignal } from 'hydroactive/signal.js';

// Define "props" this component accepts in the `$` type. Most of the time these should be
// optional (include `?` for each property) because the component will hydrate before the
// parent component has a chance to set props, so these will likely be `undefined` initially.
export const CounterDisplay = component('counter-display', ($: ComponentDef<{ count?: number }>) => {
  const initialCount = $.hydrate('span', Number);

  // Use `$.props.myProp` to get a signal which automatically updates any time the property
  // is modified on the custom element.
  $.bind('span', () => $.props.count() ?? initialCount);

  // Return hydration state useful to parent components.
  return { initialCount };
});

declare global {
  interface HTMLElementTagNameMap {
    'counter-display': InstanceType<typeof CounterDisplay>;
  }
}

// Holds the state of the current count.
export const StateHostCounter = component('state-host-counter', ($) => {
  // Initialize the outer component with state hydrated from the inner component.
  const counterDisplay = $.hydrate('counter-display', CounterDisplay);
  const [ count, setCount ] = createSignal(counterDisplay.initialCount);

  $.listen($.query('#decrement'), 'click', () => { setCount(count() - 1); });
  $.listen($.query('#increment'), 'click', () => { setCount(count() + 1); });

  // Set props of inner component by modifying the property on the custom element directly.
  $.effect(() => {
    counterDisplay.count = count();
  });
});

declare global {
  interface HTMLElementTagNameMap {
    'state-host-counter': InstanceType<typeof StateHostCounter>;
  }
}
