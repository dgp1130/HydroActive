import { HydratableElement, hydrate, live } from '../lib/hydrator.js';

class HydratingCounter extends HydratableElement {
  @live('span', Number)
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
    this.decrement.disabled = false;
    this.increment.disabled = false;

    const label = document.createElement('div');
    label.textContent = 'Hi, I\'m CSR\'d! These buttons are also disabled until their event listeners are loaded.';
    this.shadowRoot!.append(label);
  }

  private onIncrement = (() => {
    this.count++;
  }).bind(this);

  private onDecrement = (() => {
    this.count--;
  }).bind(this);
}

customElements.define('hydrating-counter', HydratingCounter);
