import { attr, component } from 'hydroactive';

const counterIdMap = new Map([
  [ 1234, 10 ],
  [ 4321, 15 ],
]);

const RepeatedCounter = component(($) => {
  const counterId = $.hydrate(':host', Number, attr('counter-id'));
  const initialCount = counterIdMap.get(counterId)!;
  $.bind('#count', () => initialCount);
  
  const name = $.hydrate(':host', String, attr('name'));
  $.bind('#name', () => name);
});

customElements.define('repeated-counter', RepeatedCounter);

declare global {
  interface HTMLElementTagNameMap {
    'repeated-counter': InstanceType<typeof RepeatedCounter>;
  }
}
