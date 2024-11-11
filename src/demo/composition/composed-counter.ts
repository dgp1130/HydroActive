import { Component } from 'hydroactive';
import { live } from 'hydroactive/signal-accessors.js';
import { WriteableSignal } from 'hydroactive/signals.js';

/**
 * Displays the current count and provides `decrement` and `increment` methods
 * for modifying the count.
 */

export class CounterDisplay extends Component {
  #count!: WriteableSignal<number>;
  public get count(): number {
    return this.#count();
  }

  protected override onHydrate(): void {
    this.#count = live(this.host.query('span').access(), this.host, Number);
  }

  public decrement(): void {
    this.#count.set(this.#count() - 1);
  }

  public increment(): void {
    this.#count.set(this.#count() + 1);
  }
}

customElements.define('counter-display', CounterDisplay);

declare global {
  interface HTMLElementTagNameMap {
    'counter-display': CounterDisplay;
  }
}

export class CounterController extends Component {
  protected override onHydrate(): void {
    // Get a reference to the underlying `counter-display` element.
    const inner = this.host.query('counter-display').access(CounterDisplay).element;

    // Bind the button clicks to modifying the counter.
    this.host.query('button#decrement').access().listen(this.host, 'click', () => {
      inner.decrement();
    });
    this.host.query('button#increment').access().listen(this.host, 'click', () => {
      inner.increment();
    });

    this.host.query('span#initial').access().write(inner.count, Number);
  }
}

customElements.define('counter-controller', CounterController);

declare global {
  interface HTMLElementTagNameMap {
    'counter-controller': CounterController;
  }
}
