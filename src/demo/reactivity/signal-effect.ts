import { defineComponent } from 'hydroactive';
import { signal } from 'hydroactive/signals.js';

/** Creates a side effect from a signal. */
export const SignalEffect = defineComponent('signal-effect', (comp) => {
  const countLabel = comp.host.query('#count');
  const initial = countLabel.read(Number);
  const count = signal(initial);
  comp.listen('button', 'click', () => { count.set(count() + 1); });

  // Track how many times the count has been updated.
  let updated = 0;
  const updatesLabel = comp.host.query('#updates');

  // Create a side effect whenever `count` is modified.
  comp.effect(() => {
    // Update the count label in the effect. Calling `count()` inside the effect
    // creates a dependency on `count`. Anytime `count` changes in the future,
    // this effect will be automatically re-run.
    //
    // We use `ElementRef.prototype.native` here to get access to the underlying
    // `Element` object wrapped by the `countLabel` `ElementRef`.
    countLabel.native.textContent = count().toString();

    // Track each time the effect is executed and display it in the DOM. This is
    // the "side effect" of updating the count.
    updated++;
    updatesLabel.native.textContent = updated.toString();
  });
});

declare global {
  interface HTMLElementTagNameMap {
    'signal-effect': InstanceType<typeof SignalEffect>;
  }
}
