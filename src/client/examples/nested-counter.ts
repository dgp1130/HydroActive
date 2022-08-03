import { HydratableElement, hydrate, property } from '../lib/hydrator.js';

class InnerCounter extends HydratableElement {
  @property @hydrate('span', Number)
  private count!: number;

  @hydrate('span', HTMLSpanElement)
  private counter!: HTMLSpanElement;

  public increment(): void {
    this.count++;
  }
  public decrement(): void {
    this.count--;
  }

  protected override update(): void {
    this.counter.textContent = this.count.toString();
  }
}
customElements.define('inner-counter', InnerCounter);

class NestedCounter extends HydratableElement {
  @hydrate('inner-counter', InnerCounter)
  private innerCounter!: InnerCounter;

  @hydrate('#increment', HTMLButtonElement)
  private increment!: HTMLButtonElement;

  @hydrate('#decrement', HTMLButtonElement)
  private decrement!: HTMLButtonElement;

  public override connectedCallback(): void {
    super.connectedCallback();

    this.decrement.addEventListener('click', this.onDecrement);
    this.increment.addEventListener('click', this.onIncrement);
  }

  public override disconnectedCallback(): void {
    this.decrement.removeEventListener('click', this.onDecrement);
    this.increment.removeEventListener('click', this.onIncrement);

    super.disconnectedCallback();
  }

  private onIncrement = (() => {
    this.innerCounter.increment();
  }).bind(this);

  private onDecrement = (() => {
    this.innerCounter.decrement();
  }).bind(this);
}
customElements.define('nested-counter', NestedCounter);
