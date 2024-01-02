import { Component, ComponentHost, Descriptor, ElementRef, Initializer, ProxyDescriptor, ValueDescriptor, bind, query, use } from 'hydroactive';
import { ElementSerializer } from 'hydroactive/serializers.js';

const valueSerializer: ElementSerializer<string, HTMLInputElement> = {
  serializeTo(value: string, element: HTMLInputElement): void {
    element.value = value;
  },

  deserializeFrom(element: HTMLInputElement): string {
    return element.value;
  },
};

class TextInputController {
  private constructor(
    private readonly el: ElementRef<HTMLInputElement>,
    private readonly host: ComponentHost,
  ) {}

  public static from(el: ElementRef<HTMLInputElement>, host: ComponentHost): TextInputController {
    const eventHandler = host.requestUpdate.bind(host);
    host.connected(() => {
      el.native.addEventListener('input', eventHandler, { passive: true });
      return () => {
        el.native.removeEventListener('input', eventHandler);
      };
    });

    return new TextInputController(el, host);
  }

  get value(): string {
    return this.el.read(valueSerializer);
  }

  set value(val: string) {
    this.el.write(val, valueSerializer);
    this.host.requestUpdate();
  }
}

type PropertyDecorator<Comp extends Component, Value> = (
  target: ClassAccessorDecoratorTarget<Comp, Value>,
  context: ClassAccessorDecoratorContext<Comp, Value>,
) => ClassAccessorDecoratorResult<Comp, Value> | void;

export function textInputLegacy(
  selectorOrElement: string | ElementRef<HTMLInputElement>,
): Initializer<TextInputController> {
  return (host) => {
    // Happens prior to hydration.
    const el = selectorOrElement instanceof ElementRef
        ? selectorOrElement
        : host.ref.query(selectorOrElement);

    if (!(el.native instanceof HTMLInputElement)) throw new Error('Not an input.');
    if (el.attr('type', String) !== 'text') throw new Error('Not a text input.');

    return TextInputController.from(el as ElementRef<HTMLInputElement>, host);
  };
}

export function textInputCtrl(selector: string | ElementRef<HTMLInputElement>):
    (host: ComponentHost) => ValueDescriptor<TextInputController> {
  return (host) => {
    return { value: textInputLegacy(selector)(host) };
  };
}

// TODO: Do we want to lean on decorators or `this.use`?
// Likely can't use `this.use` in an initializer because initializers happen
// prior to hydration.
/** TODO */
export function useTextInput<Comp extends Component>(selector: string):
    PropertyDecorator<Comp, string> {
  return use(textInput(selector));
}

export function textInput(selectorOrElement: string | ElementRef<HTMLSpanElement>):
    (host: ComponentHost) => ProxyDescriptor<string> {
  // Happens prior to hydration.
  return (host) => {
    // Happens at hydration.
    const el = selectorOrElement instanceof ElementRef
      ? selectorOrElement
      : host.ref.query(selectorOrElement);

    if (!(el.native instanceof HTMLInputElement)) throw new Error('Not an input.');
    if (el.attr('type', String) !== 'text') throw new Error('Not a text input.');

    const requestUpdate = host.requestUpdate.bind(host);
    host.connected(() => {
      el.native.addEventListener('input', requestUpdate, { passive: true });

      return () => {
        el.native.removeEventListener('input', requestUpdate);
      };
    });

    return {
      get(): string {
        return (el as ElementRef<HTMLInputElement>).read(valueSerializer);
      },

      set(value: string): void {
        (el as ElementRef<HTMLInputElement>).write(value, valueSerializer);
        host.requestUpdate();
      },
    };
  };
}

interface State {
  // readonly name: ProxyDescriptor<string>;
}

export class BindCounter extends Component<State> {
  @query('span')
  private accessor label!: ElementRef<HTMLInputElement>;

  // Decorator use of a property descriptor.
  // @use(textInput('input'))
  // private accessor name!: string;

  // Decorator use of a wrapper object.
  // @use(textInputCtrl('input'))
  // private accessor name!: TextInputController;

  // Hooks automatically call `use`.
  // TODO: Should they generally do this?
  // @useTextInput('input')
  // private accessor name!: string;

  // Imperative use of a property descriptor.
  // private name!: ProxyDescriptor<string>;
  // protected override onHydrate(): void {
  //   this.name = this.use(textInput(this.comp.host.query('input')));

  //   this.comp.connected(() => {
  //     const handle = setInterval(() => {
  //       this.name.set(this.name.get() + '!');
  //     }, 1_000);

  //     return () => {
  //       clearInterval(handle);
  //     };
  //   });
  // }

  // Imperative use of a wrapper object.
  // private name!: TextInputController;
  // protected override onHydrate(): void {
  //   this.name = this.use(textInputCtrl(this.comp.host.query('input')));
  // }

  // protected override onHydrate(): void {
  //   this.comp.connected(() => {
  //     const handle = setInterval(() => {
  //       this.name += '!';
  //     }, 1_000);

  //     return () => {
  //       clearInterval(handle);
  //     };
  //   });
  // }

  // Bind
  @bind('span')
  private accessor name: string | undefined;

  protected override onHydrate(): void {
    this.name = 'Devel';
  }

  protected override update(): void {
    // this.label.write(this.name!);
  }
}

customElements.define('bind-counter', BindCounter);

declare global {
  interface HTMLElementTagNameMap {
    'bind-counter': BindCounter;
  }
}
