import { useCheckboxInput } from 'hydroactive/forms.js';
import { bind } from 'hydroactive/signal-accessors.js';
import { defineSignalComponent } from 'hydroactive/signal-component.js';

export const CheckboxInput = defineSignalComponent('checkbox-input', (host) => {
  const excited = useCheckboxInput(host, host.query('input').access());

  host.query('button').access().listen(host, 'click', () => {
    excited.set(true);
  });

  bind(host.query('span').access(), host, Boolean, excited);
});

declare global {
  interface HTMLElementTagNameMap {
    'checkbox-input': InstanceType<typeof CheckboxInput>;
  }
}
