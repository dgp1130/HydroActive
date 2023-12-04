import { component } from 'hydroactive';

/** Automatically increments the count over time. */
export const AutoCounter = component('auto-counter', (host) => {
  const label = host.native.querySelector('span')!;
  let count = Number(label.textContent!);

  setInterval(() => {
    count++;
    label.textContent = count.toString();
  }, 1_000);
});
