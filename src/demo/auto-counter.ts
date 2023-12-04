import { component } from 'hydroactive';

/** Automatically increments the count over time. */
export const AutoCounter = component('auto-counter', (host) => {
  const label = host.query('span')!;
  let count = Number(label.text);

  setInterval(() => {
    count++;
    label.native.textContent = count.toString();
  }, 1_000);
});
