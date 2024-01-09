import { defineComponent } from 'hydroactive';
import { textInput } from 'hydroactive/forms.js';

/** TODO */
export const TextInput = defineComponent('text-input', (comp) => {
  // Create a signal for the `#name` text input.
  const name = textInput(comp, '#name');

  // Bind the text input signal to the `<span>` element.
  comp.bind('span', () => name());
});

declare global {
  interface HTMLElementTagNameMap {
    'text-input': InstanceType<typeof TextInput>;
  }
}
