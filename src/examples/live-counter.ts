import { component } from 'hydroactive';
import { unobserved } from 'hydroactive/signal.js';

const LiveCounter = component(($) => {
  const [ count, setCount ] = $.live('span', Number);

  // This has a memory leak, but we'll fix it later.
  setInterval(unobserved(() => {
    setCount(count() + 1);
  }), 1_000);
});

customElements.define('live-counter', LiveCounter);

declare global {
  interface HTMLElementTagNameMap {
    'live-counter': InstanceType<typeof LiveCounter>;
  }
}
