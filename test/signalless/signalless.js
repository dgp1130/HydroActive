import { defineBaseComponent } from 'hydroactive';

/** A base component which does not depend on signals. */
defineBaseComponent('signal-less', (host) => {
  host.write('No signals for me!', String);
});
