import { Connectable } from '../connectable.js';
import { ElementAccessor } from '../element-accessor.js';
import { ReactiveRoot, Signal, signal } from '../signals.js';

class FormAccessor {
  readonly #root: Connectable & ReactiveRoot;
  readonly #form: ElementAccessor<HTMLFormElement>;

  private constructor(
    root: Connectable & ReactiveRoot,
    accessor: ElementAccessor<HTMLFormElement>,
    public readonly valid: Signal<boolean>,
  ) {
    this.#root = root;
    this.#form = accessor;
  }

  public static from(
    root: Connectable & ReactiveRoot,
    form: ElementAccessor<HTMLFormElement>,
  ): FormAccessor {
    const valid = signal(form.element.checkValidity());

    form.listen(root, 'change', () => {
      valid.set(form.element.checkValidity());
    });

    return new FormAccessor(root, form, valid.readonly());
  }

  public onSubmit(handler: (data: FormData) => void): void {
    this.#form.listen(this.#root, 'submit', (event) => {
      event.preventDefault();

      handler(new FormData(this.#form.element));
    });
  }
}

export function useForm(
  root: Connectable & ReactiveRoot,
  form: ElementAccessor<HTMLFormElement>,
): FormAccessor {
  return FormAccessor.from(root, form);
}
