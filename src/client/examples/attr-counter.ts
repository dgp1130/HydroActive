import { HydratableElement, hydrate, attr, property } from '../lib/hydrator.js';

class AttrCounter extends HydratableElement {
  @hydrate('span', HTMLSpanElement)
  private counter!: HTMLSpanElement;

  @property @hydrate(':host', Number, attr('count'))
  private count!: number;

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

  protected override hydrate(): void {
    this.update();
  }

  protected override update(): void {
    this.counter.textContent = this.count.toString();
  }

  private onIncrement = (() => {
    this.count++;
  }).bind(this);

  private onDecrement = (() => {
    this.count--;
  }).bind(this);
}

customElements.define('attr-counter', AttrCounter);
