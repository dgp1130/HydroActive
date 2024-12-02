import { defineSignalComponent } from 'hydroactive';
import { signal } from 'hydroactive/signals.js';

/** Creates a side effect from a signal. */
export const SignalEffect = defineSignalComponent('signal-effect', (host) => {
  const countLabel = host.query('#count').access();
  const initial = countLabel.read(Number);
  const count = signal(initial);
  host.query('button').access().listen(host, 'click', () => {
    count.set(count() + 1);
  });

  // Track how many times the count has been updated.
  let updated = 0;
  const updatesLabel = host.query('#updates').access();

  // Create a side effect whenever `count` is modified.
  host.effect(() => {
    // Update the count label in the effect. Calling `count()` inside the effect
    // creates a dependency on `count`. Anytime `count` changes in the future,
    // this effect will be automatically re-run.
    countLabel.write(count(), Number);

    // Track each time the effect is executed and display it in the DOM. This is
    // the "side effect" of updating the count.
    updated++;
    updatesLabel.write(updated, Number);
  });
});

SignalEffect.define();

declare global {
  interface HTMLElementTagNameMap {
    'signal-effect': InstanceType<typeof SignalEffect>;
  }
}
