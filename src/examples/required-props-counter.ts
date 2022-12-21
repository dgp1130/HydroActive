import { component, factory, ComponentDef } from 'hydroactive';
import { Accessor, createSignal } from 'hydroactive/signal.js';

// Define the props and access them at `$.props`. They are wrapped into signal accessors and
// update whenever someone modifies the component property. Since this component is being
// hydrated from a template, it actually can receive props at hydration time, meaning this is
// the exception where props can be non-optional and the `factory()` function enforces this in
// its types.
const RequiredPropsCounter = component(($: ComponentDef<{ count: number }>) => {
  // Unfortunately we can't guarantee that this component is constructed from the factory or
  // that all the props will be set prior to hydration. So `$.props.*` always returns a signal
  // with `| undefined` in the type.
  $.bind('span', () => assertDefined($.props.count()));
});

// Generate a factory to create and hydrate a new instance of the component. Typings require
// that all the defined props are given as inputs.
const createRequiredPropsCounter = factory(RequiredPropsCounter);

customElements.define('required-props-counter', RequiredPropsCounter);

declare global {
  interface HTMLElementTagNameMap {
    'required-props-counter': InstanceType<typeof RequiredPropsCounter>;
  }
}

const Initializer = component(($) => {
  const list = $.hydrate('ul', HTMLUListElement);

  // Can't be NaN because the input is `type="number" required`, so the browser won't allow a
  // non-numeric value.
  const inputText = useInput($, 'input');
  const count = () => Number(inputText());

  $.listen($.query('form'), 'submit', (evt) => {
    evt.preventDefault();

    // Client side render a new counter with the user-specified initial value.
    const item = document.createElement('li');
    item.appendChild(createRequiredPropsCounter({
      count: count(),
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

function assertDefined<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('Required value to be defined, but it was `undefined`.');
  return value;
}
