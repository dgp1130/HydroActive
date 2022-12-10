import { component } from 'hydroactive';
import { unobserved } from 'hydroactive/signal.js';

const DisposedEffect = component(($) => {
  const [ count, setCount ] = $.live('span', Number);

  $.effect(() => {
    window.increment = unobserved(() => { setCount(count() + 1); });
    return () => { delete window.increment; };
  });
});

customElements.define('disposed-effect', DisposedEffect);

declare global {
  interface HTMLElementTagNameMap {
    'disposed-effect': InstanceType<typeof DisposedEffect>;
  }

  interface Window {
    increment?(): void;
  }
}
