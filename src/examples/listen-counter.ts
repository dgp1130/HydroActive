import { component } from 'hydroactive';

const ListenCounter = component('listen-counter', ($) => {
  const [ count, setCount ] = $.live('span', Number);

  // `$.query()` queries the shadow DOM, asserts an element is found, and returns it.
  // Also more narrowly types the result which we'll see later.
  const decrementBtn = $.query('#decrement');
  const incrementBtn = $.query('#increment');

  // `$.listen()` adds event listeners. Also removes those listeners when the component is removed from
  // the DOM.
  // No explicit `removeEventListener()` required.
  // No `.bind(this)` required.
  // No `const onClick = // ...` required.
  $.listen(decrementBtn, 'click', () => { setCount(count() - 1); });
  $.listen(incrementBtn, 'click', () => { setCount(count() + 1); });
});

declare global {
  interface HTMLElementTagNameMap {
    'listen-counter': InstanceType<typeof ListenCounter>;
  }
}
