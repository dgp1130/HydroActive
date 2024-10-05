import { defineSignalComponent } from 'hydroactive';
import { useSelect } from 'hydroactive/forms.js';
import { bind } from 'hydroactive/signal-accessors.js';

export const SelectBox = defineSignalComponent('select-box', (host) => {
  const gender = useSelect(host, host.query('select').access());

  host.query('#force-other').access().listen(host, 'click', () => {
    gender.set('Other');
  });

  bind(host.query('span').access(), host, String, () => gender());
});

declare global {
  interface HTMLElementTagNameMap {
    'select-box': InstanceType<typeof SelectBox>;
  }
}
