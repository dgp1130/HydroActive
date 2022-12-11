import { attr, component } from 'hydroactive';
import { createSignal } from 'hydroactive/signal.js';

// Map of counterId's to current counts.
const counterMap = new Map([
  [ 1234, 10 ],
]);

const AttrCounter = component(($) => {
  // `:host` means "get the host element".
  // `attr('counter-id')` means "read from the `counter-id` attribute, not `.textContent`".
  const id = $.hydrate(':host', Number, attr('counter-id'));

  // Client uses this information to get required state.
  const initialCount = getCountFromId(id);

  const [ count, setCount ] = createSignal(initialCount);
  $.bind('span', count);

  $.listen($.query('button#decrement'), 'click', () => { setCount(count() - 1); });
  $.listen($.query('button#increment'), 'click', () => { setCount(count() + 1); });
});

customElements.define('attr-counter', AttrCounter);

declare global {
  interface HTMLElementTagNameMap {
    'attr-counter': InstanceType<typeof AttrCounter>;
  }
}

function getCountFromId(counterId: number): number {
  const count = counterMap.get(counterId);
  if (!count) throw new Error(`No counter for id \`${counterId}\`.`);
  return count;
}
