import { Component, Properties, customElement, define, required } from 'hydroactive';
import { bind } from 'hydroactive/signal-accessors.js';
import { reactiveProp } from 'hydroactive/signals.js';

// TODO: Maybe a class decorator could do this? Can it alter the type?
@customElement('counter-host')
export class CounterHost extends Component<'counter-host'> {
  protected override onHydrate(): void {
    const initial = this.host.query('span#initial').access().read(Number);

    this.host.query('counter-derived').hydrate(CounterDerived, {
      count: initial,
      name: 'test',
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'counter-host': InstanceType<typeof CounterHost>;
  }
}

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
    'counter-derived': InstanceType<typeof CounterDerived>;
  }

  interface HTMLElementPropertyMap {
    'counter-derived': Properties<InstanceType<typeof CounterDerived>, {
      required: 'count' | 'name',
      optional: 'data',
    }>;
  }
}
