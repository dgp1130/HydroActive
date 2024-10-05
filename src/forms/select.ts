import { Connectable } from '../connectable.js';
import { ElementAccessor } from '../element-accessor.js';
import { ReactiveRoot, WriteableSignal, proxySignal } from '../signals.js';
import { live } from '../signal-accessors.js';
import { valueSerializer } from './value-serializer.js';

export function useSelect(
  root: Connectable & ReactiveRoot,
  select: ElementAccessor<HTMLSelectElement>,
): WriteableSignal<string> {
  if (!(select.element instanceof HTMLSelectElement)) {
    throw new Error('TODO: Not a `<select>` element.');
  }

  if (!select.query(':scope > option', { optional: true })) {
    throw new Error('TODO: No options');
  }

  const value: WriteableSignal<string> = live(select, root, valueSerializer);

  select.listen(root, 'change', () => {
    value.set(select.element.value);
  });

  return proxySignal({
    get: value,
    set: (val) => {
      const options = select.queryAll(':scope > option')
          .map((option) => option.access());
      const selectedOption =
          options.find((option) => option.element.value === val);
      if (!selectedOption) throw new Error('TODO: Invalid option.');

      value.set(val);

      // TODO: Should this be scheduled?
      select.element.value = val;
    },
  });
}
