import { defineComponent } from 'hydroactive';

/** Automatically increments the count over time. */
export const AutoCounter = defineComponent('auto-counter', (comp) => {
  const span1 = comp.host.query('span').read(HTMLSpanElement);
  // @ts-expect-error
  const span2 = comp.host.query('.foo').read(HTMLInputElement);
  // @ts-expect-error
  const span3 = comp.host.query('input').read(HTMLSelectElement);
  const span4 = comp.host.query('span').read(Element);
  const span5 = comp.host.query('span').read({
    serializeTo(input: HTMLInputElement, span: HTMLSpanElement): void {
      span.querySelector('input')!.replaceWith(input);
    },

    deserializeFrom(span: HTMLSpanElement): HTMLInputElement {
      return span.querySelector('input') as HTMLInputElement;
    }
  });
});

declare global {
  interface HTMLElementTagNameMap {
    'auto-counter': InstanceType<typeof AutoCounter>;
  }
}
