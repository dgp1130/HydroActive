import { HydratableElement, hydrate, property } from 'hydroactive/class.js';

// TODO: What about light DOM? MutationObserver of light DOM? Maybe out of scope?
class PropCounter extends HydratableElement {
  // Easy: Replicate Lit properties which automatically call `this.update()` when set.
  @property @hydrate('#initial', Number)
  private count!: number;

  @hydrate('#current', HTMLSpanElement)
  private currentLabel!: HTMLSpanElement;

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
    this.currentLabel.textContent = this.count % 2 === 0 ? 'even' : 'odd';
  }

  private onIncrement = (() => {
    this.count++;
  }).bind(this);

  private onDecrement = (() => {
    this.count--;
  }).bind(this);
}

customElements.define('prop-counter-class', PropCounter);

declare global {
  interface HTMLElementTagNameMap {
    'prop-counter-class': PropCounter;
  }
}
