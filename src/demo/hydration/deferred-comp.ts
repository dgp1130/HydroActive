import { defineComponent } from 'hydroactive';
import { live } from 'hydroactive/signal-accessors.js';

/** Says hello to HydroActive on hydration. */
export const DeferredComp = defineComponent('deferred-comp', (comp, host) => {
  const name = live(host.query('span').access(), comp, String);
  name.set('HydroActive');
});

declare global {
  interface HTMLElementTagNameMap {
    'deferred-comp': InstanceType<typeof DeferredComp>;
  }
}
