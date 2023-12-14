import { Component, ElementAccessor } from 'hydroactive';
import { bind, live } from 'hydroactive/signal-accessors.js';
import { reactiveProp, WriteableSignal } from 'hydroactive/signals.js';

class InternalComp extends Component {
  public log(msg: string): void {
    console.log(msg);
  }
}

customElements.define('internal-comp', InternalComp);

declare global {
  interface HTMLElementTagNameMap {
    'internal-comp': InternalComp;
  }
}

class AutoCounter extends Component {
  @reactiveProp()
  private accessor incrementBy = 2;

  // NOTE: Property does not *look* reactive, no `()` needed.
  // NOTE: Cannot diverge the internal API for a property (signal) from its
  // public API (accessor).
  @reactiveProp()
  public accessor factor = 2; // Secret reactive property.

  private count!: WriteableSignal<number>;
  private internalComp!: ElementAccessor<InternalComp>;

  protected override onHydrate(): void {
    // NOTE: Is `defer` worth it to stay at hydration time? No easy way to enforce
    // this beyond having `this.host` throw.
    // NOTE: Formatting is likely to be weird.
    this.count = live(this.host.query('span').access(), this.host, Number);

    this.internalComp = this.host.query('internal-comp').access(InternalComp);

    bind(
      this.host.query('#double').access(),
      this.host,
      Number,
      () => this.count() * 2,
    );

    this.host.connected(() => {
      const id = setInterval(() => {
        // Too easy to use `count` here, though `const` should stop it?
        // Weird that we're using `this.state` in `onHydrate`, but it's ok
        // because it's a closure invoked later.
        this.count.set(this.count() + this.incrementBy);
      }, 1_000);

      return () => clearInterval(id);
    });
  }

  // Have to prefix `this.state` everywhere except the `hydrate` function.
  public increment(): void {
    this.count.set(this.count() + 1);
    this.internalComp.element.log('Incrementing!');
  }

  public decrement(): void {
    this.count.set(this.count() - 1);
    this.internalComp.element.log('Decrementing!');
  }
}

customElements.define('auto-counter', AutoCounter);

declare global {
  interface HTMLElementTagNameMap {
    'auto-counter': AutoCounter;
  }
}
