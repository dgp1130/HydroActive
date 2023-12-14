import { Component, ElementAccessor, SignalComponentAccessor } from 'hydroactive';
import { HydroActiveComponent } from 'hydroactive/hydroactive-component.js';
import { ElementSerializer } from 'hydroactive/serializers.js';
import { bind, live } from 'hydroactive/signal-accessors.js';
import { reactiveProp, WriteableSignal } from 'hydroactive/signals.js';

const valueSerializer: ElementSerializer<string, HTMLInputElement> = {
  serializeTo(value: string, el: HTMLInputElement): void {
    el.value = value;
  },

  deserializeFrom(el: HTMLInputElement): string {
    return el.value;
  },
}

function textInput(
  host: SignalComponentAccessor<HydroActiveComponent>,
  input: ElementAccessor<HTMLInputElement>,
): WriteableSignal<string> {
  const sig = live(input, host, valueSerializer);
  input.listen(host, 'input', () => {
    sig.set(input.read(valueSerializer));
  });

  return sig;
}

export class BindCounter extends Component {
  // NOTE: Field ordering is not stable.
  // ES standard requires fields to be in dependency order, but this is broken
  // by `defer`. Running out of order can cause strange errors, mostly hitting
  // an uninitialized value from depending on another `defer` value which hasn't
  // been initialized yet.
  // private foo = defer(() => log('foo', this.bar));
  // private bar = defer(() => log('bar', 2));

  @reactiveProp()
  public accessor repetitions = 2;

  #name!: WriteableSignal<string>;
  public get name() {
    return this.#name();
  }

  protected override onHydrate(): void {
    this.#name = textInput(this.host, this.host.query('input').access());
    bind(this.host.query('span').access(), this.host, String,
        () => this.#name().repeat(this.repetitions));
  }

  public log(): void {
    console.log(this.#name());
  }
}

customElements.define('bind-counter', BindCounter);

declare global {
  interface HTMLElementTagNameMap {
    'bind-counter': BindCounter;
  }
}
