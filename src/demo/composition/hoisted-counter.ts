import { Component, Properties, customElement, required } from 'hydroactive';
import { bind, bindProp } from 'hydroactive/signal-accessors.js';
import { reactiveProp, signal } from 'hydroactive/signals.js';

@customElement('counter-derived')
export class CounterDerived extends Component<'counter-derived'> {
  @required()
  @reactiveProp()
  public accessor count!: number;

  @required()
  public accessor name!: string;

  public data = 'test';

  protected override onHydrate(): void {
    bind(this.host.query('span').access(), this.host, Number, () => this.count);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'counter-derived': CounterDerived;
  }

  interface HTMLElementPropertyMap {
    'counter-derived': Properties<CounterDerived, {
      required: 'count' | 'name',
      optional: 'data',
    }>;
  }
}

@customElement('counter-host')
export class CounterHost extends Component<'counter-host'> {
  protected override onHydrate(): void {
    const initial = this.host.query('span#initial').access().read(Number);
    const count = signal(initial);

    const derived = this.host.query('counter-derived').hydrate(CounterDerived, {
      count: initial,
      name: 'test',
    });

    this.host.query('button#decrement').access().listen(this.host, 'click', () => {
      count.set(count() - 1);
    });
    this.host.query('button#increment').access().listen(this.host, 'click', () => {
      count.set(count() + 1);
    });

    bindProp(derived, this.host, (el) => {
      el.count = count();
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'counter-host': CounterHost;
  }

  interface HTMLElementPropertyMap {
    'counter-host': Properties<CounterHost, {}>;
  }
}
