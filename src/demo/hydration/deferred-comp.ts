import { defineSignalComponent } from 'hydroactive';

/** Says hello to HydroActive on hydration. */
export const DeferredComp = defineSignalComponent('deferred-comp', (host) => {
  host.query('span').access().write('HydroActive', String);
});

declare global {
  interface HTMLElementTagNameMap {
    'deferred-comp': InstanceType<typeof DeferredComp>;
  }
}
