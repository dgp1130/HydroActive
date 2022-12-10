import { component } from 'hydroactive';

const DisposedEffect = component(($) => {
  const [ count, setCount ] = $.live('span', Number);

  $.effect(() => {
    window.increment = () => { setCount(count() + 1); };
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
