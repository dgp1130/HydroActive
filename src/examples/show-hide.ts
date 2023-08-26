import { attr, component } from 'hydroactive';
import { createSignal } from 'hydroactive/signal.js';

// Toggles the visibility of some content based on clicking a button.
export const ShowHide = component('show-hide', ($) => {
  const [ show, setShow ] = createSignal(true);
  $.listen($.query('button'), 'click', () => { setShow(!show()); });
  $.bind('div', () => !show(), attr('hidden'));
});

declare global {
  interface HTMLElementTagNameMap {
    'show-hide': InstanceType<typeof ShowHide>;
  }
}
