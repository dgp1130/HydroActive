import { HydratableElement, hydrate, attr, bind } from '../lib/hydrator.js';

class AttrCounter extends HydratableElement {
  // Can't use `@live()` because we want to hydrate from the host attribute but bind
  // outputs to the `<span />` tag.
  @hydrate(':host', Number, attr('count'))
  @bind('span')
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

  private onIncrement = (() => {
    this.count++;
  }).bind(this);

  private onDecrement = (() => {
    this.count--;
  }).bind(this);
}

customElements.define('attr-counter', AttrCounter);
