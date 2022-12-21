import { component } from 'hydroactive';

const DisposedEffect = component(($) => {
  const [ count, setCount ] = $.live('span', Number);

  $.effect(() => {
    window.counter = {
      count: count(),
      increment(): void {
        setCount(count() + 1);
      },
    };

    // Return a `Disposer`to clean up the previous execution before the next one.
    return () => { delete window.counter; };
  });
});

customElements.define('disposed-effect', DisposedEffect);

declare global {
  interface HTMLElementTagNameMap {
    'disposed-effect': InstanceType<typeof DisposedEffect>;
  }

  interface Window {
    counter?: {
      count: number;
      increment(): void;
    }
  }
}
