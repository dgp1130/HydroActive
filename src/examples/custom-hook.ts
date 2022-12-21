import { component, ComponentDef } from 'hydroactive';
import { Accessor } from 'hydroactive/signal.js';

const CustomHook = component(($) => {
  // `timer()` hook encapsulates the desired behavior.
  const count = timer($, 'span');

  // Returned signal can be used for additional behavior.
  $.effect(() => {
    console.log(`custom-hook: The current count is ${count()}.`);
  });
});

customElements.define('custom-hook', CustomHook);

declare global {
  interface HTMLElementTagNameMap {
    'custom-hook': InstanceType<typeof CustomHook>;
  }
}

// "Hooks" are really just functions executed at hydration time.
// They typically take `$` as a parameter to access component functionality.
function timer($: ComponentDef, selector: string): Accessor<number> {
  // Runs whenever you call `timer()` (usually on hydration).
  const [ count, setCount ] = $.live(selector, Number);

  // Set up our own lifecycle behavior internal to the hook.
  $.lifecycle(() => {
    const id = setInterval(() => { setCount(count() + 1); }, 1_000);
    return () => { clearInterval(id); };
  });

  // Return whatever we want, in this case the `count` accessor.
  return count;
};
