import { defineBaseComponent } from 'hydroactive';

/** Accesses the shadow DOM with `host.shadow`. */
export const ClosedShadow = defineBaseComponent('closed-shadow', (host) => {
  // Query the shadow DOM under `host.shadow`.
  host.shadow.query('div').access().write('I\'m blue,', String);

  // Query the light DOM under `host`.
  host.query('div').access().write('Da ba dee da ba di...', String);
});

declare global {
  interface HTMLElementTagNameMap {
    'closed-shadow': InstanceType<typeof ClosedShadow>;
  }
}
