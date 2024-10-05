import { defineSignalComponent } from 'hydroactive';
import { useTextInput } from 'hydroactive/forms.js';
import { bind } from 'hydroactive/signal-accessors.js';

/** TODO */
export const TextInput = defineSignalComponent('text-input', (host) => {
  // Create a signal for the `#name` text input.
  const name = useTextInput(host, host.query('input#name').access());

  // Bind the text input signal to the `<span>` element.
  bind(host.query('span').access(), host, String, () => name());
});

declare global {
  interface HTMLElementTagNameMap {
    'text-input': InstanceType<typeof TextInput>;
  }
}
