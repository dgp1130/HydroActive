import { component } from 'hydrator';

const LiveCounter = component(($) => {
  const [ count, setCount ] = $.live('span', Number);

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
