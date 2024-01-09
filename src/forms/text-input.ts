import { Connectable } from '../connectable.js';
import { ElementAccessor } from '../element-accessor.js';
import { ReactiveRoot, WriteableSignal, proxySignal } from '../signals.js';
import { live } from '../signal-accessors.js';
import { valueSerializer } from './value-serializer.js';

const allowedTypes = new Set(['text', 'hidden', 'password', 'search', 'url']);

/** TODO */
export function useTextInput(
  root: Connectable & ReactiveRoot,
  input: ElementAccessor<HTMLInputElement>,
  event: 'input' | 'change' = 'input',
): WriteableSignal<string> {
  if (!(input.element instanceof HTMLInputElement)) {
    throw new Error('TODO: Not an input element.');
  }

  if (!allowedTypes.has(input.element.type)) {
    throw new Error('TODO: Wrong type.');
  }

  const value: WriteableSignal<string> = live(input, root, valueSerializer);

  input.listen(root, event, () => {
    value.set(input.element.value);
  });

  return proxySignal({
    get: value,
    set: (val) => {
      value.set(val);

      // TODO: Should this be scheduled?
      input.element.value = val;
    },
  });
}
