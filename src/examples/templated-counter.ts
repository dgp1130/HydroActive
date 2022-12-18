import { ComponentDef, component, factory } from 'hydroactive';
import { Accessor, createSignal } from 'hydroactive/signal.js';

// Define the "props" necessary to hydrate in the `$` type.
const TemplatedCounter = component(($: ComponentDef<{ initial: number }>) => {
  // Props can be set on the host element's properties.
  // These properties always include `| undefined` because the element can always be created
  // without them. You can assert required properties are present or ignore those errors
  // with `!` depending on how confident you are that the component is used correctly.
  const [ count, setCount ] = createSignal($.host.initial!);

  // Write the initial count prop to the empty `<span />` tag.
  $.bind('span', count);

  $.listen($.query('#decrement'), 'click', () => { setCount(count() - 1); });
  $.listen($.query('#increment'), 'click', () => { setCount(count() + 1); });

  return {
    increment(): void {
      setCount(count() + 1);
    },
  };
});

// Create a factory function for this element with component props as the inferred parameters.
// Also triggers hydration so the returned component is in a valid state.
const createTemplatedCounter = factory(TemplatedCounter);

customElements.define('templated-counter', TemplatedCounter);

declare global {
  interface HTMLElementTagNameMap {
    'templated-counter': InstanceType<typeof TemplatedCounter>;
  }
}

const TemplatedInit = component(($) => {
  const initialText = useInput($, 'input');
  const initialCount = () => Number(initialText());

  // Create a `<templated-counter />` every time the user submits the form.
  $.listen($.query('form'), 'submit', (evt) => {
    evt.preventDefault();

    // Construct a counter via the factory, props are required inputs.
    // This doesn't actually assert that all the props are given, but it does require them in
    // the parameter type.
    const counter = createTemplatedCounter({ initial: initialCount() });
    counter.increment(); // `.increment()` is valid! Already hydrated!
    $.host.shadowRoot!.appendChild(counter);
  });
});

customElements.define('templated-init', TemplatedInit);

declare global {
  interface HTMLElementTagNameMap {
    'templated-init': InstanceType<typeof TemplatedInit>;
  }
}

// Hook to observe changes in an input element.
function useInput($: ComponentDef, selector: string): Accessor<string> {
  const input = $.hydrate(selector, HTMLInputElement) as HTMLInputElement; // TODO: Unnecessary cast.
  const [ value, setValue ] = createSignal(input.value);

  $.listen(input, 'change', (evt) => {
    setValue((evt.target as HTMLInputElement).value);
  });

  return value;
}
