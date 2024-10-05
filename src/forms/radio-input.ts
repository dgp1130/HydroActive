import { Connectable } from '../connectable.js';
import { ElementAccessor } from '../element-accessor.js';
import { ReactiveRoot, WriteableSignal, proxySignal, signal } from '../signals.js';

export function useRadioInput(
  root: Connectable & ReactiveRoot,
  container: ElementAccessor<Element>,
  name: string,
): WriteableSignal<string | undefined> {
  // TODO: MutationObserver for adding/removing radio buttons.
  // TODO: Sanitize `name`.
  const radioButtons = container.queryAll(`input[type="radio"][name="${name}"]`, { optional: true });
  if (radioButtons.length === 0) {
    throw new Error(`TODO: Could not find a radio button with name "${name}"`);
  }

  const initial = radioButtons
      .map((button) => button.access().element)
      .find((button) => button.checked)
      ?.value;

  const value = signal(initial);

  container.listen(root, 'change', ({ target }) => {
    if (!(target instanceof HTMLInputElement)) return;
    if (target.type !== 'radio') return;
    if (target.name !== name) return;

    value.set(target.value);
  });

  return proxySignal({
    get: value,
    set: (val) => {
      if (val !== undefined) {
        // TODO: Sanitize
        // TODO: What if `value` is updated client-side? Is the attribute reflected?
        const button = container.query(
          `input[type="radio"][name="${name}"][value="${val}"]`,
          { optional: true },
        );

        // TODO
        if (!button) throw new Error(`Value "${val}" is not a valid option for the "${name}" radio buttons. Valid options are: ...`);

        // TODO: Should this be scheduled?
        button.access().element.checked = true;
      } else {
        const existingButton = container.query(
          `input[type="radio"][name="${name}"]:checked`,
          { optional: true },
        );

        // TODO: Should this be scheduled?
        if (existingButton) existingButton.access().element.checked = false;
      }

      value.set(val);
    },
  });
}
