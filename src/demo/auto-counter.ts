import { component } from 'hydroactive';

/** Automatically increments the count over time. */
export const AutoCounter = component('auto-counter', (comp) => {
  const count = comp.live('span', Number);

  comp.connected(() => {
    const id = setInterval(() => {
      count.set(count() + 1);
    }, 1_000);

    return () => {
      clearInterval(id);
    };
  });
});
