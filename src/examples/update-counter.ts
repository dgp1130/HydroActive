import { component } from 'hydroactive';
import { createSignal } from 'hydroactive/signal.js';

const UpdateCounter = component(($) => {
  const [ count, setCount ] = createSignal($.hydrate('#initial', Number));
  const currentEl = $.hydrate('span#current');

  $.listen($.query('#decrement'), 'click', () => { setCount(count() - 1); });
  $.listen($.query('#increment'), 'click', () => { setCount(count() + 1); });

  return {
    update(): void {
      currentEl.textContent = count() % 2 === 0 ? 'even' : 'odd';
    },
  };
});

customElements.define('update-counter', UpdateCounter);

declare global {
  interface HTMLElementTagNameMap {
    'update-counter': InstanceType<typeof UpdateCounter>;
  }
}
