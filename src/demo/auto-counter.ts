import { component } from 'hydroactive';
import { signal } from 'hydroactive/signals.js';

/** Automatically increments the count over time. */
export const AutoCounter = component('auto-counter', (comp) => {
  const label = comp.host.query('span');
  const count = signal(label.read(Number));

  comp.connected(() => {
    const id = setInterval(() => {
      count.set(count() + 1);
    }, 1_000);

    return () => {
      clearInterval(id);
    };
  });

  comp.bind(label, () => count());
});
