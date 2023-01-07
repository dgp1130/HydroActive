import { component, hydrate, ComponentDef } from 'hydroactive';
import { Accessor, createSignal } from 'hydroactive/signal.js';

// Define the props and access them at `$.props`. They are wrapped into signal accessors and
// update whenever someone modifies the component property. These props are initially provided
// at hydration time and can be modified on the component properties afterwards.
const RequiredPropsCounter = component('required-props-counter', ($: ComponentDef<{ count: number }>) => {
  // Bind the count prop to the `<span />` element prerendered as empty.
  //
  // While HydroActive APIs will require that `count` is provided via types, it can't
  // guarantee that this component is hydrated via HydroActive. It could be hydrated like a
  // plain custom element and `count` might be omitted. To account for this, `$.props.*`
  // always returns a signal with `| undefined` in the type. You can `!` the `undefined` away
  // or assert the value is defined at runtime.
  $.bind('span', () => assertDefined($.props.count()));
});

declare global {
  interface HTMLElementTagNameMap {
    'required-props-counter': InstanceType<typeof RequiredPropsCounter>;
  }
}

const Initializer = component('my-initializer', ($) => {
  const counterTemplate = $.query('template');
  const list = $.query('ul');

  // Can't be NaN because the input is `type="number" required`, so the browser won't allow a
  // non-numeric value.
  const inputText = useInput($, 'input');
  const count = () => Number(inputText());

  $.listen($.query('form'), 'submit', (evt) => {
    evt.preventDefault();

    // Render a new counter with the user-specified initial value.
    const counter = (counterTemplate.content.cloneNode(true /* deep */) as Element).firstElementChild!;

    // Props must be provided to `hydrate()`. Types are inferred and `count` is required.
    hydrate(counter, RequiredPropsCounter, { count: count() });

    const item = document.createElement('li');
    item.appendChild(counter);
    list.appendChild(item);
  });
});

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
