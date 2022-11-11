import { component } from 'hydrator';

const ListenCounter = component(($) => {
  const [ count, setCount ] = $.live('span', Number);

  $.listen($.query('#decrement'), 'click', () => { setCount(count() - 1); });
  $.listen($.query('#increment'), 'click', () => { setCount(count() + 1); });
});

customElements.define('listen-counter', ListenCounter);

declare global {
  interface HTMLElementTagNameMap {
    'listen-counter': InstanceType<typeof ListenCounter>;
  }
}
