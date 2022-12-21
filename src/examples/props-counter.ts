import { component, factory, ComponentDef } from 'hydroactive';
import { Accessor, createSignal } from 'hydroactive/signal.js';

// Define the "props" in the `$` type.
const PropsCounter = component(($: ComponentDef<{ initialCount: number }>) => {
  // Props are JS properties on the custom element type, so they are available on `$.host`.
  // Since this component could be instantiated by a `document.createElement('props-counter')`,
  // we can't assume all properties will be given, so they are optional. Assert any required
  // properties if necessary.
  if ($.host.initialCount === undefined) throw new Error('\`initialCount\` is required.');
  
  // Use the initial count from props and bind it to the template.
  const [ count, setCount ] = createSignal($.host.initialCount);
  $.bind('span', count);

  $.listen($.query('#decrement'), 'click', () => { setCount(count() - 1); });
  $.listen($.query('#increment'), 'click', () => { setCount(count() + 1); });
});

// Generate a factory to create and hydrate a new instance of the component. Typings require
// that all the defined props are given as inputs.
const createPropsCounter = factory(PropsCounter);

customElements.define('props-counter', PropsCounter);

declare global {
  interface HTMLElementTagNameMap {
    'props-counter': InstanceType<typeof PropsCounter>;
  }
}

const Initializer = component(($) => {
  const list = $.hydrate('ul', HTMLUListElement);

  // Can't be NaN because the input is `type="number" required`, so the browser won't allow a
  // non-numeric value.
  const inputText = useInput($, 'input');
  const initialCount = () => Number(inputText());

  $.listen($.query('form'), 'submit', (evt) => {
    evt.preventDefault();

    // Client side render a new counter with the user-specified initial value.
    const item = document.createElement('li');
    item.appendChild(createPropsCounter({
      initialCount: initialCount() ?? 0,
    }));
    list.appendChild(item);
  });
});

customElements.define('my-initializer', Initializer);

declare global {
  interface HTMLElementTagNameMap {
    'my-initializer': InstanceType<typeof Initializer>;
  }
}

function useInput($: ComponentDef, selector: string): Accessor<string> {
  const input = $.hydrate(selector, HTMLInputElement) as HTMLInputElement; // TODO: Unnecessary cast.
  const [ value, setValue ] = createSignal(input.value);

  $.listen(input, 'change', () => { setValue(input.value); });

  return value;
}
