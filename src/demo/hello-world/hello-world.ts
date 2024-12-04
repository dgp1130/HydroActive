import { baseComponent } from 'hydroactive';

/** Says hello to HydroActive on hydration. */
export const HelloWorld = baseComponent('hello-world', (host) => {
  host.query('span#name').access().write('HydroActive', String);
});

HelloWorld.define();

// Declare the component tag name for improved type inference in TypeScript.
declare global {
  interface HTMLElementTagNameMap {
    'hello-world': InstanceType<typeof HelloWorld>;
  }
}
