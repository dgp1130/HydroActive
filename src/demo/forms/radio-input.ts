import { useRadioInput } from 'hydroactive/forms.js';
import { bind } from 'hydroactive/signal-accessors.js';
import { defineSignalComponent } from 'hydroactive/signal-component.js';

export const RadioInput = defineSignalComponent('radio-input', (host) => {
  const gender = useRadioInput(host, host.query('#gender-group').access(), 'gender');

  host.query('button#clear').access().listen(host, 'click', () => {
    gender.set(undefined);
  });

  bind(host.query('span').access(), host, String, () => gender() ?? 'N/A');
});

declare global {
  interface HTMLElementTagNameMap {
    'radio-input': InstanceType<typeof RadioInput>;
  }
}
