import { HydratableElement, hydrate, attr, bind } from '../lib/hydrator.js';

class AttrCounter extends HydratableElement {
  @hydrate(':host', Number, attr('counter-id'))
  private counterId!: number;

  @bind('span')
  private count!: number;

  protected override hydrate(): void {
    const decrement = this.query('button#decrement');
    this.listen(decrement, 'click', () => { this.count--; });
    const increment = this.query('button#increment');
    this.listen(increment, 'click', () => { this.count++; });

    getCount(this.counterId).then((count) => {
      this.count = count;

      decrement.disabled = false;
      increment.disabled = false;
    });
  }
}

customElements.define('attr-counter', AttrCounter);

declare global {
  interface HTMLElementTagNameMap {
    'attr-counter': AttrCounter;
  }
}

function getCount(_counterId: number): Promise<number> {
  return new Promise<number>((resolve) => {
    setTimeout(() => { resolve(10); }, 3_000);
  });
}
