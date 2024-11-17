import { Component, customElement, required } from 'hydroactive/component-class.js';
import { Properties } from 'hydroactive/hydration.js';
import { bind, hydrateAndBindProps } from 'hydroactive/signal-accessors.js';
import { reactiveProp, signal } from 'hydroactive/signals.js';

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
  @required()
  @reactiveProp()
  public accessor count!: number;

  protected override onHydrate(): void {
    bind(this.host.query('span').access(), this.host, Number, () => this.count);
  }

  public log(): void {
    console.log(this.count);
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

    const count = signal(initialCount);
    count.set(count() + 1); // Increment for fun.

    const display = hydrateAndBindProps(
      this.host.query('orchestration-display'),
      this.host,
      OrchestrationDisplay,
      { count },
    ).element;
    display.log();

    this.host.query('button#decrement').access().listen(this.host, 'click', () => {
      count.set(count() - 1);
    });
    this.host.query('button#increment').access().listen(this.host, 'click', () => {
      count.set(count() + 1);
    });
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
