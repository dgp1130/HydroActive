import { Connectable } from '../connectable.js';
import { ElementAccessor } from '../element-accessor.js';
import { ElementSerializer } from '../serializers.js';
import { live } from '../signal-accessors.js';
import { proxySignal, ReactiveRoot, WriteableSignal } from '../signals.js';

const checkedSerializer: ElementSerializer<boolean, HTMLInputElement> = {
  deserializeFrom(element: HTMLInputElement): boolean {
    return element.checked;
  },

  serializeTo(value: boolean, element: HTMLInputElement): void {
    element.checked = value;
  },
};

export function useCheckboxInput(
  root: Connectable & ReactiveRoot,
  checkbox: ElementAccessor<HTMLInputElement>,
): WriteableSignal<boolean> {
  if (!(checkbox.element instanceof HTMLInputElement)) {
    throw new Error('TODO: Not an input element.');
  }

  if (checkbox.element.type !== 'checkbox') {
    throw new Error('TODO: Wrong type.');
  }

  const value: WriteableSignal<boolean> =
      live(checkbox, root, checkedSerializer);

  checkbox.listen(root, 'change', () => {
    value.set(checkbox.element.checked);
  });

  return proxySignal({
    get: value,
    set: (val) => {
      value.set(val);

      // TODO: Should this be scheduled?
      checkbox.element.checked = val;
    },
  });
}
