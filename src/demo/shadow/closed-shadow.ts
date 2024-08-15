import { defineComponent } from 'hydroactive';
import { live } from 'hydroactive/signal-accessors.js';

/** Accesses the shadow DOM with `host.shadow`. */
export const ClosedShadow = defineComponent('closed-shadow', (comp, host) => {
  // Query the shadow DOM under `host.shadow`.
  const shadowDiv = live(host.shadow.query('div').access(), comp, String);
  shadowDiv.set('I\'m blue,');

  // Query the light DOM under `host`.
  const lightDiv = live(host.query('div').access(), comp, String);
  lightDiv.set('Da ba dee da ba di...');
});

declare global {
  interface HTMLElementTagNameMap {
    'closed-shadow': InstanceType<typeof ClosedShadow>;
  }
}
