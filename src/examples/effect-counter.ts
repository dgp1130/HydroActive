import { component } from 'hydroactive';

const EffectCounter = component(($) => {
  const [ count, setCount ] = $.live('span', Number);

  $.listen($.query('button'), 'click', () => { setCount(count() + 1); });

  $.effect(() => {
    console.log(`The \`effect-counter\` count is: ${count()}`);
  });
});

customElements.define('effect-counter', EffectCounter);

declare global {
  interface HTMLElementTagNameMap {
    'effect-counter': InstanceType<typeof EffectCounter>;
  }
}
