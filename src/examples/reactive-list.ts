import { ComponentDef, component } from 'hydroactive';
import { Accessor, createSignal } from 'hydroactive/signal.js';

// Make each item in a list independently reactive.
export const ReactiveList = component('reactive-list', ($) => {
  // Find all the inputs and labels in the list.
  const inputs = $.queryAll('li input');
  const labels = $.queryAll('li span');

  // For each pair, bind the label to the text input.
  for (const [ input, label ] of zip(inputs, labels)) {
    const text = useInput($, input);
    $.bind(label, text);
  }
});

declare global {
  interface HTMLElementTagNameMap {
    'reactive-list': InstanceType<typeof ReactiveList>;
  }
}

function useInput($: ComponentDef<{}, HTMLElement>, input: HTMLInputElement):
    Accessor<string> {
  const [ value, setValue ] = createSignal(input.value);
  $.listen(input, 'input', () => { setValue(input.value); });
  return value;
}

function zip<Left, Right>(left: Left[], right: Right[]):
    ReadonlyArray<readonly [ Left, Right ]> {
  if (left.length !== right.length) {
    throw new Error('Mismatched list lengths.');
  }

  return left.map((l, index) => [ l, right[index]! ] as const);
}
