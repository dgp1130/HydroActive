import { Component, customElement, required } from 'hydroactive/component-class.js';
import { Properties } from 'hydroactive/hydration.js';
import { bind, bindEmit, signalFromProp } from 'hydroactive/signal-accessors.js';
import { deferredSignal, property, propFromSignal } from 'hydroactive/signals.js';

@customElement('orchestration-initial')
export class OrchestrationInitial extends Component<'orchestration-initial'> {
  public accessor initialCount!: number;

  protected override onHydrate(): void {
    this.initialCount = this.host.query('span').access().read(Number);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'orchestration-initial': OrchestrationInitial;
  }

  interface HTMLElementPropertyMap {
    'orchestration-initial': Properties<OrchestrationInitial, {}>;
  }
}

@customElement('orchestration-display')
export class OrchestrationDisplay extends Component<'orchestration-display'> {
  readonly #count = deferredSignal<number>();

  @required()
  @property()
  public accessor count = propFromSignal(this.#count);

  protected override onHydrate(): void {
    bindEmit(this.host, 'countChanged', this.#count);

    bind(this.host.query('span').access(), this.host, Number, this.#count);

    this.host.connected(() => {
      const handle = setInterval(() => {
        this.#count.set(this.#count() + 1);
      }, 1_000);

      return () => {
        clearInterval(handle);
      };
    });
  }

  public log(): void {
    console.log(this.#count());
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'orchestration-display': OrchestrationDisplay;
  }

  interface HTMLElementPropertyMap {
    'orchestration-display': Properties<OrchestrationDisplay, {
      required: 'count',
    }>;
  }
}

@customElement('orchestration-host')
export class OrchestrationHost extends Component<'orchestration-host'> {
  protected override onHydrate(): void {
    const { initialCount } = this.host.query('orchestration-initial')
        .hydrate(OrchestrationInitial)
        .element;

    const display = this.host.query('orchestration-display')
        .hydrate(OrchestrationDisplay, { count: initialCount })
        .element;
    display.log();

    const count = signalFromProp(this.host, display, 'count');

    this.host.query('button#decrement').access().listen(this.host, 'click', () => {
      count.set(count() - 1);
    });
    this.host.query('button#increment').access().listen(this.host, 'click', () => {
      count.set(count() + 1);
    });

    bind(
      this.host.query('span#derived').access(),
      this.host,
      Number,
      () => count() - 1,
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'orchestration-host': OrchestrationHost;
  }

  interface HTMLElementPropertyMap {
    'orchestration-host': Properties<OrchestrationHost, {}>;
  }
}
