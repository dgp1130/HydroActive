import { defineComponent } from 'hydroactive';
import { live } from 'hydroactive/signal-accessors.js';

/** Says hello to HydroActive on hydration. */
export const HelloWorld = defineComponent('hello-world', (host, comp) => {
  const name = live(host.query('span#name').access(), comp, String);
  name.set('HydroActive');
});

// Declare the component tag name for improved type inference in TypeScript.
declare global {
  interface HTMLElementTagNameMap {
    'hello-world': InstanceType<typeof HelloWorld>;
  }
}
