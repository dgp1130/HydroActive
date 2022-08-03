import { HydratableElement, hydrate, property } from '../lib/hydrator.js';

// TODO: What about when the script executes before the element?
// Do we care if modules are defer-only?
// TODO: What about light DOM?
// TODO: MutationObserver of light DOM? Maybe out of scope?
class PropCounter extends HydratableElement {
  // Easy: Replicate Lit properties which automatically call `this.update()` when set.
  @property @hydrate('span', Number)
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

customElements.define('prop-counter', PropCounter);
