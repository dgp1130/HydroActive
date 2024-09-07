import { defineSignalComponent } from 'hydroactive';

/** A base component which does not depend on signals. */
defineSignalComponent('signal-full', (host) => {
  host.effect(() => {
    host.write('Signals here!');
  });
});
