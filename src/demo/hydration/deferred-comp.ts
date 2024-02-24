import { defineComponent } from 'hydroactive';

/** Says hello to HydroActive on hydration. */
export const DeferredComp = defineComponent('deferred-comp', (comp) => {
  const name = comp.live('span', String);
  name.set('HydroActive');
});

declare global {
  interface HTMLElementTagNameMap {
    'deferred-comp': InstanceType<typeof DeferredComp>;
  }
}
