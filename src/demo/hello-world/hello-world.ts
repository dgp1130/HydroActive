import { defineComponent } from 'hydroactive';

/** Says hello to HydroActive on hydration. */
export const HelloWorld = defineComponent('hello-world', (comp, host) => {
  const name = host.query('span#name').access().live(comp, String);
  name.set('HydroActive');
});

// Declare the component tag name for improved type inference in TypeScript.
declare global {
  interface HTMLElementTagNameMap {
    'hello-world': InstanceType<typeof HelloWorld>;
  }
}
