import { baseComponent } from 'hydroactive';

/** Says hello to HydroActive on hydration. */
export const DeferredComp = baseComponent('deferred-comp', (host) => {
  host.query('span').access().write('HydroActive', String);
});

DeferredComp.define();

declare global {
  interface HTMLElementTagNameMap {
    'deferred-comp': InstanceType<typeof DeferredComp>;
  }
}
