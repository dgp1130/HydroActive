import { component } from 'hydroactive';

const DisposedEffect = component('disposed-effect', ($) => {
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
