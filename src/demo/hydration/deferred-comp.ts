import { defineBaseComponent } from 'hydroactive';

/** Says hello to HydroActive on hydration. */
export const DeferredComp = defineBaseComponent('deferred-comp', (host) => {
  host.query('span').access().write('HydroActive', String);
});

declare global {
  interface HTMLElementTagNameMap {
    'deferred-comp': InstanceType<typeof DeferredComp>;
  }
}
