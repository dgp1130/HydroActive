import { ComponentRef, ElementRef } from 'hydroactive';
import { ElementSerializer } from 'hydroactive/serializers.js';
import { WriteableSignal } from 'hydroactive/signals.js';

const valueSerializer: ElementSerializer<string, HTMLInputElement> = {
  deserializeFrom(element: HTMLInputElement): string {
    return element.value;
  },

  serializeTo(value: string, element: HTMLInputElement): void {
    element.value = value;
  },
};

/** TODO */
export function textInput(
  comp: ComponentRef,
  selectorOrElement: string | ElementRef<HTMLInputElement>,
): WriteableSignal<string> {
  const el = selectorOrElement instanceof ElementRef
    ? selectorOrElement
    : comp.host.query(selectorOrElement);

  if (!(el.native instanceof HTMLInputElement)) {
    throw new Error('TODO: Not an input element.');
  }

  const input = el as ElementRef<HTMLInputElement>;
  // TODO: Why `never`?
  const value: WriteableSignal<string> = comp.live(input, valueSerializer);

  comp.listen(el, 'input', () => {
    value.set(input.native.value);
  });

  return value;
}
