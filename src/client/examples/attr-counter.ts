import { HydratableElement, hydrate, attr, bind } from '../lib/hydrator.js';

class AttrCounter extends HydratableElement {
  @hydrate(':host', Number, attr('counter-id'))
  private counterId!: number;

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

  protected override hydrate(): void {
    getCount(this.counterId).then((count) => {
      this.count = count;
      this.decrement.disabled = false;
      this.increment.disabled = false;
    });
  }

  private onIncrement = (() => {
    this.count++;
  }).bind(this);

  private onDecrement = (() => {
    this.count--;
  }).bind(this);
}

customElements.define('attr-counter', AttrCounter);

function getCount(_counterId: number): Promise<number> {
  return new Promise<number>((resolve) => {
    setTimeout(() => { resolve(25); }, 3_000);
  });
}
