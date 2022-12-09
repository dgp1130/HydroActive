import { component } from 'hydroactive';

const LiveCounter = component(($) => {
  const [ count, setCount ] = $.live('span', Number);

  // This has a memory leak, but we'll fix it later.
  setInterval(() => {
    setCount(count() + 1);
  }, 1_000);
});

customElements.define('live-counter', LiveCounter);

declare global {
  interface HTMLElementTagNameMap {
    'live-counter': InstanceType<typeof LiveCounter>;
  }
}
