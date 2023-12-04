import { component } from 'hydroactive';

/** Automatically increments the count over time. */
export const AutoCounter = component('auto-counter', (comp) => {
  const label = comp.host.query('span')!;
  let count = Number(label.text);

  comp.connected(() => {
    const id = setInterval(() => {
      count++;
      label.native.textContent = count.toString();
    }, 1_000);

    return () => {
      clearInterval(id);
    };
  });
});
