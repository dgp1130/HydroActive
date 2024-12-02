import { defineBaseComponent } from 'hydroactive';

/** Accesses the shadow DOM with `host.shadow`. */
export const OpenShadow = defineBaseComponent('open-shadow', (host) => {
  // Query the shadow DOM under `host.shadow`.
  host.shadow.query('div').access().write('I\'m red!', String);

  // Query the light DOM under `host`.
  host.query('div').access().write('I\'m not...', String);
});

OpenShadow.define();

declare global {
  interface HTMLElementTagNameMap {
    'open-shadow': InstanceType<typeof OpenShadow>;
  }
}
