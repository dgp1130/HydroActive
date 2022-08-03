import { HydratableElement, hydrate, idom } from '../lib/hydrator.js';

class IdomCounter extends HydratableElement {
  // Fancy: Associate the update logic with the property which changes, theoretically
  // faster, probably not worth it most of the time?
  @hydrate('span', Number)
  @idom<IdomCounter>((el) => { el.counter.textContent = el.count.toString(); })
  private count!: number;

  @hydrate('span', HTMLSpanElement)
  private counter!: HTMLSpanElement;

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
    this.count++;
  }).bind(this);

  private onDecrement = (() => {
    this.count--;
  }).bind(this);
}

customElements.define('idom-counter', IdomCounter);
