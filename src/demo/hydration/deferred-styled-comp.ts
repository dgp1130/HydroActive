import { defineComponent } from 'hydroactive/component.js';
import { live } from 'hydroactive/signal-accessors.js';

/** TODO */
export const DeferredStyledComp = defineComponent('deferred-styled-comp', (comp, host) => {
  const name = live(host.query('span').access(), comp, String);
  name.set('HydroActive');
});

declare global {
  interface HTMLElementTagNameMap {
    'deferred-style-comp': InstanceType<typeof DeferredStyledComp>;
  }
}
