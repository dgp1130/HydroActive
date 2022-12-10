import { attr, component } from 'hydroactive';
import { createSignal } from 'hydroactive/signal.js';

// Map of counterId's to current counts.
const counterMap = new Map([
  [ 1234, 10 ],
]);

const AttrCounter = component(($) => {
  const id = $.hydrate(':host', Number, attr('counter-id'));
  const initialCount = getCount(id);
  const [ count, setCount ] = createSignal(initialCount);
  $.bind('span', count);

  const decrement = $.query('button#decrement');
  $.listen(decrement, 'click', () => { setCount(count() - 1); });
  decrement.disabled = false;

  const increment = $.query('button#increment');
  $.listen(increment, 'click', () => { setCount(count() + 1); });
  increment.disabled = false;
});

customElements.define('attr-counter', AttrCounter);

declare global {
  interface HTMLElementTagNameMap {
    'attr-counter': InstanceType<typeof AttrCounter>;
  }
}

function getCount(counterId: number): number {
  const count = counterMap.get(counterId);
  if (!count) throw new Error(`No counter for id \`${counterId}\`.`);
  return count;
}
