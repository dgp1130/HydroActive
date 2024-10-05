import { Connectable } from '../connectable.js';
import { ElementAccessor } from '../element-accessor.js';
import { proxySignal, ReactiveRoot, WriteableSignal } from '../signals.js';
import { useTextInput } from './text-input.js';

export function useUrlInput(
  root: Connectable & ReactiveRoot,
  input: ElementAccessor<HTMLInputElement>,
  event?: 'change' | 'input',
): WriteableSignal<URL | undefined> {
  if (!(input.element instanceof HTMLInputElement)) throw new Error('TODO: Not an input.');
  if (input.element.type !== 'url') throw new Error('TODO: Not a URL input.');

  const text = useTextInput(root, input, event);

  return proxySignal({
    get: () => URL.canParse(text()) ? new URL(text()) : undefined,
    set: (url) => url ? text.set(url.toString()) : text.set(''),
  });
}
