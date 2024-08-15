import { defineComponent } from 'hydroactive';
import { live } from 'hydroactive/signal-accessors.js';

/** Accesses the shadow DOM with `host.shadow`. */
export const OpenShadow = defineComponent('open-shadow', (comp, host) => {
  // Query the shadow DOM under `host.shadow`.
  const shadowDiv = live(host.shadow.query('div').access(), comp, String);
  shadowDiv.set('I\'m red!');

  // Query the light DOM under `host`.
  const lightDiv = live(host.query('div').access(), comp, String);
  lightDiv.set('I\'m not...');
});

declare global {
  interface HTMLElementTagNameMap {
    'open-shadow': InstanceType<typeof OpenShadow>;
  }
}
