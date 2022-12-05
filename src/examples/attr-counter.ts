import { attr, component } from 'hydroactive';
import { createSignal } from 'hydroactive/signal.js';

const AttrCounter = component(($) => {
  const id = $.hydrate(':host', Number, attr('counter-id'));

  const decrement = $.query('button#decrement');
  const increment = $.query('button#increment');

  // TODO: Is it a good idea to call these functions asynchronously?
  getCount(id).then((initialCount) => {
    const [ count, setCount ] = createSignal(initialCount);
    $.bind('span', count);
  
    $.listen(decrement, 'click', () => { setCount(count() - 1); });
    decrement.disabled = false;
  
    $.listen(increment, 'click', () => { setCount(count() + 1); });
    increment.disabled = false;
  });
});

customElements.define('attr-counter', AttrCounter);

declare global {
  interface HTMLElementTagNameMap {
    'attr-counter': InstanceType<typeof AttrCounter>;
  }
}

function getCount(_counterId: number): Promise<number> {
  return new Promise<number>((resolve) => {
    setTimeout(() => { resolve(10); }, 3_000);
  });
}
